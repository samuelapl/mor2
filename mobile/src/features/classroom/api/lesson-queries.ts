import { useQuery } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';

import type { ApiLesson } from '../types/lesson.types';

export const lessonKeys = {
  detail: (lessonId: string) => ['lessons', 'detail', lessonId] as const,
};

/** GET /lessons/:id — 403 when not enrolled or still locked (spec §5.1). */
export function useLesson(lessonId: string | undefined) {
  return useQuery({
    queryKey: lessonKeys.detail(lessonId ?? ''),
    queryFn: () => api.get<ApiLesson>(endpoints.lessons.detail(lessonId!)),
    enabled: Boolean(lessonId),
  });
}
