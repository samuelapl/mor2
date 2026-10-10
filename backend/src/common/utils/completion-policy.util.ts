/**
 * Time-gated progression policy: a lesson/module can only be completed after
 * the learner has spent at least a configured ratio of its `durationMinutes`
 * actively working on it. The ratio is dynamic — admins manage it via
 * `PolicyService.getTimeRatio()` (Course Policy settings) — this default is
 * only used where a caller doesn't fetch the live setting.
 */

export const DEFAULT_TIME_POLICY_RATIO = 0.5;

export function requiredSeconds(
  durationMinutes?: number | null,
  ratio: number = DEFAULT_TIME_POLICY_RATIO,
): number {
  if (!durationMinutes || durationMinutes <= 0 || ratio <= 0) return 0;
  return Math.ceil(durationMinutes * 60 * ratio);
}

export function isTimeSatisfied(
  timeSpentSeconds: number,
  durationMinutes?: number | null,
  ratio: number = DEFAULT_TIME_POLICY_RATIO,
): boolean {
  return timeSpentSeconds >= requiredSeconds(durationMinutes, ratio);
}

/**
 * Required seconds for a module. Study time on a lesson stops counting once that lesson's
 * own requirement is reached, so when every lesson/sub-lesson has a duration the module can
 * never collect more than the sum of their requirements. Capping at that sum keeps a module
 * whose stored `durationMinutes` drifted above its lessons' total from staying locked forever.
 */
export function moduleRequiredSeconds(
  moduleDurationMinutes: number | null | undefined,
  lessonDurations: Array<number | null | undefined>,
  ratio: number = DEFAULT_TIME_POLICY_RATIO,
): number {
  const moduleRequired = requiredSeconds(moduleDurationMinutes, ratio);
  const allCapped =
    lessonDurations.length > 0 && lessonDurations.every((d) => !!d && d > 0);
  if (!allCapped) return moduleRequired;
  const lessonsTotal = lessonDurations.reduce<number>((sum, d) => sum + requiredSeconds(d, ratio), 0);
  return Math.min(moduleRequired, lessonsTotal);
}

export interface PolicyFailure {
  reason: 'TIME_NOT_MET' | 'ASSESSMENT_REQUIRED' | 'ASSESSMENT_NOT_PASSED' | 'LOCKED';
  message: string;
  remainingSeconds?: number;
}

/** Sum of lesson + sub-lesson time for a module (or a lesson + its sub-lessons). */
export function sumLessonTime(rows: Array<{ timeSpentSeconds: number }>): number {
  return rows.reduce((sum, r) => sum + (r.timeSpentSeconds ?? 0), 0);
}
