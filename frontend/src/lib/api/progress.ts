import { api } from "./client";
import type { ApiCourseProgress, ApiLearnerProgress } from "./types";

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
  return api<unknown>(`progress/lessons/${lessonId}/complete`, { method: "PATCH", body });
}

export async function fetchLessonProgress(lessonId: string): Promise<unknown> {
  return api<unknown>(`progress/lessons/${lessonId}`);
}