import { deriveCategory } from "@/constants/course-categories";
import type {
  ActionResult,
  Attachment,
  Course,
  Lang,
  Role,
  User,
  UserStatus,
} from "@/types";
import type {
  ApiApproval,
  ApiAttachment,
  ApiCourseDetail,
  ApiCourseListItem,
  ApiEnrollment,
  ApiLesson,
  ApiModule,
  ApiUser,
  BackendApprovalStatus,
  BackendCourseLevel,
  BackendCourseStatus,
  BackendLessonContentType,
  BackendRoleName,
  CreateCourseBody,
  CreateModuleBody,
  LocalizedText,
  UpdateCourseBody,
} from "./types";
import type { Lesson, Module } from "@/types";

/* -------------------------------------------------------------------------- */
/*  Role mapping                                                               */
/* -------------------------------------------------------------------------- */

const ROLE_API_TO_FE: Record<BackendRoleName, Role> = {
  SYSTEM_ADMIN: "system_admin",
  TRAINING_ADMIN: "training_admin",
  COURSE_OWNER: "course_owner",
  TRAINER: "trainer",
  CONTENT_APPROVER: "content_approver",
  LEARNER: "learner",
};

const ROLE_FE_TO_API: Record<Role, BackendRoleName> = {
  system_admin: "SYSTEM_ADMIN",
  training_admin: "TRAINING_ADMIN",
  course_owner: "COURSE_OWNER",
  trainer: "TRAINER",
  content_approver: "CONTENT_APPROVER",
  learner: "LEARNER",
};

export function roleFromApi(code: BackendRoleName): Role {
  return ROLE_API_TO_FE[code] ?? "learner";
}

export function roleToApi(role: Role): BackendRoleName {
  return ROLE_FE_TO_API[role] ?? "LEARNER";
}

/* -------------------------------------------------------------------------- */
/*  Course status mapping                                                      */
/* -------------------------------------------------------------------------- */

const STATUS_FE_TO_API: Record<string, BackendCourseStatus> = {
  draft: "DRAFT",
  under_review: "PENDING_APPROVAL",
  approved: "APPROVED",
  published: "PUBLISHED",
  rejected: "REJECTED",
  archived: "ARCHIVED",
};

export function statusFromApi(status: BackendCourseStatus): Course["status"] {
  switch (status) {
    case "DRAFT":
      return "draft";
    case "PENDING_APPROVAL":
      return "under_review";
    case "APPROVED":
      return "approved";
    case "PUBLISHED":
      return "published";
    case "REJECTED":
      return "rejected";
    case "ARCHIVED":
      return "archived";
  }
}

const LEVEL_API_TO_FE: Record<BackendCourseLevel, Course["level"]> = {
  BASIC: "basic",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
};

const LEVEL_FE_TO_API: Record<Course["level"], BackendCourseLevel> = {
  basic: "BASIC",
  intermediate: "INTERMEDIATE",
  advanced: "ADVANCED",
};

export function levelFromApi(level: BackendCourseLevel | undefined): Course["level"] {
  return level ? LEVEL_API_TO_FE[level] : "basic";
}

/* -------------------------------------------------------------------------- */
/*  User                                                                       */
/* -------------------------------------------------------------------------- */

export function userFromApi(user: ApiUser): User {
  const primaryRole = user.roles?.[0]?.role ?? "LEARNER";
  const registration = user.registrationStatus ?? null;
  let status: UserStatus;
  if (registration === "PENDING") status = "pending";
  else if (registration === "REJECTED") status = "rejected";
  else status = user.isActive ? "active" : "suspended";
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone ?? "",
    password: "",
    role: roleFromApi(primaryRole),
    // Other users' permissions aren't returned by this endpoint — only login/refresh
    // return the signed-in user's effective permissions.
    roles: (user.roles ?? []).map((r) => roleFromApi(r.role)),
    permissions: [],
    department: "",
    status,
    createdAt: user.createdAt,
  };
}

export function userFromAuth(
  payload: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string | null;
    roles?: { role: BackendRoleName }[];
  },
  permissions: string[] = [],
): User {
  return {
    id: payload.id,
    firstName: payload.firstName,
    lastName: payload.lastName,
    name: `${payload.firstName} ${payload.lastName}`,
    email: payload.email,
    phone: "",
    password: "",
    role: roleFromApi(payload.roles?.[0]?.role ?? "LEARNER"),
    roles: (payload.roles ?? []).map((r) => roleFromApi(r.role)),
    permissions,
    department: "",
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/*  Course                                                                     */
/* -------------------------------------------------------------------------- */

function bilingual(value?: string | null): string {
  return value ?? "";
}

export function courseFromApi(course: ApiCourseListItem): Course {
  return {
    id: course.id,
    code: course.code,
    title: course.titleEn ?? "",
    category: course.category || deriveCategory(course.titleEn, course.descriptionEn),
    department: course.department ?? undefined,
    targetAudience: course.targetAudience ?? undefined,
    deliveryMethod: course.deliveryMethod ?? undefined,
    language: course.language ?? "en",
    prerequisites: course.prerequisites ?? undefined,
    objectives: course.objectivesEn || course.objectivesAm || undefined,
    description: course.descriptionEn ?? "",
    version: course.version,
    ownerId: course.owners?.[0]?.userId ?? "",
    trainerId: null,
    status: statusFromApi(course.status),
    level: levelFromApi(course.level),
    published: course.status === "PUBLISHED",
    createdAt: course.createdAt,
    cover: course.thumbnailUrl ?? null,
    enrolledLearnerIds: [],
    progress: {},
    modules: [],
    attachments: [],
  };
}

function approvalFromApi(approval: ApiApproval): {
  reason?: string;
  by?: string;
  at?: string;
} {
  if (approval.status !== "REJECTED" || !approval.comments) return {};
  return {
    reason: approval.comments,
    by: approval.approver
      ? `${approval.approver.firstName} ${approval.approver.lastName}`
      : undefined,
    at: approval.decidedAt,
  };
}

export function courseFromDetail(
  apiCourse: ApiCourseDetail,
): Course {
  const base = courseFromApi(apiCourse);
  const rejections = (apiCourse.approvals ?? [])
    .filter((a) => a.status === "REJECTED")
    .sort((a, b) => new Date(b.decidedAt).getTime() - new Date(a.decidedAt).getTime());

  const latest = rejections[0] ? approvalFromApi(rejections[0]) : {};
  const secondLatest = rejections[1] ? approvalFromApi(rejections[1]) : undefined;

  return {
    ...base,
    trainerId: apiCourse.trainers?.[0]?.userId ?? null,
    trainerIds: (apiCourse.trainers ?? []).map((trainer) => trainer.userId),
    modules: (apiCourse.modules ?? []).map(moduleFromApi),
    attachments: (apiCourse.attachments ?? []).map(attachmentFromApi),
    rejectionReason: latest.reason,
    lastRejectionReason: secondLatest?.reason,
    rejectedBy: latest.by,
    rejectedAt: latest.at,
  };
}

export function attachmentFromApi(attachment: ApiAttachment): Attachment {
  return {
    id: attachment.id,
    name: attachment.fileName,
    type: attachment.fileType.startsWith("video") ? "video" : "pdf",
    url: attachment.fileUrl,
  };
}

export function moduleFromApi(mod: ApiModule): Module {
  return {
    id: mod.id,
    title: mod.titleEn ?? "",
    description: mod.descriptionEn ?? undefined,
    objectives: mod.objectivesEn || mod.objectivesAm || undefined,
    durationMinutes: mod.durationMinutes ?? undefined,
    unlocked: mod.unlocked,
    lessons: (mod.lessons ?? []).map(lessonFromApi),
  };
}

function lessonFromApi(lesson: ApiLesson): Lesson {
  return {
    id: lesson.id,
    title: lesson.titleEn ?? "",
    content: lesson.contentEn ?? "",
    durationMin: lesson.durationMinutes ?? 15,
    unlocked: lesson.unlocked,
    contentType: lesson.contentType,
    resourceUrl: lesson.resourceUrl ?? undefined,
    parentId: lesson.parentId ?? undefined,
    subLessons: (lesson.subLessons ?? []).map(lessonFromApi),
  };
}

/* -------------------------------------------------------------------------- */
/*  Create / Update bodies                                                     */
/* -------------------------------------------------------------------------- */

export function courseToCreateBody(input: {
  code: string;
  title: string;
  category?: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  language?: string;
  prerequisites?: string;
  objectives?: string;
  description?: string;
  ownerId?: string;
  level?: Course["level"];
}): CreateCourseBody {
  return {
    code: input.code || "TBD-000",
    title: { en: input.title, am: input.title },
    description: input.description
      ? { en: input.description, am: input.description }
      : undefined,
    objectives: input.objectives
      ? { en: input.objectives, am: input.objectives }
      : undefined,
    category: input.category,
    department: input.department,
    targetAudience: input.targetAudience,
    deliveryMethod: input.deliveryMethod,
    language: input.language,
    prerequisites: input.prerequisites,
    ownerIds: input.ownerId ? [input.ownerId] : undefined,
    level: input.level ? LEVEL_FE_TO_API[input.level] : undefined,
  };
}

export function courseToUpdateBody(input: {
  title: string;
  description?: string;
  objectives?: string;
  category?: string;
  department?: string;
  targetAudience?: string;
  deliveryMethod?: string;
  language?: string;
  prerequisites?: string;
  level?: Course["level"];
}): UpdateCourseBody {
  return {
    title: { en: input.title, am: input.title },
    description: input.description
      ? { en: input.description, am: input.description }
      : undefined,
    objectives: input.objectives
      ? { en: input.objectives, am: input.objectives }
      : undefined,
    category: input.category,
    department: input.department,
    targetAudience: input.targetAudience,
    deliveryMethod: input.deliveryMethod,
    language: input.language,
    prerequisites: input.prerequisites,
    level: input.level ? LEVEL_FE_TO_API[input.level] : undefined,
  };
}

export function moduleToCreateBody(input: {
  titleEn: string;
  titleAm?: string;
  descriptionEn?: string;
  objectivesEn?: string;
  objectivesAm?: string;
  durationMinutes?: number;
  lessons?: {
    titleEn: string;
    titleAm?: string;
    contentEn?: string;
    contentType?: BackendLessonContentType;
    durationMinutes?: number;
    resourceUrl?: string;
    subLessons?: {
      titleEn: string;
      titleAm?: string;
      contentEn?: string;
      contentType?: BackendLessonContentType;
      durationMinutes?: number;
      resourceUrl?: string;
    }[];
  }[];
}): CreateModuleBody {
  const titleAm = input.titleAm ?? input.titleEn;
  return {
    titleEn: input.titleEn,
    titleAm,
    descriptionEn: input.descriptionEn,
    descriptionAm: input.descriptionEn,
    objectivesEn: input.objectivesEn,
    objectivesAm: input.objectivesAm ?? input.objectivesEn,
    durationMinutes: input.durationMinutes,
    lessons: (input.lessons ?? []).map((l) => ({
      titleEn: l.titleEn,
      titleAm: l.titleAm ?? l.titleEn,
      contentEn: l.contentEn,
      contentType: l.contentType ?? "DOCUMENT",
      durationMinutes: l.durationMinutes,
      resourceUrl: l.resourceUrl,
      subLessons: (l.subLessons ?? []).map((sub) => ({
        titleEn: sub.titleEn,
        titleAm: sub.titleAm ?? sub.titleEn,
        contentEn: sub.contentEn,
        contentType: sub.contentType ?? "DOCUMENT",
        durationMinutes: sub.durationMinutes,
        resourceUrl: sub.resourceUrl,
      })),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/*  Enrollment helpers                                                         */
/* -------------------------------------------------------------------------- */

export function enrollmentCourseId(enrollment: ApiEnrollment): string {
  return enrollment.courseId;
}

export function enrollmentUserId(enrollment: ApiEnrollment): string {
  return enrollment.userId;
}
