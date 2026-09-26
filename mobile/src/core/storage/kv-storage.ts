import { SQLiteStorage } from 'expo-sqlite/kv-store';

/**
 * Synchronous key-value stores backed by expo-sqlite (LEARNER_MOBILE_ARCHITECTURE.md §2, §6.2).
 * expo-sqlite ships inside Expo Go and in dev/release builds, so one code path works everywhere.
 * Secrets (access + refresh tokens) are NOT stored here — they live in SecureStore (secure.ts).
 * Each concern has its own database so it can be cleared independently on logout.
 */
export class KeyValueStore {
  private readonly db: SQLiteStorage;

  constructor(name: string) {
    this.db = new SQLiteStorage(`${name}.db`);
  }

  getString(key: string): string | undefined {
    return this.db.getItemSync(key) ?? undefined;
  }

  set(key: string, value: string): void {
    this.db.setItemSync(key, value);
  }

  remove(key: string): void {
    this.db.removeItemSync(key);
  }

  clearAll(): void {
    this.db.clearSync();
  }
}

/** Cached user & permissions. */
export const sessionStorage = new KeyValueStore('eltms-session');
/** Durable offline queue (heartbeats, playhead saves). */
export const syncQueueStorage = new KeyValueStore('eltms-sync-queue');
/** Local video/audio playhead positions per lesson. */
export const playheadStorage = new KeyValueStore('eltms-playhead');
/** Persisted React Query cache for offline reading. */
export const queryCacheStorage = new KeyValueStore('eltms-query-cache');
/** Non-sensitive user preferences (e.g. UI language before login). */
export const preferencesStorage = new KeyValueStore('eltms-preferences');

export function readJson<T>(storage: KeyValueStore, key: string): T | null {
  const raw = storage.getString(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    storage.remove(key);
    return null;
  }
}

export function writeJson(storage: KeyValueStore, key: string, value: unknown): void {
  storage.set(key, JSON.stringify(value));
}

/** Wipes every user-scoped store. Preferences survive logout. */
export function clearUserStorage(): void {
  sessionStorage.clearAll();
  syncQueueStorage.clearAll();
  playheadStorage.clearAll();
  queryCacheStorage.clearAll();
}
