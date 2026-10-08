import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobsOptions, Queue } from 'bullmq';
import { MailService } from './mail.service';
import { EMAIL_QUEUE_NAME, EmailJob, EmailLocale, EmailPriority, QueuedEmail } from './email.types';
import {
  isQueueReachable,
  redisConnectionOptions,
  throttledRedisErrorLogger,
} from './redis-connection';

export const EMAIL_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 60_000 }, // 1m, 2m, 4m, 8m
  removeOnComplete: { age: 7 * 24 * 3600, count: 5000 },
  removeOnFail: false, // keep for inspection / manual retry
};

/**
 * Producer for the "email" queue: request handlers call these methods and return
 * immediately, `EmailProcessor` delivers the mail with retries.
 *
 * None of the methods throw. Redis is optional in this app (see PermissionsService), so when
 * it is unreachable account emails are sent inline instead — delivered, but without retries.
 * Notification emails are skipped then: the in-app notification still exists, and sending
 * hundreds of emails inside a request would stall it.
 */
@Injectable()
export class EmailQueue implements OnModuleDestroy {
  private readonly logger = new Logger(EmailQueue.name);
  private readonly queue: Queue<QueuedEmail, void, QueuedEmail['template']>;

  constructor(
    configService: ConfigService,
    private readonly mailService: MailService,
  ) {
    this.queue = new Queue<QueuedEmail, void, QueuedEmail['template']>(EMAIL_QUEUE_NAME, {
      connection: {
        ...redisConnectionOptions(configService),
        // Fail fast instead of buffering commands while Redis is down; we fall back inline.
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      },
      defaultJobOptions: EMAIL_JOB_OPTIONS,
    });
    this.queue.on('error', throttledRedisErrorLogger(this.logger, 'Email queue'));
  }

  async onModuleDestroy() {
    await this.queue.close().catch(() => undefined);
  }

  /** Whether emails actually leave the server (SMTP configured). */
  get isDeliveryConfigured(): boolean {
    return this.mailService.isConfigured;
  }

  passwordResetCode(to: string, code: string, locale: EmailLocale) {
    return this.enqueue(
      { template: 'password-reset-code', to, locale, data: { code } },
      EmailPriority.SECURITY,
    );
  }

  firstLoginCode(to: string, code: string, locale: EmailLocale) {
    return this.enqueue(
      { template: 'first-login-code', to, locale, data: { code } },
      EmailPriority.SECURITY,
    );
  }

  passwordChanged(to: string, locale: EmailLocale) {
    return this.enqueue(
      { template: 'password-changed', to, locale, data: {} },
      EmailPriority.SECURITY,
    );
  }

  emailVerificationCode(to: string, code: string, locale: EmailLocale) {
    return this.enqueue(
      { template: 'email-verification-code', to, locale, data: { code } },
      EmailPriority.SECURITY,
    );
  }

  /**
   * Emails copies of in-app notifications. The job id is the notification id, so a duplicate
   * enqueue can never send the same notification twice.
   */
  async notifications(notificationIds: string[]): Promise<void> {
    if (notificationIds.length === 0) return;
    try {
      if (!(await isQueueReachable(this.queue))) {
        this.logger.warn(
          `Email queue unreachable — skipping ${notificationIds.length} notification email(s)`,
        );
        return;
      }
      await this.queue.addBulk(
        notificationIds.map((notificationId) => ({
          name: 'notification-ref' as const,
          data: { template: 'notification-ref' as const, notificationId },
          opts: { jobId: `notification-${notificationId}`, priority: EmailPriority.NORMAL },
        })),
      );
    } catch (err) {
      this.logger.warn(
        `Could not queue ${notificationIds.length} notification email(s): ${(err as Error).message}`,
      );
    }
  }

  private async enqueue(job: EmailJob, priority: number): Promise<void> {
    try {
      if (await isQueueReachable(this.queue)) {
        await this.queue.add(job.template, job, { priority });
        return;
      }
      this.logger.warn(`Email queue unreachable — sending ${job.template} to ${job.to} inline`);
    } catch (err) {
      this.logger.warn(
        `Could not queue ${job.template} email to ${job.to} (${(err as Error).message}) — sending inline`,
      );
    }

    try {
      await this.mailService.deliver(job);
    } catch (err) {
      this.logger.error(`Failed to send ${job.template} email to ${job.to}: ${err}`);
    }
  }
}
