import type { ApiLiveSession } from '../types/live-session.types';

export const sessionStart = (s: Pick<ApiLiveSession, 'scheduledAt'>) =>
  new Date(s.scheduledAt).getTime();
export const sessionEnd = (s: Pick<ApiLiveSession, 'scheduledAt' | 'durationMinutes'>) =>
  sessionStart(s) + s.durationMinutes * 60 * 1000;

const EARLY_MS = 15 * 60 * 1000;

/** Virtual: joinable while LIVE, or from 15 min before start until the scheduled end. */
export function isJoinable(s: ApiLiveSession, now = Date.now()): boolean {
  if (s.status === 'LIVE') return true;
  if (s.status !== 'SCHEDULED') return false;
  return now >= sessionStart(s) - EARLY_MS && now <= sessionEnd(s);
}

/**
 * In-person: the backend accepts check-in whenever the session is SCHEDULED or LIVE (spec §8.6);
 * the app only blocks check-ins more than 15 min before the start.
 */
export function isCheckInOpen(s: ApiLiveSession, now = Date.now()): boolean {
  if (s.status !== 'SCHEDULED' && s.status !== 'LIVE') return false;
  return now >= sessionStart(s) - EARLY_MS;
}

export const isInPerson = (s: Pick<ApiLiveSession, 'sessionType' | 'platform'>) =>
  s.sessionType === 'IN_PERSON' || s.platform === 'IN_PERSON';

/** "YYYY-MM-DD" key for grouping by local day. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
