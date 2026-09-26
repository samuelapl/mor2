import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import type { Locale } from '@/core/api/types';
import { useLocaleStore } from '@/core/i18n';
import { cn } from '@/core/utils/cn';

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'am', label: 'አማርኛ' },
];

export interface LanguageToggleProps {
  /** Override persistence (e.g. also PATCH /users/me when signed in). */
  onChange?: (locale: Locale) => void;
  disabled?: boolean;
  /** Alignment within the parent; defaults to the start edge. */
  className?: string;
}

/** Segmented English / Amharic switch. */
export function LanguageToggle({ onChange, disabled, className = 'self-start' }: LanguageToggleProps) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <View className={cn('flex-row rounded-full bg-slate-200 p-1 dark:bg-slate-700', className)}>
      {OPTIONS.map((option) => {
        const active = option.value === locale;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => (onChange ? onChange(option.value) : setLocale(option.value))}
            className={cn('rounded-full px-4 py-1.5', active && 'bg-white dark:bg-slate-900')}
          >
            <AppText
              className={cn(
                'text-sm font-semibold',
                active
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-slate-600 dark:text-slate-300',
              )}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
