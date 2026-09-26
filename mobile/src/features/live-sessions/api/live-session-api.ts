import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';
import type { CheckInMethod, Paginated } from '@/core/api/types';

import type {
  ApiAttendance,
  ApiAttendanceWithSession,
  ApiLiveSession,
  AttendanceVisibility,
  CheckInBody,
  HeartbeatResult,
  JoinUrlResult,
  LiveKitTokenResult,
} from '../types/live-session.types';

export const sessionKeys = {
  upcoming: ['live-sessions', 'upcoming'] as const,
  detail: (id: string) => ['live-sessions', 'detail', id] as const,
  myAttendance: ['attendance', 'me'] as const,
  visibility: (id: string) => ['attendance', 'visibility', id] as const,
};

export const liveSessionApi = {
  joinUrl: (id: string) => api.get<JoinUrlResult>(endpoints.liveSessions.joinUrl(id)),
  livekitToken: (id: string) =>
    api.get<LiveKitTokenResult>(endpoints.liveSessions.livekitToken(id)),
  join: (id: string) => api.post<ApiAttendance>(endpoints.attendance.join(id)),
  /** `activeSeconds` must be an integer 1–120 (spec §8.5). */
  heartbeat: (id: string, activeSeconds: number) =>
    api.post<HeartbeatResult>(endpoints.attendance.heartbeat(id), { activeSeconds }),
  leave: (id: string) => api.post<ApiAttendance | null>(endpoints.attendance.leave(id)),
  checkIn: (id: string, method: CheckInMethod, body: Omit<CheckInBody, 'method'> = {}) =>
    api.post<ApiAttendance>(endpoints.attendance.checkIn(id), body, { params: { method } }),
};

/** SCHEDULED + LIVE sessions visible to the learner, soonest first (spec §8.1). */
export function useUpcomingSessions() {
  return useQuery({
    queryKey: sessionKeys.upcoming,
    queryFn: async () =>
      (
        await api.get<Paginated<ApiLiveSession>>(endpoints.liveSessions.upcomingMine, {
          params: { limit: 50 },
        })
      ).data,
    refetchInterval: 60_000,
  });
}

export function useSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.detail(sessionId ?? ''),
    // ⚠️ The detail payload embeds every attendee; the app reads the learner's own row from /attendance/me.
    queryFn: () => api.get<ApiLiveSession>(endpoints.liveSessions.detail(sessionId!)),
    enabled: Boolean(sessionId),
  });
}

/** GET /attendance/me — newest first (spec §8.7). */
export function useMyAttendance() {
  return useQuery({
    queryKey: sessionKeys.myAttendance,
    queryFn: () => api.get<ApiAttendanceWithSession[]>(endpoints.attendance.mine),
  });
}

export function useAttendanceVisibility(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionKeys.visibility(sessionId ?? ''),
    queryFn: () => api.get<AttendanceVisibility>(endpoints.attendance.visibility(sessionId!)),
    enabled: Boolean(sessionId),
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sessionId,
      method,
      latitude,
      longitude,
    }: {
      sessionId: string;
      method: CheckInMethod;
      latitude?: number;
      longitude?: number;
    }) =>
      liveSessionApi.checkIn(
        sessionId,
        method,
        method === 'GPS' && latitude !== undefined && longitude !== undefined
          ? { latitude, longitude }
          : {},
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.myAttendance }),
  });
}
