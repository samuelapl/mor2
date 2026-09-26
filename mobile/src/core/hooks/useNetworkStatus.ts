import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

/** `true` while the device has a usable connection (driven by NetInfo via onlineManager). */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
  );
}
