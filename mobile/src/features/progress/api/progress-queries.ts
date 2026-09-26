import { useQueries, useQuery } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';

import type { CourseProgress } from '../types/progress.types';
import { progressApi } from './progress-api';

export const progressKeys = {
  all: ['progress'] as const,
  course: (courseId: string) => ['progress', 'course', courseId] as const,
};

export const lessonProgressKeys = {
  lesson: (lessonId: string) => ['progress', 'lesson', lessonId] as const,
};

/** GET /progress/lessons/:id — source of `lastPosition` for sub-lessons too (spec §6.2). */
export function useLessonCompletion(lessonId: string | undefined) {
  return useQuery({
    queryKey: lessonProgressKeys.lesson(lessonId ?? ''),
    queryFn: () => progressApi.lesson(lessonId!),
    enabled: Boolean(lessonId),
  });
}

export const fetchCourseProgress = (courseId: string) =>
  api.get<CourseProgress>(endpoints.progress.course(courseId));

export function useCourseProgress(courseId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: progressKeys.course(courseId ?? ''),
    queryFn: () => fetchCourseProgress(courseId!),
    enabled: Boolean(courseId) && enabled,
  });
}

/** Progress for several courses at once (My Courses, Home). Keyed by courseId. */
export function useCoursesProgress(courseIds: string[]) {
  return useQueries({
    queries: courseIds.map((courseId) => ({
      queryKey: progressKeys.course(courseId),
      queryFn: () => fetchCourseProgress(courseId),
    })),
    combine: (results) => {
      const byCourse: Record<string, CourseProgress | undefined> = {};
      results.forEach((result, index) => {
        byCourse[courseIds[index]!] = result.data;
      });
      return byCourse;
    },
  });
}
