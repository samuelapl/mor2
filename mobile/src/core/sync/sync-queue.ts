import { onlineManager } from '@tanstack/react-query';

import { ApiError } from '../api/errors';
import { readJson, syncQueueStorage, writeJson } from '../storage/kv-storage';

/**
 * Durable offline queue (LEARNER_MOBILE_ARCHITECTURE.md §6.6, §6.12).
 *
 * Only idempotent-ish, non-gated writes go here (time heartbeats, playhead saves).
 * Items with the same `coalesceKey` are merged by their handler's `merge`, so a long
 * offline stretch becomes a few requests instead of hundreds.
 *
 * Consumers register handlers in Phase 3; Phase 1 only provides the mechanism.
 */

export interface QueueItem<P = unknown> {
  id: string;
  type: string;
  coalesceKey?: string;
  payload: P;
  createdAt: number;
  attempts: number;
}

export interface QueueHandler<P = unknown> {
  /** Sends one item. Throw to keep it queued. */
  send: (payload: P) => Promise<void>;
  /** Combines a queued payload with a new one sharing the same coalesceKey. */
  merge?: (queued: P, incoming: P) => P;
}

const STORAGE_KEY = 'items';
const MAX_ATTEMPTS = 8;

const handlers = new Map<string, QueueHandler<any>>();
let flushing: Promise<void> | null = null;

function load(): QueueItem[] {
  return readJson<QueueItem[]>(syncQueueStorage, STORAGE_KEY) ?? [];
}

function save(items: QueueItem[]): void {
  writeJson(syncQueueStorage, STORAGE_KEY, items);
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const syncQueue = {
  register<P>(type: string, handler: QueueHandler<P>): void {
    handlers.set(type, handler);
  },

  enqueue<P>(type: string, payload: P, coalesceKey?: string): void {
    const items = load();
    const handler = handlers.get(type);
    const existing = coalesceKey
      ? items.find((item) => item.type === type && item.coalesceKey === coalesceKey)
      : undefined;

    if (existing && handler?.merge) {
      existing.payload = handler.merge(existing.payload as P, payload);
    } else {
      items.push({ id: newId(), type, coalesceKey, payload, createdAt: Date.now(), attempts: 0 });
    }
    save(items);
  },

  /** Drops queued items of `type` with the given coalesceKey (e.g. a stale playhead save). */
  remove(type: string, coalesceKey: string): void {
    save(load().filter((item) => !(item.type === type && item.coalesceKey === coalesceKey)));
  },

  size(): number {
    return load().length;
  },

  /** Sends queued items in order. Safe to call often; concurrent calls share one flush. */
  flush(): Promise<void> {
    if (flushing) return flushing;
    if (!onlineManager.isOnline()) return Promise.resolve();

    flushing = (async () => {
      let items = load();
      for (const item of [...items]) {
        const handler = handlers.get(item.type);
        if (!handler) continue; // handler not registered yet — keep for later

        try {
          await handler.send(item.payload);
          items = items.filter((i) => i.id !== item.id);
        } catch (error) {
          const apiError = error instanceof ApiError ? error : null;
          if (apiError?.isNetworkError) break; // offline again — stop and keep order

          item.attempts += 1;
          const permanent = apiError && apiError.status >= 400 && apiError.status < 500;
          if (permanent || item.attempts >= MAX_ATTEMPTS) {
            items = items.filter((i) => i.id !== item.id);
          }
        }
        save(items);
      }
    })().finally(() => {
      flushing = null;
    });

    return flushing;
  },

  clear(): void {
    syncQueueStorage.remove(STORAGE_KEY);
  },
};
