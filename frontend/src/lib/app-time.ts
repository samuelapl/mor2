'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api/client';

/**
 * Session times are entered and shown in one platform time zone (EAT by default), whatever
 * zone the browser is in. The backend uses the same zone (APP_TIMEZONE).
 */
export const APP_TIME_ZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || 'Africa/Addis_Ababa';
export const APP_TIME_ZONE_LABEL = process.env.NEXT_PUBLIC_APP_TIMEZONE_LABEL || 'EAT';

type Locale = string | undefined;

function zonedParts(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

function zoneOffsetMs(date: Date): number {
  const p = zonedParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(date.getTime() / 1000) * 1000;
}

/** "2026-10-23" + "11:00" read as platform time → ISO instant ("2026-10-23T08:00:00.000Z" in EAT). */
export function appDateTimeToIso(date: string, time: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wallClock = Date.UTC(y!, m! - 1, d!, hh!, mm!);
  let instant = wallClock - zoneOffsetMs(new Date(wallClock));
  instant = wallClock - zoneOffsetMs(new Date(instant));
  return new Date(instant).toISOString();
}

/** An instant as platform-time form values: { date: "2026-10-23", time: "11:00" }. */
export function isoToAppDateTime(iso: string): { date: string; time: string } {
  const p = zonedParts(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, '0');
  return { date: `${p.year}-${pad(p.month)}-${pad(p.day)}`, time: `${pad(p.hour)}:${pad(p.minute)}` };
}

/** Today's (or `daysAhead` days later) date in platform time, as YYYY-MM-DD. */
export function appToday(daysAhead = 0): string {
  return isoToAppDateTime(new Date(Date.now() + daysAhead * 86_400_000).toISOString()).date;
}

/** e.g. "Oct 23, 2026". */
export function formatSessionDate(iso: string, options?: Intl.DateTimeFormatOptions, locale?: Locale): string {
  return new Date(iso).toLocaleDateString(locale ?? 'en-US', {
    timeZone: APP_TIME_ZONE,
    ...(options ?? { month: 'short', day: 'numeric', year: 'numeric' }),
  });
}

/** e.g. "11:00 AM EAT". */
export function formatSessionTime(iso: string, locale?: Locale): string {
  const time = new Date(iso).toLocaleTimeString(locale ?? 'en-US', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit' });
  return `${time} ${APP_TIME_ZONE_LABEL}`;
}

/** e.g. "Oct 23, 2026, 11:00 AM EAT". */
export function formatSessionDateTime(iso: string, locale?: Locale): string {
  const formatted = new Date(iso).toLocaleString(locale ?? 'en-US', { timeZone: APP_TIME_ZONE, dateStyle: 'medium', timeStyle: 'short' });
  return `${formatted} ${APP_TIME_ZONE_LABEL}`;
}

/** Seconds as "4d 2h 35m" (Amharic: "4ቀ 2ሰ 35ደ"); under a minute is "<1m". */
export function formatStartsIn(seconds: number, isAmharic = false): string {
  const [d, h, m] = isAmharic ? ['ቀ', 'ሰ', 'ደ'] : ['d', 'h', 'm'];
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days === 0 && hours === 0 && minutes === 0) return `<1${m}`;
  return [days && `${days}${d}`, (days || hours) && `${hours}${h}`, `${minutes}${m}`].filter(Boolean).join(' ');
}

/**
 * Server clock, read once (no ticking): the offset between server and browser clocks, so a
 * "from now" preview does not depend on a wrong laptop clock. Falls back to the browser clock.
 */
export function useServerNow(enabled = true): () => number {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const sentAt = Date.now();
    api<{ now: string }>('time')
      .then((res) => {
        if (cancelled) return;
        // Assume the server read its clock halfway through the request.
        const browserMid = (sentAt + Date.now()) / 2;
        setOffset(new Date(res.now).getTime() - browserMid);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [enabled]);
  return () => Date.now() + offset;
}
