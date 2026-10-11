'use client';

import { AlertTriangle, Clock } from 'lucide-react';
import { APP_TIME_ZONE_LABEL, appDateTimeToIso, formatSessionDateTime, formatStartsIn } from '@/lib/app-time';
import { cn } from '@/lib/utils';

/**
 * Shown above a session's date and time while scheduling: the start in platform time (EAT)
 * and how far away it is on the server clock. It does not count down; it updates when the
 * date or time changes.
 */
export function SessionStartNotice({ date, time, now }: { date: string; time: string; now: () => number }) {
  if (!date || !time) return null;
  const iso = appDateTimeToIso(date, time);
  const seconds = Math.floor((new Date(iso).getTime() - now()) / 1000);
  const past = seconds <= 0;

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs',
        past ? 'border-danger/30 bg-danger-soft text-danger' : 'border-primary/30 bg-primary-soft/70 text-primary',
      )}
    >
      {past ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> : <Clock className="mt-0.5 h-4 w-4 shrink-0" />}
      <div>
        <p className="font-semibold">
          {past ? 'This time has already passed.' : `Starts in ${formatStartsIn(seconds)}`}
          <span className="font-normal"> · {formatSessionDateTime(iso)}</span>
        </p>
        <p className="mt-0.5 opacity-80">Times are in {APP_TIME_ZONE_LABEL} (Addis Ababa), whatever your device&apos;s time zone.</p>
      </div>
    </div>
  );
}
