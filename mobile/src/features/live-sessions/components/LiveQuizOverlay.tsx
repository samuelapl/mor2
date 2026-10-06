import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Lightbulb,
  Minus,
  Timer,
  X,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText, Button } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { cn } from '@/core/utils/cn';

import type { LiveQuizController } from '../hooks/useLiveQuiz';
import type { LiveQuizPayload } from '../types/livekit-events';

const LETTERS = 'ABCDEFGHIJ';

const plain = (html?: string | null) => (html ?? '').replace(/<[^>]*>/g, '').trim();

function clock(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The trainer's live quiz, answered by the learner (mirrors the web learner overlay). */
export function LiveQuizOverlay({ quiz: q }: { quiz: LiveQuizController }) {
  const { t } = useTranslation();
  const isAm = useLocaleStore((s) => s.locale) === 'am';
  // Both are tied to the quiz they were set for: a new quiz starts at question 1, and a new quiz
  // or a reveal brings a minimized card back to the front.
  const quizId = q.quiz?.id ?? '';
  const stage = `${quizId}:${q.anyRevealed}`;
  const [viewing, setViewing] = useState({ quizId, index: 0 });
  const [minimizedAt, setMinimizedAt] = useState<string | null>(null);
  const index = viewing.quizId === quizId ? viewing.index : 0;
  const setIndex = (i: number) => setViewing({ quizId, index: i });
  const minimized = minimizedAt === stage;
  const setMinimized = (on: boolean) => setMinimizedAt(on ? stage : null);

  if (!q.quiz || !q.visible) return null;

  const total = q.questions.length;
  const current: LiveQuizPayload = q.questions[Math.min(index, total - 1)] ?? q.quiz;
  const selected = q.answers[current.id] ?? [];
  const reveal = q.revealFor(current);
  const answered = q.questions.filter((x) => (q.answers[x.id] ?? []).length > 0).length;
  const urgent = q.remaining <= 5 && !q.locked;
  const title = q.quiz.quizTitle || t('liveRoom.quiz');

  if (minimized) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => setMinimized(false)}
        className="absolute right-3 top-3 z-30 flex-row items-center gap-2 rounded-full border border-brand-400/50 bg-slate-900/95 px-3.5 py-2"
      >
        <ClipboardCheck size={16} color="#a5b4fc" />
        <AppText className="text-xs font-bold text-white">{title}</AppText>
        {!q.locked ? (
          <AppText className={cn('text-xs font-bold', urgent ? 'text-red-400' : 'text-sky-300')}>
            {clock(q.remaining)}
          </AppText>
        ) : null}
      </Pressable>
    );
  }

  const questionText = plain(isAm && current.titleAm ? current.titleAm : current.titleEn);
  const secondaryText = plain(isAm ? current.titleEn : current.titleAm);
  const correctIds = reveal?.correctOptionIds ?? [];
  const isCorrect =
    Boolean(reveal) &&
    selected.length > 0 &&
    correctIds.length > 0 &&
    correctIds.every((id) => selected.includes(id)) &&
    selected.every((id) => correctIds.includes(id));
  const explanation = plain(
    isAm
      ? (reveal?.explanationAm ?? reveal?.explanationEn)
      : (reveal?.explanationEn ?? reveal?.explanationAm),
  );
  const isShortAnswer = current.type === 'SHORT_ANSWER' && current.options.length === 0;

  return (
    <View className="absolute inset-x-2 bottom-2 top-2 z-30 justify-end">
      <View className="max-h-full overflow-hidden rounded-3xl border border-brand-500/40 bg-slate-900">
        {/* Header */}
        <View className="flex-row items-center gap-2 border-b border-slate-800 px-4 py-3">
          <View className="h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <ClipboardCheck size={16} color="#fff" />
          </View>
          <View className="flex-1">
            <AppText className="text-sm font-bold text-white" numberOfLines={1}>
              {title}
            </AppText>
            <AppText className="text-[11px] text-slate-400">
              {t('liveRoom.questionOf', { number: index + 1, total })}
              {current.type === 'MULTIPLE_CHOICE' ? ` · ${t('liveRoom.selectAll')}` : ''}
            </AppText>
          </View>
          {!q.locked ? (
            <View
              className={cn(
                'flex-row items-center gap-1 rounded-full px-2.5 py-1',
                urgent ? 'bg-red-500/20' : 'bg-sky-500/15',
              )}
            >
              <Timer size={13} color={urgent ? '#f87171' : '#7dd3fc'} />
              <AppText
                className={cn('text-xs font-bold', urgent ? 'text-red-300' : 'text-sky-200')}
              >
                {clock(q.remaining)}
              </AppText>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('liveRoom.minimize')}
            onPress={() => setMinimized(true)}
            className="h-8 w-8 items-center justify-center rounded-full bg-slate-800"
          >
            <Minus size={16} color="#cbd5e1" />
          </Pressable>
          {q.locked ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              onPress={q.dismiss}
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-800"
            >
              <X size={16} color="#cbd5e1" />
            </Pressable>
          ) : null}
        </View>

        {/* Question pills */}
        {total > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-1.5 px-4 pt-3"
          >
            {q.questions.map((question, i) => {
              const done = (q.answers[question.id] ?? []).length > 0;
              return (
                <Pressable
                  key={question.id}
                  onPress={() => setIndex(i)}
                  className={cn(
                    'h-8 min-w-8 items-center justify-center rounded-full px-2',
                    i === index ? 'bg-brand-600' : done ? 'bg-brand-900' : 'bg-slate-800',
                  )}
                >
                  <AppText className="text-xs font-bold text-white">{i + 1}</AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <ScrollView contentContainerClassName="gap-3 px-4 py-3" keyboardShouldPersistTaps="handled">
          <View className="gap-1">
            <AppText className="text-base font-bold leading-6 text-white">{questionText}</AppText>
            {secondaryText && secondaryText !== questionText ? (
              <AppText className="text-sm text-slate-400">{secondaryText}</AppText>
            ) : null}
          </View>

          {isShortAnswer ? (
            <TextInput
              editable={!q.locked}
              value={selected[0] ?? ''}
              onChangeText={(text) => q.setAnswer(current, text)}
              placeholder={t('liveRoom.typeAnswer')}
              placeholderTextColor="#64748b"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white"
            />
          ) : (
            current.options.map((option, i) => {
              const picked = selected.includes(option.id);
              const right = correctIds.includes(option.id);
              const votes = reveal?.distribution?.[option.id] ?? 0;
              const pct =
                reveal && reveal.totalResponses > 0
                  ? Math.round((votes / reveal.totalResponses) * 100)
                  : 0;
              const label = plain(isAm && option.textAm ? option.textAm : option.textEn);
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole={current.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: picked, disabled: q.locked }}
                  disabled={q.locked}
                  onPress={() => q.setAnswer(current, option.id)}
                  className={cn(
                    'overflow-hidden rounded-2xl border',
                    reveal && right
                      ? 'border-green-500 bg-green-950/50'
                      : reveal && picked
                        ? 'border-red-500 bg-red-950/40'
                        : picked
                          ? 'border-brand-400 bg-brand-900/60'
                          : 'border-slate-700 bg-slate-800/70',
                  )}
                >
                  {reveal && reveal.totalResponses > 0 ? (
                    <View
                      style={{ width: `${pct}%` }}
                      className={cn(
                        'absolute bottom-0 left-0 top-0',
                        right ? 'bg-green-500/15' : 'bg-slate-500/15',
                      )}
                    />
                  ) : null}
                  <View className="flex-row items-center gap-3 p-3">
                    <View
                      className={cn(
                        'h-7 w-7 items-center justify-center rounded-full',
                        picked ? 'bg-brand-500' : 'bg-slate-700',
                      )}
                    >
                      <AppText className="text-xs font-bold text-white">
                        {LETTERS[i] ?? i + 1}
                      </AppText>
                    </View>
                    <AppText className="flex-1 text-sm font-medium text-slate-100">{label}</AppText>
                    {reveal && right ? <CheckCircle2 size={18} color="#22c55e" /> : null}
                    {reveal && picked && !right ? <XCircle size={18} color="#ef4444" /> : null}
                    {reveal && reveal.totalResponses > 0 ? (
                      <AppText className="text-xs font-bold text-slate-300">{pct}%</AppText>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}

          {reveal ? (
            <View
              className={cn(
                'gap-1.5 rounded-2xl border p-3',
                selected.length === 0
                  ? 'border-slate-700 bg-slate-800/60'
                  : isCorrect
                    ? 'border-green-700 bg-green-950/40'
                    : 'border-red-800 bg-red-950/30',
              )}
            >
              <AppText
                className={cn(
                  'text-sm font-bold',
                  selected.length === 0
                    ? 'text-slate-300'
                    : isCorrect
                      ? 'text-green-300'
                      : 'text-red-300',
                )}
              >
                {selected.length === 0
                  ? t('liveRoom.notAnswered')
                  : isCorrect
                    ? t('liveRoom.correct')
                    : t('liveRoom.incorrect')}
              </AppText>
              {explanation ? (
                <View className="flex-row gap-2">
                  <Lightbulb size={15} color="#fbbf24" />
                  <AppText className="flex-1 text-xs leading-5 text-slate-300">
                    {explanation}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View className="gap-2 border-t border-slate-800 px-4 py-3">
          {total > 1 ? (
            <View className="flex-row gap-2">
              <Pressable
                disabled={index === 0}
                onPress={() => setIndex(index - 1)}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-slate-800 py-2.5',
                  index === 0 && 'opacity-40',
                )}
              >
                <ChevronLeft size={16} color="#e2e8f0" />
                <AppText className="text-sm font-semibold text-slate-200">
                  {t('quiz.previous')}
                </AppText>
              </Pressable>
              <Pressable
                disabled={index >= total - 1}
                onPress={() => setIndex(index + 1)}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-1 rounded-xl bg-slate-800 py-2.5',
                  index >= total - 1 && 'opacity-40',
                )}
              >
                <AppText className="text-sm font-semibold text-slate-200">{t('quiz.next')}</AppText>
                <ChevronRight size={16} color="#e2e8f0" />
              </Pressable>
            </View>
          ) : null}
          {!q.locked ? (
            <Button
              title={t('liveRoom.submitQuiz', { answered, total })}
              disabled={answered === 0}
              onPress={q.submit}
              fullWidth
            />
          ) : (
            <AppText className="py-1 text-center text-xs font-semibold text-slate-400">
              {q.anyRevealed
                ? t('liveRoom.answersRevealed')
                : q.submitted && answered > 0
                  ? t('liveRoom.answersSent')
                  : t('liveRoom.timeUp')}
            </AppText>
          )}
        </View>
      </View>
    </View>
  );
}
