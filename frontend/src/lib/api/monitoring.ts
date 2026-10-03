import { api, apiText } from './client';
import type {
  ApiAttendance,
  ApiAttendanceReport,
  ApiAttendanceSummary,
  ApiAttendanceVisibility,
  ApiAuditLog,
  ApiAuditStats,
  ApiHealth,
  ApiLiveSession,
  ApiPaginated,
  BackendAttendanceStatus,
  BackendCheckInMethod,
  BackendSessionStatus,
} from './types';

/* -------------------------------------------------------------------------- */
/*  Live sessions                                                              */
/* -------------------------------------------------------------------------- */

export interface ScheduleSessionBody {
  titleEn: string;
  titleAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  /** Learning objectives, separate from the description. */
  objectivesEn?: string;
  platform?: 'LIVEKIT' | 'ZOOM' | 'GOOGLE_MEET' | 'MS_TEAMS' | 'CUSTOM';
  externalUrl?: string;
  meetingId?: string;
  meetingPassword?: string;
  scheduledAt: string;
  durationMinutes: number;
  allowViewAttendance?: boolean;
  attendanceThreshold?: number;
  trainerId?: string;
  /** Schedule a session planned with the course; its weighted quizzes come along. */
  sessionPlanId?: string;
}

export function fetchLiveSessions(
  params: { page?: number; limit?: number; status?: string; courseId?: string } = {},
): Promise<ApiPaginated<ApiLiveSession>> {
  return api<ApiPaginated<ApiLiveSession>>('live-sessions', {
    query: params as Record<string, string | number | undefined>,
  });
}

export function fetchUpcomingSessions(): Promise<ApiPaginated<ApiLiveSession>> {
  return api<ApiPaginated<ApiLiveSession>>('live-sessions/upcoming/me');
}

export function fetchLiveSession(id: string): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}`);
}

export function fetchSessionJoinUrl(id: string): Promise<{ joinUrl: string; platform: string }> {
  return api<{ joinUrl: string; platform: string }>(`live-sessions/${id}/join-url`);
}

export interface LiveKitTokenResponse {
  token: string;
  wsUrl: string;
  roomName: string;
}

export function fetchLiveKitToken(sessionId: string): Promise<LiveKitTokenResponse> {
  return api<LiveKitTokenResponse>(`live-sessions/${sessionId}/livekit-token`);
}

export function scheduleSession(
  courseId: string,
  body: ScheduleSessionBody,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`courses/${courseId}/live-sessions`, { method: 'POST', body });
}

export function updateLiveSession(
  id: string,
  body: Partial<ScheduleSessionBody>,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}`, { method: 'PATCH', body });
}

/**
 * `rebalance` is required when the session came from a course plan whose quizzes carry weight
 * on an approved course: it says which session quizzes take over that weight.
 */
export function deleteLiveSession(
  id: string,
  rebalance?: Array<{ assessmentId: string; weight: number }>,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}`, { method: 'DELETE', body: rebalance ? { rebalance } : undefined });
}

/** Re-grades the session's weighted quizzes into learners' course results. */
export function gradeSessionQuizzes(id: string): Promise<{ quizzes: number; learners: number }> {
  return api(`live-sessions/${id}/grade-quizzes`, { method: 'POST' });
}

export function setSessionStatus(
  id: string,
  status: BackendSessionStatus,
): Promise<ApiLiveSession> {
  return api<ApiLiveSession>(`live-sessions/${id}/status`, {
    method: 'PATCH',
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
  return api<ApiAttendance[]>('attendance/me');
}

export function markAttendance(body: {
  sessionId: string;
  userId: string;
  status: BackendAttendanceStatus;
  durationMinutes?: number;
  notes?: string;
}): Promise<ApiAttendance> {
  return api<ApiAttendance>('attendance', { method: 'POST', body });
}

export function bulkMarkAttendance(body: {
  sessionId: string;
  records: Array<{
    userId: string;
    status: BackendAttendanceStatus;
  }>;
}): Promise<ApiAttendance[]> {
  return api<ApiAttendance[]>('attendance/bulk', { method: 'POST', body });
}

export function selfCheckIn(
  sessionId: string,
  method: BackendCheckInMethod = 'VIRTUAL',
  coords?: { latitude?: number; longitude?: number },
): Promise<ApiAttendance> {
  return api<ApiAttendance>(`attendance/checkin/${sessionId}?method=${method}`, {
    method: 'POST',
    body: coords ?? {},
  });
}

export function recordSessionJoin(sessionId: string): Promise<ApiAttendance> {
  return api<ApiAttendance>(`attendance/sessions/${sessionId}/join`, {
    method: 'POST',
  });
}

export function recordSessionHeartbeat(
  sessionId: string,
  activeSeconds = 15,
): Promise<{
  activeSeconds: number;
  durationMinutes: number;
  percentage: number;
  status: BackendAttendanceStatus;
  threshold: number;
  sessionDurationMinutes: number;
}> {
  return api<{
    activeSeconds: number;
    durationMinutes: number;
    percentage: number;
    status: BackendAttendanceStatus;
    threshold: number;
    sessionDurationMinutes: number;
  }>(`attendance/sessions/${sessionId}/heartbeat`, {
    method: 'POST',
    body: { activeSeconds },
  });
}

export function recordSessionLeave(sessionId: string): Promise<ApiAttendance | null> {
  return api<ApiAttendance | null>(`attendance/sessions/${sessionId}/leave`, {
    method: 'POST',
  });
}

export function sendSessionAttendanceReport(sessionId: string): Promise<ApiAttendanceReport> {
  return api<ApiAttendanceReport>(`attendance/sessions/${sessionId}/send-report`, {
    method: 'POST',
  });
}

export function fetchSessionAttendanceReport(sessionId: string): Promise<ApiAttendanceReport> {
  return api<ApiAttendanceReport>(`attendance/sessions/${sessionId}/report`);
}

export function fetchSessionAttendanceVisibility(
  sessionId: string,
): Promise<ApiAttendanceVisibility> {
  return api<ApiAttendanceVisibility>(`attendance/sessions/${sessionId}/visibility`);
}

export function fetchSystemSettings(): Promise<Record<string, string>> {
  return api<Record<string, string>>('admin/settings');
}

export function updateSystemSettings(
  body: Record<string, string>,
): Promise<Record<string, string>> {
  return api<Record<string, string>>('admin/settings', {
    method: 'PATCH',
    body,
  });
}

export function overrideAttendance(
  attendanceId: string,
  status: BackendAttendanceStatus,
): Promise<ApiAttendance> {
  return api<ApiAttendance>(`attendance/${attendanceId}/override`, {
    method: 'POST',
    body: { status },
  });
}

export function submitLiveSessionQuizResponse(
  sessionId: string,
  body: {
    questionId: string;
    selectedOptionIds: string[];
    responseDurationSeconds: number;
    questionTitle?: string;
    options?: string[];
    correctAnswer?: string;
  },
): Promise<{ isCorrect: boolean; score: number; explanation?: string }> {
  return api<{ isCorrect: boolean; score: number; explanation?: string }>(
    `live-sessions/${sessionId}/quiz-response`,
    {
      method: 'POST',
      body,
    },
  );
}

export interface ApiLiveQuizReportAnswer {
  userId: string;
  userName: string;
  email: string;
  selectedOptionIds: string[];
  isCorrect: boolean;
  score: number;
  responseDurationSeconds?: number;
  timestamp: string;
}

export interface ApiLiveQuizReportQuestion {
  questionId: string;
  titleEn: string;
  type: string;
  options: any;
  correctAnswer?: string;
  points: number;
  totalResponses: number;
  correctCount: number;
  accuracy: number;
  distribution: Record<string, number>;
  answers: ApiLiveQuizReportAnswer[];
}

export interface ApiLiveQuizReportLearner {
  userId: string;
  userName: string;
  email: string;
  answeredCount: number;
  correctCount: number;
  totalScore: number;
  scorePercent: number;
}

export interface ApiLiveQuizReport {
  sessionId: string;
  totalQuestions: number;
  totalResponses: number;
  overallAccuracy: number;
  questions: ApiLiveQuizReportQuestion[];
  learners: ApiLiveQuizReportLearner[];
}

export function fetchLiveSessionQuizReport(sessionId: string): Promise<ApiLiveQuizReport> {
  return api<ApiLiveQuizReport>(`live-sessions/${sessionId}/quiz-report`);
}

/* -------------------------------------------------------------------------- */
/*  Session quiz results (per learner, per quiz group)                         */
/* -------------------------------------------------------------------------- */

export interface ApiSessionQuizQuestion {
  id: string;
  type: string;
  question: string;
  options: string[];
  /** Correct answer as text (option label for choice questions). */
  correctAnswer: string | null;
  points: number;
}

export interface ApiSessionQuizGroup {
  /** Prepared quiz id, or `other` for questions broadcast outside a prepared group. */
  id: string;
  title: string;
  graded: boolean;
  weight: number | null;
  passingScore: number | null;
  questions: ApiSessionQuizQuestion[];
}

export interface ApiLearnerQuizAnswer {
  questionId: string;
  /** What the learner picked, as text; null when not answered. */
  answer: string | null;
  isCorrect: boolean | null;
  answeredAt: string | null;
}

export interface ApiLearnerQuizResult {
  quizId: string;
  answered: number;
  correct: number;
  earnedPoints: number;
  totalPoints: number;
  scorePercent: number;
  /** Result recorded in the course grade when the session was completed (graded quizzes). */
  recorded: { score: number; passed: boolean } | null;
  answers: ApiLearnerQuizAnswer[];
}

export interface ApiLearnerSessionResult {
  userId: string;
  name: string;
  email: string;
  attendance: string | null;
  quizzes: ApiLearnerQuizResult[];
}

export interface ApiSessionQuizResults {
  sessionId: string;
  title: string;
  status: string;
  completed: boolean;
  quizzes: ApiSessionQuizGroup[];
  learners: ApiLearnerSessionResult[];
}

/** Every learner's answers and scores for a session's live quizzes (trainers / attendance viewers). */
export function fetchSessionQuizResults(sessionId: string): Promise<ApiSessionQuizResults> {
  return api<ApiSessionQuizResults>(`live-sessions/${sessionId}/quiz-results`);
}

/** The current learner's own results; `available` is false until the session is completed. */
export function fetchMySessionQuizResults(sessionId: string): Promise<ApiSessionQuizResults & { available: boolean }> {
  return api<ApiSessionQuizResults & { available: boolean }>(`live-sessions/${sessionId}/quiz-results/me`);
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
  return api<ApiPaginated<ApiAuditLog>>('audit', {
    query: query as Record<string, string | number | undefined>,
  });
}

export function fetchAuditStats(from?: string, to?: string): Promise<ApiAuditStats> {
  return api<ApiAuditStats>('audit/stats', {
    query: { from, to },
  });
}

export function exportAuditCsv(): Promise<string> {
  return apiText('audit/export');
}

/* -------------------------------------------------------------------------- */
/*  Health                                                                     */
/* -------------------------------------------------------------------------- */

export function fetchHealth(): Promise<ApiHealth> {
  return api<ApiHealth>('health');
}
