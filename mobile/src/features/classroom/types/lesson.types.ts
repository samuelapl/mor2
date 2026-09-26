import type { LessonContentType } from '@/core/api/types';
import type { ApiAttachment } from '@/features/courses';

/** GET /lessons/:lessonId (spec §5.1). */
export interface ApiLessonSubLesson {
  id: string;
  moduleId: string;
  parentId: string | null;
  order: number;
  titleEn: string;
  titleAm: string;
  contentType: LessonContentType;
  durationMinutes: number | null;
  contentEn: string | null;
  contentAm: string | null;
  resourceUrl: string | null;
  attachments: ApiAttachment[];
}

export interface ApiLesson extends ApiLessonSubLesson {
  parent: ApiLessonSubLesson | null;
  subLessons: ApiLessonSubLesson[];
  module: { id: string; courseId: string; order: number };
}
