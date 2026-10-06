import { useEffect, useState } from 'react';

import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useCourse } from '@/features/courses/api/course-queries';
import type { ApiCourseDetail } from '@/features/courses/types/course.types';

import { downloadManager } from '../download-manager';

/** Course detail from the API (or its persisted cache), falling back to the downloaded copy. */
export function useCourseWithOffline(courseId: string | undefined) {
  const course = useCourse(courseId);
  const online = useIsOnline();
  const [offlineData, setOfflineData] = useState<ApiCourseDetail | null>(null);

  useEffect(() => {
    if (!courseId || (course.data && online)) return;
    void downloadManager.getOfflineCourseDetail(courseId).then(setOfflineData);
  }, [course.data, online, courseId]);

  return { course, data: course.data ?? offlineData };
}
