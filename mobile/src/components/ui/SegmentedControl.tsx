import { Pressable, View } from 'react-native';

import { cn } from '@/core/utils/cn';

import { AppText } from './AppText';

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      className="flex-row rounded-xl bg-slate-200 p-1 dark:bg-slate-800"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            className={cn(
              'flex-1 items-center rounded-lg py-2',
              active && 'bg-white dark:bg-slate-700',
            )}
          >
            <AppText
              numberOfLines={1}
              className={cn(
                'text-sm font-semibold',
                active
                  ? 'text-brand-700 dark:text-brand-200'
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
