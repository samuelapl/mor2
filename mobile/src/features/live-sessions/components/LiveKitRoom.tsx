import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import {
  CheckCircle2,
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  Monitor,
  PhoneOff,
  Send,
  Timer,
  Video,
  VideoOff,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { AppText, Badge, Button, Card, ModalSheet, ProgressBar } from '@/components/ui';
import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { useSessionStore } from '@/features/auth';

import type {
  LiveKitDataEvent,
  LiveQuizPayload,
  LiveQuizRevealPayload,
} from '../types/livekit-events';
import { buildLiveKitRoomHtml } from '../utils/livekit-room-html';

export interface LiveKitRoomProps {
  wsUrl: string;
  token: string;
  sessionId?: string;
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
  onConnected,
  onDisconnected,
  onError,
}: LiveKitRoomProps) {
  const { t } = useTranslation();
  const webview = useRef<WebView>(null);
  const user = useSessionStore((s) => s.user);

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

  const submitQuizAnswer = () => {
    if (!activeQuiz || selectedOptionIds.length === 0 || quizSubmitted) return;
    setQuizSubmitted(true);

    const duration = Math.max(1, Math.round((Date.now() - quizStartTimeRef.current) / 1000));
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
  };

  return (
    <View className="flex-1 bg-slate-950">
      {/* Top Banner when Trainer is sharing screen */}
      {screenShare.active ? (
        <View className="flex-row items-center justify-between bg-sky-950/80 px-4 py-2 border-b border-sky-800/50">
          <View className="flex-row items-center gap-2">
            <Monitor size={16} color="#38bdf8" />
            <AppText className="text-xs font-semibold text-sky-200">
              {screenShare.presenter ? `${screenShare.presenter}'s Screen` : 'Screen Presentation'}
            </AppText>
          </View>
          <Badge label="Live Stream" tone="brand" />
        </View>
      ) : null}

      {/* LiveKit WebView */}
      <WebView
        ref={webview}
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
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'connected') onConnected();
            else if (message.type === 'disconnected') onDisconnected();
            else if (message.type === 'participants' && message.count) {
              setParticipants(message.count);
            } else if (message.type === 'media') {
              if (message.mic !== undefined) setMic(message.mic);
              if (message.cam !== undefined) setCam(message.cam);
            } else if (message.type === 'screen-share') {
              setScreenShare({ active: message.active, presenter: message.presenter });
            } else if (message.type === 'error') {
              onError(message.message ?? 'Error');
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

      {/* Floating Live Quiz / Poll Card */}
      {activeQuiz ? (
        <Card className="absolute top-12 left-4 right-4 z-20 gap-3 border-brand-500/50 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md">
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

      {/* Control Bar */}
      <View className="flex-row items-center justify-around bg-slate-950 px-3 py-3 border-t border-slate-800">
        <AppText className="text-xs text-slate-400">
          {t('sessions.participants', { count: participants })}
        </AppText>

        {/* Hand Raise */}
        <RoundButton
          label={handRaised ? 'Lower Hand' : 'Raise Hand'}
          active={handRaised}
          onPress={toggleHandRaise}
          accent={handRaised}
        >
          <Hand size={20} color={handRaised ? '#000' : palette.white} />
        </RoundButton>

        {/* Chat Drawer Toggle */}
        <View className="relative">
          <RoundButton
            label="Live Chat"
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

        {/* Mic */}
        <RoundButton
          label={mic ? t('sessions.muteMic') : t('sessions.unmuteMic')}
          active={mic}
          onPress={toggleMic}
        >
          {mic ? <Mic size={20} color={palette.white} /> : <MicOff size={20} color={palette.white} />}
        </RoundButton>

        {/* Camera */}
        <RoundButton
          label={cam ? t('sessions.cameraOff') : t('sessions.cameraOn')}
          active={cam}
          onPress={toggleCam}
        >
          {cam ? <Video size={20} color={palette.white} /> : <VideoOff size={20} color={palette.white} />}
        </RoundButton>

        {/* Leave */}
        <RoundButton
          label={t('sessions.leave')}
          danger
          onPress={() => run('window.eltms && window.eltms.leave()')}
        >
          <PhoneOff size={20} color={palette.white} />
        </RoundButton>
      </View>

      {/* In-Session Live Chat Sheet */}
      <ModalSheet
        visible={chatOpen}
        onClose={() => setChatOpen(false)}
        title="Live Meeting Chat"
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
