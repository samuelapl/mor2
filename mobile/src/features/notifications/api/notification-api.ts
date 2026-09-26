import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { Paginated } from '@/core/api/types';

import type { ApiNotification } from '../types/notification.types';

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (unreadOnly: boolean) => ['notifications', 'list', unreadOnly] as const,
  unread: ['notifications', 'unread-count'] as const,
};

type NotificationPage = Paginated<ApiNotification> & { unreadCount: number };

export function useNotifications(unreadOnly: boolean) {
  return useInfiniteQuery({
    queryKey: notificationKeys.list(unreadOnly),
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api.get<NotificationPage>(endpoints.notifications.mine, {
        // ⚠️ Any non-empty unreadOnly value counts as true — omit it for "all" (spec §10.1).
        params: { page: pageParam, limit: 20, ...(unreadOnly ? { unreadOnly: 'true' } : {}) },
      }),
    getNextPageParam: (last) => (last.meta.hasNextPage ? last.meta.page + 1 : undefined),
  });
}

/** Tab/bell badge — polled every 60 s while the app is in the foreground (architecture §6.10). */
export function useUnreadCount(enabled = true) {
  return useQuery({
    queryKey: notificationKeys.unread,
    queryFn: async () =>
      (await api.get<{ unreadCount: number }>(endpoints.notifications.unreadCount)).unreadCount,
    refetchInterval: 60_000,
    enabled,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<ApiNotification>(endpoints.notifications.markRead(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.patch<{ message: string }>(endpoints.notifications.markAllRead),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
