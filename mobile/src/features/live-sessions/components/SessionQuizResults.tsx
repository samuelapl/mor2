import {
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  ClipboardCheck,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { useSessionStore } from '@/features/auth';

import { useMySessionQuizResults } from '../api/live-session-api';
import type { LearnerQuizResult, SessionQuizGroup } from '../types/live-session.types';

const plain = (html: string) => html.replace(/<[^>]*>/g, '').trim();

/** The learner's own answers and score for a completed session's live quizzes (loads on open). */
export function SessionQuizResults({
  sessionId,
  defaultOpen = false,
}: {
  sessionId: string;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [open, setOpen] = useState(defaultOpen);
  const currentUserId = useSessionStore((s) => s.user?.id);
  const results = useMySessionQuizResults(sessionId, open);
  const me =
    results.data?.learners.find((l) => l.userId === currentUserId) ??
    results.data?.learners[0];

  return (
    <View className="gap-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        className="flex-row items-center gap-2"
      >
        <ClipboardCheck size={17} color={colors.primary} />
        <AppText className="flex-1 text-sm font-semibold text-brand-700 dark:text-brand-300">
          {t('sessionQuiz.viewResults')}
        </AppText>
        {open ? (
          <ChevronDown size={18} color={colors.textMuted} />
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </Pressable>

      {open ? (
        results.isPending ? (
          <ActivityIndicator color={colors.primary} />
        ) : results.isError ? (
          <AppText className="text-sm text-red-600">{t('common.somethingWrong')}</AppText>
        ) : !results.data?.available || !me || results.data.quizzes.length === 0 ? (
          <AppText variant="muted">{t('sessionQuiz.noQuiz')}</AppText>
        ) : (
          results.data.quizzes.map((quiz) => {
            const result = me.quizzes.find((r) => r.quizId === quiz.id);
            if (!result) return null;
            return (
              <View key={quiz.id} className="gap-2">
                <View className="flex-row flex-wrap items-center gap-2">
                  <AppText className="text-sm font-bold text-slate-900 dark:text-white">
                    {quiz.title}
                  </AppText>
                  <ScoreBadge result={result} />
                </View>
                {quiz.graded ? (
                  <AppText variant="caption">{t('sessionQuiz.feedbackOnly')}</AppText>
                ) : null}
                {result.answered === 0 ? (
                  <AppText variant="muted">{t('sessionQuiz.notAnswered')}</AppText>
                ) : (
                  <AnswerList quiz={quiz} result={result} />
                )}
              </View>
            );
          })
        )
      ) : null}
    </View>
  );
}

/** Points earned and percent. Session quizzes have no pass mark, so no pass/fail colour. */
function ScoreBadge({ result }: { result: LearnerQuizResult }) {
  const { t } = useTranslation();
  if (result.answered === 0) return <Badge label={t('sessionQuiz.notAnsweredShort')} />;
  return (
    <Badge
      label={t('sessionQuiz.score', {
        percent: result.scorePercent,
        earned: result.earnedPoints,
        total: result.totalPoints,
      })}
      tone="brand"
    />
  );
}

function AnswerList({ quiz, result }: { quiz: SessionQuizGroup; result: LearnerQuizResult }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const answerOf = new Map(result.answers.map((a) => [a.questionId, a]));

  return (
    <View className="gap-3">
      {quiz.questions.map((q, i) => {
        const a = answerOf.get(q.id);
        const missed = !a || a.answer === null;
        const right = a?.isCorrect === true;
        const hasOptions = Array.isArray(q.options) && q.options.length > 0;

        return (
          <View
            key={q.id}
            className={cn(
              'gap-2.5 rounded-xl border p-3.5',
              missed
                ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                : right
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                  : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
            )}
          >
            <View className="flex-row items-start gap-2.5">
              {missed ? (
                <CircleSlash size={17} color={colors.textMuted} />
              ) : right ? (
                <CircleCheck size={17} color={colors.success} />
              ) : (
                <XCircle size={17} color={colors.danger} />
              )}
              <View className="flex-1 flex-row items-start justify-between gap-2">
                <AppText className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {i + 1}. {plain(q.question)}
                </AppText>
                <AppText variant="caption" className="font-semibold">
                  {t('sessionQuiz.points', { earned: right ? q.points : 0, total: q.points })}
                </AppText>
              </View>
            </View>

            {hasOptions ? (
              <View className="ml-6 gap-1.5 pt-1">
                {q.options.map((option, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  const isCorrect =
                    Boolean(q.correctAnswer) &&
                    String(q.correctAnswer).trim().toLowerCase() === String(option).trim().toLowerCase();
                  const isSelected = Boolean(
                    a?.selected?.some((s) => String(s).trim().toLowerCase() === String(option).trim().toLowerCase()) ||
                      (a?.answer && String(a.answer).trim().toLowerCase() === String(option).trim().toLowerCase())
                  );

                  return (
                    <View
                      key={optIdx}
                      className={cn(
                        'flex-row items-center justify-between gap-2 rounded-lg border p-2.5',
                        isSelected && isCorrect
                          ? 'border-green-500 bg-green-100/70 dark:border-green-700 dark:bg-green-950/40'
                          : isSelected && !isCorrect
                            ? 'border-red-500 bg-red-100/70 dark:border-red-700 dark:bg-red-950/40'
                            : !isSelected && isCorrect
                              ? 'border-green-400 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                              : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800/60',
                      )}
                    >
                      <View className="flex-1 flex-row items-center gap-2">
                        <View
                          className={cn(
                            'h-5 w-5 items-center justify-center rounded-full',
                            isSelected && isCorrect
                              ? 'bg-green-600'
                              : isSelected && !isCorrect
                                ? 'bg-red-600'
                                : !isSelected && isCorrect
                                  ? 'bg-green-100 dark:bg-green-900/60'
                                  : 'bg-slate-100 dark:bg-slate-700',
                          )}
                        >
                          <AppText
                            className={cn(
                              'text-[10px] font-bold',
                              isSelected && isCorrect
                                ? 'text-white'
                                : isSelected && !isCorrect
                                  ? 'text-white'
                                  : !isSelected && isCorrect
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-slate-600 dark:text-slate-300',
                            )}
                          >
                            {letter}
                          </AppText>
                        </View>
                        <AppText className="flex-1 text-xs text-slate-800 dark:text-slate-200">
                          {option}
                        </AppText>
                      </View>

                      {isSelected && isCorrect ? (
                        <View className="flex-row items-center gap-1 rounded bg-green-200/80 px-1.5 py-0.5 dark:bg-green-900/80">
                          <CircleCheck size={12} color={colors.success} />
                          <AppText className="text-[10px] font-bold text-green-800 dark:text-green-200">
                            {t('sessionQuiz.yourAnswerCorrect')}
                          </AppText>
                        </View>
                      ) : isSelected && !isCorrect ? (
                        <View className="flex-row items-center gap-1 rounded bg-red-200/80 px-1.5 py-0.5 dark:bg-red-900/80">
                          <XCircle size={12} color={colors.danger} />
                          <AppText className="text-[10px] font-bold text-red-800 dark:text-red-200">
                            {t('sessionQuiz.yourAnswer')}
                          </AppText>
                        </View>
                      ) : !isSelected && isCorrect ? (
                        <View className="flex-row items-center gap-1 rounded bg-green-200/80 px-1.5 py-0.5 dark:bg-green-900/80">
                          <CircleCheck size={12} color={colors.success} />
                          <AppText className="text-[10px] font-bold text-green-800 dark:text-green-200">
                            {t('sessionQuiz.correctAnswerBadge')}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View className="ml-6 gap-1">
                <AppText className="text-xs text-slate-600 dark:text-slate-300">
                  {t('sessionQuiz.answered')}{' '}
                  <AppText
                    className={cn(
                      'text-xs font-bold',
                      missed
                        ? 'italic text-slate-400'
                        : right
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400',
                    )}
                  >
                    {missed ? t('sessionQuiz.noAnswer') : a!.answer}
                  </AppText>
                </AppText>
                {!right && q.correctAnswer ? (
                  <AppText className="text-xs text-slate-600 dark:text-slate-300">
                    {t('sessionQuiz.correctAnswer')}{' '}
                    <AppText className="text-xs font-bold text-green-700 dark:text-green-400">
                      {q.correctAnswer}
                    </AppText>
                  </AppText>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
