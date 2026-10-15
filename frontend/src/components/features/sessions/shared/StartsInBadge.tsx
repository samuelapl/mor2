'use client';

import { Clock } from 'lucide-react';
import { formatStartsIn } from '@/lib/app-time';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export function StartsInBadge({ seconds, className }: { seconds: number | null | undefined; className?: string }) {
  const { t, isAmharic } = useTranslation('sessions');
  if (seconds == null || seconds <= 0) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary',
        className,
      )}
    >
      <Clock className="h-3 w-3" />
      {t('startsInBadge.startsIn', { time: formatStartsIn(seconds, isAmharic) })}
    </span>
  );
}
