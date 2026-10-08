export const EMAIL_QUEUE_NAME = 'email';

export type EmailLocale = 'en' | 'am';

/** BullMQ priority: lower runs first. Security emails must never wait behind bulk mail. */
export const EmailPriority = {
  SECURITY: 1,
  NORMAL: 5,
} as const;

interface EmailJobBase {
  to: string;
  locale: EmailLocale;
}

/**
 * Every email the queue can send. The worker renders it at delivery time, so a job only
 * carries the data a template needs, never pre-rendered HTML.
 */
export type EmailJob = EmailJobBase &
  (
    | { template: 'password-reset-code'; data: { code: string } }
    | { template: 'first-login-code'; data: { code: string } }
    | { template: 'password-changed'; data: Record<string, never> }
    | { template: 'email-verification-code'; data: { code: string } }
    | {
        template: 'notification';
        data: { title: string; body?: string; link?: { path: string; label: string } };
      }
  );

/**
 * Queued for every in-app notification. The worker looks up the notification and its user at
 * delivery time, so `sendToMany` stays a bulk insert plus one bulk enqueue.
 */
export interface NotificationEmailRef {
  template: 'notification-ref';
  notificationId: string;
}

/** What actually sits in the "email" queue. */
export type QueuedEmail = EmailJob | NotificationEmailRef;

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface EmailContext {
  appName: string;
  /** Public base URL of the web app, without a trailing slash. Links are omitted when unset. */
  appUrl?: string;
}

export function toEmailLocale(locale: string | null | undefined): EmailLocale {
  return locale === 'am' ? 'am' : 'en';
}
