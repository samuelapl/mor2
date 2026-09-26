import { ChevronRight } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

export interface ListRowProps {
  label: string;
  value?: string;
  icon?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
}

/** Settings-style row with optional icon, trailing value and chevron. */
export function ListRow({ label, value, icon, onPress, destructive }: ListRowProps) {
  const colors = useThemeColors();
  const content = (
    <>
      {icon}
      <AppText
        className={cn(
          'flex-1 text-base',
          destructive ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100',
        )}
      >
        {label}
      </AppText>
      {value ? <AppText variant="muted">{value}</AppText> : null}
      {onPress && !destructive ? <ChevronRight size={18} color={colors.textMuted} /> : null}
    </>
  );

  const className = 'min-h-[52px] flex-row items-center gap-3 px-4 py-3';
  if (!onPress) return <View className={className}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(className, 'active:bg-slate-100 dark:active:bg-slate-700')}
    >
      {content}
    </Pressable>
  );
}
