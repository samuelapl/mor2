/**
 * Classroom feature — lesson player per content type, lesson body, attachments.
 * Spec §5 · Architecture §6.5.
 */
export { lessonKeys, useLesson } from './api/lesson-queries';
export { ClassroomStage } from './components/ClassroomStage';
export { FileRow } from './components/FileRow';
export { LessonBody } from './components/LessonBody';
export type * from './types/lesson.types';
export { downloadAndOpen } from './utils/open-file';
