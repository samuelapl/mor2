import { AttendanceStatus, Prisma, PrismaClient, SessionStatus } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

const ATTENDED_STATUSES = [AttendanceStatus.PRESENT, AttendanceStatus.LATE];

export interface AttendanceSession {
  id: string;
  titleEn: string;
  status: string;
  sessionPlanId: string | null;
  /** Set when the plan moved on to a newer session (rescheduled, or this one was removed). */
  originalPlanId: string | null;
  attended: boolean;
}

export interface MissingSession {
  id: string;
  title: string;
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
        .filter((s) => s.status === SessionStatus.COMPLETED && s.attended)
        .map((s) => s.originalPlanId ?? s.sessionPlanId)
        .filter(Boolean),
    );
    return plans
      .filter((p) => !attendedPlanIds.has(p.id))
      .map((p) => ({ id: p.id, title: p.titleEn }));
  }

  if (!hasOnlineSessions && sessions.length === 0) return [];
  const completed = sessions.filter((s) => s.status === SessionStatus.COMPLETED);
  if (completed.length === 0) {
    // Required sessions have not been held yet.
    return sessions.length > 0
      ? sessions.map((s) => ({ id: s.id, title: s.titleEn }))
      : [{ id: 'online-sessions', title: 'Online sessions' }];
  }
  return completed.filter((s) => !s.attended).map((s) => ({ id: s.id, title: s.titleEn }));
}

/** Loads what missingSessionAttendance needs for one learner in one course. */
export async function findMissingSessionAttendance(
  db: Db,
  courseId: string,
  userId: string,
): Promise<MissingSession[]> {
  const [course, plans, sessions] = await Promise.all([
    db.course.findUnique({ where: { id: courseId }, select: { hasOnlineSessions: true } }),
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

  return missingSessionAttendance(
    plans,
    sessions.map(({ attendees, ...s }) => ({ ...s, attended: attendees.length > 0 })),
    course?.hasOnlineSessions ?? false,
  );
}
