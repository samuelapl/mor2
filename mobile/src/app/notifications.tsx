import { router, Stack } from 'expo-router';
import { Bell, BellOff } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, View } from 'react-native';

import {
  AppText,
  Button,
  EmptyState,
  ErrorState,
  Screen,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { formatDateTime } from '@/core/utils/formatters';
import {
  notificationHref,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
  type ApiNotification,
} from '@/features/notifications';

type Filter = 'all' | 'unread';

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useNotifications(filter === 'unread');
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const unread = list.data?.pages[0]?.unreadCount ?? 0;

  const open = (n: ApiNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const href = notificationHref(n);
    if (href) router.push(href);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Button
                title={t('notifications.markAll')}
                size="sm"
                variant="ghost"
                loading={markAll.isPending}
                onPress={() => markAll.mutate()}
              />
            ) : null,
        }}
      />
      <Screen scroll={false} contentClassName="p-0">
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          contentContainerClassName="gap-2 p-4"
          ListHeaderComponent={
            <View className="pb-2">
              <SegmentedControl
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: t('notifications.all') },
                  {
                    value: 'unread',
                    label: `${t('notifications.unread')}${unread ? ` (${unread})` : ''}`,
                  },
                ]}
              />
            </View>
          }
          renderItem={({ item }) => (
            <NotificationRow notification={item} onPress={() => open(item)} />
          )}
          ListEmptyComponent={
            list.isPending ? (
              <Skeleton height={80} />
            ) : list.isError && !list.data ? (
              <ErrorState error={list.error} onRetry={() => void list.refetch()} />
            ) : (
              <EmptyState
                icon={<BellOff size={40} color={colors.textMuted} />}
                title={
                  filter === 'unread' ? t('notifications.noneUnread') : t('notifications.none')
                }
              />
            )
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) void list.fetchNextPage();
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? <ActivityIndicator color={colors.primary} /> : null
          }
          refreshControl={
            <RefreshControl refreshing={list.isRefetching} onRefresh={() => void list.refetch()} />
          }
        />
      </Screen>
    </>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: ApiNotification;
  onPress: () => void;
}) {
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const unread = !notification.readAt;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'flex-row gap-3 rounded-2xl border p-4 active:opacity-80',
        unread
          ? 'border-brand-200 bg-brand-50 dark:border-brand-800 dark:bg-slate-800'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800',
      )}
    >
      <Bell size={20} color={unread ? colors.primary : colors.textMuted} />
      <View className="flex-1 gap-1">
        <AppText className={cn('text-sm text-slate-900 dark:text-slate-50', unread && 'font-bold')}>
          {localized(notification, 'title')}
        </AppText>
        {localized(notification, 'body') ? (
          <AppText variant="muted" numberOfLines={3}>
            {localized(notification, 'body')}
          </AppText>
        ) : null}
        <AppText variant="caption">{formatDateTime(notification.createdAt, locale)}</AppText>
      </View>
      {unread ? <View className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-600" /> : null}
    </Pressable>
  );
}
