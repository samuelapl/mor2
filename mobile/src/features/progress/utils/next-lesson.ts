import type { CourseProgress } from '../types/progress.types';

export interface NextLesson {
  lessonId: string;
  titleEn: string;
  titleAm: string;
}

/**
 * First unlocked, not-yet-completed activity in syllabus order (sub-lessons before their
 * parent is considered). Drives "Continue learning" — never computes locks itself.
 */
export function findNextLesson(progress: CourseProgress | undefined): NextLesson | null {
  if (!progress) return null;
  for (const module of [...progress.modules].sort((a, b) => a.order - b.order)) {
    for (const lesson of [...module.lessons].sort((a, b) => a.order - b.order)) {
      if (lesson.subLessons.length > 0) {
        const sub = [...lesson.subLessons]
          .sort((a, b) => a.order - b.order)
          .find((s) => s.unlocked && !s.completed);
        if (sub) return { lessonId: sub.lessonId, titleEn: sub.titleEn, titleAm: sub.titleAm };
      } else if (lesson.unlocked && !lesson.completed) {
        return { lessonId: lesson.lessonId, titleEn: lesson.titleEn, titleAm: lesson.titleAm };
      }
    }
  }
  return null;
}
