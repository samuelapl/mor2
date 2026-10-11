import type { Question, UploadedResource } from '@/types';

export type WizardContentType =
  | 'DOCUMENT'
  | 'VIDEO'
  | 'AUDIO'
  | 'PRESENTATION'
  | 'INTERACTIVE'
  | 'EXTERNAL_LINK'
  | 'ASSIGNMENT'
  | 'QUIZ'
  | 'ASSESSMENT';

export interface LessonDraft {
  id: string;
  title: string;
  content: string;
  durationMin: number;
  contentType: WizardContentType;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  videoResourceUrl?: string;
  videoFileName?: string;
  videoFileSize?: number;
  slideResourceUrl?: string;
  slideFileName?: string;
  slideFileSize?: number;
  audioResourceUrl?: string;
  audioFileName?: string;
  audioFileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  uploading?: boolean;
  uploadError?: string | null;
  subLessons?: LessonDraft[];
  required?: boolean;
  contentBlocks?: import('@/lib/course-draft-blocks').LessonContentBlock[];
  /** Assignment-specific fields */
  assignmentInstructions?: string;
  assignmentMaxMarks?: number;
  assignmentDueDate?: string;
  assignmentFileTypes?: string[];
  assignmentMaxFileSizeMb?: number;
  /** Quiz / Assessment specific fields */
  quizQuestions?: Question[];
  quizPassMark?: number;
  quizWeight?: number;
  quizTimeLimitMinutes?: number | null;
  quizAttemptsAllowed?: number;
  quizShuffle?: boolean;
  assessmentAllowEarlySubmit?: boolean;
  assessmentAutoSubmitOnExpire?: boolean;
}

export interface ModuleDraft {
  id: string;
  title: string;
  description?: string;
  objectives?: string;
  durationMinutes?: number;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  uploading?: boolean;
  uploadError?: string | null;
  lessons: LessonDraft[];
}

export const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-xs outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

export const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

let uidCounter = 0;
export const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${++uidCounter}`;
