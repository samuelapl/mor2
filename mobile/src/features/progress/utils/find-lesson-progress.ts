import type {
  CourseProgress,
  LessonProgress,
  ModuleProgress,
  SubLessonProgress,
} from '../types/progress.types';

export interface LessonProgressLookup {
  /** Top-level lesson or sub-lesson entry. */
  entry: LessonProgress | SubLessonProgress;
  /** Present when `entry` is a top-level lesson. */
  lesson: LessonProgress | null;
  /** The parent lesson when `entry` is a sub-lesson. */
  parent: LessonProgress | null;
  module: ModuleProgress;
}

/** Finds a lesson or sub-lesson inside GET /progress/courses/:id (spec §6.1). */
export function findLessonProgress(
  progress: CourseProgress | undefined,
  lessonId: string,
): LessonProgressLookup | null {
  if (!progress) return null;
  for (const module of progress.modules) {
    for (const lesson of module.lessons) {
      if (lesson.lessonId === lessonId) return { entry: lesson, lesson, parent: null, module };
      const sub = lesson.subLessons.find((s) => s.lessonId === lessonId);
      if (sub) return { entry: sub, lesson: null, parent: lesson, module };
    }
  }
  return null;
}

/** Immutably patches one lesson/sub-lesson entry (used to reflect heartbeat results instantly). */
export function patchLessonProgress(
  progress: CourseProgress,
  lessonId: string,
  patch: Partial<SubLessonProgress>,
): CourseProgress {
  return {
    ...progress,
    modules: progress.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) =>
        lesson.lessonId === lessonId
          ? { ...lesson, ...patch }
          : {
              ...lesson,
              subLessons: lesson.subLessons.map((sub) =>
                sub.lessonId === lessonId ? { ...sub, ...patch } : sub,
              ),
            },
      ),
    })),
  };
}
