export interface CacheOptions {
  /** Time to live in seconds. Default is 300 (5 minutes). */
  ttlSeconds?: number;
  /** If true, bypasses the in-memory L1 cache and reads/writes only to Redis */
  skipL1?: boolean;
  /** If true, bypasses the distributed Redis L2 cache and operates in-memory only */
  skipL2?: boolean;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

