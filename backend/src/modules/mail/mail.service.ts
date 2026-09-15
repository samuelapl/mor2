import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly appName: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    this.from = this.configService.get<string>('SMTP_FROM') || (user ?? '');
    this.appName = this.configService.get<string>('APP_NAME') || 'ELTMS';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '465', 10),
        secure: this.configService.get<string>('SMTP_SECURE', 'true') === 'true',
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing). ' +
          'Password-reset emails will NOT be sent. Configure these env vars to enable email delivery.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[mail] SMTP not configured — skipping password reset email to ${to}`);
      return;
    }

    const appName = this.appName;
    await this.transporter.sendMail({
      from: this.from || undefined,
      to,
      subject: `${appName} — Password reset`,
      text: [
        `Hello,`,
        ``,
        `You requested a password reset for your ${appName} account.`,
        `Open the link below to choose a new password (it expires within 60 minutes):`,
        ``,
        resetUrl,
        ``,
        `If you didn't request this, you can safely ignore this email.`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#1e293b;margin:0 0 8px">${appName}</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            You requested a password reset for your account.
            Open the link below to choose a new password
            <strong>within 60 minutes</strong>:
          </p>
          <p style="margin:20px 0">
            <a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px">
              Reset password
            </a>
          </p>
          <p style="color:#94a3b8;font-size:12px">
            If the button doesn't work, copy: ${resetUrl}<br />
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    });
    this.logger.log(`Sent password reset email to ${to}`);
  }

  async sendRegistrationApproved(to: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[mail] SMTP not configured — skipping approval email to ${to}`);
      return;
    }

    const appName = this.appName;
    await this.transporter.sendMail({
      from: this.from || undefined,
      to,
      subject: `${appName} — Your registration was approved`,
      text: [
        `Hello,`,
        ``,
        `Your ${appName} registration has been approved by an administrator.`,
        `You can now sign in to the training portal and start learning.`,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#1e293b;margin:0 0 8px">${appName}</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Your registration has been <strong>approved</strong>. You can now sign in to the
            training portal and start learning.
          </p>
        </div>
      `,
    });
    this.logger.log(`Sent registration-approval email to ${to}`);
  }

  async sendRegistrationRejected(to: string, reason?: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[mail] SMTP not configured — skipping rejection email to ${to}`);
      return;
    }

    const appName = this.appName;
    await this.transporter.sendMail({
      from: this.from || undefined,
      to,
      subject: `${appName} — Registration update`,
      text: [
        `Hello,`,
        ``,
        `Your ${appName} registration could not be approved.`,
        reason ? `Reason: ${reason}` : 'Please contact an administrator for more information.',
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#1e293b;margin:0 0 8px">${appName}</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            Your registration could not be approved.
            ${reason ? `<br />Reason: <strong>${reason}</strong>` : ''}
          </p>
          <p style="color:#94a3b8;font-size:12px">
            Please contact an administrator if you believe this is a mistake.
          </p>
        </div>
      `,
    });
    this.logger.log(`Sent registration-rejection email to ${to}`);
  }
}
