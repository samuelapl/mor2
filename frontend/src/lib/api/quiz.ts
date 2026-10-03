import { api } from './client';
import type {
  ApiAssessment,
  ApiAssessmentAttempt,
  ApiAssessmentListing,
  AssessmentReviewItem,
} from './types';

/* -------------------------------------------------------------------------- */
/*  Assessments (Quiz)                                                         */
/* -------------------------------------------------------------------------- */

export interface AssessmentQuestionInput {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer?: number | string;
  category?: string;
  points?: number;
}

export interface SaveAssessmentBody {
  titleEn: string;
  titleAm?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  /** Omit to use the global policy pass mark. */
  passingScore?: number;
  weight?: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  shuffleQuestions?: boolean;
  questions: AssessmentQuestionInput[];
}

export interface StartedAttempt {
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
  timeLimitMinutes?: number | null;
  remainingSeconds?: number;
}

export interface SubmitAnswer {
  questionId: string;
  selectedOption: number | string;
}

export interface GradedResult {
  attemptId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  submittedAt: string;
  timeSpentSeconds: number;
  review: AssessmentReviewItem[];
}

/**
 * Fetches the list of assessments for a course. Learner responses have the
 * correct answers stripped by the backend.
 */
export async function fetchCourseAssessments(courseId: string): Promise<ApiAssessmentListing[]> {
  return api<ApiAssessmentListing[]>(`courses/${courseId}/assessments`);
}

/** Fetches the module assessment (knowledge check) for a module, if any. */
export async function fetchModuleAssessments(moduleId: string): Promise<ApiAssessmentListing[]> {
  return api<ApiAssessmentListing[]>(`modules/${moduleId}/assessments`);
}

/** Fetches the lesson / sub-lesson assessment for a lesson, if any. */
export async function fetchLessonAssessments(lessonId: string): Promise<ApiAssessmentListing[]> {
  return api<ApiAssessmentListing[]>(`lessons/${lessonId}/assessments`);
}

/** Fetches a single assessment. Learners get questions without correctAnswer. */
export async function fetchAssessment(id: string): Promise<ApiAssessment> {
  return api<ApiAssessment>(`assessments/${id}`);
}

/** Staff-only: fetch an assessment including correct answers. */
export async function fetchAssessmentWithAnswers(id: string): Promise<ApiAssessment> {
  return api<ApiAssessment>(`assessments/${id}`, { query: { includeAnswers: 'true' } });
}

export async function createCourseAssessment(
  courseId: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`courses/${courseId}/assessments`, { method: 'POST', body });
}

export async function createModuleAssessment(
  courseId: string,
  moduleId: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`courses/${courseId}/modules/${moduleId}/assessments`, { method: 'POST', body });
}

export async function createLessonAssessment(
  courseId: string,
  moduleId: string,
  lessonId: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assessments`, { method: 'POST', body });
}

/** Replaces the final assessment of a draft / rejected course. */
export async function replaceAssessment(
  courseId: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`courses/${courseId}/assessment`, { method: 'PUT', body });
}

export async function updateAssessment(
  id: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`assessments/${id}`, { method: 'PATCH', body });
}

export async function startAttempt(assessmentId: string): Promise<StartedAttempt> {
  return api<StartedAttempt>(`assessments/${assessmentId}/start`, { method: 'POST' });
}

export async function submitAttempt(
  assessmentId: string,
  answers: SubmitAnswer[],
): Promise<GradedResult> {
  return api<GradedResult>(`assessments/${assessmentId}/submit`, {
    method: 'POST',
    body: { answers },
  });
}

export async function fetchAttempts(assessmentId: string): Promise<ApiAssessmentAttempt[]> {
  return api<ApiAssessmentAttempt[]>(`assessments/${assessmentId}/attempts`);
}

/* -------------------------------------------------------------------------- */
/*  Question Bank API                                                         */
/* -------------------------------------------------------------------------- */

export interface ApiQuestionBankQuestion {
  id: string;
  courseId: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
  category: string;
  explanation?: string | null;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    titleEn: string;
    titleAm: string;
    code: string;
  } | null;
  module?: {
    id: string;
    titleEn: string;
    titleAm: string;
    order: number;
  } | null;
  lesson?: {
    id: string;
    titleEn: string;
    titleAm: string;
    order: number;
  } | null;
  subLesson?: {
    id: string;
    titleEn: string;
    titleAm: string;
    order: number;
  } | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CreateBankQuestionInput {
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer?: string | null;
  points?: number;
  category?: string;
  explanation?: string | null;
  /** Save even when similar questions exist. Identical questions are always rejected. */
  acknowledgeSimilar?: boolean;
}

export interface UpdateBankQuestionInput {
  courseId?: string | null;
  moduleId?: string | null;
  lessonId?: string | null;
  subLessonId?: string | null;
  type?: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question?: string;
  options?: string[];
  correctAnswer?: string | null;
  points?: number;
  category?: string;
  explanation?: string | null;
  /** Save even when similar questions exist. Identical questions are always rejected. */
  acknowledgeSimilar?: boolean;
}

export interface QueryBankQuestionsParams {
  courseId?: string;
  moduleId?: string;
  lessonId?: string;
  subLessonId?: string;
  includeGlobal?: boolean;
  globalOnly?: boolean;
  type?: string;
  category?: string;
  search?: string;
}

export async function fetchQuestionBank(
  params?: QueryBankQuestionsParams,
): Promise<ApiQuestionBankQuestion[]> {
  const query: Record<string, string> = {};
  if (params?.courseId) query.courseId = params.courseId;
  if (params?.moduleId) query.moduleId = params.moduleId;
  if (params?.lessonId) query.lessonId = params.lessonId;
  if (params?.subLessonId) query.subLessonId = params.subLessonId;
  if (params?.includeGlobal !== undefined) query.includeGlobal = String(params.includeGlobal);
  if (params?.globalOnly !== undefined) query.globalOnly = String(params.globalOnly);
  if (params?.type && params.type !== 'ALL') query.type = params.type;
  if (params?.category) query.category = params.category;
  if (params?.search) query.search = params.search;

  return api<ApiQuestionBankQuestion[]>('question-bank', { query });
}

export async function fetchQuestionBankItem(id: string): Promise<ApiQuestionBankQuestion> {
  return api<ApiQuestionBankQuestion>(`question-bank/${id}`);
}

export async function createQuestionBankItem(
  body: CreateBankQuestionInput,
): Promise<ApiQuestionBankQuestion> {
  return api<ApiQuestionBankQuestion>('question-bank', { method: 'POST', body });
}

export async function updateQuestionBankItem(
  id: string,
  body: UpdateBankQuestionInput,
): Promise<ApiQuestionBankQuestion> {
  return api<ApiQuestionBankQuestion>(`question-bank/${id}`, { method: 'PATCH', body });
}

export async function deleteQuestionBankItem(id: string): Promise<void> {
  return api<void>(`question-bank/${id}`, { method: 'DELETE' });
}

export async function bulkCreateQuestionBankItems(
  questions: CreateBankQuestionInput[],
): Promise<ApiQuestionBankQuestion[]> {
  return api<ApiQuestionBankQuestion[]>('question-bank/bulk', {
    method: 'POST',
    body: { questions },
  });
}

export type DuplicateSeverity = 'EXACT' | 'LIKELY' | 'SIMILAR';

/** An existing bank question that is identical or similar to a draft. */
export interface SimilarQuestionMatch {
  id: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  /** Text similarity, 0–1. */
  score: number;
  severity: DuplicateSeverity;
  level: 'GLOBAL' | 'COURSE' | 'MODULE' | 'LESSON' | 'SUB_LESSON';
  location: {
    courseTitle: string | null;
    moduleTitle: string | null;
    lessonTitle: string | null;
    subLessonTitle: string | null;
  };
}

/** A bulk-create row the server rejected (409 `QUESTION_BATCH_DUPLICATES`). */
export interface BatchDuplicateIssue {
  index: number;
  /** EXACT: never saved. SIMILAR: saved once acknowledged. */
  reason: 'EXACT' | 'SIMILAR';
  matches: SimilarQuestionMatch[];
  /** Earlier rows of the same batch this row duplicates. */
  batchMatches: { index: number; score: number; severity: DuplicateSeverity }[];
}

export interface CheckBankDuplicatesInput {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  courseId?: string | null;
  excludeId?: string;
}

/** Existing questions in the course (any level) or the reusable bank similar to a draft. */
export async function checkQuestionBankDuplicates(
  body: CheckBankDuplicatesInput,
): Promise<{ matches: SimilarQuestionMatch[] }> {
  return api<{ matches: SimilarQuestionMatch[] }>('question-bank/check-duplicates', {
    method: 'POST',
    body,
  });
}
