import type {
  AttendanceStatus,
  CheckInMethod,
  SessionPlatform,
  SessionStatus,
  SessionType,
} from '@/core/api/types';
import type { ApiUserSummary, ApiVenue } from '@/features/courses';

/** GET /live-sessions/upcoming/me · /live-sessions/:id (spec §8.1, §8.3). */
export interface ApiLiveSession {
  id: string;
  courseId: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  sessionType: SessionType;
  platform: SessionPlatform;
  status: SessionStatus;
  scheduledAt: string;
  durationMinutes: number;
  externalUrl: string | null;
  meetingId: string | null;
  meetingPassword: string | null;
  venueId: string | null;
  recordingUrl: string | null;
  attendanceThreshold: number;
  allowViewAttendance: boolean;
  actualStartedAt: string | null;
  actualEndedAt: string | null;
  course: { id: string; titleEn: string; titleAm: string; code: string } | null;
  trainer: ApiUserSummary | null;
  venue: ApiVenue | null;
}

/** Attendance row (spec §8.5–§8.7). */
export interface ApiAttendance {
  id: string;
  sessionId: string;
  userId: string;
  status: AttendanceStatus;
  joinedAt: string | null;
  leftAt: string | null;
  durationMinutes: number | null;
  activeSeconds: number;
  percentage: number | null;
  rejoinCount: number;
  checkInMethod: CheckInMethod | null;
  createdAt: string;
}

export interface ApiAttendanceWithSession extends ApiAttendance {
  session: Omit<ApiLiveSession, 'trainer' | 'venue'> & {
    course: { id: string; titleEn: string; titleAm: string; code: string };
  };
}

export interface HeartbeatResult {
  activeSeconds: number;
  durationMinutes: number;
  percentage: number;
  status: AttendanceStatus;
  threshold: number;
  sessionDurationMinutes: number;
}

export interface AttendanceVisibility {
  canView: boolean;
  globalPermitted: boolean;
  sessionPermitted: boolean;
  isStaff: boolean;
}

export interface JoinUrlResult {
  joinUrl: string;
  platform: SessionPlatform;
}

export interface LiveKitTokenResult {
  token: string;
  wsUrl: string;
  roomName: string;
}

/** Spec §8.6 body — exact allowed fields. */
export interface CheckInBody {
  method?: CheckInMethod;
  latitude?: number;
  longitude?: number;
}
