import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { progressKeys } from '@/features/progress';

import type { ApiEnrollment, SelfEnrollBody } from '../types/course.types';
import { courseKeys, enrollmentKeys } from './course-queries';

function useInvalidateCourse() {
  const queryClient = useQueryClient();
  return (courseId: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
      queryClient.invalidateQueries({ queryKey: courseKeys.sessions(courseId) }),
      queryClient.invalidateQueries({ queryKey: enrollmentKeys.mine }),
      queryClient.invalidateQueries({ queryKey: progressKeys.course(courseId) }),
    ]);
}

/** POST /enrollments/self (spec §4.2). */
export function useSelfEnroll() {
  const invalidate = useInvalidateCourse();
  return useMutation({
    mutationFn: (body: SelfEnrollBody) => api.post<ApiEnrollment>(endpoints.enrollments.self, body),
    onSuccess: (_data, body) => invalidate(body.courseId),
  });
}

/** PATCH /enrollments/:id/drop (spec §4.3). */
export function useDropEnrollment() {
  const invalidate = useInvalidateCourse();
  return useMutation({
    mutationFn: ({
      enrollmentId,
      reason,
    }: {
      enrollmentId: string;
      courseId: string;
      reason?: string;
    }) =>
      api.patch<ApiEnrollment>(endpoints.enrollments.drop(enrollmentId), reason ? { reason } : {}),
    onSuccess: (_data, vars) => invalidate(vars.courseId),
  });
}
