import { EmailContext, EmailJob, RenderedEmail } from '../email.types';
import {
  emailVerificationCode,
  firstLoginCode,
  passwordChanged,
  passwordResetCode,
} from './auth.templates';
import { notification } from './notification.template';

export { escapeHtml } from './escape';

/** Renders a queued email job into its subject and bodies. */
export function renderEmail(job: EmailJob, ctx: EmailContext): RenderedEmail {
  switch (job.template) {
    case 'password-reset-code':
      return passwordResetCode(ctx, job.locale, job.data);
    case 'first-login-code':
      return firstLoginCode(ctx, job.locale, job.data);
    case 'password-changed':
      return passwordChanged(ctx, job.locale, job.data);
    case 'email-verification-code':
      return emailVerificationCode(ctx, job.locale, job.data);
    case 'notification':
      return notification(ctx, job.locale, job.data);
    default: {
      const unknown: never = job;
      throw new Error(`Unknown email template: ${(unknown as EmailJob).template}`);
    }
  }
}
