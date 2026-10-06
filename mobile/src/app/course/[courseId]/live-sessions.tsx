import { router, Stack, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CircleCheck, Radio, Video, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
  type BadgeTone,
} from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/formatters';
import { SessionQuizResults } from '@/features/live-sessions';
import { useCourseProgress, type LearnerSession } from '@/features/progress';

/** The course's online sessions: when, where, whether the learner attended, and quiz results. */
export default function CourseLiveSessionsScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const progress = useCourseProgress(courseId);
  const sessions = progress.data?.liveSessions ?? [];

  const status = (s: LearnerSession): { label: string; tone: BadgeTone; icon: typeof Radio } => {
    switch (s.status) {
      case 'TO_BE_SCHEDULED':
        return { label: t('courseSessions.toBeScheduled'), tone: 'neutral', icon: CalendarClock };
      case 'LIVE':
        return { label: t('courseSessions.liveNow'), tone: 'live', icon: Radio };
      case 'CANCELLED':
        return { label: t('sessions.status.CANCELLED'), tone: 'neutral', icon: XCircle };
      case 'COMPLETED':
        return s.attended
          ? { label: t('courseSessions.attended'), tone: 'success', icon: CircleCheck }
          : { label: t('courseSessions.missed'), tone: 'warning', icon: XCircle };
      default:
        return { label: t('sessions.upcoming'), tone: 'brand', icon: CalendarClock };
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: t('courseSessions.title') }} />
      <Screen
        contentClassName="gap-4 p-4 pb-10"
        refreshing={progress.isRefetching}
        onRefresh={() => void progress.refetch()}
      >
        <View className="flex-row items-start gap-3">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30">
            <Video size={22} color="#0284c7" />
          </View>
          <AppText className="flex-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {t('courseSessions.intro')}
          </AppText>
        </View>

        {progress.isPending ? (
          <Skeleton height={140} />
        ) : progress.isError ? (
          <ErrorState error={progress.error} onRetry={() => void progress.refetch()} />
        ) : sessions.length === 0 ? (
          <EmptyState title={t('courseSessions.none')} />
        ) : (
          sessions.map((s, i) => {
            const badge = status(s);
            const joinable = (s.status === 'LIVE' || s.status === 'SCHEDULED') && s.sessionId;
            return (
              <Card key={s.id} className="gap-3">
                <View className="flex-row items-start gap-3">
                  <View className="flex-1 gap-0.5">
                    <AppText className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {t('courseSessions.sessionN', { number: i + 1 })}
                    </AppText>
                    <AppText className="text-base font-semibold text-slate-900 dark:text-white">
                      {s.titleEn}
                    </AppText>
                    <AppText className="text-sm text-slate-600 dark:text-slate-300">
                      {s.scheduledAt
                        ? formatDateTime(s.scheduledAt, locale)
                        : t('courseSessions.dateTba')}
                      {s.durationMinutes
                        ? ` · ${t('courses.minutes', { count: s.durationMinutes })}`
                        : ''}
                    </AppText>
                    {s.platform || s.trainerName ? (
                      <AppText variant="caption">
                        {[
                          s.platform
                            ? t(`sessions.platform.${s.platform}`, { defaultValue: s.platform })
                            : null,
                          s.trainerName,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </AppText>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-1">
                    <badge.icon size={14} color={colors.textMuted} />
                    <Badge label={badge.label} tone={badge.tone} />
                  </View>
                </View>
                {joinable ? (
                  <Button
                    title={
                      s.status === 'LIVE'
                        ? t('courseSessions.joinNow')
                        : t('courseSessions.viewSession')
                    }
                    size="sm"
                    variant={s.status === 'LIVE' ? 'primary' : 'outline'}
                    onPress={() =>
                      router.push({
                        pathname: '/session/[sessionId]',
                        params: { sessionId: s.sessionId! },
                      })
                    }
                  />
                ) : null}
                {s.status === 'COMPLETED' && s.sessionId ? (
                  <View className="border-t border-slate-100 pt-3 dark:border-slate-800">
                    <SessionQuizResults sessionId={s.sessionId} />
                  </View>
                ) : null}
              </Card>
            );
          })
        )}
      </Screen>
    </>
  );
}
