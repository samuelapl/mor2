import { syncQueue } from '@/core/sync/sync-queue';

import { MAX_HEARTBEAT_SECONDS, progressApi } from '../api/progress-api';

/**
 * Offline handlers for lesson time and playhead (architecture §6.6, §6.12).
 * Completion itself is never queued — the server must validate it online.
 */

export const LESSON_TIME = 'lessonTime';
export const PLAYHEAD = 'playhead';

interface LessonTimePayload {
  lessonId: string;
  seconds: number;
}

interface PlayheadPayload {
  lessonId: string;
  lastPosition: number;
  /** Completion state at the time of saving — must never downgrade a completed lesson. */
  completed: boolean;
}

let registered = false;

export function registerProgressSync(): void {
  if (registered) return;
  registered = true;

  syncQueue.register<LessonTimePayload>(LESSON_TIME, {
    // The backend caps a single heartbeat at 300 s, so long offline stretches go in chunks.
    send: async ({ lessonId, seconds }) => {
      let remaining = Math.floor(seconds);
      while (remaining > 0) {
        const chunk = Math.min(remaining, MAX_HEARTBEAT_SECONDS);
        await progressApi.addTime(lessonId, chunk);
        remaining -= chunk;
      }
    },
    merge: (queued, incoming) => ({
      lessonId: queued.lessonId,
      seconds: queued.seconds + incoming.seconds,
    }),
  });

  syncQueue.register<PlayheadPayload>(PLAYHEAD, {
    send: ({ lessonId, lastPosition, completed }) =>
      progressApi.complete(lessonId, { completed, lastPosition }).then(() => undefined),
    // Latest position wins; once completed, stay completed.
    merge: (queued, incoming) => ({
      ...incoming,
      completed: queued.completed || incoming.completed,
    }),
  });
}

export function enqueueLessonTime(lessonId: string, seconds: number): void {
  if (seconds < 1) return;
  syncQueue.enqueue<LessonTimePayload>(LESSON_TIME, { lessonId, seconds }, lessonId);
}

export function enqueuePlayhead(lessonId: string, lastPosition: number, completed: boolean): void {
  syncQueue.enqueue<PlayheadPayload>(PLAYHEAD, { lessonId, lastPosition, completed }, lessonId);
}

export function dropQueuedPlayhead(lessonId: string): void {
  syncQueue.remove(PLAYHEAD, lessonId);
}
