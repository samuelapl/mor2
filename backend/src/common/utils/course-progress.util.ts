/**
 * Course progress percentage, shared by the learner's own progress and the trainer's
 * learner roster so the two always agree.
 *
 * Every item counts the same:
 * - each lesson (a lesson with sub-lessons counts its sub-lessons instead), done once completed;
 * - each lesson, module and final assessment, done once passed.
 *
 * Live session quizzes are left out: learners cannot take them on their own.
 * 100% is only reported when every item is done, never through rounding.
 */

/** Whether an assessment of this type counts as a progress item. */
export function countsTowardProgress(assessmentType: string): boolean {
  return assessmentType !== 'SESSION_ASSESSMENT';
}

export interface ProgressCounts {
  totalLessons: number;
  completedLessons: number;
  totalAssessments: number;
  passedAssessments: number;
}

export function computeProgressPercent(counts: ProgressCounts): number {
  const total = counts.totalLessons + counts.totalAssessments;
  const done = counts.completedLessons + counts.passedAssessments;
  if (total === 0) return 0;
  if (done >= total) return 100;
  return Math.min(99, Math.round((done / total) * 100));
}
