import { router } from 'expo-router';
import { CalendarDays, MapPin, Video } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Badge, Button, Card } from '@/components/ui';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';
import { formatTime } from '@/core/utils/formatters';

import type { ApiLiveSession } from '../types/live-session.types';
import { isInPerson } from '../utils/session-time';
import { StartsInBadge } from './StartsInBadge';

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
        <StartsInBadge seconds={session.startsInSeconds} />
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
      {inPerson && (session.venue?.id || session.id) ? (
        <View className="flex-row items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          {session.venue?.id ? (
            <View className="flex-1">
              <Button
                title={t('sessions.venue', { defaultValue: 'Venue' })}
                size="sm"
                variant="outline"
                onPress={() =>
                  router.push({
                    pathname: '/venue/[venueId]',
                    params: { venueId: session.venue!.id },
                  })
                }
              />
            </View>
          ) : null}
          <View className="flex-1">
            <Button
              title={t('sessions.checkIn', { defaultValue: 'Check-In' })}
              size="sm"
              variant="primary"
              onPress={() =>
                router.push({
                  pathname: '/session/[sessionId]/check-in',
                  params: { sessionId: session.id },
                })
              }
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}
