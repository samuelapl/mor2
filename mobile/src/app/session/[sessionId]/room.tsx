import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import { ErrorState, Screen, Skeleton } from '@/components/ui';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
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

  useEffect(() => {
    if (!online) {
      Alert.alert(
        t('sessions.offlineTitle', { defaultValue: 'Connection Required' }),
        t('sessions.offlineBody', {
          defaultValue: 'Live sessions require an active internet connection to participate.',
        }),
        [{ text: t('common.ok'), onPress: () => router.back() }],
      );
    }
  }, [online, t]);

  const token = useQuery({
    queryKey: ['live-sessions', 'livekit-token', sessionId],
    queryFn: () => liveSessionApi.livekitToken(sessionId),
    staleTime: 0,
    gcTime: 0,
    retry: false,
    enabled: online,
  });

  // Leaving the screen (back gesture, hardware back) ends attendance tracking.
  useEffect(
    () => () => {
      if (started.current) void leave();
    },
    [leave],
  );

  if (!online) {
    return (
      <Screen>
        <Skeleton height={240} />
      </Screen>
    );
  }

  if (token.isPending || session.isPending) {
    return (
      <Screen>
        <Skeleton height={240} />
      </Screen>
    );
  }
  if (token.isError || !token.data || !session.data) {
    return (
      <Screen>
        <ErrorState error={token.error ?? session.error} onRetry={() => void token.refetch()} />
      </Screen>
    );
  }

  // ws://localhost:7880 (backend default) must point at the dev machine from the phone.
  const wsUrl = resolveMediaUrl(token.data.wsUrl) ?? token.data.wsUrl;

  return (
    <View className="flex-1">
      <LiveKitRoom
        wsUrl={wsUrl}
        token={token.data.token}
        sessionId={sessionId}
        session={session.data}
        onConnected={() => {
          if (started.current) return;
          started.current = true;
          void start(session.data!);
        }}
        onDisconnected={() => {
          if (started.current) {
            started.current = false;
            void leave();
          }
          router.back();
        }}
        onError={(message) => {
          console.warn('[LiveKitRoom error]:', message);
        }}
      />
    </View>
  );
}
