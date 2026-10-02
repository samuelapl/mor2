import { api } from './client';

export interface PreparedQuestionBankQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer?: string | number | null;
  points: number;
  category: string;
  courseId: string | null;
}

export type PreparedQuestion = PreparedQuizQuestionItem;

export interface PreparedQuizQuestionItem {
  id: string;
  quizId: string;
  questionId: string;
  addedAt: string;
  order: number;
  question: PreparedQuestionBankQuestion;
}

export interface PreparedQuizGroup {
  /** Set when this is a weighted course quiz planned with the course; it is graded into the course result. */
  assessmentId?: string | null;
  assessment?: { id: string; weight: number; passingScore: number } | null;
  id: string;
  sessionId: string;
  title: string;
  timeLimitMinutes: number;
  order: number;
  createdAt: string;
  updatedAt: string;
  questions: PreparedQuizQuestionItem[];
}

const BASE = (sessionId: string) => `live-sessions/${sessionId}/prepared-quiz`;

/** Get all prepared quiz groups for a session */
export async function fetchPreparedQuizzes(sessionId: string): Promise<PreparedQuizGroup[]> {
  return api<PreparedQuizGroup[]>(BASE(sessionId));
}

/** Create a new prepared quiz group */
export async function createPreparedQuiz(
  sessionId: string,
  dto: { title?: string; timeLimitMinutes?: number },
): Promise<PreparedQuizGroup> {
  return api<PreparedQuizGroup>(BASE(sessionId), {
    method: 'POST',
    body: dto,
  });
}

/** Update quiz group (title, minutes, order) */
export async function updatePreparedQuiz(
  sessionId: string,
  quizId: string,
  dto: { title?: string; timeLimitMinutes?: number; order?: number },
): Promise<PreparedQuizGroup> {
  return api<PreparedQuizGroup>(`${BASE(sessionId)}/${quizId}`, {
    method: 'PATCH',
    body: dto,
  });
}

/** Delete a quiz group and its questions */
export async function deletePreparedQuiz(sessionId: string, quizId: string): Promise<void> {
  await api<void>(`${BASE(sessionId)}/${quizId}`, { method: 'DELETE' });
}

/** Bulk add questions to a specific quiz group */
export async function bulkAddPreparedQuestions(
  sessionId: string,
  quizId: string,
  questionIds: string[],
): Promise<PreparedQuizGroup> {
  return api<PreparedQuizGroup>(`${BASE(sessionId)}/${quizId}/questions/bulk`, {
    method: 'POST',
    body: { questionIds },
  });
}

/** Remove a single question from a quiz group */
export async function removePreparedQuestion(
  sessionId: string,
  quizId: string,
  questionId: string,
): Promise<void> {
  await api<void>(`${BASE(sessionId)}/${quizId}/questions/${questionId}`, {
    method: 'DELETE',
  });
}

/** Reorder questions within a quiz group */
export async function reorderPreparedQuestions(
  sessionId: string,
  quizId: string,
  orderedIds: string[],
): Promise<PreparedQuizGroup> {
  return api<PreparedQuizGroup>(`${BASE(sessionId)}/${quizId}/questions/reorder`, {
    method: 'PATCH',
    body: { orderedIds },
  });
}
