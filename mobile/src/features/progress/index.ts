/**
 * Progress feature — course progress, time heartbeat, playhead, completion gating.
 * Spec §6 · Architecture §6.3, §6.6.
 */
export { MAX_HEARTBEAT_SECONDS, progressApi } from './api/progress-api';
export {
  fetchCourseProgress,
  lessonProgressKeys,
  progressKeys,
  useCourseProgress,
  useCoursesProgress,
  useLessonCompletion,
} from './api/progress-queries';
export { useCompleteLesson } from './hooks/useCompleteLesson';
export { useLessonHeartbeat } from './hooks/useLessonHeartbeat';
export { usePlayhead } from './hooks/usePlayhead';
export { registerProgressSync } from './sync/progress-sync';
export type * from './types/lesson-progress.types';
export type * from './types/progress.types';
export {
  findLessonProgress,
  patchLessonProgress,
  type LessonProgressLookup,
} from './utils/find-lesson-progress';
export { findNextLesson, type NextLesson } from './utils/next-lesson';
