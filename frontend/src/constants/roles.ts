import type { Role, RoleInfo } from '@/types';

export const ROLES: Role[] = [
  'course_owner',
  'content_approver',
  'training_admin',
  'trainer',
  'learner',
  'system_admin',
];

export const ROLE_LABELS: Record<Role, string> = {
  course_owner: 'Course Owner',
  content_approver: 'Content Approver',
  training_admin: 'Training Administrator',
  trainer: 'Trainer',
  learner: 'Learner',
  system_admin: 'System Administrator',
};

export const ROLE_INFO: RoleInfo[] = [
  {
    key: 'course_owner',
    label: ROLE_LABELS.course_owner,
    description: 'Owns and manages course catalog and curriculum.',
  },
  {
    key: 'content_approver',
    label: ROLE_LABELS.content_approver,
    description: 'Reviews and approves course content.',
  },
  {
    key: 'training_admin',
    label: ROLE_LABELS.training_admin,
    description: 'Administers training programs, schedules, and enrollments.',
  },
  {
    key: 'trainer',
    label: ROLE_LABELS.trainer,
    description: 'Delivers training sessions and tracks learner progress.',
  },
  {
    key: 'learner',
    label: ROLE_LABELS.learner,
    description: 'Enrolls in and completes courses.',
  },
  {
    key: 'system_admin',
    label: ROLE_LABELS.system_admin,
    description: 'Manages system configuration, users, and permissions.',
  },
];

export const ROLE_PATHS: Record<Role, string> = {
  course_owner: '/course-owner',
  content_approver: '/content-approver',
  training_admin: '/training-admin',
  trainer: '/trainer',
  learner: '/learner',
  system_admin: '/system-admin',
};

const ROLE_BY_PATH: Record<string, Role> = ROLES.reduce(
  (acc, role) => {
    acc[ROLE_PATHS[role]] = role;
    return acc;
  },
  {} as Record<string, Role>,
);

export function getRoleFromPath(pathname: string): Role | null {
  const segment = pathname.split('/')[1] ?? '';
  return ROLE_BY_PATH[`/${segment}`] ?? null;
}

export function getRoleHomePath(role?: Role | string | null, permissions: string[] = []): string {
  if (!role) return '/learner';
  const key = role.toLowerCase().trim() as Role;
  if (ROLE_PATHS[key]) {
    return ROLE_PATHS[key];
  }

  // For custom/dynamic roles not in standard ROLE_PATHS, pick best home based on permissions
  if (permissions && permissions.length > 0) {
    if (
      permissions.some(
        (p) =>
          p.startsWith('user.') ||
          p.startsWith('role.') ||
          p.startsWith('permission.') ||
          p.startsWith('system.') ||
          p === 'category.manage' ||
          p === 'audit.view',
      )
    ) {
      return '/system-admin';
    }
    if (permissions.some((p) => p.includes('approve') || p === 'course.approve_reject')) {
      return '/content-approver';
    }
    if (
      permissions.some(
        (p) =>
          p.startsWith('course.') ||
          p.startsWith('curriculum.') ||
          p === 'question_bank.manage',
      )
    ) {
      return '/course-owner';
    }
    if (
      permissions.some(
        (p) =>
          p.startsWith('quiz.') ||
          p.startsWith('live_session.') ||
          p.startsWith('attendance.') ||
          p === 'result.view.all',
      )
    ) {
      return '/trainer';
    }
    if (
      permissions.some(
        (p) =>
          p.startsWith('enrollment.') ||
          p.startsWith('student.') ||
          p === 'venue.manage' ||
          p === 'feedback.manage',
      )
    ) {
      return '/training-admin';
    }
  }

  return '/learner';
}

