import { APP_TIME_ZONE } from '@/core/utils/formatters';

import type { ApiLiveSession } from '../types/live-session.types';

export const sessionStart = (s: Pick<ApiLiveSession, 'scheduledAt'>) =>
  new Date(s.scheduledAt).getTime();
export const sessionEnd = (s: Pick<ApiLiveSession, 'scheduledAt' | 'durationMinutes'>) =>
  sessionStart(s) + s.durationMinutes * 60 * 1000;

/** Learners may join a virtual session from 5 min before the start (the backend enforces it). */
export const JOIN_EARLY_MS = 5 * 60 * 1000;
const CHECK_IN_EARLY_MS = 15 * 60 * 1000;

/**
 * Virtual: joinable while LIVE, or from 5 min before start until the scheduled end. Pass the
 * server clock (useServerNow) so a wrong phone clock does not open or close the window.
 */
export function isJoinable(s: ApiLiveSession, now = Date.now()): boolean {
  if (s.status === 'LIVE') return true;
  if (s.status !== 'SCHEDULED') return false;
  return now >= sessionStart(s) - JOIN_EARLY_MS && now <= sessionEnd(s);
}

/**
 * In-person: the backend accepts check-in whenever the session is SCHEDULED or LIVE (spec §8.6);
 * the app only blocks check-ins more than 15 min before the start.
 */
export function isCheckInOpen(s: ApiLiveSession, now = Date.now()): boolean {
  if (s.status !== 'SCHEDULED' && s.status !== 'LIVE') return false;
  return now >= sessionStart(s) - CHECK_IN_EARLY_MS;
}

export const isInPerson = (s: Pick<ApiLiveSession, 'sessionType' | 'platform'>) =>
  s.sessionType === 'IN_PERSON' || s.platform === 'IN_PERSON';

/** "YYYY-MM-DD" key for grouping by day in the platform time zone (EAT), not the phone's. */
export function dayKey(iso: string): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Date(iso).toLocaleDateString('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
