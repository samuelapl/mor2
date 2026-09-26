import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { Alert } from '@/core/utils/alert';
import { AppText, Badge, Button, Card, ErrorState, Screen, Skeleton } from '@/components/ui';
import { ApiError } from '@/core/api/errors';
import { useIsOnline } from '@/core/hooks/useNetworkStatus';
import { useLocaleStore, useLocalized } from '@/core/i18n';
import { palette, useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';
import { formatDate } from '@/core/utils/formatters';
import {
  QuestionCard,
  QuizTimer,
  seededShuffle,
  useAssessment,
  useAttempts,
  useQuizRunnerStore,
  useStartAttempt,
  useSubmitAttempt,
  type SubmitAnswer,
} from '@/features/assessments';

/**
 * Quiz runner (architecture §6.7, spec §7.2–§7.5).
 * Intro → POST start (resumes a pending attempt) → answer → POST submit → result screen.
 */
export default function QuizScreen() {
  const { t } = useTranslation();
  const localized = useLocalized();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);
  const online = useIsOnline();
  const navigation = useNavigation();
  const { assessmentId, courseId } = useLocalSearchParams<{
    assessmentId: string;
    courseId?: string;
  }>();

  const assessment = useAssessment(assessmentId);
  const attempts = useAttempts(assessmentId);
  const start = useStartAttempt(assessmentId);
  const submit = useSubmitAttempt(assessmentId, courseId ?? assessment.data?.courseId);

  const runner = useQuizRunnerStore();
  const running = runner.attemptId !== null && runner.assessmentId === assessmentId;
  const submittingRef = useRef(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Leaving mid-attempt: the attempt stays open on the server (and its timer keeps running).
  useEffect(() => {
    if (!running) return;
    return navigation.addListener('beforeRemove', (event) => {
      if (submittingRef.current) return;
      event.preventDefault();
      Alert.alert(t('quiz.leaveTitle'), t('quiz.leaveBody'), [
        { text: t('quiz.stay'), style: 'cancel' },
        {
          text: t('quiz.leave'),
          style: 'destructive',
          onPress: () => navigation.dispatch(event.data.action),
        },
      ]);
    });
  }, [navigation, running, t]);

  const questions = assessment.data?.questions ?? [];
  const ordered = runner.questionOrder
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is (typeof questions)[number] => Boolean(q));
  const current = ordered[runner.index];
  const answeredCount = ordered.filter((q) => runner.answers[q.id] !== undefined).length;

  const doSubmit = useCallback(() => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const { answers } = useQuizRunnerStore.getState();
    const payload: SubmitAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      selectedOption: typeof value === 'string' ? value.trim() : value,
    }));
    submit.mutate(payload, {
      onSuccess: (result) => {
        useQuizRunnerStore.getState().finish(result);
        router.replace({
          pathname: '/quiz/[assessmentId]/result',
          params: { assessmentId, courseId: courseId ?? '' },
        });
      },
      onError: (error) => {
        submittingRef.current = false;
        Alert.alert(
          t('quiz.submitFailed'),
          error instanceof ApiError && !error.isNetworkError
            ? error.localizedMessage(locale)
            : t('common.offlineAction'),
        );
      },
    });
  }, [assessmentId, courseId, locale, submit, t]);

  const confirmSubmit = () => {
    const unanswered = ordered.length - answeredCount;
    Alert.alert(
      t('quiz.submitTitle'),
      unanswered > 0 ? t('quiz.submitUnanswered', { count: unanswered }) : t('quiz.submitBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('quiz.submit'), onPress: doSubmit },
      ],
    );
  };

  const begin = () => {
    setStartError(null);
    start.mutate(undefined, {
      onSuccess: (attempt) => {
        const ids = questions.map((q) => q.id);
        runner.begin({
          assessmentId,
          attemptId: attempt.attemptId,
          deadline:
            attempt.remainingSeconds !== undefined && attempt.remainingSeconds !== null
              ? Date.now() + attempt.remainingSeconds * 1000
              : null,
          // Shuffle questions only (never options — answers are graded by option index).
          questionOrder: assessment.data?.shuffleQuestions
            ? seededShuffle(ids, attempt.attemptId)
            : ids,
        });
        submittingRef.current = false;
      },
      onError: (error) => {
        if (!(error instanceof ApiError)) return setStartError(t('common.somethingWrong'));
        if (error.isNetworkError) return setStartError(t('common.offlineAction'));
        if (error.reason === 'RETAKE_COOLDOWN') {
          return setStartError(t('quiz.cooldown', { minutes: error.remainingMinutes ?? 0 }));
        }
        setStartError(error.localizedMessage(locale));
      },
    });
  };

  if (assessment.isPending) {
    return (
      <Screen>
        <Skeleton height={140} />
        <Skeleton height={220} />
      </Screen>
    );
  }
  if (assessment.isError || !assessment.data) {
    return (
      <Screen>
        <ErrorState error={assessment.error} onRetry={() => void assessment.refetch()} />
      </Screen>
    );
  }

  const data = assessment.data;
  const submitted = (attempts.data ?? []).filter((a) => a.submittedAt);
  const pending = (attempts.data ?? []).some((a) => !a.submittedAt);
  const best = submitted.reduce<number | null>(
    (max, a) => (max === null || a.score > max ? a.score : max),
    null,
  );
  const passedBefore = submitted.some((a) => a.passed);
  const attemptsLeft = Math.max(0, data.maxAttempts - submitted.length);

  /* ------------------------------- Running -------------------------------- */
  if (running && current) {
    return (
      <>
        <Stack.Screen
          options={{
            title: localized(data, 'title'),
            headerRight: () =>
              runner.deadline ? <QuizTimer deadline={runner.deadline} onExpire={doSubmit} /> : null,
          }}
        />
        <Screen contentClassName="gap-4 p-4 pb-8">
          {/* Question dots */}
          <View className="flex-row flex-wrap gap-2">
            {ordered.map((q, i) => (
              <Pressable
                key={q.id}
                accessibilityRole="button"
                accessibilityLabel={t('quiz.questionOf', { number: i + 1, total: ordered.length })}
                onPress={() => runner.goTo(i)}
                className={cn(
                  'h-8 w-8 items-center justify-center rounded-full',
                  i === runner.index
                    ? 'bg-brand-600'
                    : runner.answers[q.id] !== undefined
                      ? 'bg-brand-100 dark:bg-brand-900'
                      : 'bg-slate-200 dark:bg-slate-700',
                )}
              >
                <AppText
                  className={cn(
                    'text-xs font-bold',
                    i === runner.index ? 'text-white' : 'text-slate-700 dark:text-slate-200',
                  )}
                >
                  {i + 1}
                </AppText>
              </Pressable>
            ))}
          </View>

          <QuestionCard
            question={current}
            number={runner.index + 1}
            total={ordered.length}
            value={runner.answers[current.id]}
            onChange={(value) => runner.setAnswer(current.id, value)}
          />

          <View className="flex-row gap-3">
            <Button
              title={t('quiz.previous')}
              variant="outline"
              className="flex-1"
              disabled={runner.index === 0}
              icon={<ChevronLeft size={18} color={colors.text} />}
              onPress={() => runner.goTo(runner.index - 1)}
            />
            {runner.index < ordered.length - 1 ? (
              <Button
                title={t('quiz.next')}
                className="flex-1"
                icon={<ChevronRight size={18} color={palette.white} />}
                onPress={() => runner.goTo(runner.index + 1)}
              />
            ) : (
              <Button
                title={t('quiz.submit')}
                className="flex-1"
                loading={submit.isPending}
                disabled={!online}
                onPress={confirmSubmit}
              />
            )}
          </View>
          <AppText variant="caption" className="text-center">
            {t('quiz.answered', { done: answeredCount, total: ordered.length })}
            {!online ? ` · ${t('common.offlineAction')}` : ''}
          </AppText>
        </Screen>
      </>
    );
  }

  /* -------------------------------- Intro --------------------------------- */
  const description = localized(data, 'description');
  return (
    <>
      <Stack.Screen options={{ title: t('screens.quiz') }} />
      <Screen
        contentClassName="gap-4 p-4 pb-8"
        refreshing={attempts.isRefetching}
        onRefresh={() => void attempts.refetch()}
      >
        <Card className="items-center gap-3 py-6">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-600">
            <ClipboardCheck size={28} color={palette.white} />
          </View>
          <AppText variant="title" className="text-center">
            {localized(data, 'title')}
          </AppText>
          {description ? (
            <AppText variant="muted" className="text-center">
              {description}
            </AppText>
          ) : null}
          {passedBefore ? <Badge label={t('courses.assessmentPassed')} tone="success" /> : null}
        </Card>

        <Card className="gap-3">
          <InfoRow label={t('quiz.questions')} value={String(data.questions.length)} />
          <InfoRow label={t('quiz.passingScore')} value={`${data.passingScore}%`} />
          <InfoRow
            label={t('quiz.timeLimit')}
            value={
              data.timeLimitMinutes
                ? t('courses.minutes', { count: data.timeLimitMinutes })
                : t('quiz.noTimeLimit')
            }
          />
          <InfoRow label={t('quiz.attemptsLeft')} value={`${attemptsLeft} / ${data.maxAttempts}`} />
          {best !== null ? <InfoRow label={t('quiz.bestScore')} value={`${best}%`} /> : null}
        </Card>

        {submitted.length > 0 ? (
          <Card className="gap-2">
            <AppText variant="label">{t('quiz.history')}</AppText>
            {submitted.map((a) => (
              <View key={a.id} className="flex-row items-center justify-between">
                <AppText variant="muted">
                  #{a.attemptNumber} · {formatDate(a.submittedAt, locale)}
                </AppText>
                <Badge label={`${a.score}%`} tone={a.passed ? 'success' : 'danger'} />
              </View>
            ))}
          </Card>
        ) : null}

        {startError ? (
          <View className="rounded-xl bg-red-50 px-3 py-2.5 dark:bg-red-950">
            <AppText className="text-sm text-red-700 dark:text-red-300">{startError}</AppText>
          </View>
        ) : null}

        <Button
          title={
            pending ? t('quiz.resume') : submitted.length > 0 ? t('quiz.retake') : t('quiz.start')
          }
          onPress={begin}
          loading={start.isPending}
          disabled={!online || data.questions.length === 0}
          fullWidth
        />
        {data.timeLimitMinutes ? (
          <AppText variant="caption" className="text-center">
            {t('quiz.timerWarning')}
          </AppText>
        ) : null}
      </Screen>
    </>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between">
      <AppText variant="muted">{label}</AppText>
      <AppText className="font-semibold text-slate-900 dark:text-slate-50">{value}</AppText>
    </View>
  );
}
