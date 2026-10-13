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
  useBookableRounds,
  useCourse,
  useSelfEnroll,
  type ApiInPersonRound,
  type SelfEnrollBody,
} from '@/features/courses';

type Mode = 'online' | 'inPerson';

/**
 * Enrollment choices (spec §4.2, architecture §6.4):
 * ONLINE_ONLY → no picker · BOTH → choose mode · IN_PERSON_ONLY → round required.
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

  const rounds = useBookableRounds(courseId, effectiveMode === 'inPerson');
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
      onError: () => void rounds.refetch(),
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
          <AppText variant="label">
            {t('courses.chooseRound', { defaultValue: t('courses.chooseSession') })}
          </AppText>
          {rounds.isPending ? (
            <Skeleton height={120} />
          ) : rounds.isError ? (
            <ErrorState error={rounds.error} onRetry={() => void rounds.refetch()} />
          ) : rounds.data.length === 0 ? (
            <EmptyState
              title={t('courses.noRounds', { defaultValue: t('courses.noSessions') })}
            />
          ) : (
            rounds.data.map((round) => (
              <RoundOption
                key={round.roundKey}
                round={round}
                selected={round.primarySessionId === sessionId}
                onPress={() => setSessionId(round.primarySessionId)}
              />
            ))
          )}
        </View>
      ) : null}

      <FormMessage message={formError} />
      <Button
        title={effectiveMode === 'inPerson' ? t('courses.reserveSeat') : t('courses.enrollOnline')}
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

function RoundOption({
  round,
  selected,
  onPress,
}: {
  round: ApiInPersonRound;
  selected: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const locale = useLocaleStore((s) => s.locale);
  const colors = useThemeColors();
  const full = round.isFull;

  return (
    <Card
      onPress={full ? undefined : onPress}
      className={cn(
        'gap-3 border-2',
        selected ? 'border-brand-600' : 'border-transparent',
        full && 'opacity-50',
      )}
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-row items-center gap-2">
          <Badge label={round.roundLabel} tone="brand" />
          <AppText variant="caption" className="font-semibold">
            {round.sessions.length}{' '}
            {round.sessions.length === 1 ? 'Classroom Session' : 'Classroom Sessions'}
          </AppText>
        </View>
        {full ? (
          <Badge label={t('courses.full')} tone="danger" />
        ) : round.capacity > 0 ? (
          <Badge label={t('courses.seatsLeft', { count: round.seatsLeft })} tone="success" />
        ) : null}
      </View>

      {round.venue ? (
        <View className="flex-row items-center gap-2">
          <MapPin size={14} color={colors.textMuted} />
          <AppText variant="caption" className="font-medium text-slate-700 dark:text-slate-200">
            {round.venue.name}
            {round.venue.building ? ` · ${round.venue.building}` : ''} · {round.venue.branch}
          </AppText>
        </View>
      ) : null}

      <View className="gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-700">
        {round.sessions.map((session, idx) => (
          <View key={session.id} className="gap-0.5">
            <AppText className="text-xs font-semibold text-slate-900 dark:text-slate-50">
              {idx + 1}. {localized(session, 'title')}
            </AppText>
            <View className="flex-row items-center gap-1.5">
              <CalendarDays size={12} color={colors.textMuted} />
              <AppText variant="caption">
                {formatDateTime(session.scheduledAt, locale)} ·{' '}
                {t('courses.minutes', { count: session.durationMinutes })}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

