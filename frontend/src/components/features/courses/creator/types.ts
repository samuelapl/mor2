import type { CourseDeliveryMode, CourseLevel, Question, UploadedResource } from '@/types';
import type { LessonDraft, ModuleDraft, WizardContentType } from '../wizard-types';

export type CreatorPhase =
  | 'COURSE_DETAILS'
  | 'CURRICULUM'
  | 'FINAL_ASSESSMENT'
  | 'REVIEW_SUBMIT';

/** pending = unsaved edits waiting on the debounce (or on a title/code). */
export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export type CreatorNodeType =
  | 'COURSE_DETAILS'
  | 'MODULE'
  | 'LESSON'
  | 'SUB_LESSON'
  | 'MODULE_ASSESSMENT'
  | 'LESSON_ASSESSMENT'
  | 'FINAL_ASSESSMENT'
  | 'SESSION_PLAN'
  | 'REVIEW_SUBMIT';

export interface CreatorActiveNode {
  type: CreatorNodeType;
  moduleId?: string;
  lessonId?: string;
  subLessonId?: string;
  sessionPlanId?: string;
}

/** A weighted quiz planned for an online session; its questions are prepared after approval. */
export interface SessionQuizDraft {
  id: string;
  titleEn: string;
  weight: number;
  passingScore: number;
  timeLimitMinutes: number;
}

/** A placeholder online session the owner plans while preparing the course. */
export interface SessionPlanDraft {
  id: string;
  titleEn: string;
  descriptionEn: string;
  objectivesEn: string;
  quizzes: SessionQuizDraft[];
}

export interface CreatorDraftState {
  title: string;
  code: string;
  category: string;
  level: CourseLevel;
  deliveryMode: CourseDeliveryMode;
  description: string;
  objectives: string;
  department: string;
  targetAudience: string;
  deliveryMethod: string;
  language: string;
  prerequisites: string;
  coverFile: File | null;
  coverPreview: string | null;
  modules: ModuleDraft[];
  quizTitle: string;
  passMark: number;
  finalAssessmentWeight: number;
  timeLimitMinutes: number | null;
  attemptsAllowed: number;
  questions: Question[];
  assessmentFileUrl?: string;
  assessmentFileName?: string;
  assessmentFileSize?: number;
  assessmentResources?: UploadedResource[];
}
