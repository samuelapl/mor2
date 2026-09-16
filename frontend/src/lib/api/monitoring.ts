import { api, apiText } from "./client";
import type {
  ApiAttendance,
  ApiAttendanceSummary,
  ApiAuditLog,
  ApiAuditStats,
  ApiHealth,
  ApiLiveSession,
  ApiPaginated,
  BackendAttendanceStatus,
  BackendCheckInMethod,
  BackendSessionStatus,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Live sessions                                                              */
/* -------------------------------------------------------------------------- */

export interface ScheduleSessionBody {
  titleEn: string;
  titleAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  platform?: "ZOOM" | "GOOGLE_MEET" | "MS_TEAMS" | "CUSTOM";
  externalUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  scheduledAt: string;
  durationMinutes: number;
}

export function fetchLiveSessions(
  params: { page?: number; limit?: number; status?: string; courseId?: string } = {},
): Promise<ApiPaginated<ApiLiveSession>> {
  return api<ApiPaginated<ApiLiveSession>>("live-sessions", {
    query: params as Record<string, string | number | undefined>,
  });
}

export function fetchUpcomingSessions(): Promise<ApiPaginated<ApiLiveSession>> {
  return api<ApiPaginated<ApiLiveSession>>("live-sessions/upcoming/me");
}

export function fetchLiveSession(id: string): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}`);
}

export function fetchSessionJoinUrl(
  id: string,
): Promise<{ joinUrl: string; platform: string }> {
  return api<{ joinUrl: string; platform: string }>(`live-sessions/${id}/join-url`);
}

export function scheduleSession(
  courseId: string,
  body: ScheduleSessionBody,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`courses/${courseId}/live-sessions`, { method: "POST", body });
}

export function updateLiveSession(
  id: string,
  body: Partial<ScheduleSessionBody>,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}`, { method: "PATCH", body });
}

export function setSessionStatus(
  id: string,
  status: BackendSessionStatus,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}/status`, {
    method: "PATCH",
    body: { status },
  });
}

/* -------------------------------------------------------------------------- */
/*  Attendance                                                                 */
/* -------------------------------------------------------------------------- */

export function fetchSessionAttendance(sessionId: string): Promise<ApiAttendance[]> {
  return api<ApiAttendance[]>(`attendance/sessions/${sessionId}`);
}

export function fetchAttendanceSummary(sessionId: string): Promise<ApiAttendanceSummary> {
  return api<ApiAttendanceSummary>(`attendance/sessions/${sessionId}/summary`);
}

export function fetchMyAttendance(): Promise<ApiAttendance[]> {
  return api<ApiAttendance[]>("attendance/me");
}

export function markAttendance(body: {
  sessionId: string;
  userId: string;
  status: BackendAttendanceStatus;
  durationMinutes?: number;
  notes?: string;
}): Promise<ApiAttendance> {
  return api<ApiAttendance>("attendance", { method: "POST", body });
}

export function bulkMarkAttendance(body: {
  sessionId: string;
  records: Array<{
    userId: string;
    status: BackendAttendanceStatus;
  }>;
}): Promise<ApiAttendance[]> {
  return api<ApiAttendance[]>("attendance/bulk", { method: "POST", body });
}

export function selfCheckIn(
  sessionId: string,
  method: BackendCheckInMethod = "VIRTUAL",
  coords?: { latitude?: number; longitude?: number },
): Promise<ApiAttendance> {
  return api<ApiAttendance>(`attendance/checkin/${sessionId}?method=${method}`, {
    method: "POST",
    body: coords ?? {},
  });
}

export function overrideAttendance(
  attendanceId: string,
  status: BackendAttendanceStatus,
): Promise<ApiAttendance> {
  return api<ApiAttendance>(`attendance/${attendanceId}/override`, {
    method: "POST",
    body: { status },
  });
}

/* -------------------------------------------------------------------------- */
/*  Audit                                                                      */
/* -------------------------------------------------------------------------- */

export interface AuditQuery {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
  userId?: string;
  from?: string;
  to?: string;
}

export function fetchAuditLogs(query: AuditQuery = {}): Promise<ApiPaginated<ApiAuditLog>> {
  return api<ApiPaginated<ApiAuditLog>>("audit", {
    query: query as Record<string, string | number | undefined>,
  });
}

export function fetchAuditStats(from?: string, to?: string): Promise<ApiAuditStats> {
  return api<ApiAuditStats>("audit/stats", {
    query: { from, to },
  });
}

export function exportAuditCsv(): Promise<string> {
  return apiText("audit/export");
}

/* -------------------------------------------------------------------------- */
/*  Health                                                                     */
/* -------------------------------------------------------------------------- */

export function fetchHealth(): Promise<ApiHealth> {
  return api<ApiHealth>("health");
}