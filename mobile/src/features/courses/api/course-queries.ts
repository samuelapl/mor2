import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { Paginated } from '@/core/api/types';

import type {
  ApiCourse,
  ApiCourseDetail,
  ApiCourseSession,
  ApiEnrollment,
  CatalogParams,
} from '../types/course.types';

export const courseKeys = {
  all: ['courses'] as const,
  catalog: (params: CatalogParams) => ['courses', 'catalog', params] as const,
  detail: (courseId: string) => ['courses', 'detail', courseId] as const,
  sessions: (courseId: string) => ['courses', 'sessions', courseId] as const,
};

export const enrollmentKeys = {
  mine: ['enrollments', 'me'] as const,
};

const CATALOG_PAGE_SIZE = 20;

/** GET /courses — learners only ever receive PUBLISHED courses (spec §3.1). */
export function useCatalogCourses(params: CatalogParams) {
  return useInfiniteQuery({
    queryKey: courseKeys.catalog(params),
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      api.get<Paginated<ApiCourse>>(endpoints.courses.list, {
        signal,
        params: {
          page: pageParam,
          limit: params.limit ?? CATALOG_PAGE_SIZE,
          status: 'PUBLISHED',
          ...(params.search ? { search: params.search } : {}),
        },
      }),
    getNextPageParam: (last) => (last.meta.hasNextPage ? last.meta.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

/** GET /courses/:id — structure + per-lesson `unlocked` (spec §3.2). */
export function useCourse(courseId: string | undefined) {
  return useQuery({
    queryKey: courseKeys.detail(courseId ?? ''),
    queryFn: () => api.get<ApiCourseDetail>(endpoints.courses.detail(courseId!)),
    enabled: Boolean(courseId),
  });
}

/**
 * GET /enrollments/me — the backend ignores `status`, so fetch everything and filter on the
 * client (spec §4.1). 100 is the server's maximum page size.
 */
export function useMyEnrollments() {
  return useQuery({
    queryKey: enrollmentKeys.mine,
    queryFn: async () =>
      (
        await api.get<Paginated<ApiEnrollment>>(endpoints.enrollments.mine, {
          // Default order is createdAt desc (newest enrollment first); enrolledAt isn't a sortable field.
          params: { page: 1, limit: 100 },
        })
      ).data,
  });
}

/** Enrollment for one course, if any (needed for the enrollment id when dropping). */
export function useEnrollmentForCourse(courseId: string | undefined) {
  const query = useMyEnrollments();
  return { ...query, data: query.data?.find((e) => e.courseId === courseId) };
}

/**
 * In-person sessions a learner can book before enrolling (spec §4.2, §8.2).
 * Only future, SCHEDULED sessions with a venue are returned to the picker.
 */
export function useBookableSessions(courseId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: courseKeys.sessions(courseId ?? ''),
    enabled: Boolean(courseId) && enabled,
    queryFn: async () => {
      const res = await api.get<Paginated<ApiCourseSession>>(endpoints.liveSessions.list, {
        params: {
          courseId,
          status: 'SCHEDULED',
          limit: 50,
          sortBy: 'scheduledAt',
          sortOrder: 'asc',
        },
      });
      const now = Date.now();
      return res.data.filter(
        (s) =>
          (s.sessionType === 'IN_PERSON' || s.venueId) &&
          s.status === 'SCHEDULED' &&
          new Date(s.scheduledAt).getTime() > now,
      );
    },
  });
}
