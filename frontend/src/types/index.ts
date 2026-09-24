export type Role =
  | "course_owner"
  | "content_approver"
  | "training_admin"
  | "trainer"
  | "learner"
  | "system_admin";

export type Lang = "en" | "am";

export type UserStatus = "pending" | "active" | "rejected" | "suspended";

export type CourseStatus =
  | "draft"
  | "under_review"
  | "approved"
  | "published"
  | "rejected"
  | "archived";

export type CourseLevel = "basic" | "intermediate" | "advanced";

export interface RoleInfo {
  key: Role;
  label: string;
  description: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  tin?: string | null;
  avatarUrl?: string | null;
  locale?: Lang;
  password: string;
  /** Primary/current role — kept as a compatibility field; prefer `roles`/`permissions` for new checks. */
  role: Role;
  /** Every role the user holds (Phase 1: usually one). */
  roles: Role[];
  /** Effective permission codes across all of the user's roles (e.g. "course.publish"). Empty for users other than the signed-in one, since only login/refresh return it. */
  permissions: string[];
  department: string;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
  lastLogin?: string | null;
  /** Admin-set password not yet replaced by the user (first-login change pending). */
  mustChangePassword?: boolean;
}

export interface UploadedResource {
  id?: string;
  name: string;
  url: string;
  size?: number;
  type?: string;
  file?: File;
}

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  durationMin: number;
  unlocked?: boolean;
  contentType?: string;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  parentId?: string;
  subLessons?: Lesson[];
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  objectives?: string;
  durationMinutes?: number;
  resourceUrl?: string;
  fileName?: string;
  fileSize?: number;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  lessons: Lesson[];
  unlocked?: boolean;
}

export type QuestionType = "multiple_choice" | "true_false" | "short_answer";

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  options: string[];
  correctIndex: number;
  answerText?: string;
  points: number;
  imageUrl?: string;
}

export interface Quiz {
  id: string;
  title: string;
  passMark: number;
  attemptsAllowed: number;
  timeLimitMinutes?: number | null;
  questions: Question[];
  resourceUrl?: string;
  fileName?: string;
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
}

export type AttachmentType = "video" | "pdf";

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  /** Original file kept for upload (wizard attachments). */
  file?: File;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  titleEn?: string;
  titleAm?: string;
  category: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  language?: string;
  prerequisites?: string;
  objectives?: string;
  description: string;
  version?: number;
  ownerId: string;
  trainerId: string | null;
  trainerIds?: string[];
  status: CourseStatus;
  level: CourseLevel;
  published: boolean;
  createdAt: string;
  cover?: string | null;
  rejectionReason?: string;
  lastRejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  enrolledLearnerIds: string[];
  progress: Record<string, number>;
  modules: Module[];
  attachments?: Attachment[];
}

export type ActionResult = { ok: true } | { ok: false; message: string };

export type LoginResult =
  | { ok: true; role: Role }
  | { ok: false; message: string; passwordChangeRequired?: true };
