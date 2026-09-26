import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { cn } from '@/core/utils/cn';

/** Inline banner for form-level errors or confirmations. */
export function FormMessage({
  message,
  tone = 'error',
}: {
  message: string | null;
  tone?: 'error' | 'success';
}) {
  if (!message) return null;
  return (
    <View
      accessibilityRole="alert"
      className={cn(
        'rounded-xl px-3 py-2.5',
        tone === 'error' ? 'bg-red-50 dark:bg-red-950' : 'bg-green-50 dark:bg-green-950',
      )}
    >
      <AppText
        className={cn(
          'text-sm',
          tone === 'error'
            ? 'text-red-700 dark:text-red-300'
            : 'text-green-700 dark:text-green-300',
        )}
      >
        {message}
      </AppText>
    </View>
  );
}
