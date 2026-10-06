import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ErrorState, Screen, Skeleton } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { Alert } from '@/core/utils/alert';
import { liveSessionApi, LiveKitRoom, useMeetingStore, useSession } from '@/features/live-sessions';

/** In-app LiveKit room (WebView + LiveKit web SDK) with attendance heartbeats (spec §8.4–§8.5). */
export default function SessionRoomScreen() {
  const { t } = useTranslation();
  const online = useIsOnline();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const session = useSession(sessionId);
  const start = useMeetingStore((s) => s.start);
  const leave = useMeetingStore((s) => s.leave);
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!online) {
      Alert.alert(t('sessions.offlineTitle'), t('sessions.offlineBody'), [
        { text: t('common.ok'), onPress: () => router.back() },
      ]);
    }
  }, [online, t]);

  const token = useQuery({
    queryKey: ['live-sessions', 'livekit-token', sessionId, attempt],
    queryFn: () => liveSessionApi.livekitToken(sessionId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: online,
  });

  // Watch the session while in the room: the trainer ending it on the web closes it here too.
  const refetchSession = session.refetch;
  useEffect(() => {
    const timer = setInterval(() => void refetchSession(), 30_000);
    return () => clearInterval(timer);
  }, [refetchSession]);

  // Leaving the screen (back gesture, hardware back) ends attendance tracking.
  useEffect(
    () => () => {
      if (started.current) void leave();
    },
    [leave],
  );

  if (!online || token.isPending || session.isPending) {
    return (
      <Screen>
        <Skeleton height={240} />
      </Screen>
    );
  }
  if (token.isError || !token.data || !session.data) {
    return (
      <Screen>
        <ErrorState error={token.error ?? session.error} onRetry={() => setAttempt((n) => n + 1)} />
      </Screen>
    );
  }

  // ws://localhost:7880 (backend default) must point at the dev machine from the phone.
  const wsUrl = resolveMediaUrl(token.data.wsUrl) ?? token.data.wsUrl;
  const ended = session.data.status === 'COMPLETED' || session.data.status === 'CANCELLED';

  return (
    <View className="flex-1">
      <LiveKitRoom
        key={attempt}
        wsUrl={wsUrl}
        token={token.data.token}
        session={session.data}
        sessionEnded={ended}
        onConnected={() => {
          if (started.current) return;
          started.current = true;
          void start(session.data!);
          // Same as the web room: being in the virtual room checks the learner in.
          void liveSessionApi.checkIn(sessionId, 'VIRTUAL').catch(() => undefined);
        }}
        onLeave={() => {
          if (started.current) {
            started.current = false;
            void leave();
          }
          router.back();
        }}
        onRetry={() => setAttempt((n) => n + 1)}
      />
    </View>
  );
}
