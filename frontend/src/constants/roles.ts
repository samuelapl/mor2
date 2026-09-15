import type { Role, RoleInfo } from "@/types";

export const ROLES: Role[] = [
  "course_owner",
  "content_approver",
  "training_admin",
  "trainer",
  "learner",
  "system_admin",
];

export const ROLE_LABELS: Record<Role, string> = {
  course_owner: "Course Owner",
  content_approver: "Content Approver",
  training_admin: "Training Administrator",
  trainer: "Trainer",
  learner: "Learner",
  system_admin: "System Administrator",
};

export const ROLE_INFO: RoleInfo[] = [
  {
    key: "course_owner",
    label: ROLE_LABELS.course_owner,
    description: "Owns and manages course catalog and curriculum.",
  },
  {
    key: "content_approver",
    label: ROLE_LABELS.content_approver,
    description: "Reviews and approves course content.",
  },
  {
    key: "training_admin",
    label: ROLE_LABELS.training_admin,
    description: "Administers training programs, schedules, and enrollments.",
  },
  {
    key: "trainer",
    label: ROLE_LABELS.trainer,
    description: "Delivers training sessions and tracks learner progress.",
  },
  {
    key: "learner",
    label: ROLE_LABELS.learner,
    description: "Enrolls in and completes courses.",
  },
  {
    key: "system_admin",
    label: ROLE_LABELS.system_admin,
    description: "Manages system configuration, users, and permissions.",
  },
];

export const ROLE_PATHS: Record<Role, string> = {
  course_owner: "/course-owner",
  content_approver: "/content-approver",
  training_admin: "/training-admin",
  trainer: "/trainer",
  learner: "/learner",
  system_admin: "/system-admin",
};

const ROLE_BY_PATH: Record<string, Role> = ROLES.reduce(
  (acc, role) => {
    acc[ROLE_PATHS[role]] = role;
    return acc;
  },
  {} as Record<string, Role>,
);

export function getRoleFromPath(pathname: string): Role | null {
  const segment = pathname.split("/")[1] ?? "";
  return ROLE_BY_PATH[`/${segment}`] ?? null;
}