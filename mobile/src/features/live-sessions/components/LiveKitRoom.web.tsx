import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import { buildLiveKitRoomHtml } from '../utils/livekit-room-html';
import type { LiveKitRoomProps } from './LiveKitRoom';

type RoomWindow = Window & {
  eltms?: { setMic: (on: boolean) => void; setCam: (on: boolean) => void; leave: () => void };
};

/** Web build of LiveKitRoom: the same room page in an iframe (the browser asks for mic/camera). */
export function LiveKitRoom({
  wsUrl,
  token,
  onConnected,
  onDisconnected,
  onError,
}: LiveKitRoomProps) {
  const { t } = useTranslation();
  const frame = useRef<HTMLIFrameElement>(null);
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [participants, setParticipants] = useState(1);
  const handlers = useRef({ onConnected, onDisconnected, onError });
  useEffect(() => {
    handlers.current = { onConnected, onDisconnected, onError };
  }, [onConnected, onDisconnected, onError]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.source !== frame.current?.contentWindow ||
        typeof event.data?.eltmsRoom !== 'string'
      )
        return;
      const message = JSON.parse(event.data.eltmsRoom) as {
        type: string;
        count?: number;
        mic?: boolean;
        cam?: boolean;
        message?: string;
      };
      if (message.type === 'connected') handlers.current.onConnected();
      else if (message.type === 'disconnected') handlers.current.onDisconnected();
      else if (message.type === 'participants' && message.count) setParticipants(message.count);
      else if (message.type === 'media') {
        if (message.mic !== undefined) setMic(message.mic);
        if (message.cam !== undefined) setCam(message.cam);
      } else if (message.type === 'error') handlers.current.onError(message.message ?? 'Error');
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const room = () => (frame.current?.contentWindow as RoomWindow | null)?.eltms;

  return (
    <View className="flex-1 bg-slate-900">
      <iframe
        ref={frame}
        title="live session"
        srcDoc={buildLiveKitRoomHtml(wsUrl, token)}
        allow="camera; microphone; autoplay; fullscreen"
        style={{ flex: 1, width: '100%', border: 0, background: palette.slate900 }}
      />
      <View className="flex-row items-center justify-center gap-5 bg-slate-950 px-4 py-4">
        <AppText className="absolute left-4 text-xs text-slate-400">
          {t('sessions.participants', { count: participants })}
        </AppText>
        <Round
          label={mic ? t('sessions.muteMic') : t('sessions.unmuteMic')}
          active={mic}
          onPress={() => room()?.setMic(!mic)}
        >
          {mic ? (
            <Mic size={22} color={palette.white} />
          ) : (
            <MicOff size={22} color={palette.white} />
          )}
        </Round>
        <Round
          label={cam ? t('sessions.cameraOff') : t('sessions.cameraOn')}
          active={cam}
          onPress={() => room()?.setCam(!cam)}
        >
          {cam ? (
            <Video size={22} color={palette.white} />
          ) : (
            <VideoOff size={22} color={palette.white} />
          )}
        </Round>
        <Round label={t('sessions.leave')} danger onPress={() => room()?.leave()}>
          <PhoneOff size={22} color={palette.white} />
        </Round>
      </View>
    </View>
  );
}

function Round({
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
