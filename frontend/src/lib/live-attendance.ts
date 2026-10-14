import type { ApiCourseProgress, ApiMissingSession } from './api/types';

/**
 * Live sessions the learner still has to attend before the final assessment and certificate.
 * Uses the server's rule (`courseCompletion.missingSessions`); a rescheduled round of a missed
 * session counts. Older servers without it fall back to the session list.
 */
export function missingLiveSessions(progress?: ApiCourseProgress | null): ApiMissingSession[] {
  if (!progress) return [];
  const missing = progress.courseCompletion?.missingSessions;
  if (missing) return missing;
  return (progress.liveSessions ?? [])
    .filter((s) => !s.attended)
    .map((s) => ({ id: s.id, title: s.titleEn, nextSessionAt: s.status === 'COMPLETED' ? null : s.scheduledAt }));
}
