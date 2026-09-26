/**
 * Transport-level types shared by every feature.
 * Mirrors LEARNER_MOBILE_API_SPEC.md §1.3–§1.5 and §1.10.
 */

/** Every successful response is wrapped by the backend TransformInterceptor (§1.3). */
export interface ApiEnvelope<T> {
  data: T;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/** Payload of paginated endpoints, after the envelope has been unwrapped (§1.4). */
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Raw error body produced by the backend AllExceptionsFilter (§1.5). */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  messageAm?: string[];
  locale?: string;
  path?: string;
  timestamp?: string;
  reason?: ApiErrorReason;
  remainingSeconds?: number;
  remainingMinutes?: number;
}

export type ApiErrorReason =
  'LOCKED' | 'TIME_NOT_MET' | 'ASSESSMENT_REQUIRED' | 'ASSESSMENT_NOT_PASSED' | 'RETAKE_COOLDOWN';

export type Locale = 'en' | 'am';

/* -------------------------------------------------------------------------- */
/*  Shared enums (§1.10)                                                       */
/* -------------------------------------------------------------------------- */

export type RoleName =
  'COURSE_OWNER' | 'CONTENT_APPROVER' | 'TRAINING_ADMIN' | 'TRAINER' | 'LEARNER' | 'SYSTEM_ADMIN';

export type CourseStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

export type CourseLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

export type CourseDeliveryMode = 'ONLINE_ONLY' | 'IN_PERSON_ONLY' | 'BOTH';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';

export type LessonContentType =
  'VIDEO' | 'DOCUMENT' | 'PRESENTATION' | 'INTERACTIVE' | 'SCORM' | 'EXTERNAL_LINK' | 'AUDIO';

export type AssessmentType =
  'FINAL_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'LESSON_ASSESSMENT' | 'SUB_LESSON_ASSESSMENT';

export type QuestionType = 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';

export type SessionType = 'VIRTUAL' | 'IN_PERSON';

export type SessionPlatform =
  'LIVEKIT' | 'ZOOM' | 'GOOGLE_MEET' | 'MS_TEAMS' | 'CUSTOM' | 'IN_PERSON';

export type SessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type CheckInMethod = 'VIRTUAL' | 'QR' | 'GPS' | 'BIOMETRIC';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export type NotificationType =
  | 'ENROLLMENT_APPROVED'
  | 'ENROLLMENT_REJECTED'
  | 'COURSE_PUBLISHED'
  | 'COURSE_APPROVED'
  | 'COURSE_REJECTED'
  | 'ASSESSMENT_GRADED'
  | 'CERTIFICATE_ISSUED'
  | 'SESSION_REMINDER'
  | 'TRAINING_REMINDER'
  | 'REGISTRATION_APPROVED'
  | 'REGISTRATION_REJECTED'
  | 'SYSTEM';
