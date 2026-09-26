/**
 * Single source of truth for "is this in-person?" in the UI. Mirrors
 * backend/src/modules/live-sessions/session-mode.ts — keep the two in sync.
 */

/** A session is in-person when it is typed IN_PERSON or has a physical venue attached. */
export function isInPersonSession(
  session: { sessionType?: string | null; venueId?: string | null } | null | undefined,
): boolean {
  if (!session) return false;
  return session.sessionType === "IN_PERSON" || Boolean(session.venueId);
}

/**
 * A learner attends in person when they chose IN_PERSON_ONLY, booked a venue without
 * opting for online, or the course itself is only offered in person.
 */
export function isInPersonEnrollment(
  course: { deliveryMode?: string | null },
  enrollment?: { deliveryMode?: string | null; venueId?: string | null } | null,
): boolean {
  return (
    enrollment?.deliveryMode === "IN_PERSON_ONLY" ||
    (Boolean(enrollment?.venueId) && enrollment?.deliveryMode !== "ONLINE_ONLY") ||
    course.deliveryMode === "IN_PERSON_ONLY"
  );
}
