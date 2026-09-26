/**
 * Courses feature — catalog, course detail, syllabus with lock state, enrollment.
 * Spec §3, §4, §8.2 · Architecture §6.3–§6.4.
 */
export {
  courseKeys,
  enrollmentKeys,
  useBookableSessions,
  useCatalogCourses,
  useCourse,
  useEnrollmentForCourse,
  useMyEnrollments,
} from './api/course-queries';
export { useDropEnrollment, useSelfEnroll } from './api/course-mutations';
export { ContentTypeIcon } from './components/ContentTypeIcon';
export { CourseCard } from './components/CourseCard';
export { CourseSyllabus } from './components/CourseSyllabus';
export { CourseThumbnail } from './components/CourseThumbnail';
export { LevelFilter } from './components/LevelFilter';
export type * from './types/course.types';
