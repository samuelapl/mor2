import { router, useLocalSearchParams } from 'expo-router';
import { PartyPopper, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Button, Card, EmptyState, ProgressRing, Screen } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { ReviewList, useAssessment, useAttempts, useQuizRunnerStore } from '@/features/assessments';

/** Graded result + per-question review (spec §7.4). Reached via router.replace from the runner. */
export default function QuizResultScreen() {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { assessmentId, courseId } = useLocalSearchParams<{
    assessmentId: string;
    courseId?: string;
  }>();
  const result = useQuizRunnerStore((s) => s.lastResult);
  const assessment = useAssessment(assessmentId);
  const attempts = useAttempts(assessmentId);

  if (!result) {
    return (
      <Screen>
        <EmptyState
          title={t('common.nothingHere')}
          actionLabel={t('common.back')}
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const submitted = (attempts.data ?? []).filter((a) => a.submittedAt).length;
  const canRetry =
    !result.passed && assessment.data ? submitted < assessment.data.maxAttempts : false;
  const passingScore = assessment.data?.passingScore;

  return (
    <Screen contentClassName="gap-4 p-4 pb-8">
      <Card className="items-center gap-3 py-6">
        <ProgressRing percent={result.score} size={96} strokeWidth={8} />
        <View className="flex-row items-center gap-2">
          {result.passed ? <PartyPopper size={22} color={colors.success} /> : null}
          <AppText
            variant="title"
            className={
              result.passed
                ? 'text-green-700 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }
          >
            {result.passed ? t('quiz.passed') : t('quiz.failed')}
          </AppText>
        </View>
        <AppText variant="muted">
          {t('quiz.correctCount', { correct: result.correctCount, total: result.totalQuestions })}
          {passingScore !== undefined ? ` · ${t('quiz.passMark', { score: passingScore })}` : ''}
        </AppText>
        {result.passed ? (
          <AppText variant="caption" className="text-center">
            {t('quiz.passedHint')}
          </AppText>
        ) : null}
      </Card>

      <View className="gap-3">
        {canRetry ? (
          <Button
            title={t('quiz.retake')}
            icon={<RotateCcw size={18} color="#fff" />}
            onPress={() =>
              router.replace({
                pathname: '/quiz/[assessmentId]',
                params: { assessmentId, courseId: courseId ?? '' },
              })
            }
            fullWidth
          />
        ) : null}
        <Button
          title={t('common.continue')}
          variant={canRetry ? 'outline' : 'primary'}
          onPress={() => router.back()}
          fullWidth
        />
      </View>

      <AppText variant="heading">{t('quiz.review')}</AppText>
      <ReviewList review={result.review} />
    </Screen>
  );
}
