import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { Pressable, TextInput, View } from 'react-native';

import { AppText, Card } from '@/components/ui';
import { resolveMediaUrl } from '@/core/media/resolveMediaUrl';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import type { AnswerValue, ApiQuestion } from '../types/assessment.types';

export interface QuestionCardProps {
  question: ApiQuestion;
  number: number;
  total: number;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue | undefined) => void;
}

/** One question. Choice answers are option indexes; short answers are strings (spec §7.4). */
export function QuestionCard({ question, number, total, value, onChange }: QuestionCardProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const image = resolveMediaUrl(question.imageUrl);
  const options =
    question.type === 'TRUE_FALSE' && question.options.length === 0
      ? ['True', 'False']
      : question.options;

  return (
    <Card className="gap-4">
      <AppText variant="caption">{t('quiz.questionOf', { number, total })}</AppText>
      <AppText variant="heading">{question.question}</AppText>
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: 180, borderRadius: 12 }}
          contentFit="contain"
        />
      ) : null}

      {question.type === 'SHORT_ANSWER' ? (
        <TextInput
          value={typeof value === 'string' ? value : ''}
          onChangeText={(text) => onChange(text)}
          placeholder={t('quiz.typeAnswer')}
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          className="min-h-[52px] rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50"
          accessibilityLabel={t('quiz.typeAnswer')}
        />
      ) : (
        <View accessibilityRole="radiogroup" className="gap-2">
          {options.map((option, index) => {
            const selected = value === index;
            return (
              <Pressable
                key={`${question.id}-${index}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => onChange(selected ? undefined : index)}
                className={cn(
                  'flex-row items-center gap-3 rounded-xl border-2 p-3',
                  selected
                    ? 'border-brand-600 bg-brand-50 dark:bg-brand-900'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
                )}
              >
                <View
                  className={cn(
                    'h-7 w-7 items-center justify-center rounded-full border-2',
                    selected
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-slate-300 dark:border-slate-600',
                  )}
                >
                  <AppText
                    className={cn('text-xs font-bold', selected ? 'text-white' : 'text-slate-500')}
                  >
                    {String.fromCharCode(65 + index)}
                  </AppText>
                </View>
                <AppText className="flex-1 text-base text-slate-800 dark:text-slate-100">
                  {option}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}
    </Card>
  );
}
