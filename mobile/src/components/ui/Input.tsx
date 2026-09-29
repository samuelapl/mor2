import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { useThemeColors } from '@/core/theme/colors';
import { cn } from '@/core/utils/cn';

import { AppText } from './AppText';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string;
  /** Adds a show/hide toggle and hides the text by default. */
  password?: boolean;
  leftIcon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    password = false,
    leftIcon,
    containerClassName,
    className,
    editable = true,
    onFocus,
    onBlur,
    ...props
  },
  ref,
) {
  const colors = useThemeColors();
  const [hidden, setHidden] = useState(password);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={cn('gap-1.5', containerClassName)}>
      {label ? <AppText variant="label">{label}</AppText> : null}
      <View
        className={cn(
          'h-12 flex-row items-center rounded-xl border bg-white px-3 dark:bg-slate-800',
          error
            ? 'border-red-500'
            : isFocused
              ? 'border-brand-600 dark:border-brand-400'
              : 'border-slate-300 dark:border-slate-600',
          !editable && 'opacity-60',
        )}
      >
        {leftIcon ? <View className="mr-2.5 items-center justify-center">{leftIcon}</View> : null}
        <TextInput
          ref={ref}
          editable={editable}
          secureTextEntry={hidden}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          className={cn('flex-1 text-base text-slate-900 dark:text-slate-50', className)}
          accessibilityLabel={label}
          {...props}
        />
        {password ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            onPress={() => setHidden((h) => !h)}
            className="p-1"
          >
            {hidden ? (
              <Eye size={20} color={colors.textMuted} />
            ) : (
              <EyeOff size={20} color={colors.textMuted} />
            )}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" className="text-red-600 dark:text-red-400">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption">{hint}</AppText>
      ) : null}
    </View>
  );
});
