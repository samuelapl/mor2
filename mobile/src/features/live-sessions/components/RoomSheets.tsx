import {
  Hand,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Users,
  Video,
  VideoOff,
} from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText, Avatar, Badge, ModalSheet } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

export interface RoomChatMessage {
  id: string;
  fromIdentity: string | null;
  fromName: string;
  message: string;
  timestamp: number;
  isSelf: boolean;
  /** Sent from this phone but not confirmed by the room yet. */
  pending?: boolean;
}

export interface RoomParticipant {
  identity: string;
  name: string;
  isLocal: boolean;
  role: string;
  micOn: boolean;
  camOn: boolean;
  speaking: boolean;
}

const time = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** In-room chat — the same LiveKit chat the web room shows, so messages flow both ways. */
export function ChatSheet({
  visible,
  onClose,
  messages,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  messages: RoomChatMessage[];
  onSend: (text: string) => void;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [draft, setDraft] = useState('');
  const scroll = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 50);
  }, [visible, messages.length]);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('liveRoom.chat')}
      icon={MessageSquare}
      showCloseButton
    >
      <View className="h-96 gap-3">
        <ScrollView
          ref={scroll}
          className="flex-1"
          contentContainerStyle={{ gap: 10, paddingVertical: 4 }}
        >
          {messages.length === 0 ? (
            <AppText variant="muted" className="py-10 text-center">
              {t('liveRoom.chatEmpty')}
            </AppText>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                className={cn(
                  'max-w-[85%] gap-0.5',
                  m.isSelf ? 'items-end self-end' : 'self-start',
                )}
              >
                <AppText variant="caption">
                  {m.isSelf ? t('liveRoom.you') : m.fromName} · {time(m.timestamp)}
                </AppText>
                <View
                  className={cn(
                    'rounded-2xl px-3.5 py-2.5',
                    m.isSelf
                      ? 'rounded-br-md bg-brand-600'
                      : 'rounded-bl-md bg-slate-100 dark:bg-slate-800',
                    m.pending && 'opacity-60',
                  )}
                >
                  <AppText
                    className={cn(
                      'text-sm',
                      m.isSelf ? 'text-white' : 'text-slate-900 dark:text-slate-100',
                    )}
                  >
                    {m.message}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </ScrollView>
        <View className="flex-row items-center gap-2">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            returnKeyType="send"
            placeholder={t('liveRoom.chatPlaceholder')}
            placeholderTextColor={colors.textMuted}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('liveRoom.send')}
            onPress={send}
            disabled={!draft.trim()}
            className={cn(
              'h-11 w-11 items-center justify-center rounded-xl bg-brand-600',
              !draft.trim() && 'opacity-50',
            )}
          >
            <Send size={18} color="#fff" />
          </Pressable>
        </View>
      </View>
    </ModalSheet>
  );
}

/** Everyone in the room, trainers first, with mic/camera state and raised hands. */
export function ParticipantsSheet({
  visible,
  onClose,
  participants,
  raisedHands,
}: {
  visible: boolean;
  onClose: () => void;
  participants: RoomParticipant[];
  raisedHands: Set<string>;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const rank = (p: RoomParticipant) =>
    p.role === 'trainer' ? 0 : p.isLocal ? 1 : raisedHands.has(p.identity) ? 2 : 3;
  const sorted = [...participants].sort(
    (a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name),
  );

  return (
    <ModalSheet
      visible={visible}
      onClose={onClose}
      title={t('liveRoom.participantsTitle', { count: participants.length })}
      icon={Users}
      showCloseButton
    >
      <ScrollView className="max-h-96" contentContainerStyle={{ gap: 4, paddingBottom: 8 }}>
        {sorted.map((p) => {
          const [first, ...rest] = p.name.split(' ');
          return (
            <View
              key={p.identity}
              className={cn(
                'flex-row items-center gap-3 rounded-xl px-2 py-2.5',
                p.speaking && 'bg-green-50 dark:bg-green-950/30',
              )}
            >
              <Avatar firstName={first} lastName={rest.join(' ')} size={36} />
              <View className="flex-1">
                <AppText
                  className="text-sm font-semibold text-slate-900 dark:text-white"
                  numberOfLines={1}
                >
                  {p.name}
                  {p.isLocal ? ` (${t('liveRoom.you')})` : ''}
                </AppText>
                {p.role === 'trainer' ? <Badge label={t('liveRoom.trainer')} tone="brand" /> : null}
              </View>
              {raisedHands.has(p.identity) ? <Hand size={18} color={colors.warning} /> : null}
              {p.camOn ? (
                <Video size={18} color={colors.textMuted} />
              ) : (
                <VideoOff size={18} color={colors.textMuted} />
              )}
              {p.micOn ? (
                <Mic size={18} color={colors.success} />
              ) : (
                <MicOff size={18} color={colors.danger} />
              )}
            </View>
          );
        })}
      </ScrollView>
    </ModalSheet>
  );
}
