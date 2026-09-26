import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, CircleCheck, MapPin, Monitor, Users } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import {
  AppText,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Skeleton,
} from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { formatDateTime } from '@/core/utils/formatters';
import { FormMessage, useFormError } from '@/features/auth';
import {
  useBookableSessions,
  useCourse,
  useSelfEnroll,
  type ApiCourseSession,
  type SelfEnrollBody,
} from '@/features/courses';

type Mode = 'online' | 'inPerson';

/**
 * Enrollment choices (spec §4.2, architecture §6.4):
 * ONLINE_ONLY → no picker · BOTH → choose mode · IN_PERSON_ONLY → session required.
 */
export default function EnrollScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const course = useCourse(courseId);
  const deliveryMode = course.data?.deliveryMode;

  const [mode, setMode] = useState<Mode>(deliveryMode === 'IN_PERSON_ONLY' ? 'inPerson' : 'online');
  const effectiveMode: Mode =
    deliveryMode === 'IN_PERSON_ONLY'
      ? 'inPerson'
      : deliveryMode === 'ONLINE_ONLY'
        ? 'online'
        : mode;
  const [sessionId, setSessionId] = useState<string | null>(null);

  const sessions = useBookableSessions(courseId, effectiveMode === 'inPerson');
  const enroll = useSelfEnroll();
  const formError = useFormError(enroll.error);

  if (course.isPending) {
    return (
      <Screen>
        <Skeleton height={120} />
      </Screen>
    );
  }
  if (course.isError || !course.data) {
    return (
      <Screen>
        <ErrorState error={course.error} onRetry={() => void course.refetch()} />
      </Screen>
    );
  }

  const canSubmit = effectiveMode === 'online' || Boolean(sessionId);

  const submit = () => {
    const body: SelfEnrollBody =
      effectiveMode === 'online'
        ? { courseId }
        : { courseId, deliveryMode: 'IN_PERSON_ONLY', sessionId: sessionId! };
    enroll.mutate(body, {
      onSuccess: () => {
        Alert.alert(t('courses.enrollSuccess'));
        router.back();
      },
      // A seat may have filled up meanwhile — refresh the list so counts are current.
      onError: () => void sessions.refetch(),
    });
  };

  return (
    <Screen contentClassName="gap-5 p-5 pb-8">
      <AppText variant="heading">{localized(course.data, 'title')}</AppText>

      {deliveryMode === 'BOTH' ? (
        <View className="gap-3">
          <AppText variant="label">{t('courses.chooseMode')}</AppText>
          <ModeOption
            active={mode === 'online'}
            icon="online"
            title={t('courses.online')}
            hint={t('courses.onlineHint')}
            onPress={() => setMode('online')}
          />
          <ModeOption
            active={mode === 'inPerson'}
            icon="inPerson"
            title={t('courses.inPerson')}
            hint={t('courses.inPersonHint')}
            onPress={() => setMode('inPerson')}
          />
        </View>
      ) : null}

      {effectiveMode === 'inPerson' ? (
        <View className="gap-3">
          <AppText variant="label">{t('courses.chooseSession')}</AppText>
          {sessions.isPending ? (
            <Skeleton height={96} />
          ) : sessions.isError ? (
            <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
          ) : sessions.data.length === 0 ? (
            <EmptyState title={t('courses.noSessions')} />
          ) : (
            sessions.data.map((session) => (
              <SessionOption
                key={session.id}
                session={session}
                selected={session.id === sessionId}
                onPress={() => setSessionId(session.id)}
              />
            ))
          )}
        </View>
      ) : null}

      <FormMessage message={formError} />
      <Button
        title={t('courses.confirmEnroll')}
        onPress={submit}
        disabled={!canSubmit}
        loading={enroll.isPending}
        fullWidth
      />
    </Screen>
  );
}

function ModeOption({
  active,
  icon,
  title,
  hint,
  onPress,
}: {
  active: boolean;
  icon: Mode;
  title: string;
  hint: string;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const Icon = icon === 'online' ? Monitor : Users;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: active }}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3 rounded-2xl border-2 bg-white p-4 dark:bg-slate-800',
        active ? 'border-brand-600' : 'border-slate-200 dark:border-slate-700',
      )}
    >
      <Icon size={24} color={active ? colors.primary : colors.textMuted} />
      <View className="flex-1">
        <AppText className="font-semibold text-slate-900 dark:text-slate-50">{title}</AppText>
        <AppText variant="caption">{hint}</AppText>
      </View>
      {active ? <CircleCheck size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

function SessionOption({
  session,
  selected,
  onPress,
}: {
  session: ApiCourseSession;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const locale = useLocaleStore((s) => s.locale);
  const colors = useThemeColors();
  const capacity = session.venue?.capacity ?? 0;
  const seatsLeft = Math.max(0, capacity - session.bookedSeats);
  const full = capacity > 0 && seatsLeft === 0;

  return (
    <Card
      onPress={full ? undefined : onPress}
      className={cn(
        'gap-2 border-2',
        selected ? 'border-brand-600' : 'border-transparent',
        full && 'opacity-50',
      )}
    >
      <View className="flex-row items-start justify-between gap-2">
        <AppText className="flex-1 font-semibold text-slate-900 dark:text-slate-50">
          {localized(session, 'title')}
        </AppText>
        {full ? (
          <Badge label={t('courses.full')} tone="danger" />
        ) : capacity > 0 ? (
          <Badge label={t('courses.seatsLeft', { count: seatsLeft })} tone="success" />
        ) : null}
      </View>
      <View className="flex-row items-center gap-2">
        <CalendarDays size={14} color={colors.textMuted} />
        <AppText variant="caption">
          {formatDateTime(session.scheduledAt, locale)} ·{' '}
          {t('courses.minutes', { count: session.durationMinutes })}
        </AppText>
      </View>
      {session.venue ? (
        <View className="flex-row items-center gap-2">
          <MapPin size={14} color={colors.textMuted} />
          <AppText variant="caption">
            {session.venue.name}
            {session.venue.building ? ` · ${session.venue.building}` : ''} · {session.venue.branch}
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}
