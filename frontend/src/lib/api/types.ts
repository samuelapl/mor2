export type BackendRoleName =
  'SYSTEM_ADMIN' | 'TRAINING_ADMIN' | 'COURSE_OWNER' | 'TRAINER' | 'CONTENT_APPROVER' | 'LEARNER';

export type BackendCourseStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'ARCHIVED';

export type BackendApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_REVISION';

export type BackendCourseLevel = 'BASIC' | 'INTERMEDIATE' | 'ADVANCED';

export type BackendEnrollmentStatus = 'ACTIVE' | 'DROPPED' | 'COMPLETED';

export type BackendLessonContentType =
  'VIDEO' | 'DOCUMENT' | 'PRESENTATION' | 'INTERACTIVE' | 'SCORM' | 'EXTERNAL_LINK' | 'AUDIO';

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

/** Returned by `auth/login` instead of tokens when an admin-set password must be changed. */
export interface ApiFirstLoginChallenge {
  passwordChangeRequired: true;
  challengeToken: string;
  /** Masked, e.g. "ab•••@mor.gov.et". */
  email: string;
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
  tin: string | null;
  avatarUrl: string | null;
  locale: string;
  isActive: boolean;
  registrationStatus: BackendApprovalStatus | null;
  mustChangePassword?: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  roles: ApiUserRole[];
  primaryVenueId?: string | null;
  primaryVenue?: ApiVenue | null;
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
  category?: string | null;
  department?: string | null;
  targetAudience?: string | null;
  deliveryMethod?: string | null;
  deliveryMode?: CourseDeliveryMode;
  language?: string | null;
  objectivesAm?: string | null;
  objectivesEn?: string | null;
  prerequisites?: string | null;
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
  fileName?: string | null;
  fileSize?: number | null;
  attachments?: ApiAttachment[];
  parentId?: string | null;
  subLessons?: ApiLesson[];
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
  objectivesEn?: string | null;
  objectivesAm?: string | null;
  durationMinutes?: number | null;
  order: number | null;
  passingScore: number | null;
  resourceUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  attachments?: ApiAttachment[];
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
  deliveryMode?: CourseDeliveryMode;
  venueId?: string | null;
  sessionId?: string | null;
  venue?: ApiVenue | null;
  enrolledAt: string;
  completedAt: string | null;
  droppedAt: string | null;
  droppedReason: string | null;
  droppedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; firstName: string; lastName: string; email: string };
  course?: {
    id: string;
    titleEn: string;
    titleAm: string;
    code: string;
    deliveryMode?: CourseDeliveryMode;
  };
}

export interface SelfEnrollInput {
  courseId: string;
  deliveryMode?: CourseDeliveryMode;
  venueId?: string;
  sessionId?: string;
}

/* -------------------------------------------------------------------------- */
/*  Assessments (Quiz)                                                         */
/* -------------------------------------------------------------------------- */

export interface ApiAssessmentQuestion {
  id: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  imageUrl?: string | null;
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
  resourceUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
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

export interface ApiAttachedAssessment {
  id: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  passed: boolean;
}

export interface AssessmentReviewItem {
  questionId: string;
  type?: string;
  question?: string;
  options?: string[];
  imageUrl?: string | null;
  selectedOption?: number | string;
  correctAnswer?: number | string;
  isCorrect: boolean;
}

export interface ApiProgressLesson {
  lessonId: string;
  titleEn: string;
  titleAm: string;
  order: number;
  completed: boolean;
  unlocked?: boolean;
  lastPosition: number;
  durationMinutes?: number | null;
  timeSpentSeconds: number;
  requiredSeconds: number;
  timeSatisfied: boolean;
  assessment?: ApiAttachedAssessment | null;
  subLessons?: ApiProgressSubLesson[];
}

export interface ApiProgressSubLesson {
  lessonId: string;
  titleEn: string;
  titleAm: string;
  order: number;
  completed: boolean;
  unlocked?: boolean;
  durationMinutes?: number | null;
  timeSpentSeconds: number;
  requiredSeconds: number;
  timeSatisfied: boolean;
  assessment?: ApiAttachedAssessment | null;
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
  durationMinutes?: number | null;
  timeSpentSeconds: number;
  requiredSeconds: number;
  timeSatisfied: boolean;
  assessment?: ApiAttachedAssessment | null;
  lessons: ApiProgressLesson[];
}

export interface ApiCourseCompletion {
  contentCompleted: boolean;
  finalAssessmentRequired: boolean;
  finalAssessmentPassed: boolean;
  certificateEligible: boolean;
  finalAssessment: ApiAttachedAssessment | null;
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
  courseCompletion: ApiCourseCompletion;
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
  template?: ApiCertificateTemplate | null;
  user?: { id: string; firstName: string; lastName: string; email: string };
  course: { id: string; titleEn: string; titleAm: string; code: string };
}

export type BackendCertificateFieldAlign = 'left' | 'center' | 'right';

export interface ApiCertificateField {
  key: string;
  align?: BackendCertificateFieldAlign;
  x?: number;
  y?: number;
  size?: number;
  color?: string;
  bold?: boolean;
  imageUrl?: string;
  width?: number;
  height?: number;
  text?: string;
  title?: string;
  visible?: boolean;
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
  | 'ENROLLMENT_APPROVED'
  | 'ENROLLMENT_REJECTED'
  | 'ENROLLMENT'
  | 'ASSESSMENT_GRADED'
  | 'CERTIFICATE_ISSUED'
  | 'SYSTEM';

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
/*  Public landing page stats                                                  */
/* -------------------------------------------------------------------------- */

export interface ApiLandingStats {
  courses: number;
  staff: number;
  sessions: number;
  certificates: number;
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
/*  Venues & Delivery Modes                                                   */
/* -------------------------------------------------------------------------- */

export type CourseDeliveryMode = 'ONLINE_ONLY' | 'IN_PERSON_ONLY' | 'BOTH';
export type SessionType = 'VIRTUAL' | 'IN_PERSON';

export interface ApiVenue {
  id: string;
  name: string;
  building?: string | null;
  branch: string;
  capacity: number;
  facilities: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  trainers?: { id: string; firstName: string; lastName: string; email: string }[];
  _count?: {
    sessions?: number;
    trainers?: number;
    enrollments?: number;
  };
}

export interface CreateVenueInput {
  name: string;
  building?: string;
  branch: string;
  capacity: number;
  facilities?: string[];
  isActive?: boolean;
}

export type UpdateVenueInput = Partial<CreateVenueInput>;

export interface VenueSessionBatchItem {
  venueId: string;
  trainerId?: string;
  scheduledAt: string;
  durationMinutes: number;
}

export interface CreateBatchSessionInput {
  courseId: string;
  titleEn: string;
  titleAm?: string;
  descriptionEn?: string;
  descriptionAm?: string;
  venueSessions: VenueSessionBatchItem[];
}

/* -------------------------------------------------------------------------- */
/*  Live sessions                                                            */
/* -------------------------------------------------------------------------- */

export type BackendSessionPlatform =
  'LIVEKIT' | 'ZOOM' | 'GOOGLE_MEET' | 'MS_TEAMS' | 'CUSTOM' | 'IN_PERSON';
export type BackendSessionStatus = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type BackendAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
export type BackendCheckInMethod = 'VIRTUAL' | 'QR' | 'GPS' | 'BIOMETRIC';

export interface ApiLiveSession {
  id: string;
  courseId: string;
  titleAm: string;
  titleEn: string;
  descriptionAm: string | null;
  descriptionEn: string | null;
  sessionType?: SessionType;
  venueId?: string | null;
  venue?: ApiVenue | null;
  platform: BackendSessionPlatform;
  externalUrl: string | null;
  meetingId: string | null;
  meetingPassword: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: BackendSessionStatus;
  recordingUrl: string | null;
  allowViewAttendance?: boolean;
  attendanceThreshold?: number;
  actualStartedAt?: string | null;
  actualEndedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  trainerId?: string | null;
  trainer?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  course: { id: string; titleEn: string; titleAm: string; code: string };
  attendees?: ApiAttendance[];
  /** Active enrollments holding a seat (in-person); present on list responses. */
  bookedSeats?: number;
}

/* -------------------------------------------------------------------------- */
/*  Attendance                                                               */
/* -------------------------------------------------------------------------- */

export interface ApiAttendanceLog {
  id: string;
  sessionId: string;
  userId: string;
  eventType: 'JOIN' | 'LEAVE' | 'REJOIN' | 'HEARTBEAT';
  durationSeconds?: number | null;
  timestamp: string;
}

export interface ApiAttendance {
  id: string;
  sessionId: string;
  userId: string;
  status: BackendAttendanceStatus;
  joinedAt: string | null;
  leftAt: string | null;
  durationMinutes: number | null;
  activeSeconds?: number;
  percentage?: number | null;
  rejoinCount?: number;
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
  logs?: ApiAttendanceLog[];
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

export interface ApiAttendanceReport {
  session: {
    id: string;
    titleEn: string;
    titleAm: string;
    courseCode: string;
    courseTitle: string;
    scheduledAt: string;
    durationMinutes: number;
    actualStartedAt?: string | null;
    actualEndedAt?: string | null;
    status: BackendSessionStatus;
    attendanceThreshold: number;
  };
  summary: ApiAttendanceSummary;
  attendees: ApiAttendance[];
}

export interface ApiAttendanceVisibility {
  canView: boolean;
  globalPermitted: boolean;
  sessionPermitted: boolean;
  isStaff: boolean;
  reason?: string;
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
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  checks: {
    database: { status: 'up' | 'down'; latencyMs?: number; detail?: string };
    minio: { status: 'up' | 'down'; latencyMs?: number; detail?: string };
    redis: { status: 'up' | 'down'; latencyMs?: number; detail?: string };
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
  objectives?: LocalizedText;
  category?: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  deliveryMode?: CourseDeliveryMode;
  language?: string;
  prerequisites?: string;
  estimatedHours?: number;
  ownerIds?: string[];
  thumbnailUrl?: string | null;
  level?: BackendCourseLevel;
}

export interface UpdateCourseBody {
  code?: string;
  title?: LocalizedText;
  description?: LocalizedText;
  objectives?: LocalizedText;
  category?: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  deliveryMode?: CourseDeliveryMode;
  language?: string;
  prerequisites?: string;
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

export interface CreateCurriculumAttachmentBody {
  fileName: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
}

export interface CreateModuleBody {
  titleEn: string;
  titleAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  objectivesEn?: string;
  objectivesAm?: string;
  durationMinutes?: number;
  order?: number;
  passingScore?: number;
  attachments?: CreateCurriculumAttachmentBody[];
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
  parentId?: string;
  attachments?: CreateCurriculumAttachmentBody[];
  subLessons?: CreateInlineLessonBody[];
}

export interface ReplaceCurriculumBody {
  modules: CreateModuleBody[];
}

export interface AssignRoleBody {
  userId: string;
  role: BackendRoleName;
}

/* -------------------------------------------------------------------------- */
/*  Account settings (self-service)                                            */
/* -------------------------------------------------------------------------- */

export interface UpdateMyProfileBody {
  firstName?: string;
  lastName?: string;
  phone?: string;
  tin?: string;
  locale?: 'en' | 'am';
  avatarUrl?: string;
}

export interface ChangeMyPasswordBody {
  currentPassword: string;
  newPassword: string;
}

/* -------------------------------------------------------------------------- */
/*  Bulk user registration (spreadsheet import)                                */
/* -------------------------------------------------------------------------- */

/** `role` is a role name as stored in the backend (built-in or custom); defaults to LEARNER. */
export interface BulkCreateUserItem {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  tin?: string;
  password?: string;
  role?: string;
}

/** `row` is the 1-based position of the row in the submitted `users` array. */
export interface BulkCreateUserResultRow {
  row: number;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  tin: string | null;
  password: string;
  role: string;
}

export interface BulkCreateUserSkipped {
  row: number;
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
  locale?: 'en' | 'am';
  primaryVenueId?: string;
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
  scope: 'ALL' | 'OWN';
  description: string | null;
  isSystem: boolean;
}

export type ApiPermissionsByResource = Record<string, ApiPermission[]>;

export interface ApiRoleWithPermissions {
  id: string;
  name: BackendRoleName;
  label: string;
  description?: string | null;
  dashboardPath: string;
  isSystem: boolean;
  permissionCodes: string[];
}
