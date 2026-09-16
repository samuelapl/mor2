export type BackendRoleName =
  | "SYSTEM_ADMIN"
  | "TRAINING_ADMIN"
  | "COURSE_OWNER"
  | "TRAINER"
  | "CONTENT_APPROVER"
  | "LEARNER";

export type BackendCourseStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "PUBLISHED"
  | "ARCHIVED";

export type BackendApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export type BackendCourseLevel = "BASIC" | "INTERMEDIATE" | "ADVANCED";

export type BackendEnrollmentStatus = "ACTIVE" | "DROPPED" | "COMPLETED";

export type BackendLessonContentType =
  | "VIDEO"
  | "DOCUMENT"
  | "PRESENTATION"
  | "INTERACTIVE"
  | "SCORM"
  | "EXTERNAL_LINK";

/* -------------------------------------------------------------------------- */
/*  Paginated response                                                        */
/* -------------------------------------------------------------------------- */

export interface ApiMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiPaginated<T> {
  data: T[];
  meta: ApiMeta;
}

/* -------------------------------------------------------------------------- */
/*  Auth                                                                       */
/* -------------------------------------------------------------------------- */

export interface ApiAuthPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  roles: { role: BackendRoleName }[];
}

export interface ApiAuthResponse {
  user: ApiAuthPayload;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
}

export interface ApiAuthRegisterResponse {
  message: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

/* -------------------------------------------------------------------------- */
/*  Users                                                                      */
/* -------------------------------------------------------------------------- */

export interface ApiUserRole {
  id: string;
  userId: string;
  role: BackendRoleName;
  grantedAt: string;
  grantedBy: string | null;
}

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  locale: string;
  isActive: boolean;
  registrationStatus: BackendApprovalStatus | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  roles: ApiUserRole[];
}

/* -------------------------------------------------------------------------- */
/*  Courses                                                                    */
/* -------------------------------------------------------------------------- */

export interface ApiCourseOwner {
  id: string;
  courseId: string;
  userId: string;
  user: ApiUser;
}

export interface ApiCourseTrainer {
  id: string;
  courseId: string;
  userId: string;
  user: ApiUser;
}

export interface ApiApproval {
  id: string;
  courseId: string;
  approverId: string;
  status: BackendApprovalStatus;
  comments: string | null;
  decidedAt: string;
  version: number;
  createdAt: string;
  approver?: ApiUser;
}

export interface ApiCourseListItem {
  id: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  code: string;
  version: number;
  thumbnailUrl: string | null;
  status: BackendCourseStatus;
  level: BackendCourseLevel;
  publishedAt: string | null;
  estimatedHours: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  owners: ApiCourseOwner[];
}

export interface ApiAttachment {
  id: string;
  moduleId: string | null;
  lessonId: string | null;
  courseId: string | null;
  fileName: string;
  fileKey: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  uploadedById: string | null;
  createdAt: string;
}

export interface ApiCourseDetail extends ApiCourseListItem {
  trainers: ApiCourseTrainer[];
  modules: ApiModule[];
  approvals: ApiApproval[];
  attachments?: ApiAttachment[];
}

/* -------------------------------------------------------------------------- */
/*  Curriculum                                                                 */
/* -------------------------------------------------------------------------- */

export interface ApiLesson {
  id: string;
  titleEn: string;
  titleAm: string;
  contentEn: string | null;
  contentAm: string | null;
  contentType: BackendLessonContentType;
  durationMinutes: number | null;
  order: number;
  resourceUrl: string | null;
  createdAt: string;
  updatedAt: string;
  unlocked?: boolean;
}

export interface ApiModule {
  id: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  order: number | null;
  passingScore: number | null;
  lessons: ApiLesson[];
  unlocked?: boolean;
  completedLessons?: number;
  totalLessons?: number;
  progressPercent?: number;
  moduleCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Enrollments                                                                */
/* -------------------------------------------------------------------------- */

export interface ApiEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: BackendEnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  droppedAt: string | null;
  droppedReason: string | null;
  droppedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  course?: { id: string; titleEn: string; titleAm: string; code: string };
}

/* -------------------------------------------------------------------------- */
/*  Assessments (Quiz)                                                         */
/* -------------------------------------------------------------------------- */

export interface ApiAssessmentQuestion {
  id: string;
  type: "MULTIPLE_CHOICE" | "TRUE_FALSE" | "SHORT_ANSWER";
  question: string;
  options: string[];
  correctAnswer?: number | string;
}

export interface ApiAssessment {
  id: string;
  courseId: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  questions: ApiAssessmentQuestion[];
  attempts: ApiAssessmentAttempt[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiAssessmentAttempt {
  id: string;
  assessmentId: string;
  userId: string;
  attemptNumber: number;
  score: number;
  passed: boolean;
  submittedAt: string | null;
  startedAt: string;
  timeSpentSeconds: number | null;
}

export interface ApiAssessmentListing {
  id: string;
  courseId: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  maxAttempts: number;
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Progress                                                                   */
/* -------------------------------------------------------------------------- */

export interface ApiProgressLesson {
  lessonId: string;
  titleEn: string;
  titleAm: string;
  order: number;
  completed: boolean;
  unlocked?: boolean;
  lastPosition: number;
}

export interface ApiProgressModule {
  moduleId: string;
  titleEn: string;
  titleAm: string;
  order: number | null;
  unlocked?: boolean;
  totalLessons: number;
  completedLessons: number;
  unlockedLessons?: number;
  moduleCompleted: boolean;
  progressPercent: number;
  lessons: ApiProgressLesson[];
}

export interface ApiCourseProgress {
  courseId: string;
  stats: {
    totalModules: number;
    totalLessons: number;
    completedLessons: number;
    unlockedLessons?: number;
    overallPercent: number;
  };
  modules: ApiProgressModule[];
}

export interface ApiLearnerProgress {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  completedLessons: number;
  progressPercent: number;
}

/* -------------------------------------------------------------------------- */
/*  Certificates                                                                */
/* -------------------------------------------------------------------------- */

export interface ApiCertificate {
  id: string;
  certificateNumber: string;
  verificationCode: string;
  issuedAt: string;
  expiresAt: string;
  pdfFileUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
  templateId: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string };
  course: { id: string; titleEn: string; titleAm: string; code: string };
}

export type BackendCertificateFieldAlign = "left" | "center" | "right";

export interface ApiCertificateField {
  key: string;
  align?: BackendCertificateFieldAlign;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  bold?: boolean;
}

export interface ApiCertificateTemplate {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  backgroundUrl: string | null;
  fields: ApiCertificateField[];
  version: number;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; firstName: string; lastName: string; email: string };
}

export interface CreateCertificateTemplateBody {
  name: string;
  description?: string;
  backgroundUrl?: string | null;
  fields?: ApiCertificateField[];
}

export type UpdateCertificateTemplateBody = Partial<CreateCertificateTemplateBody>;

/* -------------------------------------------------------------------------- */
/*  Notifications                                                               */
/* -------------------------------------------------------------------------- */

export type BackendNotificationType =
  | "ENROLLMENT_APPROVED"
  | "ENROLLMENT_REJECTED"
  | "ENROLLMENT"
  | "ASSESSMENT_GRADED"
  | "CERTIFICATE_ISSUED"
  | "SYSTEM";

export interface ApiNotification {
  id: string;
  userId: string;
  type: BackendNotificationType;
  titleEn: string;
  titleAm: string;
  bodyEn: string | null;
  bodyAm: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/*  Admin dashboard stats                                                       */
/* -------------------------------------------------------------------------- */

export interface ApiDashboardStats {
  totals: {
    users: number;
    courses: number;
    enrollments: number;
    liveSessions: number;
  };
  statuses: {
    publishedCourses: number;
    pendingApprovals: number;
    activeEnrollments: number;
    certificatesIssued: number;
  };
  roles: Array<{ role: BackendRoleName; count: number }>;
  periodActivity: {
    newUsers: number;
    newEnrollments: number;
  };
}

/* -------------------------------------------------------------------------- */
/*  Live sessions                                                            */
/* -------------------------------------------------------------------------- */

export type BackendSessionPlatform = "ZOOM" | "GOOGLE_MEET" | "MS_TEAMS" | "CUSTOM";
export type BackendSessionStatus = "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
export type BackendAttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type BackendCheckInMethod = "VIRTUAL" | "QR" | "GPS" | "BIOMETRIC";

export interface ApiLiveSession {
  id: string;
  courseId: string;
  titleAm: string;
  titleEn: string;
  descriptionAm: string | null;
  descriptionEn: string | null;
  platform: BackendSessionPlatform;
  externalUrl: string | null;
  meetingId: string | null;
  meetingPassword: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: BackendSessionStatus;
  recordingUrl: string | null;
  createdAt: string;
  updatedAt: string;
  course: { id: string; titleEn: string; titleAm: string; code: string };
  attendees?: ApiAttendance[];
}

/* -------------------------------------------------------------------------- */
/*  Attendance                                                               */
/* -------------------------------------------------------------------------- */

export interface ApiAttendance {
  id: string;
  sessionId: string;
  userId: string;
  status: BackendAttendanceStatus;
  joinedAt: string | null;
  leftAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  checkInMethod: BackendCheckInMethod | null;
  latitude: number | null;
  longitude: number | null;
  biometricVerified: boolean;
  overriddenBy: string | null;
  overriddenAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  session?: { id: string; course: { id: string; titleEn: string; titleAm: string; code: string } };
}

export interface ApiAttendanceSummary {
  sessionId: string;
  totalRecorded: number;
  totalEnrolled: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendanceRate: number;
}

/* -------------------------------------------------------------------------- */
/*  Audit                                                                      */
/* -------------------------------------------------------------------------- */

export interface ApiAuditLog {
  id: string;
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface ApiAuditStats {
  total: number;
  byAction: Record<string, number>;
  byEntity: Record<string, number>;
}

/* -------------------------------------------------------------------------- */
/*  Health                                                                     */
/* -------------------------------------------------------------------------- */

export interface ApiHealth {
  status: "healthy" | "degraded" | "unhealthy";
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: "up" | "down"; latencyMs?: number; detail?: string };
    minio: { status: "up" | "down"; latencyMs?: number; detail?: string };
    redis: { status: "up" | "down"; latencyMs?: number; detail?: string };
  };
}

/* -------------------------------------------------------------------------- */
/*  Request payloads                                                           */
/* -------------------------------------------------------------------------- */

export interface LocalizedText {
  en: string;
  am: string;
}

export interface CreateCourseBody {
  code: string;
  title: LocalizedText;
  description?: LocalizedText;
  estimatedHours?: number;
  ownerIds?: string[];
  thumbnailUrl?: string | null;
  level?: BackendCourseLevel;
}

export interface UpdateCourseBody {
  code?: string;
  title?: LocalizedText;
  description?: LocalizedText;
  estimatedHours?: number;
  thumbnailUrl?: string | null;
  level?: BackendCourseLevel;
}

export interface ReviewCourseBody {
  status: BackendApprovalStatus;
  comments?: string;
}

export interface AssignTrainerBody {
  userId: string;
}

export interface CreateModuleBody {
  titleEn: string;
  titleAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  order?: number;
  passingScore?: number;
  lessons?: CreateInlineLessonBody[];
}

export interface CreateInlineLessonBody {
  titleEn: string;
  titleAm: string;
  contentEn?: string;
  contentAm?: string;
  contentType?: BackendLessonContentType;
  durationMinutes?: number;
  resourceUrl?: string;
}

export interface ReplaceCurriculumBody {
  modules: CreateModuleBody[];
}

export interface AssignRoleBody {
  userId: string;
  role: BackendRoleName;
}

/* -------------------------------------------------------------------------- */
/*  Bulk user registration (spreadsheet import)                                */
/* -------------------------------------------------------------------------- */

export interface BulkCreateUserItem {
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  role?: BackendRoleName;
}

export interface BulkCreateUserResultRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: BackendRoleName;
}

export interface BulkCreateUserSkipped {
  email: string;
  reason: string;
}

export interface CreateActorBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: BackendRoleName;
  phone?: string;
  locale?: "en" | "am";
}

export interface CreateActorResult {
  message: string;
  user: ApiUser;
}

export interface BulkCreateUsersResult {
  created: BulkCreateUserResultRow[];
  skipped: BulkCreateUserSkipped[];
  totals: { created: number; skipped: number };
}

/* -------------------------------------------------------------------------- */
/*  Roles & Permissions (System Admin matrix)                                 */
/* -------------------------------------------------------------------------- */

export interface ApiPermission {
  id: string;
  code: string;
  resource: string;
  action: string;
  scope: "ALL" | "OWN";
  description: string | null;
  isSystem: boolean;
}

export type ApiPermissionsByResource = Record<string, ApiPermission[]>;

export interface ApiRoleWithPermissions {
  id: string;
  name: BackendRoleName;
  label: string;
  dashboardPath: string;
  isSystem: boolean;
  permissionCodes: string[];
}