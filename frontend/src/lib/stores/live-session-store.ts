'use client';

import { create } from 'zustand';

import {
  deleteLiveSession,
  fetchLiveSessions,
  fetchUpcomingSessions,
  scheduleSession as apiScheduleSession,
  setSessionStatus,
  updateLiveSession,
  type ScheduleSessionBody,
} from '@/lib/api/monitoring';
import type { ApiLiveSession, BackendSessionStatus } from '@/lib/api/types';

/** Matches what the session pages requested before the store existed. */
const SESSIONS_LIMIT = 100;

interface LiveSessionState {
  /** `live-sessions` list as the backend scopes it for the signed-in user. */
  sessions: ApiLiveSession[];
  sessionsLoaded: boolean;
  loadingSessions: boolean;
  /** Learner's own `live-sessions/upcoming/me`. */
  upcoming: ApiLiveSession[];
  upcomingLoaded: boolean;
  loadingUpcoming: boolean;
  upcomingError: unknown;
}

interface LiveSessionActions {
  /**
   * Fetches the session list. Pages call it on mount so they stay as fresh as before;
   * a cached list is shown meanwhile and concurrent callers share one request.
   * Resolves to the list (empty on failure).
   */
  loadSessions: () => Promise<ApiLiveSession[]>;
  /** Same as `loadSessions` for the learner's upcoming sessions. */
  loadUpcoming: () => Promise<ApiLiveSession[]>;
  scheduleSession: (courseId: string, body: ScheduleSessionBody) => Promise<ApiLiveSession>;
  updateSession: (id: string, body: Partial<ScheduleSessionBody>) => Promise<ApiLiveSession>;
  setStatus: (id: string, status: BackendSessionStatus) => Promise<ApiLiveSession>;
  deleteSession: (id: string) => Promise<ApiLiveSession>;
  /** Refetches the loaded lists after sessions were changed outside these actions (e.g. batch in-person scheduling). */
  invalidate: () => void;
  /** Drops the user-scoped data on sign-out. */
  reset: () => void;
}

export type LiveSessionStore = LiveSessionState & LiveSessionActions;

let sessionsRequest: Promise<ApiLiveSession[]> | null = null;
let upcomingRequest: Promise<ApiLiveSession[]> | null = null;
// Only the newest request may write; bumping these also discards in-flight results
// (after a change, or on sign-out so the previous user's data never lands).
let sessionsSeq = 0;
let upcomingSeq = 0;

export const useLiveSessionStore = create<LiveSessionStore>()((set, get) => {
  /** After a change: refetch whatever is loaded so every open view sees it. */
  const afterChange = () => {
    sessionsRequest = null;
    upcomingRequest = null;
    if (get().sessionsLoaded) void get().loadSessions();
    if (get().upcomingLoaded) void get().loadUpcoming();
  };

  return {
    sessions: [],
    sessionsLoaded: false,
    loadingSessions: false,
    upcoming: [],
    upcomingLoaded: false,
    loadingUpcoming: false,
    upcomingError: null,

    loadSessions: () => {
      if (sessionsRequest) return sessionsRequest;
      const seq = ++sessionsSeq;
      set({ loadingSessions: true });
      const request = fetchLiveSessions({ limit: SESSIONS_LIMIT })
        .then((res) => {
          if (seq === sessionsSeq) set({ sessions: res.data, sessionsLoaded: true });
          return res.data;
        })
        .catch((err) => {
          console.error('Failed to load sessions:', err);
          if (seq === sessionsSeq) set({ sessions: [], sessionsLoaded: true });
          return [] as ApiLiveSession[];
        })
        .finally(() => {
          if (sessionsRequest === request) sessionsRequest = null;
          if (seq === sessionsSeq) set({ loadingSessions: false });
        });
      sessionsRequest = request;
      return request;
    },

    loadUpcoming: () => {
      if (upcomingRequest) return upcomingRequest;
      const seq = ++upcomingSeq;
      set({ loadingUpcoming: true });
      const request = fetchUpcomingSessions()
        .then((res) => {
          if (seq === upcomingSeq) set({ upcoming: res.data, upcomingLoaded: true, upcomingError: null });
          return res.data;
        })
        .catch((err) => {
          if (seq === upcomingSeq) set({ upcoming: [], upcomingLoaded: true, upcomingError: err });
          return [] as ApiLiveSession[];
        })
        .finally(() => {
          if (upcomingRequest === request) upcomingRequest = null;
          if (seq === upcomingSeq) set({ loadingUpcoming: false });
        });
      upcomingRequest = request;
      return request;
    },

    scheduleSession: async (courseId, body) => {
      const created = await apiScheduleSession(courseId, body);
      afterChange();
      return created;
    },

    updateSession: async (id, body) => {
      const updated = await updateLiveSession(id, body);
      afterChange();
      return updated;
    },

    setStatus: async (id, status) => {
      const updated = await setSessionStatus(id, status);
      // Reflect the new status right away (as SessionsManager did), then sync with the server.
      set((state) => ({ sessions: state.sessions.map((s) => (s.id === id ? { ...s, status } : s)) }));
      afterChange();
      return updated;
    },

    deleteSession: async (id) => {
      const removed = await deleteLiveSession(id);
      afterChange();
      return removed;
    },

    invalidate: () => afterChange(),

    reset: () => {
      sessionsSeq += 1;
      upcomingSeq += 1;
      sessionsRequest = null;
      upcomingRequest = null;
      set({
        sessions: [],
        sessionsLoaded: false,
        loadingSessions: false,
        upcoming: [],
        upcomingLoaded: false,
        loadingUpcoming: false,
        upcomingError: null,
      });
    },
  };
});
