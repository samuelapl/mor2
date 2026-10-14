import { AttendanceStatus, Prisma, PrismaClient, SessionStatus, SessionType } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

const ATTENDED_STATUSES = [AttendanceStatus.PRESENT, AttendanceStatus.LATE];

export interface AttendanceSession {
  id: string;
  titleEn: string;
  status: string;
  sessionType?: SessionType | string;
  sessionPlanId: string | null;
  /** Set when the plan moved on to a newer session (rescheduled, or this one was removed). */
  originalPlanId: string | null;
  attended: boolean;
  scheduledAt?: Date | null;
}

export interface MissingSession {
  id: string;
  title: string;
  /** When the learner can attend it next: the earliest upcoming round, or null if none is scheduled. */
  nextSessionAt: Date | null;
}

const UPCOMING_STATUSES: string[] = [SessionStatus.SCHEDULED, SessionStatus.LIVE];

function nextRoundAt(sessions: AttendanceSession[], matches: (s: AttendanceSession) => boolean) {
  const upcoming = sessions
    .filter((s) => UPCOMING_STATUSES.includes(s.status) && s.scheduledAt && matches(s))
    .map((s) => s.scheduledAt!.getTime());
  return upcoming.length > 0 ? new Date(Math.min(...upcoming)) : null;
}

/**
 * In-person attendance is verified via physical check-in (QR code, GPS, biometrics)
 * or trainer roll-call, so it counts immediately even if the scheduled session record was never marked COMPLETED.
 * Online / virtual sessions must be concluded (COMPLETED).
 */
export function isSessionAttended(s: AttendanceSession): boolean {
  if (!s.attended) return false;
  if (s.sessionType === SessionType.IN_PERSON || s.sessionType === 'IN_PERSON') {
    return true;
  }
  return s.status === SessionStatus.COMPLETED;
}

/**
 * Live-session attendance a learner still owes, shared by the final-assessment gate and
 * certificate issuing so the two can never disagree:
 *
 * - With planned sessions, each plan must be attended once, in any of its rounds: a learner
 *   who missed a session and attended it when it was scheduled again is done with it, and
 *   newer rounds of a plan they already attended do not block them.
 * - Without plans (ad-hoc sessions only), every completed session must be attended, and at
 *   least one must have been held when the course runs online sessions.
 */
export function missingSessionAttendance(
  plans: Array<{ id: string; titleEn: string }>,
  sessions: AttendanceSession[],
  hasOnlineSessions: boolean,
): MissingSession[] {
  if (plans.length > 0) {
    const attendedPlanIds = new Set(
      sessions
        .filter((s) => isSessionAttended(s))
        .map((s) => s.originalPlanId ?? s.sessionPlanId)
        .filter(Boolean),
    );
    return plans
      .filter((p) => !attendedPlanIds.has(p.id))
      .map((p) => ({
        id: p.id,
        title: p.titleEn,
        nextSessionAt: nextRoundAt(sessions, (s) => (s.originalPlanId ?? s.sessionPlanId) === p.id),
      }));
  }

  if (!hasOnlineSessions && sessions.length === 0) return [];
  const completedOrAttended = sessions.filter(
    (s) => s.status === SessionStatus.COMPLETED || isSessionAttended(s),
  );
  if (completedOrAttended.length === 0) {
    // Required sessions have not been held yet.
    return sessions.length > 0
      ? sessions.map((s) => ({
          id: s.id,
          title: s.titleEn,
          nextSessionAt: nextRoundAt(sessions, (x) => x.id === s.id),
        }))
      : [{ id: 'online-sessions', title: 'Online sessions', nextSessionAt: null }];
  }
  // Ad-hoc sessions are not rescheduled, so a missed one has no next round.
  return completedOrAttended
    .filter((s) => !isSessionAttended(s))
    .map((s) => ({ id: s.id, title: s.titleEn, nextSessionAt: null }));
}

/** "Session 2 (next session 12 Oct 2026), Session 3 (not scheduled yet)" for learner messages. */
export function describeMissingSessions(missing: MissingSession[]): string {
  return missing
    .map((s) =>
      s.nextSessionAt
        ? `${s.title} (next session ${s.nextSessionAt.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })})`
        : `${s.title} (not scheduled yet; your trainer will schedule a new session)`,
    )
    .join(', ');
}

/** Loads what missingSessionAttendance needs for one learner in one course. */
export async function findMissingSessionAttendance(
  db: Db,
  courseId: string,
  userId: string,
): Promise<MissingSession[]> {
  const [course, plans, sessions] = await Promise.all([
    db.course.findUnique({
      where: { id: courseId },
      select: { hasOnlineSessions: true, deliveryMode: true },
    }),
    db.courseSessionPlan.findMany({
      where: { courseId },
      orderBy: { order: 'asc' },
      select: { id: true, titleEn: true },
    }),
    db.liveSession.findMany({
      where: { courseId, deletedAt: null },
      select: {
        id: true,
        titleEn: true,
        status: true,
        sessionType: true,
        scheduledAt: true,
        sessionPlanId: true,
        originalPlanId: true,
        attendees: {
          where: { userId, status: { in: ATTENDED_STATUSES } },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);

  const isInPersonCourse = course?.deliveryMode === 'IN_PERSON_ONLY';

  return missingSessionAttendance(
    plans,
    sessions.map(({ attendees, sessionType, ...s }) => ({
      ...s,
      sessionType: isInPersonCourse ? SessionType.IN_PERSON : sessionType,
      attended: attendees.length > 0,
    })),
    course?.hasOnlineSessions ?? false,
  );
}
