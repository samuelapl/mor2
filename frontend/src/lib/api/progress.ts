import { api } from './client';
import type { ApiCourseProgress, ApiLearnerProgress } from './types';

/* -------------------------------------------------------------------------- */
/*  Progress                                                                   */
/* -------------------------------------------------------------------------- */

export async function fetchCourseProgress(courseId: string): Promise<ApiCourseProgress> {
  return api<ApiCourseProgress>(`progress/courses/${courseId}`);
}

export async function fetchCourseLearnersProgress(
  courseId: string,
): Promise<{ courseId: string; totalLessons: number; learners: ApiLearnerProgress[] }> {
  return api<{ courseId: string; totalLessons: number; learners: ApiLearnerProgress[] }>(
    `progress/courses/${courseId}/learners`,
  );
}

export async function markLessonComplete(
  lessonId: string,
  body: { completed: boolean; lastPosition?: number },
): Promise<unknown> {
  return api<unknown>(`progress/lessons/${lessonId}/complete`, { method: 'PATCH', body });
}

export interface LessonTimeResult {
  lessonId: string;
  timeSpentSeconds: number;
  requiredSeconds: number;
  satisfied: boolean;
}

export async function addLessonTime(
  lessonId: string,
  secondsDelta: number,
): Promise<LessonTimeResult> {
  return api<LessonTimeResult>(`progress/lessons/${lessonId}/time`, {
    method: 'PATCH',
    body: { secondsDelta },
  });
}

export async function fetchLessonProgress(lessonId: string): Promise<unknown> {
  return api<unknown>(`progress/lessons/${lessonId}`);
}
