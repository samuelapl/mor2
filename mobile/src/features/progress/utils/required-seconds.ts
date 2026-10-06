/**
 * Minimum study time for a lesson — mirror of the backend `requiredSeconds`
 * (backend/src/common/utils/completion-policy.util.ts). Used only when the server's
 * value isn't available (offline, before progress loads); keep the two in sync.
 */
const DEFAULT_TIME_RATIO = 0.5;

export function requiredSeconds(durationMinutes: number | null | undefined): number {
  if (!durationMinutes || durationMinutes <= 0) return 0;
  if (durationMinutes <= 1) return 5;
  return Math.min(Math.ceil(durationMinutes * 60 * DEFAULT_TIME_RATIO), 10);
}
