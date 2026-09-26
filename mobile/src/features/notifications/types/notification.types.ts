import type { NotificationType } from '@/core/api/types';

/** GET /notifications/me item (spec §10.1). */
export interface ApiNotification {
  id: string;
  userId: string;
  type: NotificationType;
  titleEn: string;
  titleAm: string;
  bodyEn: string | null;
  bodyAm: string | null;
  /** Deep-link ids, e.g. { courseId }, { certificateId, courseId }, { assessmentId }. */
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}
