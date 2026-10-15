import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfig } from '@config/app.config';
import { CacheEntry, CacheOptions } from './cache.types';

const DEFAULT_TTL_SECONDS = 300; // 5 minutes
const MAX_L1_ITEMS = 1000;
const L1_CLEANUP_INTERVAL_MS = 60_000; // 1 minute

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis | null = null;
  private readonly l1Cache = new Map<string, CacheEntry<any>>();
  private readonly inFlight = new Map<string, Promise<any>>();
  private readonly cleanupTimer: NodeJS.Timeout;
  private isRedisReady = false;

  constructor() {
    try {
      this.redis = new Redis({
        host: RedisConfig.host,
        port: RedisConfig.port,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 1000, 15000),
        enableOfflineQueue: false,
      });

      this.redis.on('ready', () => {
        this.isRedisReady = true;
        this.logger.log(`Redis L2 cache connected successfully (${RedisConfig.host}:${RedisConfig.port})`);
      });

      this.redis.on('error', (err) => {
        this.isRedisReady = false;
        this.logger.debug(`Redis L2 cache connection warning (falling back to L1 in-memory): ${err.message}`);
      });

      this.redis.on('close', () => {
        this.isRedisReady = false;
      });

      // Attempt non-blocking initial connection
      this.ensureRedisConnected().catch(() => undefined);
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Redis client; running with in-memory L1 cache only: ${err?.message}`);
      this.redis = null;
    }

    // Periodic sweep of expired L1 entries
    this.cleanupTimer = setInterval(() => this.sweepExpiredL1(), L1_CLEANUP_INTERVAL_MS);
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  async onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    if (this.redis) {
      try {
        await this.redis.quit().catch(() => this.redis?.disconnect());
      } catch {
        // Ignored on shutdown
      }
    }
    this.l1Cache.clear();
    this.inFlight.clear();
  }

  private async ensureRedisConnected(): Promise<void> {
    if (!this.redis) return;
    if (this.redis.status === 'wait' || this.redis.status === 'end') {
      try {
        await this.redis.connect();
      } catch {
        // Will degrade to L1 quietly
      }
    }
  }

  /**
   * Get an item from L1 in-memory, falling back to L2 Redis.
   */
  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    const now = Date.now();

    // 1. Check L1 in-memory cache
    if (!options?.skipL1) {
      const entry = this.l1Cache.get(key);
      if (entry) {
        if (entry.expiresAt > now) {
          return entry.value as T;
        }
        this.l1Cache.delete(key);
      }
    }

    // 2. Check L2 Redis cache
    if (!options?.skipL2 && this.redis) {
      try {
        await this.ensureRedisConnected();
        if (this.isRedisReady || this.redis.status === 'ready') {
          const raw = await this.redis.get(key);
          if (raw !== null) {
            const parsed = JSON.parse(raw) as T;
            // Backfill L1 with remaining TTL or default
            if (!options?.skipL1) {
              const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
              this.setL1(key, parsed, ttl);
            }
            return parsed;
          }
        }
      } catch (err: any) {
        this.logger.debug(`Redis read failed for key ${key}: ${err.message}`);
      }
    }

    return null;
  }

  /**
   * Store an item in L1 in-memory and L2 Redis with a TTL in seconds.
   */
  async set<T>(key: string, value: T, ttlSeconds?: number, options?: CacheOptions): Promise<void> {
    const ttl = ttlSeconds ?? options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;

    // Set L1
    if (!options?.skipL1) {
      this.setL1(key, value, ttl);
    }

    // Set L2 Redis
    if (!options?.skipL2 && this.redis) {
      try {
        await this.ensureRedisConnected();
        if (this.isRedisReady || this.redis.status === 'ready') {
          const serialized = JSON.stringify(value);
          await this.redis.set(key, serialized, 'EX', ttl);
        }
      } catch (err: any) {
        this.logger.debug(`Redis write failed for key ${key}: ${err.message}`);
      }
    }
  }

  /**
   * Delete a specific cache key from both L1 and L2.
   */
  async del(key: string): Promise<void> {
    this.l1Cache.delete(key);

    if (this.redis) {
      try {
        await this.ensureRedisConnected();
        if (this.isRedisReady || this.redis.status === 'ready') {
          await this.redis.del(key);
        }
      } catch (err: any) {
        this.logger.debug(`Redis delete failed for key ${key}: ${err.message}`);
      }
    }
  }

  /**
   * Delete all keys matching a wildcard pattern (e.g., 'news:*', 'lookup:*').
   */
  async delByPattern(pattern: string): Promise<void> {
    // 1. Purge from L1
    const regexPattern = new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    for (const key of this.l1Cache.keys()) {
      if (regexPattern.test(key)) {
        this.l1Cache.delete(key);
      }
    }

    // 2. Purge from L2 Redis using non-blocking SCAN
    if (this.redis) {
      try {
        await this.ensureRedisConnected();
        if (this.isRedisReady || this.redis.status === 'ready') {
          let cursor = '0';
          do {
            const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = nextCursor;
            if (keys.length > 0) {
              await this.redis.unlink(...keys);
            }
          } while (cursor !== '0');
        }
      } catch (err: any) {
        this.logger.debug(`Redis delByPattern failed for pattern ${pattern}: ${err.message}`);
      }
    }
  }

  /**
   * Stampede-safe Cache Fetcher:
   * Returns cached value if available, or executes fetchFn() and caches the result.
   * If multiple concurrent requests ask for the same key while it is loading,
   * all await the single in-flight promise (no duplicate database queries).
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds?: number,
    options?: CacheOptions,
  ): Promise<T> {
    // 1. Fast path: check cache
    const cached = await this.get<T>(key, options);
    if (cached !== null) {
      return cached;
    }

    // 2. Check if a fetch is already in flight for this key
    const inFlightPromise = this.inFlight.get(key);
    if (inFlightPromise) {
      return inFlightPromise as Promise<T>;
    }

    // 3. Initiate fetch with deduplication
    const fetchPromise = (async () => {
      try {
        const fresh = await fetchFn();
        if (fresh !== undefined && fresh !== null) {
          await this.set(key, fresh, ttlSeconds, options);
        }
        return fresh;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private setL1<T>(key: string, value: T, ttlSeconds: number): void {
    // Evict oldest if reaching capacity
    if (this.l1Cache.size >= MAX_L1_ITEMS) {
      const oldestKey = this.l1Cache.keys().next().value;
      if (oldestKey) {
        this.l1Cache.delete(oldestKey);
      }
    }

    this.l1Cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private sweepExpiredL1(): void {
    const now = Date.now();
    for (const [key, entry] of this.l1Cache.entries()) {
      if (entry.expiresAt <= now) {
        this.l1Cache.delete(key);
      }
    }
  }
}

