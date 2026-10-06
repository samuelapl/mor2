import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { ApiError } from '@/core/api/errors';
import { queryClient } from '@/core/api/query-client';
import { syncQueue } from '@/core/sync/sync-queue';
import { Alert } from '@/core/utils/alert';
import { getCurrentLocale, i18n } from '@/core/i18n';
import type {
  GradedResult,
  StartedAttempt,
  SubmitAnswer,
} from '@/features/assessments/types/assessment.types';
import { MAX_HEARTBEAT_SECONDS, progressApi } from '@/features/progress/api/progress-api';

import { offlineAttemptKeys } from './hooks/useOfflineQuizAttempt';
import { offlineDb } from './offline-db';
import { useOfflineStore } from './offline-store';

interface QuizSubmitPayload {
  attemptId: string;
  assessmentId: string;
  answers: SubmitAnswer[];
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

export const QUIZ_SUBMIT = 'QUIZ_SUBMIT';

let handlersRegistered = false;

/** Refreshes everything a graded attempt can change (attempts, progress, unlocks, certificate). */
function invalidateAfterGrading(assessmentId: string) {
  void queryClient.invalidateQueries({ queryKey: ['assessments', 'attempts', assessmentId] });
  void queryClient.invalidateQueries({ queryKey: ['progress'] });
  void queryClient.invalidateQueries({ queryKey: ['courses', 'detail'] });
  void queryClient.invalidateQueries({ queryKey: ['enrollments'] });
  void queryClient.invalidateQueries({ queryKey: ['certificates'] });
  void queryClient.invalidateQueries({ queryKey: offlineAttemptKeys.all });
}

/**
 * Registers durable queue handlers for offline quiz submissions, lesson completions,
 * and time-spent heartbeats.
 */
export function registerOfflineSyncHandlers(): void {
  if (handlersRegistered) return;
  handlersRegistered = true;

  // 1. Offline quiz attempts. The device cannot grade (answers are never downloaded), so the
  // server does it now: /start runs the same eligibility + attempt-limit checks as online,
  // then /submit grades the answers given offline.
  syncQueue.register<QuizSubmitPayload>(QUIZ_SUBMIT, {
    send: async (payload) => {
      try {
        await api.post<StartedAttempt>(endpoints.assessments.start(payload.assessmentId));
        const result = await api.post<GradedResult>(
          endpoints.assessments.submit(payload.assessmentId),
          { answers: payload.answers },
        );
        await offlineDb.markQuizAttemptSynced(payload.attemptId, {
          score: result.score,
          passed: result.passed,
          resultJson: JSON.stringify(result),
        });
        invalidateAfterGrading(payload.assessmentId);
        Alert.alert(
          i18n.t('quiz.syncedTitle'),
          i18n.t(result.passed ? 'quiz.syncedPassed' : 'quiz.syncedFailed', {
            score: result.score,
          }),
        );
      } catch (err) {
        // Permanent rejection (max attempts, cooldown, not eligible): keep the reason so the
        // learner sees why, and let them try again.
        if (
          err instanceof ApiError &&
          !err.isNetworkError &&
          err.status >= 400 &&
          err.status < 500
        ) {
          await offlineDb.markQuizAttemptFailed(
            payload.attemptId,
            err.localizedMessage(getCurrentLocale()),
          );
          invalidateAfterGrading(payload.assessmentId);
        }
        throw err;
      }
    },
  });

  // 2. Offline time spent (legacy SQLite queue). The backend caps one heartbeat at 300 s.
  syncQueue.register<HeartbeatPayload>('PROGRESS_HEARTBEAT', {
    send: async ({ lessonId, seconds }) => {
      let remaining = Math.floor(seconds);
      while (remaining > 0) {
        const chunk = Math.min(remaining, MAX_HEARTBEAT_SECONDS);
        await progressApi.addTime(lessonId, chunk);
        remaining -= chunk;
      }
    },
    merge: (queued, incoming) => ({
      ...queued,
      seconds: queued.seconds + incoming.seconds,
    }),
  });

  // 3. Offline lesson completions — the server re-checks time and assessment rules.
  syncQueue.register<LessonCompletePayload>('LESSON_COMPLETE', {
    send: async ({ lessonId, lastPosition }) => {
      await progressApi.complete(lessonId, { completed: true, lastPosition: lastPosition ?? 0 });
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
    },
  });
}

/** Queues an offline quiz attempt for grading. Safe to call repeatedly for the same attempt. */
export function enqueueQuizAttempt(payload: QuizSubmitPayload): void {
  registerOfflineSyncHandlers();
  syncQueue.enqueue<QuizSubmitPayload>(QUIZ_SUBMIT, payload, `quiz-${payload.attemptId}`);
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
      enqueueQuizAttempt({
        attemptId: attempt.id,
        assessmentId: attempt.assessmentId,
        answers: JSON.parse(attempt.answersJson),
      });
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
  const setSyncing = useOfflineStore.getState().setSyncing;
  setSyncing(true);
  try {
    await syncQueue.flush();
  } finally {
    setSyncing(false);
  }
}

/**
 * Sync pending offline progress and quiz attempts with the server.
 * Returns counts for user-facing feedback in the Downloads screen.
 */
export async function syncOfflineProgress(): Promise<{
  syncedProgress: number;
  syncedQuizzes: number;
}> {
  const [pendingAttempts, queuedProgress] = await Promise.all([
    offlineDb.getPendingQuizAttempts(),
    offlineDb.getQueuedProgress(),
  ]);
  await flushOfflineQueue();
  return {
    syncedProgress: queuedProgress.length,
    syncedQuizzes: pendingAttempts.length,
  };
}
