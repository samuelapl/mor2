import { Moon, Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { useAppTheme } from '@/core/theme/theme-store';
import { cn } from '@/core/utils/cn';

/** Header circular icon button for toggling theme (placed to the left of the notification bell). */
export function HeaderThemeToggle({ className }: { className?: string }) {
  const { isDark, toggleTheme } = useAppTheme();
  const colors = useThemeColors();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      hitSlop={10}
      onPress={toggleTheme}
      className={cn(
        'h-9 w-9 items-center justify-center rounded-full bg-slate-200/80 active:bg-slate-300 dark:bg-slate-800 dark:active:bg-slate-700',
        className,
      )}
    >
      {isDark ? (
        <Sun size={19} color="#f59e0b" />
      ) : (
        <Moon size={19} color={colors.text} />
      )}
    </Pressable>
  );
}

/** Segmented Light / Dark switch for Profile and Settings. */
export function ThemeToggle({ className = 'self-start' }: { className?: string }) {
  const { t } = useTranslation();
  const { isDark, setTheme } = useAppTheme();
  const colors = useThemeColors();

  return (
    <View className={cn('flex-row rounded-full bg-slate-200 p-1 dark:bg-slate-700', className)}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: !isDark }}
        onPress={() => setTheme('light')}
        className={cn(
          'flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5',
          !isDark && 'bg-white dark:bg-slate-900',
        )}
      >
        <Sun size={15} color={!isDark ? '#d97706' : colors.textMuted} />
        <AppText
          className={cn(
            'text-sm font-semibold',
            !isDark
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-slate-600 dark:text-slate-300',
          )}
        >
          {t('profile.themeLight')}
        </AppText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: isDark }}
        onPress={() => setTheme('dark')}
        className={cn(
          'flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5',
          isDark && 'bg-white dark:bg-slate-900',
        )}
      >
        <Moon size={15} color={isDark ? colors.primary : colors.textMuted} />
        <AppText
          className={cn(
            'text-sm font-semibold',
            isDark
              ? 'text-brand-700 dark:text-brand-300'
              : 'text-slate-600 dark:text-slate-300',
          )}
        >
          {t('profile.themeDark')}
        </AppText>
      </Pressable>
    </View>
  );
}
