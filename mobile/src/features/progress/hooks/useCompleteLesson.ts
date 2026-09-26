import { useMutation, useQueryClient } from '@tanstack/react-query';

import { courseKeys, enrollmentKeys } from '@/features/courses/api/course-queries';

import { progressApi } from '../api/progress-api';
import { lessonProgressKeys, progressKeys } from '../api/progress-queries';
import { dropQueuedPlayhead } from '../sync/progress-sync';

/**
 * PATCH /progress/lessons/:id/complete { completed: true } (spec §6.3).
 * Online only — the server enforces LOCKED / TIME_NOT_MET / ASSESSMENT_NOT_PASSED.
 */
export function useCompleteLesson(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, lastPosition }: { lessonId: string; lastPosition?: number }) => {
      // A queued offline playhead save (completed:false) must not undo this completion later.
      dropQueuedPlayhead(lessonId);
      return progressApi.complete(lessonId, {
        completed: true,
        ...(lastPosition !== undefined ? { lastPosition: Math.floor(lastPosition) } : {}),
      });
    },
    onSuccess: (_data, { lessonId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: progressKeys.course(courseId) }),
        queryClient.invalidateQueries({ queryKey: lessonProgressKeys.lesson(lessonId) }),
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
        queryClient.invalidateQueries({ queryKey: enrollmentKeys.mine }),
      ]),
  });
}
