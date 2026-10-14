import type { Locale } from '../api/types';

const intlLocale = (locale: Locale) => (locale === 'am' ? 'am-ET' : 'en-US');

/**
 * Session times are shown in the platform time zone (EAT), whatever zone the phone is set to,
 * so the app, the website and reminder emails always agree. Same setting as the backend's
 * APP_TIMEZONE.
 */
export const APP_TIME_ZONE = process.env.EXPO_PUBLIC_APP_TIMEZONE || 'Africa/Addis_Ababa';
export const APP_TIME_ZONE_LABEL = process.env.EXPO_PUBLIC_APP_TIMEZONE_LABEL || 'EAT';

export function formatDate(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '';
  const formatted = new Date(iso).toLocaleString(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatted} ${APP_TIME_ZONE_LABEL}`;
}

export function formatTime(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '';
  const formatted = new Date(iso).toLocaleTimeString(intlLocale(locale), {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${formatted} ${APP_TIME_ZONE_LABEL}`;
}

/** Time until a session starts: 376500 → "4d 8h 35m" (Amharic: "4ቀ 8ሰ 35ደ"); under a minute "<1m". */
export function formatStartsIn(totalSeconds: number, locale: Locale = 'en'): string {
  const [d, h, m] = locale === 'am' ? ['ቀ', 'ሰ', 'ደ'] : ['d', 'h', 'm'];
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86_400);
  const hours = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600) / 60);
  if (days === 0 && hours === 0 && minutes === 0) return `<1${m}`;
  return [days ? `${days}${d}` : null, days || hours ? `${hours}${h}` : null, `${minutes}${m}`]
    .filter(Boolean)
    .join(' ');
}

/** 5400 → "1h 30m", 95 → "1m 35s". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  return `${sec}s`;
}

/** Countdown format: 125 → "02:05", 3725 → "1:02:05". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Formats a duration stored in hours (Course.estimatedHours), matching web's formatHours:
 * e.g., 0.9166666 → "55m", 1.5 → "1h 30m", 2 → "2h", 0 / null → "Self-paced".
 */
export function formatCourseDuration(hours: number | null | undefined, locale: Locale = 'en'): string {
  const isAm = locale === 'am';
  if (!hours || hours <= 0) return isAm ? 'በራስ ፍጥነት' : 'Self-paced';

  const totalMinutes = Math.round(hours * 60);
  if (totalMinutes <= 0) return isAm ? 'በራስ ፍጥነት' : 'Self-paced';

  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;

  if (isAm) {
    if (h === 0) return `${m}ደ`;
    if (m === 0) return `${h}ሰ`;
    return `${h}ሰ ${m}ደ`;
  }

  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
