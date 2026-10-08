import { CourseDeliveryMode, SessionType } from '@prisma/client';

/**
 * Single source of truth for "is this in-person?". Every place that branches on
 * online vs in-person should use these instead of re-checking the fields inline.
 */

/** A session is in-person when it is typed IN_PERSON or has a physical venue attached. */
export function isInPersonSession(session: {
  sessionType?: SessionType | string | null;
  venueId?: string | null;
}): boolean {
  return session.sessionType === SessionType.IN_PERSON || Boolean(session.venueId);
}

/** An enrollment is in-person when the learner chose IN_PERSON_ONLY, or booked a venue without opting for online. */
export function isInPersonEnrollment(enrollment: {
  deliveryMode?: CourseDeliveryMode | string | null;
  venueId?: string | null;
}): boolean {
  return (
    enrollment.deliveryMode === CourseDeliveryMode.IN_PERSON_ONLY ||
    (Boolean(enrollment.venueId) && enrollment.deliveryMode !== CourseDeliveryMode.ONLINE_ONLY)
  );
}

/**
 * Whether an enrollment entitles the learner to a session — the per-row form of
 * `LiveSessionsService.enrolledSessionsWhere`; keep the two in step.
 */
export function enrollmentCoversSession(
  enrollment: {
    deliveryMode?: CourseDeliveryMode | string | null;
    venueId?: string | null;
    sessionId?: string | null;
  },
  session: { id: string; sessionType?: SessionType | string | null; venueId?: string | null },
): boolean {
  if (!isInPersonEnrollment(enrollment)) {
    return session.sessionType === SessionType.VIRTUAL && !session.venueId;
  }
  if (enrollment.sessionId) return enrollment.sessionId === session.id;
  if (enrollment.venueId) return session.venueId === enrollment.venueId;
  return session.sessionType === SessionType.IN_PERSON;
}
