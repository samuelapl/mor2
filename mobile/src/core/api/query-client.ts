import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform, type AppStateStatus } from 'react-native';

import { queryCacheStorage } from '../storage/kv-storage';
import { ApiError } from './errors';

/**
 * React Query setup (LEARNER_MOBILE_ARCHITECTURE.md §2, §6.12):
 * - online state follows NetInfo; focus follows AppState
 * - 4xx errors are never retried (they are business answers, not glitches)
 * - the cache is persisted to expo-sqlite so screens render offline
 */

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(Boolean(state.isConnected) && state.isInternetReachable !== false);
  }),
);

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') focusManager.setFocused(status === 'active');
}
AppState.addEventListener('change', onAppStateChange);

const DAY_MS = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 7 * DAY_MS,
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      // Gated actions (complete, submit, check-in…) must fail fast offline — see §6.12.
      networkMode: 'online',
      retry: false,
    },
  },
});

export const queryPersister = createAsyncStoragePersister({
  key: 'eltms-query-cache',
  throttleTime: 2_000,
  storage: {
    getItem: (key) => queryCacheStorage.getString(key) ?? null,
    setItem: (key, value) => queryCacheStorage.set(key, value),
    removeItem: (key) => {
      queryCacheStorage.remove(key);
    },
  },
});

/** Bump when cached payload shapes change, so stale caches are discarded. */
export const QUERY_CACHE_BUSTER = 'v1';
export const QUERY_CACHE_MAX_AGE = 7 * DAY_MS;
