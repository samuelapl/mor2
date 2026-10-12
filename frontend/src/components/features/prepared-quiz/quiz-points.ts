import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';

/**
 * Points of prepared session quizzes. Course session quizzes are formative: points have no
 * required total, and a learner's score is earned ÷ total points.
 */

/** `total` split over `count` questions; earlier questions take the remainder (10 / 3 → 4, 3, 3). */
export function splitEvenly(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function totalPoints(quiz: PreparedQuizGroup): number {
  return quiz.questions.reduce((sum, q) => sum + (q.points ?? 0), 0);
}

export type PointsStatus =
  | { kind: 'practice'; total: number }
  | { kind: 'empty' }
  | { kind: 'incomplete'; current: number; planned: number }
  | { kind: 'ready'; total: number };

/** A course quiz is ready once it has questions and points total the planned total; practice quizzes are always usable. */
export function pointsStatus(quiz: PreparedQuizGroup): PointsStatus {
  const total = totalPoints(quiz);
  if (!quiz.assessment) return { kind: 'practice', total };
  if (quiz.questions.length === 0) return { kind: 'empty' };
  const planned = quiz.assessment.totalPoints || 10;
  if (total !== planned) {
    return { kind: 'incomplete', current: total, planned };
  }
  return { kind: 'ready', total };
}

/** Why a quiz can't be broadcast yet, or null when it can. */
export function broadcastBlocker(quiz: PreparedQuizGroup): string | null {
  if (quiz.questions.length === 0) return 'Add questions first';
  if (quiz.assessment) {
    const planned = quiz.assessment.totalPoints || 10;
    const current = totalPoints(quiz);
    if (current !== planned) {
      return `Points must total ${planned} (currently ${current})`;
    }
  }
  return null;
}

export const QUESTION_TYPE_LABEL: Record<string, string> = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short answer',
};
