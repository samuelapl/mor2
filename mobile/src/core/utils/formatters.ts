import type { Locale } from '../api/types';

const intlLocale = (locale: Locale) => (locale === 'am' ? 'am-ET' : 'en-US');

export function formatDate(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(intlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(intlLocale(locale), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string | null | undefined, locale: Locale = 'en'): string {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString(intlLocale(locale), {
    hour: '2-digit',
    minute: '2-digit',
  });
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
