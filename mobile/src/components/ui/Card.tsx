import type { ReactNode } from 'react';
import { Pressable, View, type ViewProps } from 'react-native';

import { cn } from '@/core/utils/cn';

export interface CardProps extends ViewProps {
  children: ReactNode;
  onPress?: () => void;
  className?: string;
}

const base =
  'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800';

export function Card({ children, onPress, className, ...props }: CardProps) {
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        className={cn(base, 'active:opacity-80', className)}
        {...props}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View className={cn(base, className)} {...props}>
      {children}
    </View>
  );
}
