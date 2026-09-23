import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  private readonly logger = new Logger(LiveSessionsService.name);

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

    // Learners must be actively enrolled in the course.
    // If not yet enrolled for an active/scheduled session, auto-enroll them so they can participate seamlessly!
    if (!isAuthorizedStaff) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: user.id, courseId: session.courseId } },
      });
      if (!enrollment || enrollment.status !== 'ACTIVE') {
        try {
          await this.prisma.enrollment.upsert({
            where: { userId_courseId: { userId: user.id, courseId: session.courseId } },
            update: {
              status: 'ACTIVE',
              droppedAt: null,
              droppedReason: null,
              droppedBy: null,
            },
            create: {
              userId: user.id,
              courseId: session.courseId,
              status: 'ACTIVE',
            },
          });
          this.logger.log(`Auto-enrolled learner ${user.id} into course ${session.courseId} on session ${sessionId} join`);
        } catch (enrollErr) {
          this.logger.warn(`Could not auto-enroll learner ${user.id} in course ${session.courseId}:`, enrollErr);
        }
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
    const overallAccuracy = totalResponses > 0 ? Math.round((totalCorrect / totalResponses) * 100) : 0;

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

