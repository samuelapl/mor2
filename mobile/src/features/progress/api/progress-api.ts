import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';

import type { LessonCompletion, LessonTimeResult } from '../types/lesson-progress.types';

/** Max secondsDelta the backend accepts per heartbeat (spec §6.4). */
export const MAX_HEARTBEAT_SECONDS = 300;

export const progressApi = {
  lesson: (lessonId: string) =>
    api.get<LessonCompletion | null>(endpoints.progress.lesson(lessonId)),

  /** `secondsDelta` must be an integer in 1–300. */
  addTime: (lessonId: string, secondsDelta: number) =>
    api.patch<LessonTimeResult>(endpoints.progress.time(lessonId), { secondsDelta }),

  /**
   * ⚠️ `completed` overwrites the stored state (spec §6.3) — callers must pass the lesson's
   * current completion state when only saving the playhead.
   */
  complete: (lessonId: string, body: { completed: boolean; lastPosition?: number }) =>
    api.patch<LessonCompletion>(endpoints.progress.complete(lessonId), body),
};
