import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailContext, EmailJob } from './email.types';
import { renderEmail } from './templates';

/**
 * Delivers emails over SMTP. Callers should not use it directly: they go through
 * `EmailQueue`, whose worker calls `deliver` with retries.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly context: EmailContext;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.from = this.configService.get<string>('SMTP_FROM') || (user ?? '');
    this.context = {
      appName: this.configService.get<string>('APP_NAME') || 'ELTMS',
      appUrl: this.configService.get<string>('APP_PUBLIC_URL')?.replace(/\/+$/, '') || undefined,
    };

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '465', 10),
        secure: this.configService.get<string>('SMTP_SECURE', 'true') === 'true',
        // auth is optional — MailHog and similar dev catchers need no credentials
        auth: user && pass ? { user, pass } : undefined,
      });
      const port = this.configService.get<string>('SMTP_PORT') || '465';
      this.logger.log(
        `SMTP transporter initialized: ${host}:${port} (secure: ${this.configService.get<string>('SMTP_SECURE', 'true') === 'true'})`,
      );
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST missing). ' +
          'Emails will NOT be sent. Set SMTP_HOST to enable email delivery.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Renders and sends one email. Throws on SMTP errors so the queue can retry.
   * NOTE: Never log rendered bodies — they can contain one-time codes (except the dev
   * fallback below).
   */
  async deliver(job: EmailJob): Promise<void> {
    const { subject, html, text } = renderEmail(job, this.context);

    if (!this.transporter) {
      // Without SMTP nobody could ever receive the email; in development only, print it so
      // flows that depend on a code can still be exercised locally.
      const isDev =
        this.configService.get<string>('NODE_ENV') === 'development' ||
        this.configService.get<string>('APP_ENV') === 'development';
      if (isDev) {
        this.logger.warn(
          `[mail] SMTP not configured — DEV ONLY ${job.template} email for ${job.to}:\n${text}`,
        );
      } else {
        this.logger.warn(
          `[mail] SMTP not configured — skipping ${job.template} email to ${job.to}`,
        );
      }
      return;
    }

    await this.transporter.sendMail({
      from: this.from || undefined,
      to: job.to,
      subject,
      text,
      html,
    });
    this.logger.log(`Sent ${job.template} email to ${job.to}`);
  }
}
