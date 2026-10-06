import { useQuery } from '@tanstack/react-query';

import { offlineDb } from '../offline-db';

export const offlineAttemptKeys = {
  all: ['offline-attempt'] as const,
  latest: (assessmentId: string) => ['offline-attempt', assessmentId] as const,
};

/** Latest attempt taken offline for an assessment: waiting to sync, graded, or rejected. */
export function useOfflineQuizAttempt(assessmentId: string | undefined) {
  return useQuery({
    queryKey: offlineAttemptKeys.latest(assessmentId ?? ''),
    queryFn: () => offlineDb.getLatestQuizAttempt(assessmentId!),
    enabled: Boolean(assessmentId),
    networkMode: 'always',
    staleTime: 0,
  });
}
