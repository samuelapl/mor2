import { api } from "./client";
import type {
  ApiAssessment,
  ApiAssessmentAttempt,
  ApiAssessmentListing,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Assessments (Quiz)                                                         */
/* -------------------------------------------------------------------------- */

export interface AssessmentQuestionInput {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE";
  question: string;
  options: string[];
  correctAnswer?: number;
  points: number;
}

export interface SaveAssessmentBody {
  titleEn: string;
  titleAm?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  passingScore: number;
  maxAttempts?: number;
  timeLimitMinutes?: number | null;
  shuffleQuestions?: boolean;
  questions: AssessmentQuestionInput[];
}

export interface StartedAttempt {
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
}

export interface SubmitAnswer {
  questionId: string;
  selectedOption: number;
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
}

/**
 * Fetches the list of assessments for a course. Learner responses have the
 * correct answers stripped by the backend.
 */
export async function fetchCourseAssessments(
  courseId: string,
): Promise<ApiAssessmentListing[]> {
  return api<ApiAssessmentListing[]>(`courses/${courseId}/assessments`);
}

/** Fetches a single assessment. Learners get questions without correctAnswer. */
export async function fetchAssessment(id: string): Promise<ApiAssessment> {
  return api<ApiAssessment>(`assessments/${id}`);
}

/** Staff-only: fetch an assessment including correct answers. */
export async function fetchAssessmentWithAnswers(id: string): Promise<ApiAssessment> {
  return api<ApiAssessment>(`assessments/${id}`, { query: { includeAnswers: "true" } });
}

export async function createCourseAssessment(
  courseId: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`courses/${courseId}/assessments`, { method: "POST", body });
}

/** Replaces the final assessment of a draft / rejected course. */
export async function replaceAssessment(
  courseId: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`courses/${courseId}/assessment`, { method: "PUT", body });
}

export async function updateAssessment(
  id: string,
  body: SaveAssessmentBody,
): Promise<ApiAssessment> {
  return api<ApiAssessment>(`assessments/${id}`, { method: "PATCH", body });
}

export async function startAttempt(assessmentId: string): Promise<StartedAttempt> {
  return api<StartedAttempt>(`assessments/${assessmentId}/start`, { method: "POST" });
}

export async function submitAttempt(
  assessmentId: string,
  answers: SubmitAnswer[],
): Promise<GradedResult> {
  return api<GradedResult>(`assessments/${assessmentId}/submit`, {
    method: "POST",
    body: { answers },
  });
}

export async function fetchAttempts(assessmentId: string): Promise<ApiAssessmentAttempt[]> {
  return api<ApiAssessmentAttempt[]>(`assessments/${assessmentId}/attempts`);
}