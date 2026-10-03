import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';

/**
 * Points rules for prepared session quizzes (mirrors the backend's quiz-points.ts):
 * a weighted quiz's question points must total its course weight, so one point is one
 * percent of the course grade. Ungraded (practice) quizzes have no required total.
 */

/** `total` split over `count` questions; earlier questions take the remainder (10 / 3 → 4, 3, 3). */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

/** True when `points` is an even split of `total` in any order (an empty quiz counts as even). */
export function isEvenSplit(points: number[], total: number): boolean {
  const even = splitEvenly(total, points.length);
  return [...points].sort((a, b) => b - a).every((p, i) => p === even[i]);
}

export function totalPoints(quiz: PreparedQuizGroup): number {
  return quiz.questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
}

export type PointsStatus =
  | { kind: 'practice'; total: number }
  | { kind: 'empty'; required: number }
  | { kind: 'under'; total: number; required: number }
  | { kind: 'ready'; total: number; required: number };

/** Where a quiz stands against its required points. Weighted quizzes can't go over (the server refuses). */
export function pointsStatus(quiz: PreparedQuizGroup): PointsStatus {
  const total = totalPoints(quiz);
  if (!quiz.assessment) return { kind: 'practice', total };
  const required = quiz.assessment.weight;
  if (quiz.questions.length === 0) return { kind: 'empty', required };
  return total === required ? { kind: 'ready', total, required } : { kind: 'under', total, required };
}

/** Why a quiz can't be broadcast yet, or null when it can. */
export function broadcastBlocker(quiz: PreparedQuizGroup): string | null {
  if (quiz.questions.length === 0) return 'Add questions first';
  const status = pointsStatus(quiz);
  if (status.kind === 'under') {
    return `Points total ${status.total} of ${status.required}. Assign the remaining ${status.required - status.total} before broadcasting.`;
  }
  return null;
}

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
};
