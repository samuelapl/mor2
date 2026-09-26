import type { AssessmentType, QuestionType } from '@/core/api/types';

/** Question as served to learners — `correctAnswer` is stripped (spec §7.2). */
export interface ApiQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  points?: number;
  imageUrl?: string | null;
}

export interface ApiAssessment {
  id: string;
  courseId: string;
  moduleId: string | null;
  lessonId: string | null;
  type: AssessmentType;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  questions: ApiQuestion[];
  course: { id: string; titleEn: string; titleAm: string } | null;
  module: { id: string; titleEn: string; titleAm: string } | null;
  lesson: { id: string; titleEn: string; titleAm: string } | null;
  // ⚠️ The payload also embeds every user's `attempts` — never read it; use GET …/attempts.
}

/** POST /assessments/:id/start (spec §7.3). Resumes a pending attempt when one exists. */
export interface StartedAttempt {
  attemptId: string;
  attemptNumber: number;
  startedAt: string;
  timeLimitMinutes?: number | null;
  remainingSeconds?: number;
}

/** MULTIPLE_CHOICE / TRUE_FALSE → option index; SHORT_ANSWER → exact string (spec §7.4). */
export type AnswerValue = number | string;

export interface SubmitAnswer {
  questionId: string;
  selectedOption: AnswerValue;
}

export interface ReviewItem {
  questionId: string;
  type?: QuestionType;
  question?: string;
  options?: string[];
  imageUrl?: string | null;
  selectedOption?: AnswerValue;
  correctAnswer?: AnswerValue;
  isCorrect: boolean;
}

/** POST /assessments/:id/submit (spec §7.4). */
export interface GradedResult {
  attemptId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  correctCount: number;
  totalQuestions: number;
  review: ReviewItem[];
}

/** GET /assessments/:id/attempts (spec §7.5). */
export interface ApiAttempt {
  id: string;
  assessmentId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSeconds: number | null;
  createdAt: string;
}
