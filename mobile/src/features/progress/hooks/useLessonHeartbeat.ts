import { onlineManager, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/core/api/errors';
import { useAppState } from '@/core/hooks/useAppState';

import { MAX_HEARTBEAT_SECONDS, progressApi } from '../api/progress-api';
import { progressKeys } from '../api/progress-queries';
import { enqueueLessonTime } from '../sync/progress-sync';
import type { CourseProgress } from '../types/progress.types';
import { patchLessonProgress } from '../utils/find-lesson-progress';

const FLUSH_EVERY_SECONDS = 30;

export interface LessonHeartbeatOptions {
  courseId: string;
  lessonId: string;
  /** Server-side time already recorded (from course progress). */
  serverSeconds: number;
  /**
   * Extra activity condition, e.g. media is playing. Time only counts while the screen is
   * focused, the app is in the foreground and this is true (architecture §6.6).
   */
  active: boolean;
  /** Disable entirely (e.g. lesson already completed). */
  enabled?: boolean;
}

/**
 * Counts active study seconds locally and sends them with PATCH /progress/lessons/:id/time
 * every 30 s (1–300 s per call). Unsent time is flushed on blur/background/unmount and
 * queued offline for delivery on reconnect.
 */
export function useLessonHeartbeat({
  courseId,
  lessonId,
  serverSeconds,
  active,
  enabled = true,
}: LessonHeartbeatOptions) {
  const queryClient = useQueryClient();
  const isFocused = useIsFocused();
  const appState = useAppState();
  const counting = enabled && active && isFocused && appState === 'active';

  const pending = useRef(0); // counted, not yet sent or queued
  const offlineQueued = useRef(0); // handed to the offline queue this session
  const confirmed = useRef(serverSeconds);
  const sinceFlush = useRef(0);
  const [liveSeconds, setLiveSeconds] = useState(serverSeconds);

  // A fresher server value (e.g. after refetch) supersedes our local baseline.
  useEffect(() => {
    if (serverSeconds > confirmed.current) {
      confirmed.current = serverSeconds;
      setLiveSeconds(serverSeconds + offlineQueued.current + pending.current);
    }
  }, [serverSeconds]);

  const flush = useCallback(async () => {
    const seconds = Math.min(Math.floor(pending.current), MAX_HEARTBEAT_SECONDS);
    if (seconds < 1) return;
    pending.current -= seconds;
    sinceFlush.current = 0;

    if (!onlineManager.isOnline()) {
      enqueueLessonTime(lessonId, seconds);
      offlineQueued.current += seconds;
      return;
    }
    try {
      const res = await progressApi.addTime(lessonId, seconds);
      confirmed.current = res.timeSpentSeconds;
      setLiveSeconds(res.timeSpentSeconds + offlineQueued.current + pending.current);
      queryClient.setQueryData<CourseProgress>(progressKeys.course(courseId), (old) =>
        old
          ? patchLessonProgress(old, lessonId, {
              timeSpentSeconds: res.timeSpentSeconds,
              requiredSeconds: res.requiredSeconds,
              timeSatisfied: res.satisfied,
            })
          : old,
      );
    } catch (error) {
      if (error instanceof ApiError && error.isNetworkError) {
        enqueueLessonTime(lessonId, seconds);
        offlineQueued.current += seconds;
      }
      // 4xx (e.g. LOCKED) — the server refused this time; drop it.
    }
  }, [courseId, lessonId, queryClient]);

  // Local 1-second tick while counting; periodic flush.
  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => {
      pending.current += 1;
      sinceFlush.current += 1;
      setLiveSeconds(confirmed.current + offlineQueued.current + pending.current);
      if (sinceFlush.current >= FLUSH_EVERY_SECONDS) void flush();
    }, 1000);
    return () => {
      clearInterval(timer);
      // Paused (blur / background / media paused / unmount): send what we have.
      void flush();
    };
  }, [counting, flush]);

  /** Adds time measured elsewhere (e.g. while an external link was open in the browser). */
  const addSeconds = useCallback(
    (seconds: number) => {
      pending.current += Math.max(0, Math.floor(seconds));
      setLiveSeconds(confirmed.current + offlineQueued.current + pending.current);
      void flush();
    },
    [flush],
  );

  return { liveSeconds, isCounting: counting, flush, addSeconds };
}
