import type {
  CourseDeliveryMode,
  CourseLevel,
  CourseStatus,
  EnrollmentStatus,
  LessonContentType,
  SessionPlatform,
  SessionStatus,
  SessionType,
} from '@/core/api/types';

/** Spec §3.1 */
export interface ApiUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface ApiCourse {
  id: string;
  code: string;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  objectivesEn: string | null;
  objectivesAm: string | null;
  thumbnailUrl: string | null;
  status: CourseStatus;
  level: CourseLevel;
  category: string | null;
  department: string | null;
  targetAudience: string | null;
  deliveryMode: CourseDeliveryMode;
  language: string | null;
  prerequisites: string | null;
  estimatedHours: number | null;
  version: number;
  publishedAt: string | null;
  owners?: { user: ApiUserSummary }[];
}

export interface ApiAttachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  sizeBytes: number;
  fileKey?: string;
  createdAt?: string;
}

export interface ApiAssessmentSummary {
  id: string;
  titleEn: string;
  titleAm: string;
  passingScore: number;
  timeLimitMinutes: number | null;
}

/** Lessons & sub-lessons inside GET /courses/:id (spec §3.2). Content is null when locked. */
export interface ApiCourseLesson {
  id: string;
  moduleId: string;
  parentId: string | null;
  order: number;
  titleEn: string;
  titleAm: string;
  contentType: LessonContentType;
  durationMinutes: number | null;
  contentEn: string | null;
  contentAm: string | null;
  resourceUrl: string | null;
  unlocked: boolean;
  attachments: ApiAttachment[];
  assessments?: ApiAssessmentSummary[];
  subLessons?: ApiCourseLesson[];
}

export interface ApiCourseModule {
  id: string;
  order: number;
  titleEn: string;
  titleAm: string;
  descriptionEn: string | null;
  descriptionAm: string | null;
  durationMinutes: number | null;
  passingScore: number | null;
  unlocked: boolean;
  attachments: ApiAttachment[];
  assessments: ApiAssessmentSummary[];
  lessons: ApiCourseLesson[];
}

export interface ApiCourseDetail extends ApiCourse {
  enrolled: boolean;
  enrollmentStatus: EnrollmentStatus | null;
  enrolledAt: string | null;
  trainers: { user: ApiUserSummary }[];
  attachments: ApiAttachment[];
  /** The FINAL_ASSESSMENT (0 or 1). */
  assessments: ApiAssessmentSummary[];
  modules: ApiCourseModule[];
}

export interface CatalogParams {
  search?: string;
  limit?: number;
}

/* ------------------------------- Enrollments ------------------------------ */

export interface ApiVenue {
  id: string;
  name: string;
  building: string | null;
  branch: string;
  capacity: number;
  facilities: string[];
  isActive: boolean;
}

/** Spec §4.1 */
export interface ApiEnrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  deliveryMode: CourseDeliveryMode;
  venueId: string | null;
  sessionId: string | null;
  enrolledAt: string;
  completedAt: string | null;
  droppedAt: string | null;
  droppedReason: string | null;
  course: ApiCourse;
  venue: ApiVenue | null;
}

/** Spec §4.2 — exact allowed fields. */
export interface SelfEnrollBody {
  courseId: string;
  deliveryMode?: CourseDeliveryMode;
  sessionId?: string;
  venueId?: string;
}

/** Subset of a live session used by the in-person session picker (spec §8.2). */
export interface ApiCourseSession {
  id: string;
  courseId: string;
  titleEn: string;
  titleAm: string;
  sessionType: SessionType;
  platform: SessionPlatform;
  status: SessionStatus;
  scheduledAt: string;
  durationMinutes: number;
  venueId: string | null;
  venue: ApiVenue | null;
  bookedSeats: number;
}
