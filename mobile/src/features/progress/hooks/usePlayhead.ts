import { onlineManager } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';

import { ApiError } from '@/core/api/errors';
import { playheadStorage } from '@/core/storage/kv-storage';

import { progressApi } from '../api/progress-api';
import { enqueuePlayhead } from '../sync/progress-sync';

const LOCAL_SAVE_EVERY_SECONDS = 5;
const SERVER_SAVE_EVERY_SECONDS = 30;

/**
 * Media playhead persistence (architecture §6.6):
 * local store every 5 s, server every 30 s and on pause/exit via PATCH …/complete with the
 * lesson's CURRENT completion state (sending `false` would un-complete it — spec §6.3).
 */
export function usePlayhead(lessonId: string, completed: boolean) {
  const lastLocal = useRef(0);
  const lastServer = useRef(0);
  const latest = useRef(0);

  const saveToServer = useCallback(
    async (position: number) => {
      const lastPosition = Math.max(0, Math.floor(position));
      lastServer.current = Date.now();
      if (!onlineManager.isOnline()) {
        enqueuePlayhead(lessonId, lastPosition, completed);
        return;
      }
      try {
        await progressApi.complete(lessonId, { completed, lastPosition });
      } catch (error) {
        if (error instanceof ApiError && error.isNetworkError) {
          enqueuePlayhead(lessonId, lastPosition, completed);
        }
      }
    },
    [lessonId, completed],
  );

  /** Call on every time update; throttles itself. */
  const onPosition = useCallback(
    (position: number) => {
      latest.current = position;
      const now = Date.now();
      if (now - lastLocal.current >= LOCAL_SAVE_EVERY_SECONDS * 1000) {
        lastLocal.current = now;
        playheadStorage.set(lessonId, String(Math.floor(position)));
      }
      if (now - lastServer.current >= SERVER_SAVE_EVERY_SECONDS * 1000) {
        void saveToServer(position);
      }
    },
    [lessonId, saveToServer],
  );

  /** Call on pause and when leaving the lesson. */
  const commit = useCallback(() => {
    if (latest.current <= 0) return;
    playheadStorage.set(lessonId, String(Math.floor(latest.current)));
    void saveToServer(latest.current);
  }, [lessonId, saveToServer]);

  /** max(local, server) — whichever is further along. */
  const resumePosition = useCallback(
    (serverPosition: number | null | undefined) => {
      const local = Number(playheadStorage.getString(lessonId) ?? 0);
      return Math.max(local || 0, serverPosition ?? 0);
    },
    [lessonId],
  );

  return { onPosition, commit, resumePosition };
}
