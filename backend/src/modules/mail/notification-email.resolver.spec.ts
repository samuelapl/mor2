import { NotificationType } from '@prisma/client';
import { NotificationEmailResolver, notificationLink } from './notification-email.resolver';

describe('notificationLink', () => {
  it.each([
    [NotificationType.COURSE_SUBMITTED, {}, '/content-approver/pending-approvals'],
    [NotificationType.COURSE_APPROVED, { courseId: 'c1' }, '/course-owner/content-status'],
    [NotificationType.CERTIFICATE_ISSUED, { courseId: 'c1' }, '/learner/certificates'],
    [NotificationType.ASSESSMENT_GRADED, { courseId: 'c1' }, '/learner/courses/c1'],
    [NotificationType.SYSTEM, { newsId: 'x', slug: 'tax-update' }, '/news/tax-update'],
    [NotificationType.SESSION_REMINDER, { sessionId: 's1' }, '/learner/live-sessions'],
    [
      NotificationType.SESSION_REMINDER,
      { sessionId: 's1', forTrainer: true },
      '/trainer/sessions/s1',
    ],
    [NotificationType.SYSTEM, null, '/'],
  ])('%s %j → %s', (type, metadata, path) => {
    expect(notificationLink(type, metadata as any, 'en').path).toBe(path);
  });
});

describe('NotificationEmailResolver', () => {
  const baseUser = {
    email: 'a@x.et',
    locale: 'en',
    isActive: true,
    deletedAt: null,
    emailNotifications: true,
  };
  const notification = (user: object | null) => ({
    id: 'n1',
    type: NotificationType.CERTIFICATE_ISSUED,
    titleEn: 'Certificate issued',
    titleAm: 'ሰርተፊኬት ተሰጥቷል',
    bodyEn: 'Well done',
    bodyAm: null,
    metadata: { courseId: 'c1' },
    user,
  });
  const resolverFor = (row: unknown) =>
    new NotificationEmailResolver({
      notification: { findUnique: jest.fn(async () => row) },
    } as any);

  it('builds the email in the user language, falling back to English per field', async () => {
    const job = await resolverFor(notification({ ...baseUser, locale: 'am' })).resolve('n1');
    expect(job).toMatchObject({
      template: 'notification',
      to: 'a@x.et',
      locale: 'am',
      data: { title: 'ሰርተፊኬት ተሰጥቷል', body: 'Well done', link: { path: '/learner/certificates' } },
    });
  });

  it.each([
    ['opted out', { emailNotifications: false }],
    ['inactive', { isActive: false }],
    ['deleted', { deletedAt: new Date() }],
  ])('skips users who are %s', async (_, patch) => {
    expect(await resolverFor(notification({ ...baseUser, ...patch })).resolve('n1')).toBeNull();
  });

  it('skips a notification that no longer exists', async () => {
    expect(await resolverFor(null).resolve('n1')).toBeNull();
  });
});
