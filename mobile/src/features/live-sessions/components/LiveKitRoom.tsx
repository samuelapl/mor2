import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AppText } from '@/components/ui';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import { buildLiveKitRoomHtml } from '../utils/livekit-room-html';

export interface LiveKitRoomProps {
  wsUrl: string;
  token: string;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
}

/**
 * LiveKit room via the LiveKit web SDK inside a WebView (architecture §6.8). Learners join
 * listen-only; mic/camera ask for permission when first switched on.
 */
export function LiveKitRoom({
  wsUrl,
  token,
  onConnected,
  onDisconnected,
  onError,
}: LiveKitRoomProps) {
  const { t } = useTranslation();
  const webview = useRef<WebView>(null);
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [, requestMic] = useMicrophonePermissions();
  const [, requestCamera] = useCameraPermissions();

  const run = (js: string) => webview.current?.injectJavaScript(`${js};true;`);

  const toggleMic = async () => {
    if (!mic && !(await requestMic()).granted) return;
    run(`window.eltms && window.eltms.setMic(${!mic})`);
  };
  const toggleCam = async () => {
    if (!cam && !(await requestCamera()).granted) return;
    run(`window.eltms && window.eltms.setCam(${!cam})`);
  };

  return (
    <View className="flex-1 bg-slate-900">
      <WebView
        ref={webview}
        // http://localhost is a secure context (getUserMedia) and may open ws:// to the LAN server.
        source={{ html: buildLiveKitRoomHtml(wsUrl, token), baseUrl: 'http://localhost' }}
        originWhitelist={['*']}
        javaScriptEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        mediaCapturePermissionGrantType="grant"
        mixedContentMode="always"
        style={{ flex: 1, backgroundColor: palette.slate900 }}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data) as {
              type: string;
              count?: number;
              mic?: boolean;
              cam?: boolean;
              message?: string;
            };
            if (message.type === 'connected') onConnected();
            else if (message.type === 'disconnected') onDisconnected();
            else if (message.type === 'participants' && message.count)
              setParticipants(message.count);
            else if (message.type === 'media') {
              if (message.mic !== undefined) setMic(message.mic);
              if (message.cam !== undefined) setCam(message.cam);
            } else if (message.type === 'error') onError(message.message ?? 'Error');
          } catch {
            // ignore non-JSON messages
          }
        }}
      />
      <View className="flex-row items-center justify-center gap-5 bg-slate-950 px-4 py-4">
        <AppText className="absolute left-4 text-xs text-slate-400">
          {t('sessions.participants', { count: participants })}
        </AppText>
        <RoundButton
          label={mic ? t('sessions.muteMic') : t('sessions.unmuteMic')}
          active={mic}
          onPress={toggleMic}
        >
          {mic ? (
            <Mic size={22} color={palette.white} />
          ) : (
            <MicOff size={22} color={palette.white} />
          )}
        </RoundButton>
        <RoundButton
          label={cam ? t('sessions.cameraOff') : t('sessions.cameraOn')}
          active={cam}
          onPress={toggleCam}
        >
          {cam ? (
            <Video size={22} color={palette.white} />
          ) : (
            <VideoOff size={22} color={palette.white} />
          )}
        </RoundButton>
        <RoundButton
          label={t('sessions.leave')}
          danger
          onPress={() => run('window.eltms && window.eltms.leave()')}
        >
          <PhoneOff size={22} color={palette.white} />
        </RoundButton>
      </View>
    </View>
  );
}

function RoundButton({
  children,
  label,
  active,
  danger,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'h-14 w-14 items-center justify-center rounded-full',
        danger ? 'bg-red-600' : active ? 'bg-brand-600' : 'bg-slate-700',
      )}
    >
      {children}
    </Pressable>
  );
}
