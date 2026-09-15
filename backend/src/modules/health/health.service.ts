import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '@config/prisma.service';
import { FilesService } from '@modules/files/files.service';
import { RedisConfig } from '@config/app.config';

interface ComponentStatus {
  status: 'up' | 'down' | 'degraded';
  latencyMs?: number;
  detail?: string;
}

@Injectable()
export class HealthService implements OnModuleDestroy {
  private redis?: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly filesService: FilesService,
  ) {}

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => this.redis?.disconnect());
    }
  }

  private async checkDatabase(): Promise<ComponentStatus> {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (err) {
      return { status: 'down', detail: err instanceof Error ? err.message : 'unknown error' };
    }
  }

  private async checkMinio(): Promise<ComponentStatus> {
    const started = Date.now();
    try {
      const ok = await this.filesService.checkHealth();
      return { status: ok ? 'up' : 'down', latencyMs: Date.now() - started };
    } catch (err) {
      return { status: 'down', detail: err instanceof Error ? err.message : 'unknown error' };
    }
  }

  private async checkRedis(): Promise<ComponentStatus> {
    const started = Date.now();
    if (!this.redis) {
      this.redis = new Redis({
        host: RedisConfig.host,
        port: RedisConfig.port,
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
      });
    }
    this.redis.on('error', () => undefined);
    try {
      if (this.redis.status === 'wait' || this.redis.status === 'end') {
        await this.redis.connect();
      }
      await this.redis.ping();
      return { status: 'up', latencyMs: Date.now() - started };
    } catch (err) {
      return {
        status: 'down',
        detail: err instanceof Error ? err.message : 'unknown error',
      };
    }
  }

  async status() {
    const [database, minio, redis] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkMinio(),
      this.checkRedis(),
    ]);

    const components: Record<string, ComponentStatus> = {
      database: database.status === 'fulfilled' ? database.value : { status: 'down' as const },
      minio: minio.status === 'fulfilled' ? minio.value : { status: 'down' as const },
      redis: redis.status === 'fulfilled' ? redis.value : { status: 'down' as const },
    };

    const entries = Object.values(components);
    const downCount = entries.filter((c) => c.status === 'down').length;

    return {
      status: downCount === 0 ? 'healthy' : downCount === entries.length ? 'unhealthy' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks: components,
    };
  }
}
