import { api } from './client';

// ─── Types ────────────────────────────────────────────────────────────────────

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

export interface PreparedQuestion {
  id: string;
  sessionId: string;
  questionId: string;
  addedAt: string;
  order: number;
  question: PreparedQuestionBankQuestion;
}

// ─── API functions ─────────────────────────────────────────────────────────────

const BASE = (sessionId: string) => `live-sessions/${sessionId}/prepared-quiz`;

/** Get all prepared quiz questions for a session (Redis-cached on the backend). */
export async function fetchPreparedQuiz(sessionId: string): Promise<PreparedQuestion[]> {
  return api<PreparedQuestion[]>(BASE(sessionId));
}

/** Add a single question from the bank to the session's prepared quiz. */
export async function addPreparedQuestion(
  sessionId: string,
  questionId: string,
  order?: number,
): Promise<PreparedQuestion> {
  return api<PreparedQuestion>(BASE(sessionId), {
    method: 'POST',
    body: { questionId, order },
  });
}

/** Bulk-import multiple questions from the bank into the prepared quiz. */
export async function bulkAddPreparedQuestions(
  sessionId: string,
  questionIds: string[],
): Promise<PreparedQuestion[]> {
  return api<PreparedQuestion[]>(`${BASE(sessionId)}/bulk`, {
    method: 'POST',
    body: { questionIds },
  });
}

/** Remove a single question from the prepared quiz. */
export async function removePreparedQuestion(
  sessionId: string,
  questionId: string,
): Promise<void> {
  await api<void>(`${BASE(sessionId)}/${questionId}`, { method: 'DELETE' });
}

/** Clear all prepared questions from a session. */
export async function clearPreparedQuiz(sessionId: string): Promise<void> {
  await api<void>(BASE(sessionId), { method: 'DELETE' });
}

/** Update the order of prepared questions by providing a full ordered list of question IDs. */
export async function reorderPreparedQuiz(
  sessionId: string,
  orderedIds: string[],
): Promise<PreparedQuestion[]> {
  return api<PreparedQuestion[]>(`${BASE(sessionId)}/reorder`, {
    method: 'PATCH',
    body: { orderedIds },
  });
}
