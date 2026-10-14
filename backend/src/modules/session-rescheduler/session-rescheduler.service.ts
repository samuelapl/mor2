import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@config/prisma.service';
import { CourseStatus, Prisma, SessionStatus, SessionType } from '@prisma/client';
import { addAppDaysAtTimeOf, formatAppDateTime } from '@common/utils';
import { SessionQuizGradingService } from '@modules/live-sessions/session-quiz-grading.service';
import { SessionRemindersService } from '@modules/live-sessions/session-reminders.service';
import { WorkingDayResolverService } from './working-day-resolver.service';
import {
  DEFAULT_RESCHEDULE_DAY_GAP,
  LIVE_SESSION_ENDED_EVENT,
  LIVE_SESSION_RESCHEDULE_DAY_GAP_KEY,
  LiveSessionEndedEvent,
} from './session-rescheduler.constants';

@Injectable()
export class SessionReschedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionReschedulerService.name);
  private reaperInterval: NodeJS.Timeout | null = null;
  private isProcessingReaper = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly workingDayResolver: WorkingDayResolverService,
    private readonly sessionQuizGrading: SessionQuizGradingService,
    private readonly reminders: SessionRemindersService,
  ) {}

  onModuleInit() {
    // Check for abandoned sessions every 5 minutes
    this.reaperInterval = setInterval(() => {
      void this.reapAbandonedSessions();
    }, 5 * 60 * 1000);
    this.logger.log('SessionReschedulerService initialized with Abandonment Reaper.');
  }

  onModuleDestroy() {
    if (this.reaperInterval) {
      clearInterval(this.reaperInterval);
      this.reaperInterval = null;
    }
  }

  /**
   * Responds to domain event 'live_session.ended'.
   * Fully decoupled via EventEmitter2.
   */
  @OnEvent(LIVE_SESSION_ENDED_EVENT, { async: true })
  async handleSessionEnded(event: LiveSessionEndedEvent): Promise<void> {
    this.logger.log(`Received ${LIVE_SESSION_ENDED_EVENT} for session ${event.sessionId}`);

    try {
      // 1. Concurrency & Idempotency guard:
      // Atomically mark rescheduleStatus as PROCESSED so duplicate clicks or co-host actions exit immediately
      const lockUpdate = await this.prisma.liveSession.updateMany({
        where: {
          id: event.sessionId,
          rescheduleStatus: { not: 'PROCESSED' },
        },
        data: {
          rescheduleStatus: 'PROCESSED',
        },
      });

      if (lockUpdate.count === 0) {
        this.logger.warn(`Session ${event.sessionId} has already been processed for rescheduling. Skipping duplicate.`);
        return;
      }

      // 2. Fetch the session details and its course
      const session = await this.prisma.liveSession.findUnique({
        where: { id: event.sessionId },
        include: {
          course: {
            select: {
              id: true,
              status: true,
              title: true,
              code: true,
              deletedAt: true,
            },
          },
          sessionPlan: {
            include: {
              assessments: {
                where: { type: 'SESSION_ASSESSMENT' },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      });

      if (!session || session.deletedAt || !session.course || session.course.deletedAt) {
        this.logger.warn(`Session or course no longer exists. Skipping rescheduling for ${event.sessionId}.`);
        return;
      }

      // Only published or approved courses have automated rolling session schedules
      if (
        session.course.status !== CourseStatus.APPROVED &&
        session.course.status !== CourseStatus.PUBLISHED
      ) {
        this.logger.log(
          `Course "${session.course.title}" status is ${session.course.status}. Skipping auto-reschedule.`,
        );
        return;
      }

      // Grade this round before its quizzes move to the next one. Ending from attendance or the
      // abandonment reaper does not grade; grading is idempotent, so a second run is harmless.
      try {
        await this.sessionQuizGrading.gradeSession(session.id);
      } catch (err) {
        this.logger.warn(
          `Grading session ${session.id} before rescheduling failed: ${(err as Error).message}`,
        );
      }

      // 3. Fetch configured institutional Day Gap (default 10 days)
      const dayGap = await this.getRescheduleDayGap();

      // 4. Find the latest upcoming scheduled session for this course (excluding the ended session)
      const latestUpcoming = await this.prisma.liveSession.findFirst({
        where: {
          courseId: session.courseId,
          id: { not: session.id },
          status: SessionStatus.SCHEDULED,
          scheduledAt: { gt: new Date() },
          deletedAt: null,
        },
        orderBy: { scheduledAt: 'desc' },
      });

      // 5. Fallback Anchor Date logic:
      // If upcoming sessions exist, anchor to the latest one (Nov 20).
      // If no upcoming sessions exist (e.g. final session just concluded), anchor to the session that just ended.
      const baseDate = latestUpcoming
        ? new Date(latestUpcoming.scheduledAt)
        : new Date(session.scheduledAt);

      // Raw candidate date = baseDate + dayGap days, at the session's start time of day.
      // Calendar days and times are read in the app time zone (EAT), not the server's.
      let rawTargetDate = addAppDaysAtTimeOf(baseDate, dayGap, session.scheduledAt);

      // Safety check: Ensure the candidate is strictly in the future
      if (rawTargetDate.getTime() <= Date.now()) {
        rawTargetDate = addAppDaysAtTimeOf(new Date(), dayGap, session.scheduledAt);
      }

      // 6. Working Day & Holiday Resolver (Skips Sundays and Ethiopian Public Holidays)
      const resolvedTargetDate = await this.workingDayResolver.resolveNextValidWorkingDay(rawTargetDate);

      // 7. Atomic transaction:
      // - Preserve original plan ID and order on completed session
      // - Release unique constraint on sessionPlanId so the new cycle session can attach to sessionPlan
      // - Create the new fresh LiveSession with 0 attendees
      const planId = session.sessionPlanId ?? session.originalPlanId ?? null;
      const plannedOrder = session.sessionPlan?.order ?? session.plannedOrder ?? null;

      const created = await this.prisma.$transaction(async (tx) => {
        // Clear sessionPlanId on completed session to respect Prisma's 1-to-1 @unique constraint,
        // while permanently retaining originalPlanId and plannedOrder for audit/certificates
        if (session.sessionPlanId) {
          await tx.liveSession.update({
            where: { id: session.id },
            data: {
              sessionPlanId: null,
              originalPlanId: planId,
              plannedOrder: plannedOrder,
            },
          });
        }

        // Spawn the new LiveSession iteration
        const newSession = await tx.liveSession.create({
          data: {
            courseId: session.courseId,
            sessionPlanId: planId,
            originalPlanId: planId,
            plannedOrder: plannedOrder,
            titleAm: session.titleAm,
            titleEn: session.titleEn,
            descriptionAm: session.descriptionAm,
            descriptionEn: session.descriptionEn,
            objectivesEn: session.objectivesEn,
            sessionType: session.sessionType,
            platform: session.platform,
            venueId: session.venueId,
            externalUrl: session.externalUrl,
            meetingId: session.meetingId,
            meetingPassword: session.meetingPassword,
            scheduledAt: resolvedTargetDate,
            durationMinutes: session.durationMinutes,
            trainerId: session.trainerId, // Inherited default trainer; publisher can edit manually anytime
            allowViewAttendance: session.allowViewAttendance,
            attendanceThreshold: await this.getDefaultAttendanceThreshold(tx),
            status: SessionStatus.SCHEDULED,
            isAutoRescheduled: true,
            rescheduleStatus: 'NONE',
          },
        });

        // A weighted quiz has one prepared quiz (assessmentId is unique): move it, with the
        // trainer's questions and points, to the new round. Earlier rounds' results are kept on
        // their attempts and attendance logs.
        if (session.sessionPlan?.assessments && session.sessionPlan.assessments.length > 0) {
          for (const [order, quiz] of session.sessionPlan.assessments.entries()) {
            await tx.sessionPreparedQuiz.upsert({
              where: { assessmentId: quiz.id },
              update: { sessionId: newSession.id, order },
              create: {
                sessionId: newSession.id,
                assessmentId: quiz.id,
                title: quiz.titleEn,
                timeLimitMinutes: quiz.timeLimitMinutes ?? 10,
                order,
              },
            });
          }
        }

        return newSession;
      });

      this.logger.log(
        `[Auto-Rescheduler] Created next iteration for "${session.titleEn}" scheduled on ${resolvedTargetDate.toISOString()} (Session ID: ${created.id})`,
      );

      // 24 h / 1 h reminders, like a session scheduled by hand.
      try {
        await this.reminders.schedule(created.id);
      } catch (err) {
        this.logger.warn(
          `Could not schedule reminders for ${created.id}: ${(err as Error).message}`,
        );
      }

      // 8. Targeted Notification Scoping:
      // Notify ONLY enrolled learners who have NOT yet attended this session topic in a previous cycle
      await this.dispatchTargetedNotifications(session.courseId, created, planId);
    } catch (err) {
      this.logger.error(
        `Failed to reschedule session ${event.sessionId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  /**
   * Reads configured Day Gap from system_settings, falling back to 10 days.
   */
  async getRescheduleDayGap(): Promise<number> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key: LIVE_SESSION_RESCHEDULE_DAY_GAP_KEY },
      });
      if (setting && setting.value) {
        const parsed = parseInt(setting.value, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (err) {
      this.logger.error(`Error reading ${LIVE_SESSION_RESCHEDULE_DAY_GAP_KEY}: ${(err as Error).message}`);
    }
    return DEFAULT_RESCHEDULE_DAY_GAP;
  }

  /**
   * Scoped notifications:
   * Avoids spamming learners who already completed this session topic in an earlier cycle.
   */
  private async dispatchTargetedNotifications(
    courseId: string,
    newSession: { id: string; titleEn: string; titleAm?: string | null; scheduledAt: Date },
    planId: string | null,
  ) {
    try {
      // 1. Get all active enrollments for this course
      const activeEnrollments = await this.prisma.enrollment.findMany({
        where: { courseId, status: 'ACTIVE' },
        select: { userId: true },
      });

      if (activeEnrollments.length === 0) return;
      const allLearnerIds = activeEnrollments.map((e) => e.userId);

      // 2. Find which learners already attended this specific topic in a completed session
      let attendedUserIds = new Set<string>();
      if (planId) {
        const priorSessions = await this.prisma.liveSession.findMany({
          where: {
            courseId,
            OR: [{ sessionPlanId: planId }, { originalPlanId: planId }],
            AND: [
              {
                OR: [
                  { status: SessionStatus.COMPLETED },
                  { sessionType: SessionType.IN_PERSON },
                ],
              },
            ],
          },
          select: { id: true },
        });

        if (priorSessions.length > 0) {
          const priorAttendances = await this.prisma.attendance.findMany({
            where: {
              sessionId: { in: priorSessions.map((s) => s.id) },
              userId: { in: allLearnerIds },
              status: { in: ['PRESENT', 'LATE'] },
            },
            select: { userId: true },
          });
          attendedUserIds = new Set(priorAttendances.map((a) => a.userId));
        }
      }

      // Filter: only learners who haven't completed this session topic yet
      const targetLearnerIds = allLearnerIds.filter((uid) => !attendedUserIds.has(uid));

      if (targetLearnerIds.length > 0) {
        await this.prisma.notification.createMany({
          data: targetLearnerIds.map((userId) => ({
            userId,
            type: 'SESSION_REMINDER' as any,
            titleEn: `Upcoming Live Session: ${newSession.titleEn}`,
            titleAm: `የቀጥታ ክፍለ-ጊዜ ተመድቧል፦ ${newSession.titleAm || newSession.titleEn}`,
            bodyEn: `A newly scheduled session for your course is set for ${formatAppDateTime(newSession.scheduledAt)}.`,
            bodyAm: `ለኮርስዎ አዲስ የቀጥታ ክፍለ-ጊዜ ተመድቧል።`,
            metadata: { sessionId: newSession.id, courseId } as any,
          })),
        });
      }
    } catch (err) {
      this.logger.warn(`Could not send scoped notifications for session ${newSession.id}: ${(err as Error).message}`);
    }
  }

  /**
   * Abandonment / Zero-Participant Reaper:
   * Identifies sessions in 'LIVE' status where the scheduled time + duration has passed
   * AND zero participants are connected for an extended duration (45+ minutes).
   * Gracefully marks them COMPLETED so the rolling loop is not permanently stalled.
   */
  async reapAbandonedSessions(): Promise<void> {
    if (this.isProcessingReaper) return;
    this.isProcessingReaper = true;

    try {
      const now = new Date();
      // Look for sessions that went LIVE, whose scheduled end was at least 45 minutes ago
      const potentialStalled = await this.prisma.liveSession.findMany({
        where: {
          status: SessionStatus.LIVE,
          deletedAt: null,
        },
        select: {
          id: true,
          courseId: true,
          sessionPlanId: true,
          titleEn: true,
          scheduledAt: true,
          durationMinutes: true,
          actualStartedAt: true,
        },
      });

      for (const session of potentialStalled) {
        const scheduledEnd = new Date(
          session.scheduledAt.getTime() + (session.durationMinutes || 60) * 60 * 1000,
        );
        const fortyFiveMinutesPastEnd = new Date(scheduledEnd.getTime() + 45 * 60 * 1000);

        if (now >= fortyFiveMinutesPastEnd) {
          // Check if there was any active attendee log in the last 45 minutes
          const recentActivity = await this.prisma.attendanceLog.findFirst({
            where: {
              sessionId: session.id,
              timestamp: { gte: new Date(now.getTime() - 45 * 60 * 1000) },
            },
          });

          // If no participant activity was logged in the past 45 minutes, mark as abandoned/completed
          if (!recentActivity) {
            this.logger.warn(
              `[Abandonment Reaper] Session "${session.titleEn}" (${session.id}) has had zero participants for 45+ minutes past scheduled end. Auto-completing.`,
            );

            await this.prisma.liveSession.update({
              where: { id: session.id },
              data: {
                status: SessionStatus.COMPLETED,
                actualEndedAt: now,
              },
            });

            // Trigger the rolling reschedule
            await this.handleSessionEnded({
              sessionId: session.id,
              courseId: session.courseId,
              sessionPlanId: session.sessionPlanId,
              endedAt: now,
            });
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error running Abandonment Reaper: ${(err as Error).message}`);
    } finally {
      this.isProcessingReaper = false;
    }
  }

  private async getDefaultAttendanceThreshold(tx: Prisma.TransactionClient): Promise<number> {
    const setting = await tx.systemSetting.findUnique({
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

