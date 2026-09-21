import { PrismaClient, RoleName } from '@prisma/client';

interface PermissionDef {
  code: string;
  resource: string;
  action: string;
  scope: 'ALL' | 'OWN';
  description: string;
}

interface RoleDef {
  name: RoleName;
  label: string;
  dashboardPath: string;
}

// Source of truth: ROLE-PERMISSION-SPEC.md §5 (registry) and §6 (seed matrix).
export const ROLES: RoleDef[] = [
  { name: RoleName.COURSE_OWNER, label: 'Course Owner', dashboardPath: '/course-owner' },
  { name: RoleName.CONTENT_APPROVER, label: 'Content Approver', dashboardPath: '/content-approver' },
  { name: RoleName.TRAINING_ADMIN, label: 'Training Administrator', dashboardPath: '/training-admin' },
  { name: RoleName.TRAINER, label: 'Trainer', dashboardPath: '/trainer' },
  { name: RoleName.LEARNER, label: 'Learner', dashboardPath: '/learner' },
  { name: RoleName.SYSTEM_ADMIN, label: 'System Administrator', dashboardPath: '/system-admin' },
];

export const PERMISSIONS: PermissionDef[] = [
  // Course
  { code: 'course.create', resource: 'course', action: 'create', scope: 'ALL', description: 'Create course' },
  { code: 'course.update.own', resource: 'course', action: 'update', scope: 'OWN', description: 'Update own course' },
  { code: 'course.update.all', resource: 'course', action: 'update', scope: 'ALL', description: 'Update any course' },
  { code: 'course.view.own', resource: 'course', action: 'view', scope: 'OWN', description: 'View created courses' },
  { code: 'course.view.all', resource: 'course', action: 'view', scope: 'ALL', description: 'View all courses' },
  { code: 'course.view.assigned', resource: 'course', action: 'view', scope: 'OWN', description: 'View courses assigned to me (trainers)' },
  { code: 'course.browse', resource: 'course', action: 'browse', scope: 'ALL', description: 'Browse published catalog' },
  { code: 'course.submit_approval', resource: 'course', action: 'submit_approval', scope: 'ALL', description: 'Request approval' },
  { code: 'course.approve_reject', resource: 'course', action: 'approve_reject', scope: 'ALL', description: 'Approve or reject a course under review' },
  { code: 'course.publish', resource: 'course', action: 'publish', scope: 'ALL', description: 'Publish course' },
  { code: 'course.unpublish', resource: 'course', action: 'unpublish', scope: 'ALL', description: 'Unpublish course' },
  { code: 'course.archive', resource: 'course', action: 'archive', scope: 'ALL', description: 'Archive course (Owner: DRAFT only, enforced in service layer)' },
  { code: 'course.delete', resource: 'course', action: 'delete', scope: 'ALL', description: 'Delete course (Owner: DRAFT only, enforced in service layer)' },
  { code: 'course.assign_trainer', resource: 'course', action: 'assign_trainer', scope: 'ALL', description: 'Assign trainer' },
  { code: 'course.manage_curriculum', resource: 'course', action: 'manage_curriculum', scope: 'ALL', description: 'Manage modules & lessons' },
  { code: 'course.view_enrollments', resource: 'course', action: 'view_enrollments', scope: 'ALL', description: 'View course enrollments' },

  // Assessment / Quiz
  { code: 'quiz.create', resource: 'quiz', action: 'create', scope: 'ALL', description: 'Create quiz / assessment' },
  { code: 'quiz.grade', resource: 'quiz', action: 'grade', scope: 'ALL', description: 'Grade submissions' },
  { code: 'assessment.submit', resource: 'assessment', action: 'submit', scope: 'OWN', description: 'Take quiz' },
  // Question Bank — dedicated permission to view and manage the question bank
  { code: 'question_bank.manage', resource: 'question_bank', action: 'manage', scope: 'ALL', description: 'Access and manage the question bank (create, edit, delete questions)' },

  // Attendance
  { code: 'attendance.view', resource: 'attendance', action: 'view', scope: 'ALL', description: 'View attendance' },
  { code: 'attendance.manage', resource: 'attendance', action: 'manage', scope: 'ALL', description: 'Mark attendance' },
  { code: 'attendance.override', resource: 'attendance', action: 'override', scope: 'ALL', description: 'Override attendance record' },
  { code: 'attendance.checkin', resource: 'attendance', action: 'checkin', scope: 'OWN', description: 'Learner self check-in' },

  // Results & Students
  { code: 'result.view.all', resource: 'result', action: 'view', scope: 'ALL', description: 'View results / scores (any learner)' },
  { code: 'result.view.own', resource: 'result', action: 'view', scope: 'OWN', description: 'View own results / scores' },
  { code: 'student.view', resource: 'student', action: 'view', scope: 'ALL', description: 'View enrolled students' },
  { code: 'student.manage', resource: 'student', action: 'manage', scope: 'ALL', description: 'Enroll / drop learners (bulk)' },
  { code: 'enrollment.self', resource: 'enrollment', action: 'self', scope: 'OWN', description: 'Self-enroll / drop' },
  { code: 'enrollment.view_all', resource: 'enrollment', action: 'view_all', scope: 'ALL', description: 'View enrollment listings across every course/user (admin-wide, not the per-course view)' },

  // Live Sessions
  { code: 'live_session.manage_all', resource: 'live_session', action: 'manage_all', scope: 'ALL', description: 'Manage all sessions' },
  { code: 'live_session.manage_own', resource: 'live_session', action: 'manage_own', scope: 'OWN', description: 'Manage own sessions' },

  // Progress
  { code: 'progress.view', resource: 'progress', action: 'view', scope: 'ALL', description: "View learners' progress" },
  { code: 'progress.mark_own', resource: 'progress', action: 'mark', scope: 'OWN', description: 'Mark own lesson complete' },

  // Certificate
  { code: 'certificate.view', resource: 'certificate', action: 'view', scope: 'OWN', description: 'View own certificate' },
  { code: 'certificate.manage', resource: 'certificate', action: 'manage', scope: 'ALL', description: 'Manage templates & issue' },

  // Users & System
  { code: 'user.view', resource: 'user', action: 'view', scope: 'ALL', description: 'View users' },
  { code: 'user.manage', resource: 'user', action: 'manage', scope: 'ALL', description: 'Manage users (create, bulk, approve, reset)' },
  { code: 'role.view', resource: 'role', action: 'view', scope: 'ALL', description: 'View roles' },
  { code: 'role.manage', resource: 'role', action: 'manage', scope: 'ALL', description: 'Manage roles & assignment' },
  { code: 'permission.manage', resource: 'permission', action: 'manage', scope: 'ALL', description: 'Edit permission matrix' },
  { code: 'dashboard.stats', resource: 'dashboard', action: 'stats', scope: 'ALL', description: 'View admin dashboard stats' },
  { code: 'audit.view', resource: 'audit', action: 'view', scope: 'ALL', description: 'View audit logs' },

  // Course policy (time-spent %, retake cooldown)
  { code: 'course_policy.manage', resource: 'course_policy', action: 'manage', scope: 'ALL', description: 'Manage course completion policy (time-spent %, retake cooldown)' },
];

// Seed matrix — ROLE-PERMISSION-SPEC.md §6, final version (includes footnotes ¹²³ and the Exception block).
export const ROLE_PERMISSION_MATRIX: Record<RoleName, string[]> = {
  [RoleName.COURSE_OWNER]: [
    'course.create',
    'course.update.own',
    'course.view.own',
    'course.submit_approval',
    'course.archive',
    'course.delete',
    'course.manage_curriculum',
    'course.view_enrollments',
    'quiz.create',
    'quiz.grade',
    'question_bank.manage',
    'assessment.submit',
    'attendance.view',
    'result.view.all',
    'student.view',
    'live_session.manage_own',
    'progress.view',
  ],
  [RoleName.CONTENT_APPROVER]: ['course.view.all', 'course.approve_reject'],
  [RoleName.TRAINING_ADMIN]: [
    'course.create',
    'course.update.all',
    'course.view.all',
    'course.submit_approval',
    'course.publish',
    'course.unpublish',
    'course.archive',
    'course.delete',
    'course.assign_trainer',
    'course.manage_curriculum',
    'course.view_enrollments',
    'enrollment.view_all',
    'quiz.create',
    'quiz.grade',
    'question_bank.manage',
    'assessment.submit',
    'attendance.view',
    'attendance.manage',
    'result.view.all',
    'student.view',
    'live_session.manage_own',
    'progress.view',
    'user.view',
    'dashboard.stats',
    'course_policy.manage',
  ],
  [RoleName.TRAINER]: [
    'course.view.assigned',
    'quiz.create',
    'quiz.grade',
    'question_bank.manage',
    'attendance.view',
    'result.view.all',
    'student.view',
    'live_session.manage_own',
    'progress.view',
  ],
  [RoleName.LEARNER]: [
    'course.browse',
    'assessment.submit',
    'attendance.checkin',
    'result.view.own',
    'enrollment.self',
    'progress.mark_own',
    'certificate.view',
  ],
  // System Admin is locked (superuser bypass in the guards) but is still seeded with
  // every permission so the admin UI and GET /admin/users/:id/permissions reflect reality.
  [RoleName.SYSTEM_ADMIN]: [], // filled in below with every permission code
};
ROLE_PERMISSION_MATRIX[RoleName.SYSTEM_ADMIN] = PERMISSIONS.map((p) => p.code);

export async function seedPermissions(prisma: PrismaClient) {
  console.log('  Seeding roles...');
  const roleIdByName = new Map<RoleName, string>();
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { label: r.label, dashboardPath: r.dashboardPath, isSystem: true },
      create: { name: r.name, label: r.label, dashboardPath: r.dashboardPath, isSystem: true },
    });
    roleIdByName.set(r.name, role.id);
  }

  console.log('  Seeding permission registry...');
  const permissionIdByCode = new Map<string, string>();
  for (const p of PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { code: p.code },
      update: { resource: p.resource, action: p.action, scope: p.scope, description: p.description },
      create: {
        code: p.code,
        resource: p.resource,
        action: p.action,
        scope: p.scope,
        description: p.description,
      },
    });
    permissionIdByCode.set(p.code, permission.id);
  }

  console.log('  Seeding role → permission matrix...');
  for (const [roleName, codes] of Object.entries(ROLE_PERMISSION_MATRIX) as [RoleName, string[]][]) {
    const roleId = roleIdByName.get(roleName)!;
    for (const code of codes) {
      const permissionId = permissionIdByCode.get(code);
      if (!permissionId) {
        throw new Error(`Seed matrix references unknown permission code "${code}" for role ${roleName}`);
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // TRAINER used to hold 'course.view.all'; it now holds the narrower 'course.view.assigned'.
  // The matrix seed above is additive-only, so drop that stale grant explicitly.
  const trainerRoleId = roleIdByName.get(RoleName.TRAINER)!;
  const viewAllPermissionId = permissionIdByCode.get('course.view.all')!;
  await prisma.rolePermission.deleteMany({
    where: { roleId: trainerRoleId, permissionId: viewAllPermissionId },
  });

  // 'course.approve' + 'course.reject' were merged into a single
  // 'course.approve_reject' permission (the /courses/:id/review endpoint
  // always granted either one interchangeably). Delete the old rows —
  // cascades to their role_permissions grants.
  await prisma.permission.deleteMany({
    where: { code: { in: ['course.approve', 'course.reject'] } },
  });

  // 'live_session.manage' and 'live_session.view_own' were replaced by
  // 'live_session.manage_all' and 'live_session.manage_own'.
  // Delete the old rows — cascades to their role_permissions grants.
  await prisma.permission.deleteMany({
    where: { code: { in: ['live_session.manage', 'live_session.view_own'] } },
  });

  // TRAINING_ADMIN now defaults to 'live_session.manage_own' instead of 'live_session.manage_all'.
  // Drop any old 'live_session.manage_all' grant from TRAINING_ADMIN so it only sees its assigned sessions by default.
  const trainingAdminRoleId = roleIdByName.get(RoleName.TRAINING_ADMIN);
  const liveSessionManageAllPerm = permissionIdByCode.get('live_session.manage_all');
  if (trainingAdminRoleId && liveSessionManageAllPerm) {
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: trainingAdminRoleId,
        permissionId: liveSessionManageAllPerm,
      },
    });
  }

  // TRAINER and COURSE_OWNER now default to view-only attendance ('attendance.view').
  // Drop 'attendance.manage' from them so neither can change status unless explicitly granted by admin.
  const attendanceManagePerm = permissionIdByCode.get('attendance.manage');
  if (attendanceManagePerm) {
    const courseOwnerRoleId = roleIdByName.get(RoleName.COURSE_OWNER);
    await prisma.rolePermission.deleteMany({
      where: {
        roleId: { in: [trainerRoleId, courseOwnerRoleId].filter((id): id is string => Boolean(id)) },
        permissionId: attendanceManagePerm,
      },
    });
  }

  console.log('  ✓ Permission registry + matrix seeded');
}
