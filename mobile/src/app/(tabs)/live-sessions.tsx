import { router } from 'expo-router';
import { CalendarX, Radio } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, SectionList, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  SegmentedControl,
  Skeleton,
} from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatDate, formatDateTime } from '@/core/utils/formatters';
import {
  dayKey,
  SessionCard,
  useMeetingStore,
  useMyAttendance,
  useUpcomingSessions,
  type ApiLiveSession,
} from '@/features/live-sessions';

type Segment = 'upcoming' | 'past';

const attendanceTone = {
  PRESENT: 'success',
  LATE: 'warning',
  EXCUSED: 'neutral',
  ABSENT: 'danger',
} as const;

export default function LiveSessionsScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const [segment, setSegment] = useState<Segment>('upcoming');
  const upcoming = useUpcomingSessions();
  const attendance = useMyAttendance();
  const activeMeeting = useMeetingStore((s) => s.active);

  const dayLabel = (iso: string) => {
    const key = dayKey(iso);
    const today = dayKey(new Date().toISOString());
    const tomorrow = dayKey(new Date(Date.now() + 86_400_000).toISOString());
    if (key === today) return t('sessions.today');
    if (key === tomorrow) return t('sessions.tomorrow');
    return formatDate(iso, locale);
  };

  const sections = Object.values(
    (upcoming.data ?? []).reduce<Record<string, { title: string; data: ApiLiveSession[] }>>(
      (acc, s) => {
        const key = dayKey(s.scheduledAt);
        (acc[key] ??= { title: dayLabel(s.scheduledAt), data: [] }).data.push(s);
        return acc;
      },
      {},
    ),
  );

  const openSession = (sessionId: string) =>
    router.push({ pathname: '/session/[sessionId]', params: { sessionId } });

  const header = (
    <View className="gap-3 pb-2">
      <SegmentedControl
        value={segment}
        onChange={setSegment}
        options={[
          { value: 'upcoming', label: t('sessions.upcoming') },
          { value: 'past', label: t('sessions.past') },
        ]}
      />
      {activeMeeting ? (
        <Card
          onPress={() => openSession(activeMeeting.sessionId)}
          className="flex-row items-center gap-3 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
        >
          <Radio size={20} color={colors.danger} />
          <AppText className="flex-1 font-semibold text-red-700 dark:text-red-300">
            {t('sessions.inSessionBanner')}
          </AppText>
        </Card>
      ) : null}
    </View>
  );

  if (segment === 'past') {
    const past = (attendance.data ?? []).filter((a) => a.session);
    return (
      <Screen refreshing={attendance.isRefetching} onRefresh={() => void attendance.refetch()}>
        {header}
        {attendance.isPending ? (
          <Skeleton height={120} />
        ) : attendance.isError && !attendance.data ? (
          <ErrorState error={attendance.error} onRetry={() => void attendance.refetch()} />
        ) : past.length === 0 ? (
          <EmptyState
            icon={<CalendarX size={40} color={colors.textMuted} />}
            title={t('sessions.noHistory')}
          />
        ) : (
          past.map((row) => (
            <Card key={row.id} onPress={() => openSession(row.sessionId)} className="gap-2">
              <View className="flex-row items-center justify-between gap-2">
                <AppText
                  className="flex-1 font-semibold text-slate-900 dark:text-slate-50"
                  numberOfLines={2}
                >
                  {localized(row.session, 'title')}
                </AppText>
                <Badge
                  label={t(`sessions.attendance.${row.status}`)}
                  tone={attendanceTone[row.status]}
                />
              </View>
              <AppText variant="caption">
                {row.session.course?.code} · {formatDateTime(row.session.scheduledAt, locale)}
                {row.percentage !== null ? ` · ${Math.round(row.percentage)}%` : ''}
                {row.checkInMethod ? ` · ${t(`sessions.method.${row.checkInMethod}`)}` : ''}
              </AppText>
            </Card>
          ))
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll={false} contentClassName="p-0">
      <SectionList
        sections={sections}
        keyExtractor={(s) => s.id}
        contentContainerClassName="gap-3 p-4"
        ListHeaderComponent={header}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <AppText variant="label" className="pt-2">
            {section.title}
          </AppText>
        )}
        renderItem={({ item }) => (
          <SessionCard session={item} onPress={() => openSession(item.id)} />
        )}
        ListEmptyComponent={
          upcoming.isPending ? (
            <Skeleton height={120} />
          ) : upcoming.isError && !upcoming.data ? (
            <ErrorState error={upcoming.error} onRetry={() => void upcoming.refetch()} />
          ) : (
            <EmptyState
              icon={<CalendarX size={40} color={colors.textMuted} />}
              title={t('sessions.noUpcoming')}
              description={t('sessions.noUpcomingHint')}
            />
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={upcoming.isRefetching}
            onRefresh={() => void upcoming.refetch()}
          />
        }
        ListFooterComponent={
          upcoming.data && upcoming.data.length > 0 ? null : (
            <Button
              title={t('home.browseCatalog')}
              variant="ghost"
              onPress={() => router.navigate('/catalog')}
            />
          )
        }
      />
    </Screen>
  );
}
