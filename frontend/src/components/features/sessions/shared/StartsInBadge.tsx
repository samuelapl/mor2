'use client';

import { Clock } from 'lucide-react';
import { formatStartsIn } from '@/lib/app-time';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

/**
 * "Starts in 4d 2h 35m" for an upcoming session, from the server's `startsInSeconds` at load
 * time. It does not count down; reloading the page asks the server again.
 */
export function StartsInBadge({
  seconds,
  className,
}: {
  seconds: number | null | undefined;
  className?: string;
}) {
  const { t, isAmharic } = useTranslation('sessions');
  if (seconds == null || seconds <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {t('startsInBadge.startsIn', { time: formatStartsIn(seconds, isAmharic) })}
    </span>
  );
}
