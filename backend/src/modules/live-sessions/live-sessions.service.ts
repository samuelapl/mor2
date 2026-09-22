import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, SessionStatus } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { buildOrderBy, buildPaginationArgs, buildPaginatedResponse } from '@common/utils';
import { AuthenticatedUser, PaginationQuery } from '@common/interfaces';
import { CreateSessionDto, UpdateSessionDto, SubmitLiveQuizDto } from './dto';
import { BigBlueButtonProvider } from './providers/bigbluebutton.provider';
import { LiveKitProvider } from './providers/livekit.provider';
import { LiveKitConfig } from '@config/app.config';

@Injectable()
export class LiveSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bbbProvider: BigBlueButtonProvider,
    private readonly liveKitProvider: LiveKitProvider,
  ) {}

  async create(courseId: string, dto: CreateSessionDto) {
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });

    if (!course || course.deletedAt) {
      throw new NotFoundException('Course not found');
    }

    const session = await this.prisma.liveSession.create({
      data: {
        courseId,
        titleAm: dto.titleAm,
        titleEn: dto.titleEn,
        descriptionAm: dto.descriptionAm,
        descriptionEn: dto.descriptionEn,
        platform: dto.platform,
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
        trainer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
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

  async findAll(query: PaginationQuery & { status?: SessionStatus; courseId?: string; trainerId?: string }) {
    const { page, limit, skip } = buildPaginationArgs(query);
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const where: Prisma.LiveSessionWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.courseId ? { courseId: query.courseId } : {}),
      ...(query.trainerId ? { trainerId: query.trainerId } : {}),
    };

    const [sessions, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
          trainer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          attendees: true,
        },
      }),
      this.prisma.liveSession.count({ where }),
    ]);

    return buildPaginatedResponse(sessions, total, page, limit);
  }

  async findById(id: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        trainer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
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

    return this.prisma.liveSession.update({
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
        status: dto.status !== undefined ? dto.status : dto.scheduledAt ? SessionStatus.SCHEDULED : undefined,
        trainerId: dto.trainerId !== undefined ? (dto.trainerId || null) : undefined,
        allowViewAttendance: dto.allowViewAttendance !== undefined ? dto.allowViewAttendance : undefined,
        attendanceThreshold: dto.attendanceThreshold !== undefined ? dto.attendanceThreshold : undefined,
      },
      include: {
        course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
        trainer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });
  }

  async getJoinUrl(id: string, user?: AuthenticatedUser) {
    const session = await this.findById(id);

    const userName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
      : 'Guest';

    const isStaff = user
      ? user.roles?.some((r) =>
          ['TRAINER', 'COURSE_OWNER', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'].includes(r),
        ) ?? false
      : false;

    let externalUrl = session.externalUrl?.trim() || '';
    if (externalUrl && !externalUrl.startsWith('http://') && !externalUrl.startsWith('https://')) {
      externalUrl = `https://${externalUrl}`;
    }

    // BigBlueButton session
    if (session.meetingId?.startsWith('bbb-') || externalUrl.includes('/bigbluebutton/')) {
      const meetingId = session.meetingId || `bbb-${session.id}`;
      const joinUrl = this.bbbProvider.generateJoinUrl({
        meetingId,
        fullName: userName,
        isModerator: Boolean(isStaff),
        password: session.meetingPassword || undefined,
      });
      return { joinUrl, platform: session.platform };
    }

    // Jitsi Meet — inject display name and suppress the "Asking to join / Log in" screen
    if (externalUrl && (externalUrl.includes('meet.jit.si') || externalUrl.includes('jitsi'))) {
      const baseUrl = externalUrl.split('#')[0];
      // prejoinConfig.enabled=false disables the pre-join page; requireDisplayName=false
      // prevents the login prompt from blocking guest entry; enableWelcomePage=false prevents welcome page
      const jitsiJoinUrl = `${baseUrl}#userInfo.displayName="${encodeURIComponent(userName)}"&config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.requireDisplayName=false&config.enableWelcomePage=false&config.disableDeepLinking=true`;
      return { joinUrl: jitsiJoinUrl, platform: session.platform };
    }

    return { joinUrl: externalUrl, platform: session.platform };
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

  /**
   * Generate a LiveKit access token for a participant joining a LIVEKIT-platform session.
   * Verifies that the session exists and is active, and that learners are enrolled.
   */
  async getLiveKitToken(
    sessionId: string,
    user: AuthenticatedUser,
  ): Promise<{ token: string; wsUrl: string; roomName: string }> {
    const session = await this.findById(sessionId);

    const isStaff = user.roles?.some((r) =>
      ['TRAINER', 'COURSE_OWNER', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'].includes(r),
    ) ?? false;
    const isSessionTrainer = session.trainerId === user.id;
    const isAuthorizedStaff = isStaff || isSessionTrainer;

    if (session.status !== SessionStatus.SCHEDULED && session.status !== SessionStatus.LIVE) {
      if (isAuthorizedStaff) {
        await this.prisma.liveSession.update({
          where: { id: sessionId },
          data: { status: SessionStatus.LIVE, actualEndedAt: null },
        });
      } else {
        throw new BadRequestException('Session is not scheduled or live');
      }
    } else if (session.status === SessionStatus.SCHEDULED && isAuthorizedStaff) {
      await this.prisma.liveSession.update({
        where: { id: sessionId },
        data: { status: SessionStatus.LIVE, actualStartedAt: new Date() },
      });
    }

    // Learners must be actively enrolled in the course
    if (!isAuthorizedStaff) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: session.courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') {
        throw new ForbiddenException('You must be actively enrolled in this course to join');
      }
    }

    const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
    const roomName = session.id;

    const token = await this.liveKitProvider.generateToken(roomName, {
      identity: user.id,
      name: displayName,
      isTrainer: isAuthorizedStaff,
      metadata: { role: isAuthorizedStaff ? 'trainer' : 'learner', sessionId },
    });

    return { token, wsUrl: LiveKitConfig.url, roomName };
  }

  async upcomingForUser(userId?: string, query: PaginationQuery = {}) {
    const { page, limit, skip } = buildPaginationArgs(query);

    // Return all scheduled/live sessions so that institutional sessions scheduled
    // by training administrators are visible to all students and trainers
    const where: Prisma.LiveSessionWhereInput = {
      status: { in: [SessionStatus.SCHEDULED, SessionStatus.LIVE] },
      deletedAt: null,
    };

    const [sessions, total] = await Promise.all([
      this.prisma.liveSession.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
        include: {
          course: { select: { id: true, titleEn: true, titleAm: true, code: true } },
          trainer: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
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
  async submitQuizResponse(
    sessionId: string,
    user: AuthenticatedUser,
    dto: SubmitLiveQuizDto,
  ) {
    const session = await this.findById(sessionId);

    // Verify enrollment if learner
    const isStaff = user.roles?.some((r) =>
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
}

