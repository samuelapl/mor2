import { create } from 'zustand';

import { ApiError } from '@/core/api/errors';
import { queryClient } from '@/core/api/query-client';
import { readJson, sessionStorage, writeJson } from '@/core/storage/kv-storage';

import { liveSessionApi, sessionKeys } from '../api/live-session-api';
import type { ApiLiveSession, HeartbeatResult } from '../types/live-session.types';

/**
 * Virtual-session attendance (spec §8.5, architecture §6.8).
 *
 * External meeting apps (Zoom/Meet/Teams) push this app to the background, where JS timers
 * stop. So attendance is measured by wall clock: every heartbeat sends the seconds elapsed
 * since the previous one (split into ≤120 s calls), capped at the session's end. The state is
 * persisted so a killed app can still send the time and "leave" when it comes back.
 */

const MAX_BEAT_SECONDS = 120;
const GRACE_AFTER_END_MS = 15 * 60 * 1000;
const STORAGE_KEY = 'active-meeting';

interface ActiveMeeting {
  sessionId: string;
  lastBeatAt: number;
  endsAt: number;
}

interface MeetingState {
  active: ActiveMeeting | null;
  last: HeartbeatResult | null;
  start: (session: ApiLiveSession) => Promise<void>;
  beat: () => Promise<void>;
  leave: () => Promise<void>;
}

function persist(active: ActiveMeeting | null) {
  if (active) writeJson(sessionStorage, STORAGE_KEY, active);
  else sessionStorage.remove(STORAGE_KEY);
}

function sessionEnd(session: ApiLiveSession): number {
  const start = new Date(session.actualStartedAt ?? session.scheduledAt).getTime();
  return Math.max(start, Date.now()) + session.durationMinutes * 60 * 1000 + GRACE_AFTER_END_MS;
}

let beating: Promise<void> | null = null;

export const useMeetingStore = create<MeetingState>((set, get) => ({
  active: readJson<ActiveMeeting>(sessionStorage, STORAGE_KEY),
  last: null,

  start: async (session) => {
    // Switching meetings: close the previous one first.
    if (get().active && get().active!.sessionId !== session.id) await get().leave();
    await liveSessionApi.join(session.id);
    const active = { sessionId: session.id, lastBeatAt: Date.now(), endsAt: sessionEnd(session) };
    persist(active);
    set({ active });
  },

  beat: () => {
    if (beating) return beating;
    beating = (async () => {
      const active = get().active;
      if (!active) return;
      const now = Math.min(Date.now(), active.endsAt);
      let remaining = Math.floor((now - active.lastBeatAt) / 1000);
      let cursor = active.lastBeatAt;
      try {
        while (remaining >= 1) {
          const chunk = Math.min(remaining, MAX_BEAT_SECONDS);
          const result = await liveSessionApi.heartbeat(active.sessionId, chunk);
          cursor += chunk * 1000;
          remaining -= chunk;
          set({ last: result });
        }
      } catch (error) {
        // Network: keep lastBeatAt so the time is sent later. 4xx: give up on this meeting.
        if (!(error instanceof ApiError && error.isNetworkError)) {
          persist(null);
          set({ active: null });
          return;
        }
      }
      const next = { ...active, lastBeatAt: cursor };
      if (get().active?.sessionId === active.sessionId) {
        persist(next);
        set({ active: next });
      }
    })().finally(() => {
      beating = null;
    });
    return beating;
  },

  leave: async () => {
    const active = get().active;
    if (!active) return;
    await get().beat();
    try {
      await liveSessionApi.leave(active.sessionId);
    } catch {
      // Best effort — the heartbeats already recorded the time.
    }
    persist(null);
    set({ active: null });
    void queryClient.invalidateQueries({ queryKey: sessionKeys.myAttendance });
  },
}));
