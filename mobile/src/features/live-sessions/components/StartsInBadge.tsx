import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui';
import { useLocaleStore } from '@/core/i18n';
import { formatStartsIn } from '@/core/utils/formatters';

/**
 * "Starts in 4d 2h 35m" for an upcoming session, from the server's `startsInSeconds` at load
 * time. It does not count down; pulling to refresh (or reopening) asks the server again.
 */
export function StartsInBadge({ seconds }: { seconds: number | null | undefined }) {
  const { t } = useTranslation();
  const locale = useLocaleStore((s) => s.locale);
  if (seconds == null || seconds <= 0) return null;
  return <Badge label={t('sessions.startsIn', { time: formatStartsIn(seconds, locale) })} tone="brand" />;
}
