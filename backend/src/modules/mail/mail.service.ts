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

    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(this.configService.get<string>('SMTP_PORT') || '465', 10),
        secure: this.configService.get<string>('SMTP_SECURE', 'true') === 'true',
        // auth is optional — MailHog and similar dev catchers need no credentials
        auth: user && pass ? { user, pass } : undefined,
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'SMTP is not configured (SMTP_HOST missing). ' +
          'Password-reset emails will NOT be sent. Set SMTP_HOST to enable email delivery.',
      );
    }
  }

  get isConfigured(): boolean {
    return this.transporter !== null;
  }

  /**
   * Sends a 6-digit OTP code for password reset.
   * NOTE: Never log the plaintext `code` value (except the dev fallback in `sendCodeEmail`).
   */
  async sendPasswordResetCode(to: string, code: string): Promise<void> {
    await this.sendCodeEmail(to, code, {
      kind: 'password reset code',
      subject: `${this.appName} — Your password reset code`,
      intro: 'Your password reset code is:',
      footer: "If you didn't request this, you can safely ignore this email.",
    });
  }

  /**
   * Sends the 6-digit code an admin-created account uses to set its own password on
   * first sign-in.
   */
  async sendFirstLoginCode(to: string, code: string): Promise<void> {
    await this.sendCodeEmail(to, code, {
      kind: 'first-login code',
      subject: `${this.appName} — Set your password`,
      intro: `Welcome to ${this.appName}! To finish signing in, enter this code and choose your own password:`,
      footer:
        "If you didn't just try to sign in, contact your administrator — someone may know your temporary password.",
    });
  }

  private async sendCodeEmail(
    to: string,
    code: string,
    copy: { kind: string; subject: string; intro: string; footer: string },
  ): Promise<void> {
    if (!this.transporter) {
      // Without SMTP nobody could ever receive the code; in development only, print it so
      // the flow can still be exercised locally.
      if (this.configService.get<string>('NODE_ENV') === 'development') {
        this.logger.warn(`[mail] SMTP not configured — DEV ONLY ${copy.kind} for ${to}: ${code}`);
      } else {
        this.logger.warn(`[mail] SMTP not configured — skipping ${copy.kind} email to ${to}`);
      }
      return;
    }

    const appName = this.appName;
    // Format as "123 456" for easy readability in the email body.
    const display = `${code.slice(0, 3)} ${code.slice(3)}`;

    await this.transporter.sendMail({
      from: this.from || undefined,
      to,
      subject: copy.subject,
      text: [
        `Hello,`,
        ``,
        `${copy.intro} ${code}`,
        `It expires in 10 minutes.`,
        ``,
        copy.footer,
      ].join('\n'),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
          <h2 style="color:#1e293b;margin:0 0 8px">${appName}</h2>
          <p style="color:#475569;font-size:14px;line-height:1.6">
            ${copy.intro}
          </p>
          <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#4f46e5;background:#eef2ff;display:inline-block;padding:12px 24px;border-radius:8px;margin:16px 0">
            ${display}
          </p>
          <p style="color:#94a3b8;font-size:12px">
            This code expires in 10 minutes.<br/>
            ${copy.footer}
          </p>
        </div>
      `,
    });
    this.logger.log(`Sent ${copy.kind} email to ${to}`);
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
