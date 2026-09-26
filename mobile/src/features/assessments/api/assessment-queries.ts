import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import { courseKeys, enrollmentKeys } from '@/features/courses/api/course-queries';
import { progressKeys } from '@/features/progress/api/progress-queries';

import type {
  ApiAssessment,
  ApiAttempt,
  GradedResult,
  StartedAttempt,
  SubmitAnswer,
} from '../types/assessment.types';

export const assessmentKeys = {
  detail: (id: string) => ['assessments', 'detail', id] as const,
  attempts: (id: string) => ['assessments', 'attempts', id] as const,
};

export function useAssessment(assessmentId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.detail(assessmentId ?? ''),
    queryFn: () => api.get<ApiAssessment>(endpoints.assessments.detail(assessmentId!)),
    enabled: Boolean(assessmentId),
  });
}

export function useAttempts(assessmentId: string | undefined) {
  return useQuery({
    queryKey: assessmentKeys.attempts(assessmentId ?? ''),
    queryFn: () => api.get<ApiAttempt[]>(endpoints.assessments.attempts(assessmentId!)),
    enabled: Boolean(assessmentId),
  });
}

export function useStartAttempt(assessmentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<StartedAttempt>(endpoints.assessments.start(assessmentId)),
    // Starting may auto-submit an expired pending attempt server-side.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: assessmentKeys.attempts(assessmentId) }),
  });
}

/** Submit, then refresh everything a pass can change (lesson/module/course completion, spec §7.4). */
export function useSubmitAttempt(assessmentId: string, courseId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: SubmitAnswer[]) =>
      api.post<GradedResult>(endpoints.assessments.submit(assessmentId), { answers }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: assessmentKeys.attempts(assessmentId) });
      void queryClient.invalidateQueries({ queryKey: progressKeys.all });
      void queryClient.invalidateQueries({ queryKey: enrollmentKeys.mine });
      if (courseId) void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
      void queryClient.invalidateQueries({ queryKey: ['certificates'] });
    },
  });
}
