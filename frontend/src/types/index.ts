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
  password: string;
  role: Role;
  department: string;
  status: UserStatus;
  createdAt: string;
}

export interface Lesson {
  id: string;
  title: string;
  content?: string;
  durationMin: number;
  unlocked?: boolean;
}

export interface Module {
  id: string;
  title: string;
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
}

export interface Quiz {
  id: string;
  title: string;
  passMark: number;
  attemptsAllowed: number;
  questions: Question[];
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
  category: string;
  description: string;
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
  | { ok: false; message: string };
