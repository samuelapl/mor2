import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnrollmentStatus, NotificationType, SessionStatus } from '@prisma/client';
import { Job, Queue, Worker } from 'bullmq';
import { PrismaService } from '@config/prisma.service';
import { NotificationsService } from '@modules/notifications/notifications.service';
import {
  isQueueReachable,
  redisConnectionOptions,
  throttledRedisErrorLogger,
} from '@modules/mail/redis-connection';
import { enrollmentCoversSession } from './session-mode';

const REMINDER_QUEUE_NAME = 'session-reminders';

const LEADS = [
  { key: '24h', ms: 24 * 3600 * 1000, en: 'tomorrow', am: 'ነገ' },
  { key: '1h', ms: 3600 * 1000, en: 'in 1 hour', am: 'በ1 ሰዓት ውስጥ' },
] as const;

type LeadKey = (typeof LEADS)[number]['key'];

interface ReminderJob {
  sessionId: string;
  /** The start time the reminder was scheduled for; a rescheduled session makes it stale. */
  scheduledAt: string;
  lead: LeadKey;
}

/**
 * Sends in-app + email reminders 24 h and 1 h before each live session, as delayed BullMQ
 * jobs. Job ids include the start time, so rescheduling just adds new jobs; the old ones
 * notice the time changed when they fire and do nothing. Cancelled or deleted sessions are
 * caught the same way. On startup every upcoming session is (re)scheduled, which covers
 * sessions created while Redis was down — duplicate job ids are ignored by BullMQ.
 */
@Injectable()
export class SessionRemindersService
  implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(SessionRemindersService.name);
  private queue?: Queue<ReminderJob>;
  private worker?: Worker<ReminderJob>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const connection = redisConnectionOptions(this.configService);
    this.queue = new Queue<ReminderJob>(REMINDER_QUEUE_NAME, {
      connection: { ...connection, enableOfflineQueue: false, maxRetriesPerRequest: 1 },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        // Must outlive the 24 h lead, so a restart's re-scheduling finds the finished job
        // and does not send the reminder again.
        removeOnComplete: { age: 7 * 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 },
      },
    });
    this.queue.on('error', throttledRedisErrorLogger(this.logger, 'Reminder queue'));

    this.worker = new Worker<ReminderJob>(REMINDER_QUEUE_NAME, (job) => this.process(job), {
      connection: { ...connection, maxRetriesPerRequest: null },
    });
    this.worker.on('error', throttledRedisErrorLogger(this.logger, 'Reminder worker'));
    this.worker.on('failed', (job, err) =>
      this.logger.warn(`Session reminder ${job?.id} failed: ${err.message}`),
    );
  }

  onApplicationBootstrap() {
    void this.scheduleAllUpcoming();
  }

  async onModuleDestroy() {
    await Promise.all([
      this.worker?.close().catch(() => undefined),
      this.queue?.close().catch(() => undefined),
    ]);
  }

  /** Schedules the reminders for one session. Never throws. */
  async schedule(sessionId: string): Promise<void> {
    await this.scheduleWhere({ id: sessionId });
  }

  async scheduleMany(sessionIds: string[]): Promise<void> {
    if (sessionIds.length > 0) await this.scheduleWhere({ id: { in: sessionIds } });
  }

  private async scheduleAllUpcoming() {
    await this.scheduleWhere({});
  }

  private async scheduleWhere(where: { id?: string | { in: string[] } }) {
    try {
      if (!this.queue || !(await isQueueReachable(this.queue))) {
        this.logger.warn('Reminder queue unreachable — reminders will be scheduled on restart');
        return;
      }
      const now = Date.now();
      const sessions = await this.prisma.liveSession.findMany({
        where: {
          ...where,
          status: SessionStatus.SCHEDULED,
          deletedAt: null,
          scheduledAt: { gt: new Date(now) },
        },
        select: { id: true, scheduledAt: true },
      });

      const jobs = sessions.flatMap((s) =>
        LEADS.map((lead) => ({
          delay: s.scheduledAt.getTime() - lead.ms - now,
          data: { sessionId: s.id, scheduledAt: s.scheduledAt.toISOString(), lead: lead.key },
        }))
          .filter((j) => j.delay > 0)
          .map(({ delay, data }) => ({
            name: 'remind',
            data,
            opts: {
              delay,
              jobId: `session-${data.sessionId}-${new Date(data.scheduledAt).getTime()}-${data.lead}`,
            },
          })),
      );
      if (jobs.length > 0) await this.queue!.addBulk(jobs);
    } catch (err) {
      this.logger.warn(`Could not schedule session reminders: ${(err as Error).message}`);
    }
  }

  async process(job: Job<ReminderJob>): Promise<void> {
    const { sessionId, scheduledAt, lead: leadKey } = job.data;
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: { course: { select: { title: true } } },
    });

    const stillOn =
      session &&
      !session.deletedAt &&
      session.status === SessionStatus.SCHEDULED &&
      session.scheduledAt.toISOString() === scheduledAt &&
      session.scheduledAt.getTime() > Date.now();
    if (!stillOn) return;

    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseId: session.courseId, status: EnrollmentStatus.ACTIVE },
      select: { userId: true, deliveryMode: true, venueId: true, sessionId: true },
    });
    const learnerIds = [
      ...new Set(
        enrollments.filter((e) => enrollmentCoversSession(e, session)).map((e) => e.userId),
      ),
    ].filter((id) => id !== session.trainerId);

    const lead = LEADS.find((l) => l.key === leadKey)!;
    const when = this.formatTime(session.scheduledAt);
    const titleEn = session.titleEn;
    const titleAm = session.titleAm || session.titleEn;
    const titles = {
      en: `Session ${lead.en}: ${titleEn}`,
      am: `ክፍለ ጊዜ ${lead.am}፦ ${titleAm}`,
    };
    const bodies = {
      en: `"${titleEn}" (${session.course.title}) starts ${when}.`,
      am: `"${titleAm}" (${session.course.title}) የሚጀምረው ${when} ነው።`,
    };
    const metadata = { sessionId: session.id, courseId: session.courseId, lead: leadKey };

    await this.notificationsService.sendToMany(
      learnerIds,
      NotificationType.SESSION_REMINDER,
      titles,
      bodies,
      metadata,
    );
    if (session.trainerId) {
      await this.notificationsService.send(
        session.trainerId,
        NotificationType.SESSION_REMINDER,
        titles,
        bodies,
        { ...metadata, forTrainer: true },
      );
    }
  }

  private formatTime(date: Date): string {
    const timeZone = this.configService.get<string>('APP_TIMEZONE') || 'Africa/Addis_Ababa';
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  }
}
