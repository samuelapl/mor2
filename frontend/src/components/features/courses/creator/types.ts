import type { CourseDeliveryMode, CourseLevel, Question, UploadedResource } from '@/types';
import type { LessonDraft, ModuleDraft, WizardContentType } from '../wizard-types';

export type CreatorPhase =
  | 'COURSE_DETAILS'
  | 'CURRICULUM'
  | 'FINAL_ASSESSMENT'
  | 'REVIEW_SUBMIT';

export type CreatorNodeType =
  | 'COURSE_DETAILS'
  | 'MODULE'
  | 'LESSON'
  | 'SUB_LESSON'
  | 'MODULE_ASSESSMENT'
  | 'LESSON_ASSESSMENT'
  | 'FINAL_ASSESSMENT'
  | 'REVIEW_SUBMIT';

export interface CreatorActiveNode {
  type: CreatorNodeType;
  moduleId?: string;
  lessonId?: string;
  subLessonId?: string;
}

export interface CreatorDraftState {
  title: string;
  titleAm: string;
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
