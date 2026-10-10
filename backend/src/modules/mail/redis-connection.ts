import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { RedisOptions } from 'ioredis';

const REDIS_WARNING_INTERVAL_MS = 60_000;

export function redisConnectionOptions(config: ConfigService): RedisOptions {
  return {
    host: config.get<string>('REDIS_HOST') || 'localhost',
    port: parseInt(config.get<string>('REDIS_PORT') || '6379', 10),
  };
}

/**
 * ioredis keeps reconnecting while Redis is down and BullMQ re-emits every failure; log at
 * most one warning per minute instead of flooding the output.
 */
export function throttledRedisErrorLogger(logger: Logger, what: string) {
  let lastLoggedAt = 0;
  return (err: Error) => {
    const now = Date.now();
    if (now - lastLoggedAt < REDIS_WARNING_INTERVAL_MS) return;
    lastLoggedAt = now;
    logger.warn(`${what}: Redis unavailable (${err.message})`);
  };
}

const QUEUE_CONNECT_TIMEOUT_MS = 2_000;

/**
 * Whether a queue's Redis connection is up, waiting at most 2 s. `queue.client` only resolves
 * once Redis is connected and never rejects while ioredis keeps retrying, hence the timeout.
 */
export async function isQueueReachable(queue: Queue<any, any, any>): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), QUEUE_CONNECT_TIMEOUT_MS);
  });
  try {
    const client = await Promise.race([queue.client, timeout]);
    return client?.status === 'ready';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
