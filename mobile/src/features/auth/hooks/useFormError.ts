import { useTranslation } from 'react-i18next';

import { ApiError } from '@/core/api/errors';
import { useLocaleStore } from '@/core/i18n';

import { NotLearnerError } from './useAuthActions';

/** Turns a mutation error into a user-facing, localized message (or null). */
export function useFormError(error: unknown): string | null {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);

  if (!error) return null;
  if (error instanceof NotLearnerError) return t('auth.errors.notLearner');
  if (error instanceof ApiError) {
    if (error.isNetworkError) return t('common.offlineAction');
    return error.localizedMessage(locale);
  }
  return t('common.somethingWrong');
}
