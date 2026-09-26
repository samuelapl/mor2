import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView } from 'react-native';

import { AppText } from '@/components/ui';
import type { CourseLevel } from '@/core/api/types';
import { cn } from '@/core/utils/cn';

const LEVELS: CourseLevel[] = ['BASIC', 'INTERMEDIATE', 'ADVANCED'];

/** Client-side level chips — the backend has no level filter (spec §3.1). */
export function LevelFilter({
  value,
  onChange,
}: {
  value: CourseLevel | null;
  onChange: (level: CourseLevel | null) => void;
}) {
  const { t } = useTranslation();
  const options: { key: CourseLevel | null; label: string }[] = [
    { key: null, label: t('courses.allLevels') },
    ...LEVELS.map((level) => ({ key: level, label: t(`courses.level.${level}`) })),
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.label}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.key)}
            className={cn(
              'rounded-full border px-4 py-2',
              active
                ? 'border-brand-600 bg-brand-600'
                : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800',
            )}
          >
            <AppText
              className={cn(
                'text-sm font-medium',
                active ? 'text-white' : 'text-slate-700 dark:text-slate-200',
              )}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
