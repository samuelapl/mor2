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
  title?: string;
  titleEn: string;
  titleAm: string;
  description?: string | null;
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
  course: { id: string; title?: string; titleEn?: string; titleAm?: string; code: string } | null;
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
    course: { id: string; title?: string; titleEn?: string; titleAm?: string; code: string };
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

/* ----------------------- Session quiz results (GET live-sessions/:id/quiz-results/me) ---------- */

export interface SessionQuizQuestion {
  id: string;
  type: string;
  /** May contain HTML. */
  question: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
}

export interface SessionQuizGroup {
  /** Prepared quiz id, or `other` for questions broadcast outside a prepared quiz. */
  id: string;
  title: string;
  graded: boolean;
  weight: number | null;
  passingScore: number | null;
  questions: SessionQuizQuestion[];
}

export interface LearnerQuizAnswer {
  questionId: string;
  /** What the learner picked, as text; null when not answered. */
  answer: string | null;
  isCorrect: boolean | null;
  answeredAt: string | null;
}

export interface LearnerQuizResult {
  quizId: string;
  answered: number;
  correct: number;
  earnedPoints: number;
  totalPoints: number;
  scorePercent: number;
  /** What went into the course grade when the session was completed (graded quizzes). */
  recorded: { score: number; passed: boolean } | null;
  answers: LearnerQuizAnswer[];
}

export interface MySessionQuizResults {
  sessionId: string;
  title: string;
  status: string;
  completed: boolean;
  /** False until the session is COMPLETED — results only exist after it is graded. */
  available: boolean;
  quizzes: SessionQuizGroup[];
  learners: { userId: string; name: string; quizzes: LearnerQuizResult[] }[];
}
