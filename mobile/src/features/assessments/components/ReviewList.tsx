import { CircleCheck, CircleX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';

import type { AnswerValue, ReviewItem } from '../types/assessment.types';

function answerText(item: ReviewItem, value: AnswerValue | undefined, empty: string): string {
  if (value === undefined || value === null || value === '') return empty;
  if (typeof value === 'number' && item.options?.[value] !== undefined) return item.options[value]!;
  return String(value);
}

/** Per-question review after grading (spec §7.4 `review`). */
export function ReviewList({ review }: { review: ReviewItem[] }) {
  const { t } = useTranslation();
  const colors = useThemeColors();

  return (
    <View className="gap-3">
      {review.map((item, index) => (
        <Card key={item.questionId} className="gap-2">
          <View className="flex-row items-start gap-2">
            {item.isCorrect ? (
              <CircleCheck size={20} color={colors.success} />
            ) : (
              <CircleX size={20} color={colors.danger} />
            )}
            <AppText className="flex-1 font-semibold text-slate-900 dark:text-slate-50">
              {index + 1}. {item.question}
            </AppText>
          </View>
          <AppText variant="muted">
            {t('quiz.yourAnswer')}: {answerText(item, item.selectedOption, t('quiz.noAnswer'))}
          </AppText>
          {!item.isCorrect && item.correctAnswer !== undefined ? (
            <AppText className="text-sm text-green-700 dark:text-green-400">
              {t('quiz.correctAnswer')}: {answerText(item, item.correctAnswer, '—')}
            </AppText>
          ) : null}
        </Card>
      ))}
    </View>
  );
}
