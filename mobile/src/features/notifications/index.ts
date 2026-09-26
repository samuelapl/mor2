/**
 * Notifications feature — list, unread badge, deep links. Spec §10 · Architecture §6.10.
 * Push notifications are out of scope: the backend has no device-token endpoint.
 */
export {
  notificationKeys,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  useUnreadCount,
} from './api/notification-api';
export type * from './types/notification.types';
export { notificationHref } from './utils/deep-link';
