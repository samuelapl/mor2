import type { Course, Lesson, Module, UploadedResource } from '@/types';
import type {
  ApiAttachedAssessment,
  ApiCourseProgress,
  ApiProgressLesson,
  ApiProgressModule,
  ApiProgressSubLesson,
} from '@/lib/api/types';

export type ClassroomItemType =
  'COURSE_OVERVIEW' | 'MODULE_OVERVIEW' | 'LESSON' | 'SUB_LESSON' | 'QUIZ' | 'CERTIFICATE';

export type ClassroomQuizKind = 'LESSON_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'FINAL_ASSESSMENT';

export interface ClassroomSelection {
  type: ClassroomItemType;
  moduleId: string;
  lessonId?: string;
  subLessonId?: string;
  quizId?: string;
  quizKind?: ClassroomQuizKind;
}

export interface ClassroomFlatItem {
  key: string;
  type: ClassroomItemType;
  title: string;
  moduleId: string;
  moduleIndex: number;
  lessonId?: string;
  lessonIndex?: number;
  subLessonId?: string;
  subIndex?: number;
  quizId?: string;
  quizKind?: ClassroomQuizKind;
  unlocked: boolean;
  completed: boolean;
  durationMin?: number;
  contentType?: string;
  assessment?: ApiAttachedAssessment | null;
  isInPersonLocked?: boolean;
}

export interface ClassroomActiveContent {
  item: ClassroomFlatItem;
  course?: Course;
  module?: Module;
  lesson?: Lesson;
  subLesson?: Lesson;
  moduleProgress?: ApiProgressModule;
  lessonProgress?: ApiProgressLesson;
  subLessonProgress?: ApiProgressSubLesson;
  assessment?: ApiAttachedAssessment | null;
}
