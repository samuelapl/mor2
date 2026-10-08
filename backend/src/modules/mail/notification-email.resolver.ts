import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '@config/prisma.service';
import { EmailJob, EmailLocale, toEmailLocale } from './email.types';

type Metadata = Record<string, unknown> | null;

const LINK_LABELS: Record<
  'course' | 'certificates' | 'news' | 'session' | 'review' | 'app',
  Record<EmailLocale, string>
> = {
  course: { en: 'Open course', am: 'ኮርሱን ይክፈቱ' },
  certificates: { en: 'View certificates', am: 'ሰርተፊኬቶችን ይመልከቱ' },
  news: { en: 'Read announcement', am: 'ማስታወቂያውን ያንብቡ' },
  session: { en: 'View session', am: 'ክፍለ ጊዜውን ይመልከቱ' },
  review: { en: 'Review course', am: 'ኮርሱን ይገምግሙ' },
  app: { en: 'Open ELTMS', am: 'ELTMS ይክፈቱ' },
};

/** Web app page that matches a notification, for the email's button. */
export function notificationLink(
  type: NotificationType,
  metadata: Metadata,
  locale: EmailLocale,
): { path: string; label: string } {
  const str = (key: string) =>
    typeof metadata?.[key] === 'string' ? (metadata[key] as string) : undefined;
  const to = (path: string, label: keyof typeof LINK_LABELS) => ({
    path,
    label: LINK_LABELS[label][locale],
  });

  switch (type) {
    case NotificationType.COURSE_SUBMITTED:
      return to('/content-approver/pending-approvals', 'review');
    case NotificationType.COURSE_APPROVED:
    case NotificationType.COURSE_REJECTED:
    case NotificationType.COURSE_PUBLISHED:
      return to('/course-owner/content-status', 'course');
    case NotificationType.CERTIFICATE_ISSUED:
      return to('/learner/certificates', 'certificates');
    case NotificationType.SESSION_REMINDER: {
      const sessionId = str('sessionId');
      if (metadata?.forTrainer && sessionId) {
        return to(`/trainer/sessions/${encodeURIComponent(sessionId)}`, 'session');
      }
      return to('/learner/live-sessions', 'session');
    }
  }

  const slug = str('slug');
  if (slug) return to(`/news/${encodeURIComponent(slug)}`, 'news');
  const courseId = str('courseId');
  if (courseId) return to(`/learner/courses/${encodeURIComponent(courseId)}`, 'course');
  return to('/', 'app');
}

/** Turns a queued notification reference into the email to send, or null to skip it. */
@Injectable()
export class NotificationEmailResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(notificationId: string): Promise<EmailJob | null> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            email: true,
            locale: true,
            isActive: true,
            deletedAt: true,
            emailNotifications: true,
          },
        },
      },
    });
    const user = notification?.user;
    if (!notification || !user || !user.isActive || user.deletedAt || !user.emailNotifications) {
      return null;
    }

    const locale = toEmailLocale(user.locale);
    const am = locale === 'am';
    return {
      template: 'notification',
      to: user.email,
      locale,
      data: {
        title: (am && notification.titleAm) || notification.titleEn,
        body: (am && notification.bodyAm) || notification.bodyEn || undefined,
        link: notificationLink(notification.type, notification.metadata as Metadata, locale),
      },
    };
  }
}
