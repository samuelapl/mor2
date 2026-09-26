import { View } from 'react-native';

import { cn } from '@/core/utils/cn';

export interface ProgressBarProps {
  /** 0–100 */
  percent: number;
  tone?: 'brand' | 'success';
  className?: string;
}

export function ProgressBar({ percent, tone = 'brand', className }: ProgressBarProps) {
  const value = Math.min(100, Math.max(0, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: value }}
      className={cn(
        'h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700',
        className,
      )}
    >
      <View
        className={cn('h-full rounded-full', tone === 'success' ? 'bg-green-600' : 'bg-brand-600')}
        style={{ width: `${value}%` }}
      />
    </View>
  );
}
