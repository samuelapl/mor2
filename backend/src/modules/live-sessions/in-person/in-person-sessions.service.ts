import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentType,
  EnrollmentStatus,
  Prisma,
  SessionPlatform,
  SessionStatus,
  SessionType,
} from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { ScheduleInPersonRoundDto } from './dto/schedule-in-person-round.dto';

/** Either the root client or an interactive-transaction client. */
type Db = PrismaService | Prisma.TransactionClient;

const ACTIVE_SESSION_STATUSES: SessionStatus[] = [SessionStatus.SCHEDULED, SessionStatus.LIVE];

/**
 * Rules that only apply to in-person (venue) sessions: room availability, seat booking,
 * and round-based cohort scheduling (Round 1, Round 2, ...).
 * Callers that write data should pass their transaction client so the check and the write
 * happen atomically — the row locks taken here only hold for the enclosing transaction.
 */
@Injectable()
export class InPersonSessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getVenueOrFail(venueId: string, db: Db = this.prisma) {
    const venue = await db.venue.findUnique({ where: { id: venueId } });
    if (!venue) {
      throw new NotFoundException(`Venue ${venueId} not found`);
    }
    return venue;
  }

  /** First SCHEDULED/LIVE session in the venue whose time window overlaps the given one, if any. */
  async findVenueConflict(
    venueId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId?: string,
    db: Db = this.prisma,
  ) {
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMinutes * 60000);

    // Only sessions starting before our end can overlap; the end-side check needs each row's duration.
    const candidates = await db.liveSession.findMany({
      where: {
        venueId,
        deletedAt: null,
        status: { in: ACTIVE_SESSION_STATUSES },
        scheduledAt: { lt: end },
        ...(excludeSessionId ? { id: { not: excludeSessionId } } : {}),
      },
      include: { course: { select: { title: true, code: true } } },
    });

    return (
      candidates.find((s) => {
        const sEnd = new Date(s.scheduledAt.getTime() + s.durationMinutes * 60000);
        return start < sEnd;
      }) ?? null
    );
  }

  /**
   * Throws if the venue is missing, inactive, or already booked for an overlapping time.
   * Locks the venue row so concurrent schedulers can't both pass the check.
   */
  async assertVenueAvailable(
    venueId: string,
    scheduledAt: Date,
    durationMinutes: number,
    excludeSessionId: string | undefined,
    db: Db,
  ) {
    await db.$queryRaw`SELECT id FROM venues WHERE id = ${venueId} FOR UPDATE`;
    const venue = await this.getVenueOrFail(venueId, db);
    if (!venue.isActive) {
      throw new BadRequestException(
        `Venue "${venue.name}" (${venue.branch}) is inactive and cannot be scheduled`,
      );
    }

    const conflict = await this.findVenueConflict(
      venueId,
      scheduledAt,
      durationMinutes,
      excludeSessionId,
      db,
    );
    if (conflict) {
      throw new ConflictException(
        `Venue "${venue.name}" (${venue.branch}) is already booked at that time by ` +
          `"${conflict.titleEn}"${conflict.course?.code ? ` (${conflict.course.code})` : ''}, ` +
          `starting ${conflict.scheduledAt.toISOString()} for ${conflict.durationMinutes} min.`,
      );
    }
    return venue;
  }

  /** Active enrollments holding a seat in the session — the one seat count used everywhere. */
  countBookedSeats(sessionId: string, db: Db = this.prisma) {
    return db.enrollment.count({
      where: { sessionId, status: EnrollmentStatus.ACTIVE },
    });
  }

  /**
   * Validates an in-person session booking and checks there is a free seat.
   * Also returns all sibling sessions in the same Round (same courseId, venueId, and round tag)
   * so the learner's attendance roster is populated across every classroom session in that Round.
   */
  async reserveSeat(tx: Prisma.TransactionClient, sessionId: string, courseId: string) {
    await tx.$queryRaw`SELECT id FROM live_sessions WHERE id = ${sessionId} FOR UPDATE`;

    const session = await tx.liveSession.findUnique({
      where: { id: sessionId },
      include: { venue: true },
    });
    if (!session || session.deletedAt) {
      throw new NotFoundException('Selected in-person session not found');
    }
    if (session.courseId !== courseId) {
      throw new BadRequestException('Selected session does not belong to this course');
    }
    if (!ACTIVE_SESSION_STATUSES.includes(session.status)) {
      throw new BadRequestException('Selected session is no longer open for booking');
    }
    const venue = session.venue;
    if (!venue) {
      throw new BadRequestException('Selected session does not have a physical venue assigned');
    }

    const booked = await this.countBookedSeats(sessionId, tx);
    if (booked >= venue.capacity) {
      throw new BadRequestException(
        `Classroom full! Venue "${venue.name}" (${venue.branch}) has reached its maximum seat capacity (${venue.capacity} seats). Please select another session or round.`,
      );
    }

    // Find all sibling sessions in the same Round at this venue so the learner is registered for all of them
    const roundTag = session.rescheduleStatus?.startsWith('ROUND_')
      ? session.rescheduleStatus
      : undefined;

    const roundSessions = roundTag
      ? await tx.liveSession.findMany({
          where: {
            courseId,
            venueId: venue.id,
            rescheduleStatus: roundTag,
            deletedAt: null,
            status: { in: ACTIVE_SESSION_STATUSES },
          },
          orderBy: { scheduledAt: 'asc' },
          select: { id: true },
        })
      : [{ id: session.id }];

    return {
      sessionId: session.id,
      venueId: venue.id,
      roundSessionIds: roundSessions.map((s) => s.id),
    };
  }

  /** Parses the numeric round from `rescheduleStatus` (e.g., `"ROUND_2"` -> `2`, default `1`). */
  parseRoundNumber(rescheduleStatus?: string | null): number {
    if (!rescheduleStatus) return 1;
    const match = /^ROUND_(\d+)$/i.exec(rescheduleStatus.trim());
    return match ? Math.max(1, parseInt(match[1], 10)) : 1;
  }

  /**
   * Schedules a complete In-Person Cohort Round (e.g., Round 1, Round 2, ...) for a course
   * at a physical venue. A Round contains 1 or more Classroom Sessions.
   */
  async scheduleRound(dto: ScheduleInPersonRoundDto) {
    if (!dto.sessions || dto.sessions.length === 0) {
      throw new BadRequestException('At least one classroom session is required to schedule a round');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      include: {
        sessionPlans: {
          orderBy: { order: 'asc' },
          include: {
            liveSession: { select: { id: true, deletedAt: true } },
            assessments: {
              where: { type: AssessmentType.SESSION_ASSESSMENT },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
    });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    // Determine next Round number if not explicitly provided
    let roundNumber = dto.roundNumber;
    if (!roundNumber) {
      const existingInPerson = await this.prisma.liveSession.findMany({
        where: {
          courseId: dto.courseId,
          sessionType: SessionType.IN_PERSON,
          deletedAt: null,
        },
        select: { rescheduleStatus: true },
      });
      if (existingInPerson.length === 0) {
        roundNumber = 1;
      } else {
        const maxRound = existingInPerson.reduce(
          (max, s) => Math.max(max, this.parseRoundNumber(s.rescheduleStatus)),
          0,
        );
        roundNumber = maxRound + 1;
      }
    }

    const roundTag = `ROUND_${roundNumber}`;
    const planMap = new Map(course.sessionPlans.map((p) => [p.id, p]));

    const createdSessions = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];

      for (const [idx, slot] of dto.sessions.entries()) {
        const scheduledDate = new Date(slot.scheduledAt);
        const venue = await this.assertVenueAvailable(
          dto.venueId,
          scheduledDate,
          slot.durationMinutes,
          undefined,
          tx,
        );

        const plan = slot.sessionPlanId ? planMap.get(slot.sessionPlanId) : undefined;
        const assignedTrainerId = slot.trainerId || dto.trainerId || plan?.trainerId || null;

        // If the CourseSessionPlan does not yet have a primary liveSession linked, link it now
        // so the course review checklist marks this planned classroom session as scheduled!
        const hasActivePlanLink = plan?.liveSession && !plan.liveSession.deletedAt;
        const linkPlanId = plan && !hasActivePlanLink ? plan.id : null;

        const baseTitleEn =
          slot.titleEn?.trim() ||
          plan?.titleEn ||
          `Classroom Session ${idx + 1}`;
        const fullTitleEn = `Round ${roundNumber} · ${baseTitleEn} (${venue.branch} - ${venue.name})`;
        const fullTitleAm = slot.titleAm?.trim() || fullTitleEn;

        const session = await tx.liveSession.create({
          data: {
            courseId: dto.courseId,
            sessionPlanId: linkPlanId,
            originalPlanId: plan?.id || null,
            plannedOrder: plan?.order ?? idx,
            rescheduleStatus: roundTag,
            titleEn: fullTitleEn,
            titleAm: fullTitleAm,
            descriptionEn: slot.descriptionEn ?? plan?.descriptionEn ?? null,
            descriptionAm: slot.descriptionEn ?? plan?.descriptionEn ?? null,
            objectivesEn: slot.objectivesEn ?? plan?.objectivesEn ?? null,
            sessionType: SessionType.IN_PERSON,
            platform: SessionPlatform.IN_PERSON,
            venueId: dto.venueId,
            trainerId: assignedTrainerId,
            scheduledAt: scheduledDate,
            durationMinutes: slot.durationMinutes,
            allowViewAttendance: true,
          },
          include: {
            course: { select: { id: true, title: true, code: true } },
            trainer: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
            venue: true,
          },
        });

        // Duplicate formative quizzes from the planned classroom session onto this session
        if (plan?.assessments && plan.assessments.length > 0) {
          for (const [order, quiz] of plan.assessments.entries()) {
            const rawQuestions = Array.isArray(quiz.questions) ? (quiz.questions as any[]) : [];
            const totalPts = rawQuestions.reduce(
              (sum, q) => sum + (typeof q?.points === 'number' ? q.points : 10),
              0,
            );

            await tx.sessionPreparedQuiz.create({
              data: {
                sessionId: session.id,
                // Note: assessmentId is @unique on SessionPreparedQuiz, so only link on primary session
                assessmentId: linkPlanId ? quiz.id : null,
                title: quiz.titleEn,
                timeLimitMinutes: quiz.timeLimitMinutes ?? 10,
                order,
              },
            });
            void totalPts;
          }
        }

        created.push({
          ...session,
          roundNumber,
        });
      }

      return created;
    });

    return {
      message: `Successfully scheduled Round ${roundNumber} with ${createdSessions.length} classroom session(s).`,
      roundNumber,
      count: createdSessions.length,
      data: createdSessions,
    };
  }

  /**
   * Lists all scheduled In-Person Rounds for a course, grouped by Round number & Venue,
   * so coordinators and learners can see each Round and all Classroom Sessions inside it.
   */
  async listCourseRounds(courseId: string) {
    const sessions = await this.prisma.liveSession.findMany({
      where: {
        courseId,
        deletedAt: null,
        OR: [{ sessionType: SessionType.IN_PERSON }, { venueId: { not: null } }],
      },
      orderBy: [{ scheduledAt: 'asc' }],
      include: {
        venue: true,
        trainer: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        _count: {
          select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } },
        },
      },
    });

    const groups = new Map<
      string,
      {
        roundKey: string;
        roundNumber: number;
        roundLabel: string;
        venueId: string | null;
        venue: any;
        trainer: any;
        primarySessionId: string;
        capacity: number;
        bookedSeats: number;
        seatsLeft: number;
        sessions: any[];
      }
    >();

    for (const s of sessions) {
      const roundNumber = this.parseRoundNumber(s.rescheduleStatus);
      const key = `${roundNumber}:${s.venueId ?? 'no-venue'}`;
      const booked = s._count.enrollments;
      const capacity = s.venue?.capacity ?? 30;

      const formattedSession = {
        id: s.id,
        titleEn: s.titleEn,
        titleAm: s.titleAm,
        descriptionEn: s.descriptionEn,
        objectivesEn: s.objectivesEn,
        scheduledAt: s.scheduledAt,
        durationMinutes: s.durationMinutes,
        status: s.status,
        sessionPlanId: s.sessionPlanId,
        originalPlanId: s.originalPlanId,
        plannedOrder: s.plannedOrder ?? 0,
        roundNumber,
        bookedSeats: booked,
        venue: s.venue,
        trainer: s.trainer,
      };

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          roundKey: key,
          roundNumber,
          roundLabel: `Round ${roundNumber}`,
          venueId: s.venueId,
          venue: s.venue,
          trainer: s.trainer,
          primarySessionId: s.id,
          capacity,
          bookedSeats: booked,
          seatsLeft: Math.max(0, capacity - booked),
          sessions: [formattedSession],
        });
      } else {
        existing.sessions.push(formattedSession);
        // Track highest booked seat count among sessions in the round
        if (booked > existing.bookedSeats) {
          existing.bookedSeats = booked;
          existing.seatsLeft = Math.max(0, existing.capacity - booked);
        }
      }
    }

    return Array.from(groups.values()).sort((a, b) => a.roundNumber - b.roundNumber);
  }
}

