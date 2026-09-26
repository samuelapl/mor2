/**
 * Web build of kv-storage.ts: same API over localStorage (expo-sqlite on web needs a
 * WebAssembly worker + COOP/COEP headers, which a plain dev server doesn't send).
 */
export class KeyValueStore {
  private readonly prefix: string;

  constructor(name: string) {
    this.prefix = `${name}:`;
  }

  private get storage(): Storage | null {
    return typeof window !== 'undefined' ? window.localStorage : null;
  }

  getString(key: string): string | undefined {
    return this.storage?.getItem(this.prefix + key) ?? undefined;
  }

  set(key: string, value: string): void {
    this.storage?.setItem(this.prefix + key, value);
  }

  remove(key: string): void {
    this.storage?.removeItem(this.prefix + key);
  }

  clearAll(): void {
    const storage = this.storage;
    if (!storage) return;
    Object.keys(storage)
      .filter((k) => k.startsWith(this.prefix))
      .forEach((k) => storage.removeItem(k));
  }
}

export const sessionStorage = new KeyValueStore('eltms-session');
export const syncQueueStorage = new KeyValueStore('eltms-sync-queue');
export const playheadStorage = new KeyValueStore('eltms-playhead');
export const queryCacheStorage = new KeyValueStore('eltms-query-cache');
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

export function clearUserStorage(): void {
  sessionStorage.clearAll();
  syncQueueStorage.clearAll();
  playheadStorage.clearAll();
  queryCacheStorage.clearAll();
}
