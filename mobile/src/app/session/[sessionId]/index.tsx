import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  CalendarDays,
  CircleCheck,
  KeyRound,
  MapPin,
  PlayCircle,
  QrCode,
  Radio,
  Video,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ErrorState,
  ProgressBar,
  Screen,
  Skeleton,
} from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { palette, useThemeColors } from '@/core/theme/colors';
import { formatDateTime } from '@/core/utils/formatters';
import {
  isCheckInOpen,
  isInPerson,
  isJoinable,
  liveSessionApi,
  useAttendanceVisibility,
  useMeetingStore,
  useMyAttendance,
  useSession,
} from '@/features/live-sessions';

/** Session details, join, attendance and check-in entry (spec §8.3–§8.8, architecture §6.8). */
export default function SessionScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const online = useIsOnline();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();

  const session = useSession(sessionId);
  const attendance = useMyAttendance();
  const visibility = useAttendanceVisibility(sessionId);
  const meeting = useMeetingStore();
  const inThisMeeting = meeting.active?.sessionId === sessionId;
  const [joining, setJoining] = useState(false);

  if (session.isPending) {
    return (
      <Screen>
        <Skeleton height={160} />
        <Skeleton height={100} />
      </Screen>
    );
  }
  if (session.isError || !session.data) {
    return (
      <Screen>
        <ErrorState error={session.error} onRetry={() => void session.refetch()} />
      </Screen>
    );
  }

  const data = session.data;
  const inPerson = isInPerson(data);
  const joinable = isJoinable(data);
  const checkInOpen = isCheckInOpen(data);
  const mine = attendance.data?.find((a) => a.sessionId === sessionId);
  const percentage =
    inThisMeeting && meeting.last ? meeting.last.percentage : (mine?.percentage ?? null);
  const threshold = meeting.last?.threshold ?? data.attendanceThreshold;
  const checkedIn = Boolean(mine?.checkInMethod) && mine?.status === 'PRESENT';
  const description = localized(data, 'description');

  const join = async () => {
    setJoining(true);
    try {
      if (data.platform === 'LIVEKIT') {
        router.push({ pathname: '/session/[sessionId]/room', params: { sessionId } });
        return;
      }
      const { joinUrl } = await liveSessionApi.joinUrl(sessionId);
      if (!joinUrl) {
        Alert.alert(t('sessions.join'), t('sessions.noJoinLink'));
        return;
      }
      await meeting.start(data);
      // Prefer the meeting app (Zoom/Meet/Teams); fall back to the in-app browser.
      const opened = await Linking.openURL(joinUrl).then(
        () => true,
        () => false,
      );
      if (!opened) await WebBrowser.openBrowserAsync(joinUrl);
    } catch (error) {
      Alert.alert(
        t('sessions.join'),
        error instanceof ApiError ? error.localizedMessage(locale) : t('common.somethingWrong'),
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: data.course?.code ?? t('screens.session') }} />
      <Screen
        refreshing={session.isRefetching}
        onRefresh={() => {
          void session.refetch();
          void attendance.refetch();
        }}
      >
        <Card className="gap-3">
          <View className="flex-row flex-wrap gap-2">
            {data.status === 'LIVE' ? <Badge label={t('sessions.live')} tone="live" /> : null}
            <Badge
              label={inPerson ? t('sessions.inPerson') : t('sessions.online')}
              tone={inPerson ? 'warning' : 'brand'}
            />
            <Badge label={t(`sessions.status.${data.status}`)} />
          </View>
          <AppText variant="title">{localized(data, 'title')}</AppText>
          {data.course ? (
            <AppText variant="muted">{localized(data.course, 'title')}</AppText>
          ) : null}
          <View className="flex-row items-center gap-2">
            <CalendarDays size={16} color={colors.textMuted} />
            <AppText>
              {formatDateTime(data.scheduledAt, locale)} ·{' '}
              {t('courses.minutes', { count: data.durationMinutes })}
            </AppText>
          </View>
          {!inPerson ? (
            <View className="flex-row items-center gap-2">
              <Video size={16} color={colors.textMuted} />
              <AppText>{t(`sessions.platform.${data.platform}`)}</AppText>
            </View>
          ) : null}
          {data.trainer ? (
            <View className="flex-row items-center gap-2">
              <Avatar
                uri={data.trainer.avatarUrl}
                firstName={data.trainer.firstName}
                lastName={data.trainer.lastName}
                size={28}
              />
              <AppText>
                {data.trainer.firstName} {data.trainer.lastName}
              </AppText>
            </View>
          ) : null}
          {description ? <AppText variant="muted">{description}</AppText> : null}
        </Card>

        {/* In-person: venue + check-in */}
        {inPerson ? (
          <>
            {data.venue ? (
              <Card
                onPress={() =>
                  router.push({ pathname: '/venue/[venueId]', params: { venueId: data.venue!.id } })
                }
                className="flex-row items-center gap-3"
              >
                <MapPin size={20} color={colors.primary} />
                <View className="flex-1">
                  <AppText className="font-semibold text-slate-900 dark:text-slate-50">
                    {data.venue.name}
                  </AppText>
                  <AppText variant="caption">
                    {[data.venue.building, data.venue.branch].filter(Boolean).join(' · ')}
                  </AppText>
                </View>
              </Card>
            ) : null}
            {checkedIn ? (
              <Card className="flex-row items-center gap-3">
                <CircleCheck size={22} color={colors.success} />
                <AppText className="flex-1 font-semibold text-green-700 dark:text-green-400">
                  {t('sessions.checkedIn', {
                    method: t(`sessions.method.${mine!.checkInMethod!}`),
                  })}
                </AppText>
              </Card>
            ) : (
              <Button
                title={t('screens.checkIn')}
                icon={<QrCode size={18} color={palette.white} />}
                disabled={!checkInOpen || !online}
                onPress={() =>
                  router.push({ pathname: '/session/[sessionId]/check-in', params: { sessionId } })
                }
                fullWidth
              />
            )}
            {!checkInOpen && !checkedIn ? (
              <AppText variant="caption" className="text-center">
                {t('sessions.checkInWindow')}
              </AppText>
            ) : null}
          </>
        ) : null}

        {/* Virtual: join + attendance tracking */}
        {!inPerson ? (
          <>
            {inThisMeeting ? (
              <Card className="gap-3 border-red-200 dark:border-red-900">
                <View className="flex-row items-center gap-2">
                  <Radio size={18} color={colors.danger} />
                  <AppText className="flex-1 font-semibold text-slate-900 dark:text-slate-50">
                    {t('sessions.inSession')}
                  </AppText>
                </View>
                <AppText variant="caption">{t('sessions.inSessionHint')}</AppText>
                <View className="flex-row gap-3">
                  <Button
                    title={t('sessions.rejoin')}
                    variant="outline"
                    className="flex-1"
                    onPress={join}
                    loading={joining}
                  />
                  <Button
                    title={t('sessions.iLeft')}
                    variant="danger"
                    className="flex-1"
                    onPress={() => void meeting.leave()}
                  />
                </View>
              </Card>
            ) : (
              <Button
                title={data.platform === 'LIVEKIT' ? t('sessions.joinInApp') : t('sessions.join')}
                icon={<Video size={18} color={palette.white} />}
                disabled={!joinable || !online}
                loading={joining}
                onPress={join}
                fullWidth
              />
            )}
            {!joinable && !inThisMeeting ? (
              <AppText variant="caption" className="text-center">
                {data.status === 'COMPLETED' || data.status === 'CANCELLED'
                  ? t('sessions.ended')
                  : t('sessions.joinWindow')}
              </AppText>
            ) : null}
            {data.meetingPassword ? (
              <View className="flex-row items-center justify-center gap-2">
                <KeyRound size={14} color={colors.textMuted} />
                <AppText variant="caption" selectable>
                  {t('sessions.meetingPassword')}: {data.meetingPassword}
                </AppText>
              </View>
            ) : null}
          </>
        ) : null}

        {/* Attendance % — only when the session allows learners to see it (spec §8.8) */}
        {visibility.data?.canView && percentage !== null ? (
          <Card className="gap-2">
            <View className="flex-row items-center justify-between">
              <AppText variant="label">{t('sessions.attendanceLabel')}</AppText>
              <AppText className="font-semibold text-slate-900 dark:text-slate-50">
                {Math.round(percentage)}% / {threshold}%
              </AppText>
            </View>
            <ProgressBar
              percent={percentage}
              tone={percentage >= threshold ? 'success' : 'brand'}
            />
          </Card>
        ) : null}

        {mine && !inThisMeeting ? (
          <View className="flex-row justify-center">
            <Badge
              label={t(`sessions.attendance.${mine.status}`)}
              tone={mine.status === 'PRESENT' ? 'success' : 'neutral'}
            />
          </View>
        ) : null}

        {data.recordingUrl && data.status === 'COMPLETED' ? (
          <Button
            title={t('sessions.watchRecording')}
            variant="secondary"
            icon={<PlayCircle size={18} color={colors.primary} />}
            onPress={() => void WebBrowser.openBrowserAsync(data.recordingUrl!)}
            fullWidth
          />
        ) : null}
      </Screen>
    </>
  );
}
