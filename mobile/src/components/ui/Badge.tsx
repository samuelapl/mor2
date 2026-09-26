import { View } from 'react-native';

import { cn } from '@/core/utils/cn';

import { AppText } from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'live';

const toneClasses: Record<BadgeTone, { box: string; text: string }> = {
  neutral: { box: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-700 dark:text-slate-200' },
  brand: { box: 'bg-brand-50 dark:bg-brand-900', text: 'text-brand-700 dark:text-brand-200' },
  success: { box: 'bg-green-100 dark:bg-green-900', text: 'text-green-800 dark:text-green-200' },
  warning: { box: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-800 dark:text-amber-200' },
  danger: { box: 'bg-red-100 dark:bg-red-900', text: 'text-red-800 dark:text-red-200' },
  live: { box: 'bg-red-600', text: 'text-white' },
};

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ label, tone = 'neutral', className }: BadgeProps) {
  const classes = toneClasses[tone];
  return (
    <View className={cn('self-start rounded-full px-2.5 py-1', classes.box, className)}>
      <AppText className={cn('text-xs font-semibold', classes.text)}>{label}</AppText>
    </View>
  );
}
