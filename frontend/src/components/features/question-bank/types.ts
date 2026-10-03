export type BankQuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export interface BankQuestion {
  id: string;
  type: BankQuestionType;
  question: string;
  options: string[];
  correctAnswer?: number | string | null;
  points: number;
  courseId: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
  category?: string;
  isReusable?: boolean;
  module?: { id: string; titleEn: string; titleAm: string; order: number } | null;
  lesson?: { id: string; titleEn: string; titleAm: string; order: number } | null;
  subLesson?: { id: string; titleEn: string; titleAm: string; order: number } | null;
}

export type CurriculumNodeType =
  'ALL' | 'GLOBAL' | 'COURSE_GENERAL' | 'MODULE' | 'LESSON' | 'SUB_LESSON';

export interface ActiveCurriculumNode {
  type: CurriculumNodeType;
  id: string | null;
  title: string;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
}

/** A question added to the editor's queue, saved with the rest of the batch. */
export interface StagedQuestion {
  id: string;
  type: BankQuestionType;
  question: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
  category: string;
}

/** Where a question being edited will be placed. */
export type TargetLevel = 'COURSE_GENERAL' | 'MODULE' | 'LESSON' | 'SUB_LESSON' | 'GLOBAL';

export type CourseFilterMode = 'ALL' | 'MY';
export type ScopeFilter = 'ALL' | 'GLOBAL' | 'COURSE';

export const ALL_QUESTIONS_NODE: ActiveCurriculumNode = {
  type: 'ALL',
  id: null,
  title: 'All Course Questions',
};
