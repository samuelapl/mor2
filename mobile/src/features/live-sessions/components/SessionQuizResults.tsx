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
  const results = useMySessionQuizResults(sessionId, open);
  const me = results.data?.learners[0];

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
                  <ScoreBadge quiz={quiz} result={result} />
                </View>
                {quiz.graded ? (
                  <AppText variant="caption">
                    {t('sessionQuiz.gradedInfo', {
                      weight: quiz.weight ?? 0,
                      pass: quiz.passingScore ?? 0,
                    })}
                  </AppText>
                ) : null}
                {result.answered === 0 ? (
                  <AppText variant="muted">
                    {quiz.graded
                      ? t('sessionQuiz.notAnsweredGraded')
                      : t('sessionQuiz.notAnswered')}
                  </AppText>
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

function ScoreBadge({ quiz, result }: { quiz: SessionQuizGroup; result: LearnerQuizResult }) {
  const { t } = useTranslation();
  if (result.answered === 0) return <Badge label={t('sessionQuiz.notAnsweredShort')} />;
  const passed =
    quiz.graded && quiz.passingScore !== null ? result.scorePercent >= quiz.passingScore : null;
  return (
    <Badge
      label={t('sessionQuiz.score', {
        percent: result.scorePercent,
        earned: result.earnedPoints,
        total: result.totalPoints,
      })}
      tone={passed === false ? 'danger' : passed === true ? 'success' : 'brand'}
    />
  );
}

function AnswerList({ quiz, result }: { quiz: SessionQuizGroup; result: LearnerQuizResult }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const answerOf = new Map(result.answers.map((a) => [a.questionId, a]));

  return (
    <View className="gap-2">
      {quiz.questions.map((q, i) => {
        const a = answerOf.get(q.id);
        const missed = !a || a.answer === null;
        const right = a?.isCorrect === true;
        return (
          <View
            key={q.id}
            className={cn(
              'flex-row gap-2.5 rounded-xl border p-3',
              missed
                ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                : right
                  ? 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20'
                  : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20',
            )}
          >
            {missed ? (
              <CircleSlash size={17} color={colors.textMuted} />
            ) : right ? (
              <CircleCheck size={17} color={colors.success} />
            ) : (
              <XCircle size={17} color={colors.danger} />
            )}
            <View className="flex-1 gap-1">
              <View className="flex-row items-start gap-2">
                <AppText className="flex-1 text-sm font-semibold text-slate-900 dark:text-white">
                  {i + 1}. {plain(q.question)}
                </AppText>
                <AppText variant="caption">
                  {t('sessionQuiz.points', { earned: right ? q.points : 0, total: q.points })}
                </AppText>
              </View>
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
          </View>
        );
      })}
    </View>
  );
}
