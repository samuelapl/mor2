import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useKeepAwake } from 'expo-keep-awake';
import {
  AlertCircle,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  PhoneOff,
  Radio,
  RefreshCw,
  SwitchCamera,
  Users,
  Video,
  VideoOff,
  Volume2,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText, Avatar, Button } from '@/components/ui';
import { useLocalized } from '@/core/i18n';
import { palette } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { cn } from '@/core/utils/cn';
import { useSessionStore } from '@/features/auth';

import { useAttendanceVisibility } from '../api/live-session-api';
import { useLiveQuiz } from '../hooks/useLiveQuiz';
import { useMeetingStore } from '../store/meeting-store';
import type { ApiLiveSession } from '../types/live-session.types';
import type { LiveKitDataEvent } from '../types/livekit-events';
import { buildLiveKitRoomHtml } from '../utils/livekit-room-html';
import { LiveQuizOverlay } from './LiveQuizOverlay';
import {
  ChatSheet,
  ParticipantsSheet,
  type RoomChatMessage,
  type RoomParticipant,
} from './RoomSheets';

type ConnectionState = 'joining' | 'connected' | 'failed' | 'ended';

/** Disconnect reasons (livekit-client DisconnectReason) that mean the session is over for us. */
const ENDED_REASONS = new Set(['ROOM_DELETED', 'ROOM_CLOSED', 'PARTICIPANT_REMOVED']);

export interface LiveKitRoomProps {
  wsUrl: string;
  token: string;
  session: ApiLiveSession;
  /** The session was completed/cancelled on the server (polled by the screen). */
  sessionEnded?: boolean;
  onConnected: () => void;
  /** The learner left, or closed an ended/failed room. */
  onLeave: () => void;
  /** Fetch a fresh token and reconnect. */
  onRetry: () => void;
}

/**
 * The in-app live classroom. Media runs in a WebView (livekit-client); everything the learner
 * touches is native: mic/camera, chat, raise hand, participants and the trainer's live quiz.
 * It speaks the same data-channel protocol as the web room, so trainers on the web see mobile
 * learners' answers, hands and chat like any other participant.
 */
export function LiveKitRoom({
  wsUrl,
  token,
  session,
  sessionEnded = false,
  onConnected,
  onLeave,
  onRetry,
}: LiveKitRoomProps) {
  useKeepAwake();
  const { t } = useTranslation();
  const localized = useLocalized();
  const user = useSessionStore((s) => s.user);
  const attendance = useMeetingStore((s) => s.last);
  const visibility = useAttendanceVisibility(session.id);
  const webview = useRef<WebView>(null);
  const leavingRef = useRef(false);

  const userId = user?.id ?? '';
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : t('liveRoom.you');
  const sessionTitle = localized(session, 'title');
  const trainerName = session.trainer
    ? `${session.trainer.firstName} ${session.trainer.lastName}`
    : null;

  const [state, setState] = useState<ConnectionState>('joining');
  const [reconnecting, setReconnecting] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [endedReason, setEndedReason] = useState<'ended' | 'removed'>('ended');
  const [slowJoin, setSlowJoin] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [, requestMic] = useMicrophonePermissions();
  const [, requestCamera] = useCameraPermissions();

  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [screenShare, setScreenShare] = useState<string | null>(null);
  const [handRaised, setHandRaised] = useState(false);
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());

  const [chatOpen, setChatOpen] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [messages, setMessages] = useState<RoomChatMessage[]>([]);
  const [unread, setUnread] = useState(0);

  const run = useCallback((js: string) => webview.current?.injectJavaScript(`${js};true;`), []);
  const broadcast = useCallback(
    (event: LiveKitDataEvent) =>
      run(`window.eltms && window.eltms.broadcastData(${JSON.stringify(event)})`),
    [run],
  );

  const quiz = useLiveQuiz({ sessionId: session.id, userId, userName, broadcast });

  const html = useMemo(
    () =>
      buildLiveKitRoomHtml({ wsUrl, token, youLabel: t('liveRoom.you'), devNetworkFix: __DEV__ }),
    [wsUrl, token, t],
  );

  // Short-lived banner (e.g. "the trainer lowered your hand").
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (state !== 'joining') return;
    const timer = setTimeout(() => setSlowJoin(true), 12000);
    return () => clearTimeout(timer);
  }, [state]);

  // The trainer ended the session on the server: close the room for this learner too.
  useEffect(() => {
    if (!sessionEnded) return;
    leavingRef.current = true;
    run('window.eltms && window.eltms.leave()');
  }, [run, sessionEnded]);

  const announceHand = useCallback(
    (raised: boolean) =>
      broadcast({
        type: 'HAND_RAISE',
        payload: { userId, userName, raised, timestamp: Date.now() },
      }),
    [broadcast, userId, userName],
  );

  /** Things to (re)send whenever we (re)join: our raised hand, and a request for the live quiz. */
  const resyncRoom = useCallback(() => {
    quiz.requestSync();
    if (handRaised) announceHand(true);
  }, [announceHand, handRaised, quiz]);

  const handleEvent = (event: LiveKitDataEvent) => {
    if (event.type === 'HAND_RAISE') {
      const { userId: who, raised } = event.payload;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (raised) next.add(who);
        else next.delete(who);
        return next;
      });
      // A trainer lowering our hand.
      if (who === userId && !raised && handRaised) {
        setHandRaised(false);
        setNotice(t('liveRoom.handLowered'));
      }
      return;
    }
    quiz.handleEvent(event);
  };

  const onMessage = (e: WebViewMessageEvent) => {
    let m: any;
    try {
      m = JSON.parse(e.nativeEvent.data);
    } catch {
      return;
    }
    switch (m.type) {
      case 'connected':
        setState('connected');
        setReconnecting(false);
        setFailure(null);
        onConnected();
        resyncRoom();
        break;
      case 'reconnecting':
        setReconnecting(true);
        break;
      case 'reconnected':
        setReconnecting(false);
        resyncRoom();
        break;
      case 'disconnected':
        if (leavingRef.current) return;
        if (ENDED_REASONS.has(m.reason)) {
          setEndedReason(m.reason === 'PARTICIPANT_REMOVED' ? 'removed' : 'ended');
          setState('ended');
        } else {
          setFailure(
            m.reason === 'DUPLICATE_IDENTITY'
              ? t('liveRoom.duplicateIdentity')
              : t('sessions.connectionFailedBody'),
          );
          setState('failed');
        }
        break;
      case 'error':
        if (state === 'joining') {
          setFailure(String(m.message ?? ''));
          setState('failed');
        } else {
          setNotice(String(m.message ?? t('common.somethingWrong')));
        }
        break;
      case 'participants':
        setParticipants(m.participants ?? []);
        break;
      case 'screen-share':
        setScreenShare(m.active ? (m.presenter ?? '') : null);
        break;
      case 'media':
        if (typeof m.mic === 'boolean') setMic(m.mic);
        if (typeof m.cam === 'boolean') setCam(m.cam);
        break;
      case 'audio-blocked':
        setAudioBlocked(Boolean(m.blocked));
        break;
      case 'data-channel':
        handleEvent(m.event as LiveKitDataEvent);
        break;
      case 'chat': {
        const incoming: RoomChatMessage = {
          id: String(m.id ?? `${m.timestamp}-${m.fromIdentity}`),
          fromIdentity: m.fromIdentity ?? null,
          fromName: m.fromName || t('liveRoom.participant'),
          message: String(m.message ?? ''),
          timestamp: Number(m.timestamp) || Date.now(),
          isSelf: m.fromIdentity === userId,
        };
        setMessages((prev) =>
          prev.some((x) => x.id === incoming.id) ? prev : [...prev, incoming],
        );
        if (!chatOpen && !incoming.isSelf) setUnread((n) => n + 1);
        break;
      }
      case 'chat-sent':
        setMessages((prev) =>
          prev.map((x) => (x.id === m.clientId ? { ...x, id: String(m.id), pending: false } : x)),
        );
        break;
    }
  };

  const toggleMic = async () => {
    if (!mic && !(await requestMic()).granted) return;
    run(`window.eltms && window.eltms.setMic(${!mic})`);
  };
  const toggleCam = async () => {
    if (!cam && !(await requestCamera()).granted) return;
    run(`window.eltms && window.eltms.setCam(${!cam})`);
  };
  const toggleHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    announceHand(next);
  };

  const sendChat = (text: string) => {
    const clientId = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    setMessages((prev) => [
      ...prev,
      {
        id: clientId,
        fromIdentity: userId,
        fromName: userName,
        message: text,
        timestamp: Date.now(),
        isSelf: true,
        pending: true,
      },
    ]);
    run(
      `window.eltms && window.eltms.sendChat(${JSON.stringify(clientId)}, ${JSON.stringify(text)})`,
    );
  };

  const leave = () => {
    leavingRef.current = true;
    if (handRaised) announceHand(false);
    run('window.eltms && window.eltms.leave()');
    onLeave();
  };

  const confirmLeave = () =>
    Alert.alert(t('sessions.leaveConfirmTitle'), t('sessions.leaveConfirmBody'), [
      { text: t('sessions.stayInSession'), style: 'cancel' },
      { text: t('sessions.leave'), style: 'destructive', onPress: leave },
    ]);

  /* ---------------------------------------------------------- end states */

  if (state === 'failed' || state === 'ended' || sessionEnded) {
    const ended = state === 'ended' || sessionEnded;
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <View className="w-full max-w-sm items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <View
            className={cn(
              'h-14 w-14 items-center justify-center rounded-full',
              ended ? 'bg-sky-950' : 'bg-red-950',
            )}
          >
            {ended ? (
              <Radio size={28} color="#38bdf8" />
            ) : (
              <AlertCircle size={28} color="#ef4444" />
            )}
          </View>
          <AppText className="text-center text-lg font-bold text-white">
            {ended
              ? endedReason === 'removed'
                ? t('liveRoom.removedTitle')
                : t('sessions.sessionEndedTitle')
              : t('sessions.connectionFailedTitle')}
          </AppText>
          <AppText className="text-center text-sm leading-5 text-slate-300">
            {ended
              ? endedReason === 'removed'
                ? t('liveRoom.removedBody')
                : t('liveRoom.endedBody')
              : failure || t('sessions.connectionFailedBody')}
          </AppText>
          <View className="w-full gap-2 pt-1">
            {!ended ? (
              <Button
                title={t('sessions.retryConnection')}
                icon={<RefreshCw size={16} color="#fff" />}
                onPress={() => {
                  leavingRef.current = false;
                  setFailure(null);
                  setSlowJoin(false);
                  setState('joining');
                  onRetry();
                }}
                fullWidth
              />
            ) : null}
            <Button
              title={ended ? t('sessions.returnToDetails') : t('sessions.leave')}
              variant={ended ? 'primary' : 'outline'}
              onPress={onLeave}
              fullWidth
            />
          </View>
        </View>
      </View>
    );
  }

  /* ------------------------------------------------------------- the room */

  const trainerHere = participants.some((p) => p.role === 'trainer');

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1 rounded-full bg-red-600 px-2 py-0.5">
              <View className="h-1.5 w-1.5 rounded-full bg-white" />
              <AppText className="text-[10px] font-extrabold text-white">
                {t('sessions.live')}
              </AppText>
            </View>
            <AppText className="flex-1 text-sm font-bold text-white" numberOfLines={1}>
              {sessionTitle}
            </AppText>
          </View>
          <AppText className="mt-0.5 text-[11px] text-slate-400" numberOfLines={1}>
            {[
              trainerName,
              visibility.data?.canView && attendance
                ? t('liveRoom.attendance', { percent: Math.round(attendance.percentage) })
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('liveRoom.participantsTitle', { count: participants.length })}
          onPress={() => setPeopleOpen(true)}
          className="flex-row items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 active:bg-slate-700"
        >
          <Users size={15} color="#e2e8f0" />
          <AppText className="text-xs font-bold text-slate-100">
            {Math.max(1, participants.length)}
          </AppText>
          {raisedHands.size > 0 ? <Hand size={13} color="#facc15" /> : null}
        </Pressable>
      </View>

      {reconnecting ? (
        <Banner tone="warning">
          <ActivityIndicator size="small" color="#f59e0b" />
          <AppText className="text-xs font-semibold text-amber-200">
            {t('sessions.reconnectingBanner')}
          </AppText>
        </Banner>
      ) : null}
      {audioBlocked ? (
        <Pressable onPress={() => run('window.eltms && window.eltms.startAudio()')}>
          <Banner tone="info">
            <Volume2 size={15} color="#7dd3fc" />
            <AppText className="text-xs font-semibold text-sky-200">
              {t('liveRoom.enableAudio')}
            </AppText>
          </Banner>
        </Pressable>
      ) : null}
      {screenShare !== null ? (
        <Banner tone="info">
          <AppText className="text-xs font-semibold text-sky-200">
            {t('liveRoom.presenting', { name: screenShare || t('liveRoom.trainer') })}
          </AppText>
        </Banner>
      ) : null}

      {/* Stage */}
      <View className="relative flex-1">
        <WebView
          ref={webview}
          source={{ html, baseUrl: 'http://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          mixedContentMode="always"
          style={{ flex: 1, backgroundColor: palette.slate900 }}
          onMessage={onMessage}
        />

        {state === 'connected' && !trainerHere ? (
          <View pointerEvents="none" className="absolute inset-x-0 top-3 items-center">
            <View className="rounded-full bg-slate-900/90 px-3.5 py-1.5">
              <AppText className="text-xs font-semibold text-slate-300">
                {t('liveRoom.waitingTrainer')}
              </AppText>
            </View>
          </View>
        ) : null}

        {notice ? (
          <View pointerEvents="none" className="absolute inset-x-4 bottom-3 items-center">
            <View className="rounded-2xl bg-slate-800 px-4 py-2.5">
              <AppText className="text-center text-xs font-semibold text-white">{notice}</AppText>
            </View>
          </View>
        ) : null}

        {quiz.quiz && !quiz.visible ? (
          <Pressable
            onPress={quiz.reopen}
            className="absolute right-3 top-3 rounded-full bg-brand-600 px-3.5 py-2"
          >
            <AppText className="text-xs font-bold text-white">{t('liveRoom.openQuiz')}</AppText>
          </Pressable>
        ) : null}

        <LiveQuizOverlay quiz={quiz} />

        {state === 'joining' ? (
          <View className="absolute inset-0 items-center justify-center gap-4 bg-slate-950 px-8">
            {session.trainer ? (
              <Avatar
                uri={session.trainer.avatarUrl}
                firstName={session.trainer.firstName}
                lastName={session.trainer.lastName}
                size={64}
              />
            ) : null}
            <AppText className="text-center text-lg font-bold text-white">{sessionTitle}</AppText>
            <ActivityIndicator size="large" color="#818cf8" />
            <AppText className="text-center text-sm text-slate-400">
              {slowJoin ? t('liveRoom.slowJoin') : t('sessions.joiningSession')}
            </AppText>
            <Button title={t('common.cancel')} variant="outline" onPress={leave} />
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View className="flex-row items-start justify-around border-t border-slate-800 bg-slate-900 px-2 pb-3 pt-2.5">
        <Control
          label={mic ? t('liveRoom.micOn') : t('liveRoom.micOff')}
          onPress={toggleMic}
          tone={mic ? 'on' : 'off'}
        >
          {mic ? <Mic size={21} color="#fff" /> : <MicOff size={21} color="#fff" />}
        </Control>
        <Control
          label={cam ? t('liveRoom.camOn') : t('liveRoom.camOff')}
          onPress={toggleCam}
          tone={cam ? 'on' : 'off'}
        >
          {cam ? <Video size={21} color="#fff" /> : <VideoOff size={21} color="#fff" />}
        </Control>
        {cam ? (
          <Control
            label={t('liveRoom.flip')}
            onPress={() => run('window.eltms && window.eltms.flipCam()')}
          >
            <SwitchCamera size={21} color="#fff" />
          </Control>
        ) : null}
        <Control
          label={handRaised ? t('sessions.lowerHand') : t('sessions.raiseHand')}
          onPress={toggleHand}
          tone={handRaised ? 'accent' : undefined}
        >
          <Hand size={21} color={handRaised ? '#111827' : '#fff'} />
        </Control>
        <Control
          label={t('liveRoom.chat')}
          badge={unread}
          onPress={() => {
            setChatOpen(true);
            setUnread(0);
          }}
        >
          <MessageSquare size={21} color="#fff" />
        </Control>
        <Control label={t('sessions.leave')} onPress={confirmLeave} tone="danger">
          <PhoneOff size={21} color="#fff" />
        </Control>
      </View>

      <ChatSheet
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={messages}
        onSend={sendChat}
      />
      <ParticipantsSheet
        visible={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        participants={participants}
        raisedHands={raisedHands}
      />
    </View>
  );
}

function Banner({ tone, children }: { tone: 'warning' | 'info'; children: ReactNode }) {
  return (
    <View
      className={cn(
        'flex-row items-center justify-center gap-2 px-4 py-2',
        tone === 'warning' ? 'bg-amber-500/15' : 'bg-sky-500/10',
      )}
    >
      {children}
    </View>
  );
}

function Control({
  label,
  onPress,
  tone,
  badge = 0,
  children,
}: {
  label: string;
  onPress: () => void;
  tone?: 'on' | 'off' | 'accent' | 'danger';
  badge?: number;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="w-16 items-center gap-1"
    >
      <View
        className={cn(
          'h-12 w-12 items-center justify-center rounded-full',
          tone === 'danger'
            ? 'bg-red-600'
            : tone === 'accent'
              ? 'bg-yellow-400'
              : tone === 'off'
                ? 'bg-slate-700'
                : tone === 'on'
                  ? 'bg-brand-600'
                  : 'bg-slate-800',
        )}
      >
        {children}
        {badge > 0 ? (
          <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1">
            <AppText className="text-[10px] font-bold text-white">
              {badge > 9 ? '9+' : badge}
            </AppText>
          </View>
        ) : null}
      </View>
      <AppText className="text-[10px] font-medium text-slate-400" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}
