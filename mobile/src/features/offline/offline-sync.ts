import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { syncQueue } from '@/core/sync/sync-queue';

import { offlineDb, type OfflineQuizAttempt } from './offline-db';

interface QuizSubmitPayload {
  attemptId: string;
  assessmentId: string;
  answers: Array<{ questionId: string; selectedOption: number | string }>;
}

interface HeartbeatPayload {
  courseId: string;
  lessonId: string;
  seconds: number;
}

interface LessonCompletePayload {
  lessonId: string;
  lastPosition?: number;
}

let handlersRegistered = false;

/**
 * Registers durable queue handlers for offline quiz submissions, lesson completions,
 * and time-spent heartbeats.
 */
export function registerOfflineSyncHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // 1. Offline Quiz Attempt Submissions
  syncQueue.register<QuizSubmitPayload>('QUIZ_SUBMIT', {
    send: async (payload) => {
      try {
        await api.post(endpoints.assessments.submit(payload.assessmentId), {
          answers: payload.answers,
        });
        await offlineDb.updateQuizAttemptStatus(payload.attemptId, 'SYNCED');
      } catch (err: any) {
        // If the server rejects permanently (e.g. max attempts reached), mark as FAILED
        if (err?.status && err.status >= 400 && err.status < 500) {
          await offlineDb.updateQuizAttemptStatus(
            payload.attemptId,
            'FAILED',
            err?.message || 'Server rejected attempt',
          );
        }
        throw err;
      }
    },
  });

  // 2. Offline Progress Heartbeats
  syncQueue.register<HeartbeatPayload>('PROGRESS_HEARTBEAT', {
    send: async (payload) => {
      await api.post(endpoints.progress.time(payload.lessonId), {
        seconds: payload.seconds,
      });
    },
    merge: (queued, incoming) => ({
      ...queued,
      seconds: queued.seconds + incoming.seconds,
    }),
  });

  // 3. Offline Lesson Completions
  syncQueue.register<LessonCompletePayload>('LESSON_COMPLETE', {
    send: async (payload) => {
      await api.post(endpoints.progress.complete(payload.lessonId), {
        lastPosition: payload.lastPosition ?? 0,
      });
    },
  });
}

/**
 * Checks SQLite for any un-synced quiz attempts or progress items and enqueues them for flush.
 */
export async function flushOfflineQueue(): Promise<void> {
  registerOfflineSyncHandlers();

  // 1. Sync pending quiz attempts
  const pendingAttempts = await offlineDb.getPendingQuizAttempts();
  for (const attempt of pendingAttempts) {
    try {
      const answers = JSON.parse(attempt.answersJson);
      syncQueue.enqueue<QuizSubmitPayload>(
        'QUIZ_SUBMIT',
        {
          attemptId: attempt.id,
          assessmentId: attempt.assessmentId,
          answers,
        },
        `quiz-${attempt.id}`,
      );
    } catch (e) {
      console.warn(`[offline-sync] Could not parse answers for attempt ${attempt.id}:`, e);
    }
  }

  // 2. Sync queued progress
  const queuedProgress = await offlineDb.getQueuedProgress();
  for (const item of queuedProgress) {
    try {
      const payload = JSON.parse(item.payloadJson);
      if (item.type === 'HEARTBEAT') {
        syncQueue.enqueue<HeartbeatPayload>(
          'PROGRESS_HEARTBEAT',
          {
            courseId: item.courseId,
            lessonId: item.lessonId,
            seconds: payload.seconds ?? 0,
          },
          `heartbeat-${item.courseId}-${item.lessonId}`,
        );
      } else if (item.type === 'COMPLETION') {
        syncQueue.enqueue<LessonCompletePayload>(
          'LESSON_COMPLETE',
          {
            lessonId: item.lessonId,
            lastPosition: payload.lastPosition,
          },
          `complete-${item.lessonId}`,
        );
      }
      await offlineDb.removeProgressItem(item.id);
    } catch (e) {
      console.warn(`[offline-sync] Error processing progress item ${item.id}:`, e);
    }
  }

  // 3. Flush the unified sync queue
  await syncQueue.flush();
}
