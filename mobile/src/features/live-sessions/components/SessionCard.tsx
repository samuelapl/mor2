import { CalendarDays, MapPin, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Card } from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatTime } from '@/core/utils/formatters';

import type { ApiLiveSession } from '../types/live-session.types';
import { isInPerson } from '../utils/session-time';

export function SessionCard({
  session,
  onPress,
}: {
  session: ApiLiveSession;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const inPerson = isInPerson(session);

  return (
    <Card onPress={onPress} className="gap-2">
      <View className="flex-row flex-wrap items-center gap-2">
        {session.status === 'LIVE' ? <Badge label={t('sessions.live')} tone="live" /> : null}
        <Badge
          label={inPerson ? t('sessions.inPerson') : t('sessions.online')}
          tone={inPerson ? 'warning' : 'brand'}
        />
        {session.course ? <AppText variant="caption">{session.course.code}</AppText> : null}
      </View>
      <AppText variant="heading" numberOfLines={2}>
        {localized(session, 'title')}
      </AppText>
      <View className="flex-row items-center gap-2">
        <CalendarDays size={14} color={colors.textMuted} />
        <AppText variant="caption">
          {formatTime(session.scheduledAt, locale)} ·{' '}
          {t('courses.minutes', { count: session.durationMinutes })}
        </AppText>
      </View>
      <View className="flex-row items-center gap-2">
        {inPerson ? (
          <MapPin size={14} color={colors.textMuted} />
        ) : (
          <Video size={14} color={colors.textMuted} />
        )}
        <AppText variant="caption" numberOfLines={1}>
          {inPerson
            ? [session.venue?.name, session.venue?.building, session.venue?.branch]
                .filter(Boolean)
                .join(' · ')
            : t(`sessions.platform.${session.platform}`)}
        </AppText>
      </View>
    </Card>
  );
}
