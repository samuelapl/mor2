import type { Question, UploadedResource } from "@/types";

export type WizardContentType =
  | "DOCUMENT"
  | "VIDEO"
  | "AUDIO"
  | "PRESENTATION"
  | "INTERACTIVE"
  | "EXTERNAL_LINK"
  | "ASSIGNMENT"
  | "QUIZ"
  | "ASSESSMENT";

export interface LessonDraft {
  id: string;
  title: string;
  content: string;
  durationMin: number;
  contentType: WizardContentType;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  uploading?: boolean;
  uploadError?: string | null;
  subLessons?: LessonDraft[];
  required?: boolean;
  /** Assignment-specific fields */
  assignmentInstructions?: string;
  assignmentMaxMarks?: number;
  assignmentDueDate?: string;
  assignmentFileTypes?: string[];
  assignmentMaxFileSizeMb?: number;
  /** Quiz / Assessment specific fields */
  quizQuestions?: Question[];
  quizPassMark?: number;
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
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

export const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

let uidCounter = 0;
export const uid = (prefix = "id") => `${prefix}-${Date.now()}-${++uidCounter}`;

