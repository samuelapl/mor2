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
export function LanguageToggle({
  onChange,
  disabled,
  className = 'self-start',
}: LanguageToggleProps) {
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

/** Compact English / Amharic toggle designed for navigation headers. */
export function HeaderLanguageToggle({
  onChange,
  disabled,
  className,
}: LanguageToggleProps) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const handleSelect = (val: Locale) => {
    if (disabled || val === locale) return;
    if (onChange) {
      onChange(val);
    } else {
      setLocale(val);
    }
  };

  return (
    <View
      className={cn(
        'flex-row items-center rounded-full bg-slate-200/90 p-0.5 dark:bg-slate-800',
        className,
      )}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="English"
        accessibilityState={{ selected: locale === 'en', disabled }}
        disabled={disabled}
        onPress={() => handleSelect('en')}
        className={cn(
          'rounded-full px-2 py-0.5',
          locale === 'en' && 'bg-white shadow-xs dark:bg-slate-900',
        )}
      >
        <AppText
          className={cn(
            'text-[11px] font-bold tracking-tight',
            locale === 'en'
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-slate-600 dark:text-slate-400',
          )}
        >
          EN
        </AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="አማርኛ"
        accessibilityState={{ selected: locale === 'am', disabled }}
        disabled={disabled}
        onPress={() => handleSelect('am')}
        className={cn(
          'rounded-full px-2 py-0.5',
          locale === 'am' && 'bg-white shadow-xs dark:bg-slate-900',
        )}
      >
        <AppText
          className={cn(
            'text-[11px] font-bold tracking-tight',
            locale === 'am'
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-slate-600 dark:text-slate-400',
          )}
        >
          አማ
        </AppText>
      </Pressable>
    </View>
  );
}
