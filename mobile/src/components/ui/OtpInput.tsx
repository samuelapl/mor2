import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { cn } from '@/core/utils/cn';

import { AppText } from './AppText';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** The backend always sends 6-digit codes (spec §2.5, §2.6). */
  length?: number;
  error?: string | null;
  autoFocus?: boolean;
}

/** Single hidden TextInput rendered as boxes — supports paste and SMS/email autofill. */
export function OtpInput({ value, onChange, length = 6, error, autoFocus = true }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const digits = value.padEnd(length, ' ').slice(0, length).split('');

  return (
    <View className="gap-2">
      <Pressable
        accessibilityLabel="Verification code"
        onPress={() => inputRef.current?.focus()}
        className="flex-row justify-between gap-2"
      >
        {digits.map((digit, index) => {
          const active = index === Math.min(value.length, length - 1);
          return (
            <View
              key={index}
              className={cn(
                'h-14 flex-1 items-center justify-center rounded-xl border bg-white dark:bg-slate-800',
                error
                  ? 'border-red-500'
                  : active
                    ? 'border-brand-600'
                    : 'border-slate-300 dark:border-slate-600',
              )}
            >
              <AppText variant="title">{digit.trim()}</AppText>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={length}
        className="absolute h-0 w-0 opacity-0"
      />
      {error ? (
        <AppText variant="caption" className="text-red-600 dark:text-red-400">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
