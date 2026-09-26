import { AlertTriangle, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/errors';
import { useLocaleStore } from '@/core/i18n';
import { useThemeColors } from '@/core/theme/colors';

import { EmptyState } from './EmptyState';

export interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
}

/** Full-area error with localized server message and a retry action. */
export function ErrorState({ error, onRetry }: ErrorStateProps) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const locale = useLocaleStore((s) => s.locale);

  const apiError = error instanceof ApiError ? error : null;
  const offline = apiError?.isNetworkError ?? false;
  const message = apiError
    ? apiError.localizedMessage(locale)
    : error instanceof Error
      ? error.message
      : undefined;

  return (
    <EmptyState
      icon={
        offline ? (
          <WifiOff size={40} color={colors.textMuted} />
        ) : (
          <AlertTriangle size={40} color={colors.warning} />
        )
      }
      title={offline ? t('common.offlineAction') : t('common.somethingWrong')}
      description={offline ? undefined : message}
      actionLabel={onRetry ? t('common.retry') : undefined}
      onAction={onRetry}
    />
  );
}
