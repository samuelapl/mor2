import type { Href } from 'expo-router';

import type { ApiNotification } from '../types/notification.types';

const str = (value: unknown) => (typeof value === 'string' && value ? value : null);

/** Where a notification should take the learner (architecture §6.10), or null for none. */
export function notificationHref(notification: ApiNotification): Href | null {
  const meta = notification.metadata ?? {};
  const certificateId = str(meta.certificateId);
  const assessmentId = str(meta.assessmentId);
  const sessionId = str(meta.sessionId);
  const courseId = str(meta.courseId);

  if (notification.type === 'CERTIFICATE_ISSUED') {
    return certificateId
      ? { pathname: '/certificates/[certificateId]', params: { certificateId } }
      : '/certificates';
  }
  if (assessmentId) return { pathname: '/quiz/[assessmentId]', params: { assessmentId } };
  if (sessionId) return { pathname: '/session/[sessionId]', params: { sessionId } };
  if (courseId) return { pathname: '/course/[courseId]', params: { courseId } };
  return null;
}
