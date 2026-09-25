import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { buildOrderBy, buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
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

/**
 * Which sessions a user may list:
 * - `all`      — System Admin or live_session.manage_all
 * - `hosted`   — live_session.manage_own: only sessions they are the assigned trainer of
 * - `enrolled` — everyone else (learners): only sessions of courses they are enrolled in
 */
type SessionVisibility =
  | { kind: 'all' }
  | { kind: 'hosted' | 'enrolled'; where: Prisma.LiveSessionWhereInput };

@Injectable()
export class LiveSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly virtualSessions: VirtualSessionsService,
    private readonly inPersonSessions: InPersonSessionsService,
    private readonly permissions: PermissionsService,
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
   * enrollments see only virtual sessions.
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

    return {
      OR: enrollments.map((e): Prisma.LiveSessionWhereInput => {
        if (!isInPersonEnrollment(e)) {
          return { courseId: e.courseId, sessionType: SessionType.VIRTUAL, venueId: null };
        }
        if (e.sessionId) {
          return { id: e.sessionId, courseId: e.courseId };
        }
        return e.venueId
          ? { courseId: e.courseId, venueId: e.venueId }
          : { courseId: e.courseId, sessionType: SessionType.IN_PERSON };
      }),
    };
  }

  async create(courseId: string, dto: CreateSessionDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

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
      return tx.liveSession.create({
        data: {
          courseId,
          titleAm: dto.titleAm,
          titleEn: dto.titleEn,
          descriptionAm: dto.descriptionAm,
          descriptionEn: dto.descriptionEn,
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
          attendanceThreshold: dto.attendanceThreshold ?? 60,
        },
        include: {
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          venue: true,
        },
      });
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
            bodyEn: `A live training session has been scheduled for "${session.course?.titleEn || session.titleEn}" on ${new Date(session.scheduledAt).toLocaleString()}.`,
            bodyAm: `ለኮርስዎ የቀጥታ ክፍለ ጊዜ ተቀጥሯል።`,
            metadata: { sessionId: session.id, courseId } as any,
          })),
        });
      }
    } catch {
      // notification failure should not block session creation
    }

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

    // All-or-nothing: a conflict in any row (including with an earlier row of the same batch)
    // rolls back the whole batch instead of leaving it half-created.
    const createdSessions = await this.prisma.$transaction(async (tx) => {
      const created: any[] = [];
      for (const item of dto.venueSessions) {
        const venue = await this.inPersonSessions.assertVenueAvailable(
          item.venueId,
          new Date(item.scheduledAt),
          item.durationMinutes,
          undefined,
          tx,
        );

        const session = await tx.liveSession.create({
          data: {
            courseId: dto.courseId,
            titleAm: dto.titleAm || dto.titleEn,
            titleEn: `${dto.titleEn} (${venue.branch} - ${venue.name})`,
            descriptionAm: dto.descriptionAm,
            descriptionEn: dto.descriptionEn,
            sessionType: SessionType.IN_PERSON,
            platform: SessionPlatform.IN_PERSON,
            venueId: item.venueId,
            trainerId: item.trainerId || null,
            scheduledAt: new Date(item.scheduledAt),
            durationMinutes: item.durationMinutes,
          },
          include: {
            course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
            trainer: {
              select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
            },
            venue: true,
          },
        });
        created.push(session);
      }
      return created;
    });

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
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
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
    const withSeats = sessions.map(({ _count, attendees, ...session }) => ({
      ...session,
      ...(visibility.kind === 'enrolled' ? {} : { attendees }),
      bookedSeats: _count.enrollments,
    }));

    return buildPaginatedResponse(withSeats, total, page, limit);
  }

  async findById(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
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
      return tx.liveSession.update({
        where: { id },
        data: {
          titleAm: dto.titleAm,
          titleEn: dto.titleEn,
          descriptionAm: dto.descriptionAm,
          descriptionEn: dto.descriptionEn,
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
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
        },
      });
    });
  }

  async getJoinUrl(id: string, user?: AuthenticatedUser) {
    return this.virtualSessions.getJoinUrl(await this.findById(id), user);
  }

  async changeStatus(id: string, status: SessionStatus) {
    await this.findById(id);

    return this.prisma.liveSession.update({
      where: { id },
      data: { status },
    });
  }

  async softDelete(id: string) {
    await this.findById(id);

    return this.prisma.liveSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
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
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
          trainer: {
            select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
          },
          venue: true,
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    return buildPaginatedResponse(sessions, total, page, limit);
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

    if (question) {
      const correctAns = question.correctAnswer?.trim().toLowerCase();
      const selected = dto.selectedOptionIds.map((s) => s.trim().toLowerCase());

      if (correctAns) {
        isCorrect = selected.includes(correctAns);
      }
      score = isCorrect ? question.points : 0;
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
          selectedOptionIds: dto.selectedOptionIds,
          isCorrect,
          score,
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

      // Option distribution
      const distribution: Record<string, number> = {};
      for (const ans of qData.answers) {
        for (const optId of ans.selectedOptionIds) {
          distribution[optId] = (distribution[optId] || 0) + 1;
        }
      }

      return {
        questionId: qId,
        titleEn: qEntity?.question || 'Live Session Question',
        type: qEntity?.type || 'SINGLE_CHOICE',
        options: qEntity?.options || [],
        correctAnswer: qEntity?.correctAnswer,
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
}
