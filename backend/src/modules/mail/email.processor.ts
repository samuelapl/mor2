import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Worker } from 'bullmq';
import { MailService } from './mail.service';
import { EMAIL_QUEUE_NAME, QueuedEmail } from './email.types';
import { NotificationEmailResolver } from './notification-email.resolver';
import { redisConnectionOptions, throttledRedisErrorLogger } from './redis-connection';

const WORKER_CONCURRENCY = 5;
const DEFAULT_RATE_LIMIT_PER_SEC = 10;

/** BullMQ worker for the "email" queue. Runs inside the API process. */
@Injectable()
export class EmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailProcessor.name);
  private worker?: Worker<QueuedEmail>;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly notificationEmails: NotificationEmailResolver,
  ) {}

  onModuleInit() {
    const ratePerSec =
      parseInt(this.configService.get<string>('MAIL_RATE_LIMIT_PER_SEC') || '', 10) ||
      DEFAULT_RATE_LIMIT_PER_SEC;

    this.worker = new Worker<QueuedEmail>(EMAIL_QUEUE_NAME, (job) => this.process(job), {
      // Workers must wait on Redis indefinitely (BullMQ requirement).
      connection: { ...redisConnectionOptions(this.configService), maxRetriesPerRequest: null },
      concurrency: WORKER_CONCURRENCY,
      limiter: { max: ratePerSec, duration: 1000 },
    });

    this.worker.on('failed', (job, err) => this.onFailed(job, err));
    this.worker.on('error', throttledRedisErrorLogger(this.logger, 'Email worker'));
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined);
  }

  /** Errors propagate so BullMQ retries the job with backoff. */
  async process(job: Job<QueuedEmail>): Promise<void> {
    if (job.data.template !== 'notification-ref') {
      await this.mailService.deliver(job.data);
      return;
    }
    // Resolved now rather than at enqueue time, so an opt-out made meanwhile is respected.
    const email = await this.notificationEmails.resolve(job.data.notificationId);
    if (email) await this.mailService.deliver(email);
  }

  private onFailed(job: Job<QueuedEmail> | undefined, err: Error) {
    if (!job) {
      this.logger.error(`Email job failed: ${err.message}`);
      return;
    }
    // Never log job.data in full — it can contain one-time codes.
    const { template } = job.data;
    const to = 'to' in job.data ? job.data.to : `notification ${job.data.notificationId}`;
    const attempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= attempts) {
      this.logger.error(
        `Gave up on ${template} email to ${to} after ${job.attemptsMade} attempts (job ${job.id}): ${err.message}`,
      );
    } else {
      this.logger.warn(
        `${template} email to ${to} failed (attempt ${job.attemptsMade}/${attempts}, job ${job.id}), will retry: ${err.message}`,
      );
    }
  }
}
