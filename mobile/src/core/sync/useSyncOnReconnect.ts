import { onlineManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { syncQueue } from './sync-queue';
import { flushOfflineQueue } from '@/features/offline';

/** Flushes the offline queue when connectivity returns or the app comes to the foreground. */
export function useSyncOnReconnect(): void {
  useEffect(() => {
    void flushOfflineQueue();
    void syncQueue.flush();

    const unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) {
        void flushOfflineQueue();
        void syncQueue.flush();
      }
    });
    const appState = AppState.addEventListener('change', (status) => {
      if (status === 'active') {
        void flushOfflineQueue();
        void syncQueue.flush();
      }
    });

    return () => {
      unsubscribeOnline();
      appState.remove();
    };
  }, []);
}
