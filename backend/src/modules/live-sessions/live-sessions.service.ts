import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CourseStatus,
  EnrollmentStatus,
  Prisma,
  RoleName,
  SessionPlatform,
  SessionStatus,
  SessionType,
} from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import {
  buildOrderBy,
  buildPaginationArgs,
  buildPaginatedResponse,
  formatAppDateTime,
  isAnswerCorrect,
  startsInSeconds,
} from '@common/utils';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import {
  CreateSessionDto,
  UpdateSessionDto,
  SubmitLiveQuizDto,
  CreateBatchSessionDto,
} from './dto';
import { VirtualSessionsService } from './virtual/virtual-sessions.service';
import { isInPersonEnrollment, isInPersonSession } from './session-mode';
import { InPersonSessionsService } from './in-person/in-person-sessions.service';
import { PermissionsService } from '@modules/permissions/permissions.service';
import { assertCanRunSession } from './session-access';
import { SessionQuizGradingService } from './session-quiz-grading.service';
import { SessionRemindersService } from './session-reminders.service';

/**
 * Which sessions a user may list:
 * - `all`      — System Admin or live_session.manage_all
 * - `hosted`   — live_session.manage_own: only sessions they are the assigned trainer of
 * - `enrolled` — everyone else (learners): only sessions of courses they are enrolled in
 */
type SessionVisibility =
  { kind: 'all' } | { kind: 'hosted' | 'enrolled'; where: Prisma.LiveSessionWhereInput };

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly virtualSessions: VirtualSessionsService,
    private readonly inPersonSessions: InPersonSessionsService,
    private readonly permissions: PermissionsService,
    private readonly sessionQuizGrading: SessionQuizGradingService,
    private readonly reminders: SessionRemindersService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async sessionVisibility(user: AuthenticatedUser): Promise<SessionVisibility> {
    if (user.roles.includes(RoleName.SYSTEM_ADMIN)) return { kind: 'all' };
    const codes = await this.permissions.effectivePermissions(user.roles);
    if (codes.includes('live_session.manage_all')) return { kind: 'all' };
    if (codes.includes('live_session.manage_own')) {
      return { kind: 'hosted', where: { trainerId: user.id } };
    }
    return { kind: 'enrolled', where: await this.enrolledSessionsWhere(user.id) };
  }

  /**
   * Sessions a learner's enrollments entitle them to see. In-person enrollments see only their
   * booked session (or, without a booking, in-person sessions at their venue); online
   * enrollments see only virtual sessions. `enrollmentCoversSession` is the per-row form of
   * this; keep the two in step.
   */
  private async enrolledSessionsWhere(userId: string): Promise<Prisma.LiveSessionWhereInput> {
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        userId,
        status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
      },
      select: { courseId: true, sessionId: true, venueId: true, deliveryMode: true },
    });
    if (enrollments.length === 0) return { id: { in: [] } };

    const bookedSessionIds = enrollments
      .map((e) => e.sessionId)
      .filter((sid): sid is string => Boolean(sid));

    const bookedSessions =
      bookedSessionIds.length > 0
        ? await this.prisma.liveSession.findMany({
            where: { id: { in: bookedSessionIds } },
            select: { id: true, courseId: true, venueId: true, rescheduleStatus: true },
          })
        : [];

    const bookedSessionMap = new Map(bookedSessions.map((s) => [s.id, s]));

    return {
      OR: enrollments.map((e): Prisma.LiveSessionWhereInput => {
        if (!isInPersonEnrollment(e)) {
          return { courseId: e.courseId, sessionType: SessionType.VIRTUAL, venueId: null };
        }
        if (e.sessionId) {
          const booked = bookedSessionMap.get(e.sessionId);
          if (booked?.rescheduleStatus?.startsWith('ROUND_') && booked.venueId) {
            return {
              courseId: e.courseId,
              OR: [
                {
                  venueId: booked.venueId,
                  rescheduleStatus: booked.rescheduleStatus,
                },
                { attendees: { some: { userId } } },
              ],
            };
          }
          return {
            courseId: e.courseId,
            OR: [
              { id: e.sessionId },
              { attendees: { some: { userId } } },
            ],
          };
        }
        return e.venueId
          ? { courseId: e.courseId, venueId: e.venueId }
          : { courseId: e.courseId, sessionType: SessionType.IN_PERSON };
      }),
    };
  }

  async create(courseId: string, dto: CreateSessionDto, user?: AuthenticatedUser) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    // Without manage_all (i.e. live_session.manage_own) a user schedules only for courses
    // they are assigned to train, and the session is theirs to run.
    if (user && (await this.sessionVisibility(user)).kind !== 'all') {
      const assigned = await this.prisma.trainerAssignment.findFirst({
        where: { courseId, userId: user.id },
        select: { id: true },
      });
      if (!assigned) {
        throw new ForbiddenException(
          'You can only schedule sessions for courses you are assigned to',
        );
      }
      dto = { ...dto, trainerId: user.id };
    }

    const plan = dto.sessionPlanId
      ? await this.assertPlanSchedulable(courseId, dto.sessionPlanId)
      : null;
    // The trainer assigned to the plan hosts it unless the scheduler picked someone else.
    if (plan?.trainerId && !dto.trainerId) dto = { ...dto, trainerId: plan.trainerId };

    const isVenueSession = isInPersonSession(dto);
    const session = await this.prisma.$transaction(async (tx) => {
      if (dto.venueId) {
        await this.inPersonSessions.assertVenueAvailable(
          dto.venueId,
          new Date(dto.scheduledAt),
          dto.durationMinutes,
          undefined,
          tx,
        );
      }
      const created = await tx.liveSession.create({
        data: {
          courseId,
          sessionPlanId: plan?.id ?? null,
          titleAm: dto.titleAm,
          titleEn: dto.titleEn,
          descriptionAm: dto.descriptionAm,
          descriptionEn: dto.descriptionEn,
          objectivesEn: dto.objectivesEn,
          sessionType:
            dto.sessionType || (isVenueSession ? SessionType.IN_PERSON : SessionType.VIRTUAL),
          platform:
            dto.platform || (isVenueSession ? SessionPlatform.IN_PERSON : SessionPlatform.LIVEKIT),
          venueId: dto.venueId || null,
          externalUrl: dto.externalUrl,
          meetingId: dto.meetingId,
          meetingPassword: dto.meetingPassword,
          scheduledAt: new Date(dto.scheduledAt),
          durationMinutes: dto.durationMinutes,
          trainerId: dto.trainerId || null,
          allowViewAttendance: dto.allowViewAttendance ?? false,
          attendanceThreshold:
            dto.attendanceThreshold ?? (await this.getDefaultAttendanceThreshold()),
        },
        include: {
          course: { select: { id: true, title: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          venue: true,
        },
      });

      if (plan) {
        // One prepared quiz per planned quiz, already linked to its weighted assessment;
        // the trainer only has to add questions from the question bank.
        // A plan scheduled before (its session was removed) still has its prepared quizzes;
        // they move to the new session with their questions.
        for (const [order, quiz] of plan.assessments.entries()) {
          await tx.sessionPreparedQuiz.upsert({
            where: { assessmentId: quiz.id },
            update: { sessionId: created.id, order },
            create: {
              sessionId: created.id,
              assessmentId: quiz.id,
              title: quiz.titleEn,
              timeLimitMinutes: quiz.timeLimitMinutes ?? 10,
              order,
            },
          });
        }
        if (created.trainerId !== plan.trainerId) {
          await tx.courseSessionPlan.update({
            where: { id: plan.id },
            data: { trainerId: created.trainerId },
          });
        }
      }

      // The host must be a course trainer, so the course appears in their question bank
      // and quiz tools even before it is published.
      if (created.trainerId) {
        await tx.trainerAssignment.upsert({
          where: { courseId_userId: { courseId, userId: created.trainerId } },
          create: { courseId, userId: created.trainerId },
          update: {},
        });
      }

      return created;
    });

    // Notify all enrolled learners, assigned trainers, and active learners about the new live session (best-effort)
    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseId, status: 'ACTIVE' },
        select: { userId: true },
      });

      const trainers = await this.prisma.trainerAssignment.findMany({
        where: { courseId },
        select: { userId: true },
      });

      const activeLearners = await this.prisma.userRole.findMany({
        where: { role: 'LEARNER' },
        select: { userId: true },
        take: 200,
      });

      const allRecipientIds = Array.from(
        new Set([
          ...enrollments.map((e) => e.userId),
          ...trainers.map((t) => t.userId),
          ...activeLearners.map((l) => l.userId),
          ...(session.trainerId ? [session.trainerId] : []),
        ]),
      );

      if (allRecipientIds.length > 0) {
        await this.prisma.notification.createMany({
          data: allRecipientIds.map((userId) => ({
            userId,
            type: 'SESSION_REMINDER' as any,
            titleEn: `Live Session Scheduled: ${session.titleEn}`,
            titleAm: `የቀጥታ ክፍለ ጊዜ ቅጥር: ${session.titleAm || session.titleEn}`,
            bodyEn: `A live training session has been scheduled for "${session.course?.title || session.titleEn}" on ${formatAppDateTime(session.scheduledAt)}.`,
            bodyAm: `ለኮርስዎ የቀጥታ ክፍለ ጊዜ ተቀጥሯል።`,
            metadata: { sessionId: session.id, courseId } as any,
          })),
        });
      }
    } catch {
      // notification failure should not block session creation
    }

    await this.reminders.schedule(session.id);

    return session;
  }

  async createBatch(dto: CreateBatchSessionDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (!dto.venueSessions || dto.venueSessions.length === 0) {
      throw new BadRequestException('At least one venue session must be provided');
    }

    // If linked to a course session plan, load its details
    const plan = dto.sessionPlanId
      ? await this.prisma.courseSessionPlan.findUnique({
          where: { id: dto.sessionPlanId },
          include: { assessments: { where: { type: 'SESSION_ASSESSMENT' } } },
        })
      : null;

    // All-or-nothing: a conflict in any row (including with an earlier row of the same batch)
    // rolls back the whole batch instead of leaving it half-created.
    const createdSessions = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      for (const [idx, item] of dto.venueSessions.entries()) {
        const venue = await this.inPersonSessions.assertVenueAvailable(
          item.venueId,
          new Date(item.scheduledAt),
          item.durationMinutes,
          undefined,
          tx,
        );

        const assignedTrainerId = item.trainerId || plan?.trainerId || null;

        const session = await tx.liveSession.create({
          data: {
            courseId: dto.courseId,
            sessionPlanId: plan && idx === 0 ? plan.id : null,
            originalPlanId: plan?.id || null,
            plannedOrder: plan?.order ?? null,
            titleAm: dto.titleAm || dto.titleEn,
            titleEn: `${dto.titleEn} (${venue.branch} - ${venue.name})`,
            descriptionAm: dto.descriptionAm,
            descriptionEn: dto.descriptionEn,
            sessionType: SessionType.IN_PERSON,
            platform: SessionPlatform.IN_PERSON,
            venueId: item.venueId,
            trainerId: assignedTrainerId,
            scheduledAt: new Date(item.scheduledAt),
            durationMinutes: item.durationMinutes,
          },
          include: {
            course: { select: { id: true, title: true, code: true } },
            trainer: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
            venue: true,
          },
        });

        // If planned assessments exist, duplicate/setup prepared quizzes for each venue session
        if (plan?.assessments && plan.assessments.length > 0) {
          for (const [order, quiz] of plan.assessments.entries()) {
            await tx.sessionPreparedQuiz.create({
              data: {
                sessionId: session.id,
                assessmentId: quiz.id,
                title: quiz.titleEn,
                timeLimitMinutes: quiz.timeLimitMinutes ?? 10,
                order,
              },
            });
          }
        }

        created.push(session);
      }
      return created;
    });

    await this.reminders.scheduleMany(createdSessions.map((s) => s.id));

    return {
      message: `Successfully scheduled ${createdSessions.length} in-person classroom session(s).`,
      count: createdSessions.length,
      data: createdSessions,
    };
  }

  async findAll(
    query: PaginationQuery & { status?: SessionStatus; courseId?: string; trainerId?: string },
    user: AuthenticatedUser,
  ) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);
    const visibility = await this.sessionVisibility(user);

    let visible: Prisma.LiveSessionWhereInput | undefined;
    if (visibility.kind === 'enrolled' && query.courseId) {
      // Before enrolling, a learner may browse a published course's in-person sessions to pick a seat.
      visible = {
        OR: [
          visibility.where,
          {
            course: { status: CourseStatus.PUBLISHED },
            status: { in: [SessionStatus.SCHEDULED, SessionStatus.LIVE] },
            OR: [{ sessionType: SessionType.IN_PERSON }, { venueId: { not: null } }],
          },
        ],
      };
    } else if (visibility.kind !== 'all') {
      visible = visibility.where;
    }

    const where: Prisma.LiveSessionWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.trainerId ? { trainerId: query.trainerId } : {}),
      ...(visible ? { AND: [visible] } : {}),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          course: { select: { id: true, title: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          venue: true,
          attendees: true,
          _count: { select: { enrollments: { where: { status: EnrollmentStatus.ACTIVE } } } },
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    // bookedSeats = active enrollments holding a seat — the same count the booking check uses.
    // Learners get the seat count but not other people's attendance rows.
    const now = new Date();
    const withSeats = sessions.map(({ _count, attendees, ...session }) => ({
      ...session,
      ...(visibility.kind === 'enrolled' ? {} : { attendees }),
      bookedSeats: _count.enrollments,
      startsInSeconds: startsInSeconds(session, now),
    }));

    return buildPaginatedResponse(withSeats, total, page, limit);
  }

  async findById(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true, code: true } },
        trainer: {
          select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
        },
        venue: true,
        attendees: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    });

    if (!session || session.deletedAt) {
      throw new NotFoundException('Live session not found');
    }

    return session;
  }

  async update(id: string, dto: UpdateSessionDto) {
    const before = (await this.findById(id)).status;
    const updated = await this.updateSession(id, dto);
    await this.gradeIfJustCompleted(id, before, dto.status);
    // A new start time or a session put back on SCHEDULED needs reminders for that time.
    if (dto.scheduledAt !== undefined || dto.status === SessionStatus.SCHEDULED) {
      await this.reminders.schedule(id);
    }
    if (dto.status === SessionStatus.COMPLETED && before !== SessionStatus.COMPLETED) {
      this.eventEmitter.emit('live_session.ended', {
        sessionId: updated.id,
        courseId: updated.courseId,
        sessionPlanId: updated.sessionPlanId,
        endedAt: updated.actualEndedAt ?? new Date(),
      });
    }
    return updated;
  }

  private async updateSession(id: string, dto: UpdateSessionDto) {
    const existing = await this.findById(id);

    if (existing.status === SessionStatus.COMPLETED && !dto.status && !dto.scheduledAt) {
      throw new BadRequestException('Cannot update a completed session without rescheduling');
    }

    const rescheduled = dto.scheduledAt !== undefined || dto.durationMinutes !== undefined;

    return this.prisma.$transaction(async (tx) => {
      // Moving an in-person session in time must not collide with another booking in its room.
      if (existing.venueId && rescheduled) {
        await this.inPersonSessions.assertVenueAvailable(
          existing.venueId,
          dto.scheduledAt ? new Date(dto.scheduledAt) : existing.scheduledAt,
          dto.durationMinutes ?? existing.durationMinutes,
          id,
          tx,
        );
      }
      const updated = await tx.liveSession.update({
        where: { id },
        data: {
          titleAm: dto.titleAm,
          titleEn: dto.titleEn,
          descriptionAm: dto.descriptionAm,
          descriptionEn: dto.descriptionEn,
          objectivesEn: dto.objectivesEn,
          platform: dto.platform,
          externalUrl: dto.externalUrl,
          meetingId: dto.meetingId,
          meetingPassword: dto.meetingPassword,
          scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
          durationMinutes: dto.durationMinutes,
          status:
            dto.status !== undefined
              ? dto.status
              : dto.scheduledAt
                ? SessionStatus.SCHEDULED
                : undefined,
          trainerId: dto.trainerId !== undefined ? dto.trainerId || null : undefined,
          allowViewAttendance:
            dto.allowViewAttendance !== undefined ? dto.allowViewAttendance : undefined,
          attendanceThreshold:
            dto.attendanceThreshold !== undefined ? dto.attendanceThreshold : undefined,
        },
        include: {
          course: { select: { id: true, title: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
      });

      // A session scheduled from a plan keeps the plan's trainer in step.
      if (dto.trainerId !== undefined && existing.sessionPlanId) {
        await tx.courseSessionPlan.update({
          where: { id: existing.sessionPlanId },
          data: { trainerId: dto.trainerId },
        });
      }

      if (dto.trainerId) {
        await tx.trainerAssignment.upsert({
          where: { courseId_userId: { courseId: existing.courseId, userId: dto.trainerId } },
          create: { courseId: existing.courseId, userId: dto.trainerId },
          update: {},
        });
      } else if (dto.trainerId === null && existing.trainerId) {
        const otherSessions = await tx.liveSession.count({
          where: {
            courseId: existing.courseId,
            id: { not: id },
            trainerId: existing.trainerId,
            deletedAt: null,
          },
        });
        const plansHosted = await tx.courseSessionPlan.count({
          where: { courseId: existing.courseId, trainerId: existing.trainerId },
        });
        if (otherSessions === 0 && plansHosted === 0) {
          await tx.trainerAssignment.deleteMany({
            where: { courseId: existing.courseId, userId: existing.trainerId },
          });
        }
      }

      return updated;
    });
  }

  async getJoinUrl(id: string, user?: AuthenticatedUser) {
    return this.virtualSessions.getJoinUrl(await this.findById(id), user);
  }

  async changeStatus(id: string, status: SessionStatus, user?: AuthenticatedUser) {
    const existing = await this.findById(id);
    if (user) await assertCanRunSession(this.prisma, this.permissions, user, id);
    if (status === SessionStatus.LIVE && existing.status !== SessionStatus.LIVE) {
      await this.assertGradedQuizzesReady(id);
      const FIVE_MINUTES_MS = 5 * 60 * 1000;
      const isTimeReached =
        !existing.scheduledAt || Date.now() >= existing.scheduledAt.getTime() - FIVE_MINUTES_MS;
      if (!isTimeReached) {
        throw new BadRequestException(
          'This live session is coming soon. You can start the session 5 minutes before the scheduled start time.',
        );
      }
    }

    const updated = await this.prisma.liveSession.update({
      where: { id },
      data: {
        status,
        ...(status === SessionStatus.COMPLETED && !existing.actualEndedAt
          ? { actualEndedAt: new Date() }
          : {}),
      },
    });
    await this.gradeIfJustCompleted(id, existing.status, status);

    if (status === SessionStatus.COMPLETED && existing.status !== SessionStatus.COMPLETED) {
      this.eventEmitter.emit('live_session.ended', {
        sessionId: updated.id,
        courseId: updated.courseId,
        sessionPlanId: updated.sessionPlanId,
        endedAt: updated.actualEndedAt ?? new Date(),
      });
    }

    return updated;
  }

  /**
   * Removing a session scheduled from a course plan only unschedules it: the plan (its quizzes
   * and trainer) stays and can be scheduled again. The link moves to `originalPlanId`
   * so the plan is free for a new session; its prepared quizzes move over when that happens.
   */
  async softDelete(id: string) {
    const existing = await this.findById(id);

    return this.prisma.liveSession.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        ...(existing.sessionPlanId
          ? { sessionPlanId: null, originalPlanId: existing.sessionPlanId }
          : {}),
      },
    });
  }

  /** A session with course quizzes can only go live once each one has questions. */
  private async assertGradedQuizzesReady(sessionId: string) {
    const quizzes = await this.prisma.sessionPreparedQuiz.findMany({
      where: { sessionId, assessmentId: { not: null } },
      select: {
        title: true,
        _count: { select: { questions: true } },
      },
    });
    const problems = quizzes
      .filter((q) => q._count.questions === 0)
      .map((q) => `"${q.title}" has no questions`);
    if (problems.length > 0) {
      throw new BadRequestException({
        message: `Unable to start this session now: prepare its session quiz first (${problems.join('; ')}).`,
        code: 'SESSION_QUIZ_NOT_READY',
        problems,
      });
    }
  }

  /** Re-scores the session's quizzes (e.g. after a late response). */
  async gradeSessionQuizzes(id: string, user?: AuthenticatedUser) {
    await this.findById(id);
    if (user) await assertCanRunSession(this.prisma, this.permissions, user, id);
    return this.sessionQuizGrading.gradeSession(id);
  }

  private async gradeIfJustCompleted(id: string, before: SessionStatus, after?: SessionStatus) {
    if (after !== SessionStatus.COMPLETED || before === SessionStatus.COMPLETED) return;
    try {
      await this.sessionQuizGrading.gradeSession(id);
    } catch (err) {
      // Grading never blocks ending a session; it can be re-run from the session.
      this.logger.warn(`Session quiz grading failed for ${id}: ${(err as Error).message}`);
    }
  }

  /** The plan must belong to the course, not be scheduled yet, and the course must be approved. */
  private async assertPlanSchedulable(courseId: string, planId: string) {
    const plan = await this.prisma.courseSessionPlan.findUnique({
      where: { id: planId },
      include: {
        course: { select: { status: true } },
        liveSession: { select: { id: true, deletedAt: true } },
        assessments: { where: { type: 'SESSION_ASSESSMENT' }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!plan || plan.courseId !== courseId)
      throw new NotFoundException('Planned session not found for this course');
    if (
      plan.course.status !== CourseStatus.APPROVED &&
      plan.course.status !== CourseStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        'Planned sessions can be scheduled once the course is approved',
      );
    }
    if (plan.liveSession && !plan.liveSession.deletedAt) {
      throw new BadRequestException('This planned session is already scheduled');
    }
    return plan;
  }

  async getLiveKitToken(
    sessionId: string,
    user: AuthenticatedUser,
  ): Promise<{ token: string; wsUrl: string; roomName: string }> {
    return this.virtualSessions.getLiveKitToken(await this.findById(sessionId), user);
  }

  async upcomingForUser(
    user: AuthenticatedUser,
    query: PaginationQuery & { courseId?: string } = {},
  ) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const visibility = await this.sessionVisibility(user);

    const where: Prisma.LiveSessionWhereInput = {
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.LIVE] },
      deletedAt: null,
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(visibility.kind !== 'all' ? { AND: [visibility.where] } : {}),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          course: { select: { id: true, title: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          venue: true,
          attendees: {
            where: { userId: user.id },
            select: { status: true, checkInMethod: true },
            take: 1,
          },
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    const now = new Date();
    const ATTENDED_STATUSES = ['PRESENT', 'LATE'];
    return buildPaginatedResponse(
      sessions.map((s) => {
        const attendee = s.attendees?.[0];
        const attended = attendee ? ATTENDED_STATUSES.includes(attendee.status) : false;
        return {
          ...s,
          attended,
          attendanceStatus: attendee?.status ?? null,
          startsInSeconds: startsInSeconds(s, now),
        };
      }),
      total,
      page,
      limit,
    );
  }

  /**
   * Submit learner response for an interactive in-room live quiz.
   * Scores response, creates an immutable audit attendance log, and returns score.
   */
  async submitQuizResponse(sessionId: string, user: AuthenticatedUser, dto: SubmitLiveQuizDto) {
    const session = await this.findById(sessionId);

    // Verify enrollment if learner
    const isStaff =
      user.roles?.some((r) =>
        ['TRAINER', 'COURSE_OWNER', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'].includes(r),
      ) ?? false;
    const isSessionTrainer = session.trainerId === user.id;
    if (!isStaff && !isSessionTrainer) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: session.courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') {
        throw new ForbiddenException('You must be enrolled in this course to submit quiz answers');
      }
    }

    // Try finding question in question bank
    const question = await this.prisma.questionBankQuestion.findUnique({
      where: { id: dto.questionId },
    });

    let isCorrect = false;
    let score = 0;
    const explanation = undefined;
    const effectivePoints =
      typeof dto.points === 'number' && dto.points > 0
        ? dto.points
        : 1;

    if (question) {
      // The key may be stored as an option position or as its text; apps send positions.
      isCorrect = isAnswerCorrect(
        {
          options: Array.isArray(question.options) ? question.options : [],
          correctAnswer: question.correctAnswer,
        },
        dto.selectedOptionIds,
      );
      score = isCorrect ? effectivePoints : 0;
    } else if (dto.correctAnswer !== undefined) {
      isCorrect = isAnswerCorrect(
        {
          options: Array.isArray(dto.options) ? dto.options : [],
          correctAnswer: dto.correctAnswer,
        },
        dto.selectedOptionIds,
      );
      score = isCorrect ? effectivePoints : 0;
    }

    // Create an immutable log entry in attendanceLog for audit & performance records
    const attendance = await this.prisma.attendance.findUnique({
      where: { sessionId_userId: { sessionId, userId: user.id } },
    });

    await this.prisma.attendanceLog.create({
      data: {
        sessionId,
        userId: user.id,
        attendanceId: attendance?.id ?? null,
        eventType: 'QUIZ_RESPONSE',
        timestamp: new Date(),
        metadata: {
          questionId: dto.questionId,
          questionTitle: dto.questionTitle,
          options: dto.options,
          correctAnswer: dto.correctAnswer,
          selectedOptionIds: dto.selectedOptionIds,
          isCorrect,
          score,
          points: effectivePoints,
          responseDurationSeconds: dto.responseDurationSeconds,
        },
      },
    });

    return {
      isCorrect,
      score,
      explanation,
    };
  }

  /**
   * Get comprehensive live quiz and poll report for a session from AttendanceLog.
   */
  async getLiveQuizReport(sessionId: string) {
    await this.findById(sessionId);

    // Fetch all QUIZ_RESPONSE attendance logs for this session
    const logs = await this.prisma.attendanceLog.findMany({
      where: {
        sessionId,
        eventType: 'QUIZ_RESPONSE',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        timestamp: 'asc',
      },
    });

    // Group logs by questionId
    const questionMap = new Map<
      string,
      {
        questionId: string;
        answers: Array<{
          userId: string;
          userName: string;
          email: string;
          selectedOptionIds: string[];
          isCorrect: boolean;
          score: number;
          responseDurationSeconds?: number;
          timestamp: Date;
        }>;
      }
    >();

    const distinctQuestionIds = new Set<string>();

    for (const log of logs) {
      const meta = (log.metadata as Record<string, any>) || {};
      const qId = meta.questionId || 'unknown';
      distinctQuestionIds.add(qId);

      if (!questionMap.has(qId)) {
        questionMap.set(qId, {
          questionId: qId,
          answers: [],
        });
      }

      const qEntry = questionMap.get(qId)!;
      qEntry.answers.push({
        userId: log.user.id,
        userName: `${log.user.firstName} ${log.user.lastName}`.trim(),
        email: log.user.email,
        selectedOptionIds: meta.selectedOptionIds || [],
        isCorrect: Boolean(meta.isCorrect),
        score: meta.score || 0,
        responseDurationSeconds: meta.responseDurationSeconds,
        timestamp: log.timestamp,
      });
    }

    // Fetch question bank questions for the stored questionIds
    const storedQuestions = await this.prisma.questionBankQuestion.findMany({
      where: {
        id: { in: Array.from(distinctQuestionIds) },
      },
    });

    const storedQuestionMap = new Map(storedQuestions.map((q) => [q.id, q]));

    // Format questions array
    const questions = Array.from(questionMap.entries()).map(([qId, qData]) => {
      const qEntity = storedQuestionMap.get(qId);
      const totalAnswers = qData.answers.length;
      const correctAnswers = qData.answers.filter((a) => a.isCorrect).length;
      const accuracy = totalAnswers > 0 ? Math.round((correctAnswers / totalAnswers) * 100) : 0;

      // Fallback from metadata if question not found in QuestionBankQuestion
      let titleEn = qEntity?.question;
      let options: any[] = Array.isArray(qEntity?.options) ? (qEntity.options as any[]) : [];
      let correctAnswer = qEntity?.correctAnswer;

      if (!titleEn || options.length === 0) {
        for (const log of logs) {
          const meta = (log.metadata as Record<string, any>) || {};
          if (meta.questionId === qId) {
            if (!titleEn && meta.questionTitle) titleEn = meta.questionTitle;
            if (options.length === 0 && Array.isArray(meta.options) && meta.options.length > 0) {
              options = meta.options;
            }
            if (!correctAnswer && meta.correctAnswer) correctAnswer = meta.correctAnswer;
          }
        }
      }

      // If options are still empty, build options from distinct selectedOptionIds
      if (options.length === 0) {
        const optionKeys = new Set<string>();
        qData.answers.forEach((a) => a.selectedOptionIds.forEach((id) => optionKeys.add(id)));
        if (optionKeys.size > 0) {
          options = Array.from(optionKeys).map((key, idx) => `Option ${idx + 1}`);
        }
      }

      // Option distribution
      const distribution: Record<string, number> = {};
      for (const ans of qData.answers) {
        for (const optId of ans.selectedOptionIds) {
          distribution[optId] = (distribution[optId] || 0) + 1;
        }
      }

      return {
        questionId: qId,
        titleEn: titleEn || 'Live Session Question',
        type: qEntity?.type || 'SINGLE_CHOICE',
        options,
        correctAnswer,
        points: qEntity?.points || 1,
        totalResponses: totalAnswers,
        correctCount: correctAnswers,
        accuracy,
        distribution,
        answers: qData.answers,
      };
    });

    // Per-learner overall summary
    const learnerMap = new Map<
      string,
      {
        userId: string;
        userName: string;
        email: string;
        answeredCount: number;
        correctCount: number;
        totalScore: number;
      }
    >();

    for (const q of questions) {
      for (const ans of q.answers) {
        if (!learnerMap.has(ans.userId)) {
          learnerMap.set(ans.userId, {
            userId: ans.userId,
            userName: ans.userName,
            email: ans.email,
            answeredCount: 0,
            correctCount: 0,
            totalScore: 0,
          });
        }
        const lEntry = learnerMap.get(ans.userId)!;
        lEntry.answeredCount += 1;
        if (ans.isCorrect) {
          lEntry.correctCount += 1;
        }
        lEntry.totalScore += ans.score;
      }
    }

    const learners = Array.from(learnerMap.values()).map((l) => ({
      ...l,
      scorePercent: l.answeredCount > 0 ? Math.round((l.correctCount / l.answeredCount) * 100) : 0,
    }));

    const totalResponses = logs.length;
    const totalCorrect = logs.filter((l) => (l.metadata as any)?.isCorrect).length;
    const overallAccuracy =
      totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0;

    return {
      sessionId,
      totalQuestions: questions.length,
      totalResponses,
      overallAccuracy,
      questions,
      learners,
    };
  }

  private async getDefaultAttendanceThreshold(): Promise<number> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key: 'default_attendance_threshold' },
    });
    if (setting?.value) {
      const parsed = parseInt(setting.value, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed <= 100) {
        return parsed;
      }
    }
    return 60;
  }
}
