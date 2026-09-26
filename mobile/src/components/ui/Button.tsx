import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';

import { palette } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const containerByVariant: Record<Variant, string> = {
  primary: 'bg-brand-600 active:bg-brand-700',
  secondary: 'bg-brand-50 active:bg-brand-100 dark:bg-slate-800 dark:active:bg-slate-700',
  outline:
    'border border-slate-300 bg-transparent active:bg-slate-100 dark:border-slate-600 dark:active:bg-slate-800',
  ghost: 'bg-transparent active:bg-slate-100 dark:active:bg-slate-800',
  danger: 'bg-red-600 active:bg-red-700',
};

const textByVariant: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-brand-700 dark:text-brand-200',
  outline: 'text-slate-800 dark:text-slate-100',
  ghost: 'text-brand-600 dark:text-brand-300',
  danger: 'text-white',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3 rounded-lg',
  md: 'h-12 px-4 rounded-xl',
  lg: 'h-14 px-6 rounded-2xl',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  fullWidth = false,
  className,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor =
    variant === 'primary' || variant === 'danger' ? palette.white : palette.brand600;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      className={cn(
        'flex-row items-center justify-center',
        sizeClasses[size],
        containerByVariant[variant],
        fullWidth && 'w-full',
        isDisabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon}
          <AppText
            className={cn(
              'font-semibold',
              size === 'sm' ? 'text-sm' : 'text-base',
              textByVariant[variant],
            )}
          >
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
