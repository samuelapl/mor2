import { syncQueue } from '@/core/sync/sync-queue';

import { liveSessionApi } from '../api/live-session-api';

/**
 * Live-quiz answers are graded from what reaches POST live-sessions/:id/quiz-response, so they go
 * through the durable queue: a network blip in the room must not lose an answer. One item per
 * question; a newer answer to the same question replaces a queued one (the server keeps the latest).
 */
export const LIVE_QUIZ_RESPONSE = 'liveQuizResponse';

export interface LiveQuizResponsePayload {
  sessionId: string;
  questionId: string;
  selectedOptionIds: string[];
  responseDurationSeconds: number;
  questionTitle?: string;
  options?: string[];
  correctAnswer?: string;
}

let registered = false;

export function registerLiveQuizSync(): void {
  if (registered) return;
  registered = true;
  syncQueue.register<LiveQuizResponsePayload>(LIVE_QUIZ_RESPONSE, {
    send: ({ sessionId, ...dto }) =>
      liveSessionApi.submitQuizResponse(sessionId, dto).then(() => undefined),
  });
}

export function enqueueLiveQuizResponse(payload: LiveQuizResponsePayload): void {
  registerLiveQuizSync();
  syncQueue.enqueue(LIVE_QUIZ_RESPONSE, payload, `${payload.sessionId}:${payload.questionId}`);
  void syncQueue.flush();
}
