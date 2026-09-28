import { AlertCircle, CheckCircle } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui';
import { palette } from '@/core/theme/colors';
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
  const isError = tone === 'error';
  return (
    <View
      accessibilityRole="alert"
      className={cn(
        'flex-row items-center gap-2.5 rounded-xl border px-3.5 py-3',
        isError
          ? 'border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40'
          : 'border-green-200 bg-green-50 dark:border-green-900/60 dark:bg-green-950/40',
      )}
    >
      {isError ? (
        <AlertCircle size={18} color={palette.danger} />
      ) : (
        <CheckCircle size={18} color={palette.success} />
      )}
      <AppText
        className={cn(
          'flex-1 text-sm font-medium',
          isError
            ? 'text-red-700 dark:text-red-300'
            : 'text-green-700 dark:text-green-300',
        )}
      >
        {message}
      </AppText>
    </View>
  );
}
