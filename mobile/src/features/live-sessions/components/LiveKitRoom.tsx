import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import {
  AlertCircle,
  CheckCircle2,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Radio,
  RefreshCw,
  Send,
  Timer,
  Video,
  VideoOff,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  ModalSheet,
  ProgressBar,
} from '@/components/ui';
import { palette } from '@/core/theme/colors';
import { Alert } from '@/core/utils/alert';
import { cn } from '@/core/utils/cn';
import { useLocalized } from '@/core/i18n';
import { useSessionStore } from '@/features/auth';

import { liveSessionApi } from '../api/live-session-api';
import type { ApiLiveSession } from '../types/live-session.types';
import type {
  LiveKitDataEvent,
  LiveQuizPayload,
  LiveQuizRevealPayload,
} from '../types/livekit-events';
import { buildLiveKitRoomHtml } from '../utils/livekit-room-html';

export type RoomConnectionState = 'joining' | 'connected' | 'reconnecting' | 'failed' | 'ended';

export interface LiveKitRoomProps {
  wsUrl: string;
  token: string;
  sessionId?: string;
  session?: ApiLiveSession;
  onConnected: () => void;
  onDisconnected: () => void;
  onError: (message: string) => void;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSelf: boolean;
}

export function LiveKitRoom({
  wsUrl,
  token,
  sessionId,
  session,
  onConnected,
  onDisconnected,
  onError,
}: LiveKitRoomProps) {
  const { t } = useTranslation();
  const localized = useLocalized();
  const webview = useRef<WebView>(null);
  const user = useSessionStore((s) => s.user);

  // Connection State Machine
  const [connectionState, setConnectionState] = useState<RoomConnectionState>('joining');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [statusDetail, setStatusDetail] = useState(
    t('sessions.establishingConnection', { defaultValue: 'Establishing secure LiveKit connection…' }),
  );
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [connectKey, setConnectKey] = useState(0);
  const [errorReason, setErrorReason] = useState<string | null>(null);

  // Audio / Video states
  const [mic, setMic] = useState(false);
  const [cam, setCam] = useState(false);
  const [participants, setParticipants] = useState(1);
  const [, requestMic] = useMicrophonePermissions();
  const [, requestCamera] = useCameraPermissions();

  // Screen share presentation state
  const [screenShare, setScreenShare] = useState<{ active: boolean; presenter?: string }>({
    active: false,
  });

  // Hand raise state
  const [handRaised, setHandRaised] = useState(false);

  // In-session chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Live Quiz & Polls state
  const [activeQuiz, setActiveQuiz] = useState<LiveQuizPayload | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizReveal, setQuizReveal] = useState<LiveQuizRevealPayload | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const quizStartTimeRef = useRef<number>(0);

  const sessionTitle = session ? localized(session, 'title') : 'Live Virtual Session';
  const trainerName = session?.trainer
    ? `${session.trainer.firstName} ${session.trainer.lastName}`
    : null;

  // Timeout guard for joining state
  useEffect(() => {
    if (connectionState !== 'joining') return;
    const timeout = setTimeout(() => {
      setStatusDetail(
        t('sessions.takingLonger', {
          defaultValue: 'Connection is taking longer than expected. Please wait…',
        }),
      );
    }, 12000);
    return () => clearTimeout(timeout);
  }, [connectionState, t]);

  const run = (js: string) => webview.current?.injectJavaScript(`${js};true;`);

  const broadcastEvent = (event: LiveKitDataEvent) => {
    run(`window.eltms && window.eltms.broadcastData(${JSON.stringify(event)})`);
  };

  const toggleMic = async () => {
    if (!mic && !(await requestMic()).granted) return;
    run(`window.eltms && window.eltms.setMic(${!mic})`);
  };

  const toggleCam = async () => {
    if (!cam && !(await requestCamera()).granted) return;
    run(`window.eltms && window.eltms.setCam(${!cam})`);
  };

  const toggleHandRaise = () => {
    const nextState = !handRaised;
    setHandRaised(nextState);
    broadcastEvent({
      type: 'HAND_RAISE',
      payload: {
        userId: user?.id || 'me',
        userName: user ? `${user.firstName} ${user.lastName}` : 'Learner',
        raised: nextState,
        timestamp: Date.now(),
      },
    });
  };

  const confirmLeave = () => {
    Alert.alert(
      t('sessions.leaveConfirmTitle', { defaultValue: 'Leave Session' }),
      t('sessions.leaveConfirmBody', {
        defaultValue: 'Are you sure you want to leave this live session?',
      }),
      [
        {
          text: t('sessions.stayInSession', { defaultValue: 'Stay' }),
          style: 'cancel',
        },
        {
          text: t('sessions.leave', { defaultValue: 'Leave' }),
          style: 'destructive',
          onPress: () => {
            run('window.eltms && window.eltms.leave()');
            onDisconnected();
          },
        },
      ],
    );
  };

  const sendChatMessage = () => {
    const text = chatInput.trim();
    if (!text) return;

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sender = user ? `${user.firstName} ${user.lastName}` : 'Learner';
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

    const newMsg: ChatMessage = {
      id,
      sender: 'You',
      text,
      time,
      isSelf: true,
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');

    broadcastEvent({
      type: 'CHAT_MESSAGE',
      payload: {
        id,
        userId: user?.id || 'me',
        sender,
        text,
        time,
      },
    });
  };

  // Live Quiz Timer Countdown
  useEffect(() => {
    if (!activeQuiz || quizSubmitted || secondsRemaining <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeQuiz, quizSubmitted, secondsRemaining]);

  const handleSelectQuizOption = (optionId: string) => {
    if (quizSubmitted) return;
    if (activeQuiz?.type === 'MULTIPLE_CHOICE') {
      setSelectedOptionIds((prev) =>
        prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId],
      );
    } else {
      setSelectedOptionIds([optionId]);
    }
  };

  const submitQuizAnswer = async () => {
    if (!activeQuiz || selectedOptionIds.length === 0 || quizSubmitted) return;
    setQuizSubmitted(true);

    const duration = Math.max(1, Math.round((Date.now() - quizStartTimeRef.current) / 1000));

    // 1. Broadcast over sub-50ms reliable WebRTC data channel
    broadcastEvent({
      type: 'QUIZ_ANSWER',
      payload: {
        questionId: activeQuiz.id,
        userId: user?.id || 'me',
        userName: user ? `${user.firstName} ${user.lastName}` : 'Learner',
        selectedOptionIds,
        submittedAt: Date.now(),
        responseDurationSeconds: duration,
      },
    });

    // 2. Persist to server backend API
    if (sessionId) {
      try {
        await liveSessionApi.submitQuizResponse(sessionId, {
          questionId: activeQuiz.id,
          selectedOptionIds,
          responseDurationSeconds: duration,
          questionTitle: activeQuiz.titleEn,
          options: activeQuiz.options.map((o) => o.textEn),
        });
      } catch {
        // Log silently; WebRTC data channel has already delivered the response to trainer
      }
    }
  };

  const handleRetry = () => {
    setErrorReason(null);
    setConnectionState('joining');
    setStatusDetail(
      t('sessions.establishingConnection', { defaultValue: 'Establishing secure LiveKit connection…' }),
    );
    setConnectKey((k) => k + 1);
  };

  // -------------------------------------------------------------
  // STATE: Connection Failed
  // -------------------------------------------------------------
  if (connectionState === 'failed') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <Card className="w-full max-w-sm items-center gap-4 border-red-900/40 bg-slate-900 p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-red-950/60 border border-red-800">
            <AlertCircle size={28} color="#ef4444" />
          </View>
          <AppText className="text-lg font-bold text-white text-center">
            {t('sessions.connectionFailedTitle', { defaultValue: 'Connection Failed' })}
          </AppText>
          <AppText className="text-center text-sm text-slate-300">
            {errorReason ||
              t('sessions.connectionFailedBody', {
                defaultValue:
                  'Could not connect to the live session room. Please verify your internet connection.',
              })}
          </AppText>
          <View className="w-full gap-2 pt-2">
            <Button
              title={t('sessions.retryConnection', { defaultValue: 'Retry Connection' })}
              icon={<RefreshCw size={16} color="#fff" />}
              onPress={handleRetry}
              fullWidth
            />
            <Button
              title={t('sessions.leave', { defaultValue: 'Leave Session' })}
              variant="outline"
              onPress={onDisconnected}
              fullWidth
            />
          </View>
        </Card>
      </View>
    );
  }

  // -------------------------------------------------------------
  // STATE: Session Ended
  // -------------------------------------------------------------
  if (connectionState === 'ended') {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-6">
        <Card className="w-full max-w-sm items-center gap-4 border-slate-800 bg-slate-900 p-6">
          <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-800 border border-slate-700">
            <Radio size={28} color="#38bdf8" />
          </View>
          <AppText className="text-lg font-bold text-white text-center">
            {t('sessions.sessionEndedTitle', { defaultValue: 'Session Concluded' })}
          </AppText>
          <AppText className="text-center text-sm text-slate-300">
            {t('sessions.sessionEndedBody', {
              defaultValue: 'The trainer has ended this live session.',
            })}
          </AppText>
          <Button
            title={t('sessions.returnToDetails', { defaultValue: 'Return to Session Details' })}
            onPress={onDisconnected}
            className="mt-2"
            fullWidth
          />
        </Card>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      {/* ------------------------------------------------------------- */}
      {/* STATE: Professional Joining Screen Overlay                      */}
      {/* ------------------------------------------------------------- */}
      {connectionState === 'joining' ? (
        <View className="absolute inset-0 z-30 items-center justify-center bg-slate-950 px-6">
          <Card className="w-full max-w-sm items-center gap-4 border-slate-800 bg-slate-900/90 p-6 backdrop-blur-md">
            <View className="flex-row items-center gap-2">
              <View className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <Badge label="LIVE VIRTUAL SESSION" tone="brand" />
            </View>

            <AppText className="text-center text-lg font-bold text-white" numberOfLines={2}>
              {sessionTitle}
            </AppText>

            {session?.course ? (
              <AppText variant="caption" className="text-slate-400 font-medium">
                {session.course.code}
              </AppText>
            ) : null}

            {session?.trainer ? (
              <View className="flex-row items-center gap-3 rounded-xl bg-slate-800/80 px-4 py-2.5 border border-slate-700/60 w-full">
                <Avatar
                  uri={session.trainer.avatarUrl}
                  firstName={session.trainer.firstName}
                  lastName={session.trainer.lastName}
                  size={36}
                />
                <View className="flex-1">
                  <AppText className="text-sm font-semibold text-white">
                    {trainerName}
                  </AppText>
                  <AppText variant="caption" className="text-slate-400">
                    Session Trainer
                  </AppText>
                </View>
              </View>
            ) : null}

            <View className="items-center gap-2 py-3">
              <ActivityIndicator size="large" color="#3b82f6" />
              <AppText className="text-base font-semibold text-white">
                {t('sessions.joiningSession', { defaultValue: 'Joining session...' })}
              </AppText>
              <AppText variant="caption" className="text-center text-slate-400">
                {statusDetail}
              </AppText>
            </View>

            <Button
              title={t('common.cancel', { defaultValue: 'Cancel' })}
              variant="outline"
              onPress={onDisconnected}
              fullWidth
            />
          </Card>
        </View>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* Reconnecting Non-Blocking Top Banner                          */}
      {/* ------------------------------------------------------------- */}
      {isReconnecting ? (
        <View className="z-20 flex-row items-center justify-center gap-2 bg-amber-500/20 px-4 py-2 border-b border-amber-500/40">
          <ActivityIndicator size="small" color="#f59e0b" />
          <AppText className="text-xs font-semibold text-amber-200">
            {t('sessions.reconnectingBanner', {
              defaultValue: 'Connection Interrupted · Reconnecting…',
            })}
          </AppText>
        </View>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* Top Session Info Header (when connected)                     */}
      {/* ------------------------------------------------------------- */}
      <View className="flex-row items-center justify-between bg-slate-900/90 px-4 py-2.5 border-b border-slate-800">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center gap-2">
            <View className="flex-row items-center gap-1.5 rounded-full bg-red-950/80 border border-red-800 px-2 py-0.5">
              <View className="h-2 w-2 rounded-full bg-red-500" />
              <AppText className="text-[10px] font-bold text-red-300">LIVE</AppText>
            </View>
            <AppText className="text-xs font-bold text-white" numberOfLines={1}>
              {sessionTitle}
            </AppText>
          </View>
          {trainerName ? (
            <AppText variant="caption" className="text-slate-400 mt-0.5" numberOfLines={1}>
              Trainer: {trainerName}
            </AppText>
          ) : null}
        </View>

        <Badge
          label={t('sessions.participants', { count: participants })}
          tone="neutral"
        />
      </View>

      {/* Top Banner when Trainer is sharing screen */}
      {screenShare.active ? (
        <View className="flex-row items-center justify-between bg-sky-950/80 px-4 py-2 border-b border-sky-800/50">
          <View className="flex-row items-center gap-2">
            <Monitor size={16} color="#38bdf8" />
            <AppText className="text-xs font-semibold text-sky-200">
              {screenShare.presenter
                ? `${screenShare.presenter}'s Screen`
                : t('sessions.trainerPresentation', {
                    defaultValue: 'Trainer Screen Presentation',
                  })}
            </AppText>
          </View>
          <Badge label="Live Stream" tone="brand" />
        </View>
      ) : null}

      {/* ------------------------------------------------------------- */}
      {/* Stage Area: LiveKit WebView & In-Room Waiting Placeholder      */}
      {/* ------------------------------------------------------------- */}
      <View className="flex-1 relative bg-slate-950">
        {/* LiveKit WebView is always mounted so audio & WebRTC stay alive */}
        <WebView
          key={`livekit-webview-${connectKey}`}
          ref={webview}
          source={{ html: buildLiveKitRoomHtml(wsUrl, token), baseUrl: 'http://localhost' }}
          originWhitelist={['*']}
          javaScriptEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mediaCapturePermissionGrantType="grant"
          mixedContentMode="always"
          style={{
            flex: 1,
            backgroundColor: palette.slate900,
            opacity: hasRemoteVideo || screenShare.active ? 1 : 0.05,
          }}
          onMessage={(event) => {
            try {
              const message = JSON.parse(event.nativeEvent.data);
              if (message.type === 'connected') {
                setConnectionState('connected');
                setIsReconnecting(false);
                onConnected();
              } else if (message.type === 'reconnecting') {
                setIsReconnecting(true);
              } else if (message.type === 'reconnected') {
                setIsReconnecting(false);
              } else if (message.type === 'disconnected') {
                if (connectionState === 'connected') {
                  setConnectionState('ended');
                } else if (connectionState === 'joining') {
                  setErrorReason(
                    t('sessions.connectionFailedBody', {
                      defaultValue:
                        'Could not connect to the live session room. Please verify your internet connection.',
                    }),
                  );
                  setConnectionState('failed');
                }
              } else if (message.type === 'stream-status') {
                if (message.hasVideo !== undefined) setHasRemoteVideo(Boolean(message.hasVideo));
                if (message.screenShare !== undefined) {
                  setScreenShare((prev) => ({ ...prev, active: Boolean(message.screenShare) }));
                }
                if (message.participants) setParticipants(message.participants);
              } else if (message.type === 'participants' && message.count) {
                setParticipants(message.count);
              } else if (message.type === 'media') {
                if (message.mic !== undefined) setMic(message.mic);
                if (message.cam !== undefined) setCam(message.cam);
              } else if (message.type === 'screen-share') {
                setScreenShare({ active: message.active, presenter: message.presenter });
              } else if (message.type === 'error') {
                const msg = message.message ?? 'Connection error';
                if (connectionState === 'joining') {
                  setErrorReason(msg);
                  setConnectionState('failed');
                }
                onError(msg);
              } else if (message.type === 'data-channel' && message.event) {
                const dataEvent = message.event as LiveKitDataEvent;

                // 1. Live Quiz Start
                if (dataEvent.type === 'QUIZ_START') {
                  setActiveQuiz(dataEvent.payload);
                  setSelectedOptionIds([]);
                  setQuizSubmitted(false);
                  setQuizReveal(null);
                  setSecondsRemaining(dataEvent.payload.timeLimitSeconds || 30);
                  quizStartTimeRef.current = Date.now();
                }
                // 2. Live Quiz Reveal
                else if (dataEvent.type === 'QUIZ_REVEAL') {
                  setQuizReveal(dataEvent.payload);
                }
                // 3. Live Quiz Close
                else if (dataEvent.type === 'QUIZ_CLOSE') {
                  setActiveQuiz(null);
                  setQuizReveal(null);
                }
                // 4. In-session chat message
                else if (dataEvent.type === 'CHAT_MESSAGE') {
                  const msg = dataEvent.payload;
                  if (msg.userId !== user?.id) {
                    setChatMessages((prev) => [
                      ...prev,
                      {
                        id: msg.id,
                        sender: msg.sender,
                        text: msg.text,
                        time: msg.time,
                        isSelf: false,
                      },
                    ]);
                    if (!chatOpen) {
                      setUnreadChatCount((prev) => prev + 1);
                    }
                  }
                }
              }
            } catch {
              // ignore non-JSON messages
            }
          }}
        />

        {/* Professional in-room waiting stage when connected but no video yet */}
        {!hasRemoteVideo && !screenShare.active && connectionState === 'connected' ? (
          <View className="absolute inset-0 items-center justify-center p-6 bg-slate-950 pointer-events-none">
            <Card className="w-full max-w-sm items-center gap-3 border-slate-800 bg-slate-900/90 p-6 text-center">
              <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-950/60 border border-brand-800">
                <Radio size={28} color="#38bdf8" />
              </View>

              <View className="flex-row items-center gap-1.5 rounded-full bg-green-950/70 border border-green-800 px-3 py-1">
                <View className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <AppText className="text-xs font-semibold text-green-300">
                  Connected to Live Session
                </AppText>
              </View>

              <AppText className="text-base font-bold text-white text-center">
                {sessionTitle}
              </AppText>

              {session?.trainer ? (
                <View className="flex-row items-center gap-2 pt-1">
                  <Avatar
                    uri={session.trainer.avatarUrl}
                    firstName={session.trainer.firstName}
                    lastName={session.trainer.lastName}
                    size={28}
                  />
                  <AppText className="text-sm font-medium text-slate-200">
                    {trainerName}
                  </AppText>
                </View>
              ) : null}

              <AppText variant="caption" className="text-slate-400 text-center pt-2">
                {t('sessions.waitingForTrainer', {
                  defaultValue: 'Session is in progress · Waiting for trainer\'s video or presentation',
                })}
              </AppText>
              <AppText variant="caption" className="text-sky-400 text-center">
                {t('sessions.audioActiveHint', {
                  defaultValue: 'Live audio and interaction are active.',
                })}
              </AppText>
            </Card>
          </View>
        ) : null}

        {/* Floating Live Quiz / Poll Card */}
        {activeQuiz ? (
          <Card className="absolute top-4 left-4 right-4 z-20 gap-3 border-brand-500/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
            <View className="flex-row items-center justify-between">
              <Badge label={activeQuiz.quizTitle || 'Live Interactive Quiz'} tone="brand" />
              <View className="flex-row items-center gap-1">
                <Timer size={14} color={secondsRemaining < 10 ? '#ef4444' : '#38bdf8'} />
                <AppText
                  className={cn(
                    'text-xs font-bold',
                    secondsRemaining < 10 ? 'text-red-400' : 'text-sky-300',
                  )}
                >
                  {secondsRemaining}s
                </AppText>
              </View>
            </View>

            <AppText className="text-base font-bold text-white">{activeQuiz.titleEn}</AppText>

            <View className="gap-2">
              {activeQuiz.options.map((opt) => {
                const selected = selectedOptionIds.includes(opt.id);
                const isCorrect = quizReveal?.correctOptionIds?.includes(opt.id);
                const votes = quizReveal?.distribution?.[opt.id] ?? 0;
                const totalVotes = quizReveal?.totalResponses ?? 1;
                const pct = quizReveal ? Math.round((votes / totalVotes) * 100) : 0;

                return (
                  <Pressable
                    key={opt.id}
                    disabled={quizSubmitted}
                    onPress={() => handleSelectQuizOption(opt.id)}
                    className={cn(
                      'rounded-xl border p-3',
                      isCorrect
                        ? 'border-green-500 bg-green-950/40'
                        : selected
                          ? 'border-brand-500 bg-brand-950/40'
                          : 'border-slate-700 bg-slate-800/60',
                    )}
                  >
                    <View className="flex-row items-center justify-between">
                      <AppText
                        className={cn(
                          'text-sm font-medium',
                          isCorrect
                            ? 'text-green-300'
                            : selected
                              ? 'text-brand-300'
                              : 'text-slate-200',
                        )}
                      >
                        {opt.textEn}
                      </AppText>
                      {isCorrect ? <CheckCircle2 size={16} color="#22c55e" /> : null}
                    </View>
                    {quizReveal ? (
                      <View className="mt-2 gap-1">
                        <ProgressBar percent={pct} tone={isCorrect ? 'success' : 'brand'} />
                        <AppText variant="caption" className="text-slate-400 text-right">
                          {pct}% ({votes} votes)
                        </AppText>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {!quizSubmitted ? (
              <Button
                title="Submit Answer"
                disabled={selectedOptionIds.length === 0}
                onPress={submitQuizAnswer}
                fullWidth
              />
            ) : (
              <View className="flex-row items-center justify-between pt-1">
                <AppText variant="caption" className="text-green-400">
                  Answer submitted! Waiting for results…
                </AppText>
                {quizReveal ? (
                  <Pressable onPress={() => setActiveQuiz(null)}>
                    <AppText className="text-xs font-semibold text-slate-400">Dismiss</AppText>
                  </Pressable>
                ) : null}
              </View>
            )}
          </Card>
        ) : null}
      </View>

      {/* ------------------------------------------------------------- */}
      {/* Accessible Bottom Control Bar (5 Controls)                    */}
      {/* ------------------------------------------------------------- */}
      <View className="flex-row items-center justify-around bg-slate-900 px-3 py-3 border-t border-slate-800">
        {/* 1. Microphone Toggle */}
        <RoundButton
          label={mic ? t('sessions.muteMic') : t('sessions.unmuteMic')}
          active={mic}
          onPress={toggleMic}
        >
          {mic ? <Mic size={20} color={palette.white} /> : <MicOff size={20} color={palette.white} />}
        </RoundButton>

        {/* 2. Camera Toggle */}
        <RoundButton
          label={cam ? t('sessions.cameraOff') : t('sessions.cameraOn')}
          active={cam}
          onPress={toggleCam}
        >
          {cam ? <Video size={20} color={palette.white} /> : <VideoOff size={20} color={palette.white} />}
        </RoundButton>

        {/* 3. Live Chat */}
        <View className="relative">
          <RoundButton
            label={t('sessions.liveChat', { defaultValue: 'Live Chat' })}
            onPress={() => {
              setChatOpen(true);
              setUnreadChatCount(0);
            }}
          >
            <MessageSquare size={20} color={palette.white} />
          </RoundButton>
          {unreadChatCount > 0 ? (
            <View className="absolute -top-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-brand-500">
              <AppText className="text-[10px] font-bold text-white">{unreadChatCount}</AppText>
            </View>
          ) : null}
        </View>

        {/* 4. Hand Raise */}
        <RoundButton
          label={
            handRaised
              ? t('sessions.lowerHand', { defaultValue: 'Lower Hand' })
              : t('sessions.raiseHand', { defaultValue: 'Raise Hand' })
          }
          active={handRaised}
          accent={handRaised}
          onPress={toggleHandRaise}
        >
          <Hand size={20} color={handRaised ? '#000' : palette.white} />
        </RoundButton>

        {/* 5. Leave Session */}
        <RoundButton
          label={t('sessions.leave')}
          danger
          onPress={confirmLeave}
        >
          <PhoneOff size={20} color={palette.white} />
        </RoundButton>
      </View>

      {/* ------------------------------------------------------------- */}
      {/* In-Session Live Chat Sheet                                    */}
      {/* ------------------------------------------------------------- */}
      <ModalSheet
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        title={t('sessions.liveChat', { defaultValue: 'Live Meeting Chat' })}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="h-80 gap-3"
        >
          <ScrollView className="flex-1 gap-2 p-1" contentContainerStyle={{ gap: 8 }}>
            {chatMessages.length === 0 ? (
              <AppText variant="muted" className="py-8 text-center">
                No chat messages yet. Say hello to everyone!
              </AppText>
            ) : (
              chatMessages.map((msg) => (
                <View
                  key={msg.id}
                  className={cn(
                    'max-w-[80%] rounded-xl p-3',
                    msg.isSelf
                      ? 'self-end bg-brand-600'
                      : 'self-start bg-slate-800 border border-slate-700',
                  )}
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <AppText
                      className={cn(
                        'text-xs font-bold',
                        msg.isSelf ? 'text-brand-100' : 'text-slate-300',
                      )}
                    >
                      {msg.sender}
                    </AppText>
                    <AppText className="text-[10px] text-slate-400">{msg.time}</AppText>
                  </View>
                  <AppText className="mt-1 text-sm text-white">{msg.text}</AppText>
                </View>
              ))
            )}
          </ScrollView>

          <View className="flex-row items-center gap-2 border-t border-slate-700/60 pt-2">
            <TextInput
              placeholder="Send message to room…"
              placeholderTextColor="#94a3b8"
              value={chatInput}
              onChangeText={setChatInput}
              onSubmitEditing={sendChatMessage}
              className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 text-sm text-white border border-slate-700"
            />
            <Pressable
              onPress={sendChatMessage}
              className="h-10 w-10 items-center justify-center rounded-xl bg-brand-600 active:bg-brand-700"
            >
              <Send size={18} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </ModalSheet>
    </View>
  );
}

function RoundButton({
  children,
  label,
  active,
  accent,
  danger,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  active?: boolean;
  accent?: boolean;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={cn(
        'h-12 w-12 items-center justify-center rounded-full',
        danger
          ? 'bg-red-600'
          : accent
            ? 'bg-yellow-400'
            : active
              ? 'bg-brand-600'
              : 'bg-slate-800',
      )}
    >
      {children}
    </Pressable>
  );
}
