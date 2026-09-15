import { api } from "./client";
import type { ApiMeta, ApiNotification } from "./types";

/* -------------------------------------------------------------------------- */
/*  Notifications                                                               */
/* -------------------------------------------------------------------------- */

export async function fetchMyNotifications(
  params: { page?: number; limit?: number; unreadOnly?: boolean } = {},
): Promise<{ data: ApiNotification[]; meta: ApiMeta; unreadCount: number }> {
  return api<{ data: ApiNotification[]; meta: ApiMeta; unreadCount: number }>(
    "notifications/me",
    { query: params as Record<string, string | number | boolean | undefined> },
  );
}

export async function fetchUnreadCount(): Promise<{ unreadCount: number }> {
  return api<{ unreadCount: number }>("notifications/me/unread-count");
}

export async function markNotificationRead(id: string): Promise<ApiNotification> {
  return api<ApiNotification>(`notifications/${id}/read`, { method: "PATCH" });
}

export async function markAllNotificationsRead(): Promise<{ message: string }> {
  return api<{ message: string }>("notifications/me/read-all", { method: "PATCH" });
}