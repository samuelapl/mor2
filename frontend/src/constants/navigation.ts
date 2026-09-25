import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FilePlus2,
  FileQuestion,
  GraduationCap,
  Hourglass,
  LayoutDashboard,
  Lock,
  MessageSquareQuote,
  Presentation,
  ScrollText,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  Store,
  UploadCloud,
  Users,
  UserPlus,
  UserCog,
  Video,
} from 'lucide-react';
import type { Role } from '@/types';

export interface NavItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  /** Permission code(s) required to see this item (OR semantics). Omit for always-visible items. */
  permission?: string | string[];
  /** Present for a collapsible group instead of a direct link. */
  children?: NavItem[];
}

export const ROLE_ICONS: Record<Role, LucideIcon> = {
  course_owner: BookOpen,
  content_approver: BadgeCheck,
  training_admin: CalendarRange,
  trainer: Presentation,
  learner: GraduationCap,
  system_admin: ShieldCheck,
};

export const NAV_ITEMS: Record<Role, NavItem[]> = {
  course_owner: [
    { label: 'Dashboard', href: '/course-owner', icon: LayoutDashboard },
    {
      label: 'Courses',
      href: '/courses',
      icon: BookOpen,
      permission: ['course.view.own', 'course.view.all', 'course.create'],
    },
    {
      label: 'Question Bank',
      href: '/course-owner/question-bank',
      icon: FileQuestion,
      permission: 'question_bank.manage',
    },
  ],
  content_approver: [
    { label: 'Dashboard', href: '/content-approver', icon: LayoutDashboard },
    {
      label: 'Courses',
      href: '/courses',
      icon: BookOpen,
      permission: ['course.view.all', 'course.approve_reject'],
    },
    {
      label: 'Pending Approvals',
      href: '/content-approver/pending-approvals',
      icon: Hourglass,
      permission: 'course.approve_reject',
    },
  ],
  training_admin: [
    { label: 'Dashboard', href: '/training-admin', icon: LayoutDashboard },
    {
      label: 'Courses',
      href: '/courses',
      icon: BookOpen,
      permission: ['course.view.all', 'course.create'],
    },
    {
      label: 'Enrollments',
      href: '/training-admin/enrollments',
      icon: Users,
      permission: ['student.manage', 'student.view', 'enrollment.view_all'],
    },
    {
      label: 'Sessions',
      icon: Presentation,
      children: [
        {
          label: 'All Sessions',
          href: '/training-admin/sessions',
          icon: Presentation,
          permission: ['live_session.manage_all'],
        },
        {
          label: 'My Sessions',
          href: '/trainer/sessions',
          icon: CalendarDays,
          permission: ['live_session.manage_own', 'live_session.manage_all'],
        },
      ],
    },
    {
      label: 'Question Bank',
      href: '/trainer/question-bank',
      icon: FileQuestion,
      permission: 'question_bank.manage',
    },
    {
      label: 'Course Feedback',
      href: '/training-admin/feedback',
      icon: MessageSquareQuote,
      permission: ['feedback.manage', 'feedback.view'],
    },
  ],
  trainer: [
    { label: 'Dashboard', href: '/trainer', icon: LayoutDashboard },
    {
      label: 'Courses',
      href: '/courses',
      icon: BookOpen,
      permission: ['course.view.assigned', 'course.view.all'],
    },
    {
      label: 'Sessions',
      icon: Presentation,
      children: [
        {
          label: 'All Sessions',
          href: '/training-admin/sessions',
          icon: Presentation,
          permission: ['live_session.manage_all'],
        },
        {
          label: 'My Sessions',
          href: '/trainer/sessions',
          icon: CalendarDays,
          permission: ['live_session.manage_own', 'live_session.manage_all'],
        },
      ],
    },
    {
      label: 'Question Bank',
      href: '/trainer/question-bank',
      icon: FileQuestion,
      permission: 'question_bank.manage',
    },
  ],
  learner: [
    { label: 'Dashboard', href: '/learner', icon: LayoutDashboard },
    {
      label: 'Available Courses',
      href: '/learner/catalog',
      icon: Store,
      permission: 'course.browse',
    },
    {
      label: 'My Courses',
      href: '/learner/my-courses',
      icon: BookOpen,
      permission: ['course.browse', 'enrollment.self', 'progress.mark_own'],
    },
    {
      label: 'Live Sessions',
      href: '/learner/live-sessions',
      icon: Video,
      permission: ['attendance.checkin', 'course.browse'],
    },
    {
      label: 'Certificates',
      href: '/learner/certificates',
      icon: Award,
      permission: 'certificate.view',
    },
    {
      label: 'Progress',
      href: '/learner/progress',
      icon: BarChart3,
      permission: ['progress.view', 'progress.mark_own'],
    },
  ],
  system_admin: [
    { label: 'Dashboard', href: '/system-admin', icon: LayoutDashboard },
    {
      label: 'Courses',
      href: '/courses',
      icon: BookOpen,
      permission: ['course.view.all', 'course.view.own', 'course.create'],
    },
    {
      label: 'Registration',
      icon: UserPlus,
      children: [
        {
          label: 'Approve Registration',
          href: '/system-admin/pending-registrations',
          icon: UserPlus,
          permission: 'user.manage',
        },
        {
          label: 'Actor Registration',
          href: '/system-admin/register-actor',
          icon: UserCog,
          permission: 'user.manage',
        },
        {
          label: 'Bulk Register',
          href: '/system-admin/bulk-register',
          icon: UploadCloud,
          permission: 'user.manage',
        },
      ],
    },
    {
      label: 'Pending Course Approvals',
      href: '/system-admin/pending-course-approvals',
      icon: Hourglass,
      permission: 'course.approve_reject',
    },
    {
      label: 'Certificate Templates',
      href: '/certificate-templates',
      icon: FilePlus2,
      permission: 'certificate.manage',
    },
    {
      label: 'Question Bank',
      href: '/trainer/question-bank',
      icon: FileQuestion,
      permission: 'question_bank.manage',
    },
    {
      label: 'Course Feedback',
      href: '/training-admin/feedback',
      icon: MessageSquareQuote,
      permission: ['feedback.manage', 'feedback.view'],
    },
    {
      label: 'Users & Roles',
      href: '/system-admin/users',
      icon: Users,
      permission: ['user.manage', 'user.view'],
    },
    {
      label: 'Roles & Permissions',
      href: '/system-admin/roles',
      icon: Lock,
      permission: ['role.manage', 'permission.manage'],
    },
    {
      label: 'Policies',
      href: '/system-admin/policies',
      icon: SlidersHorizontal,
      permission: 'course_policy.manage',
    },
    {
      label: 'System Settings',
      href: '/system-admin/settings',
      icon: Settings,
      permission: ['user.manage', 'role.manage', 'permission.manage'],
    },
    {
      label: 'Audit Logs',
      href: '/system-admin/audit-logs',
      icon: ScrollText,
      permission: 'audit.view',
    },
  ],
};

/**
 * Permission-gated pages that any role can reach once granted the permission — access to
 * these is NOT restricted to the role whose path segment they happen to live under.
 * `DashboardShell` bypasses its normal role-redirect for these exact paths and checks the
 * listed permissions (OR semantics) instead.
 */
export const PERMISSION_GATED_PATHS: Record<string, string[]> = {
  '/system-admin/users': ['user.manage', 'user.view'],
  '/system-admin/roles': ['role.manage', 'permission.manage'],
  '/system-admin/policies': ['course_policy.manage'],
  '/courses': [
    'course.view.own',
    'course.view.all',
    'course.view.assigned',
    'course.create',
    'course.browse',
  ],
  '/course-owner/create-course': ['course.create'],
  '/course-owner/question-bank': ['question_bank.manage'],
  '/trainer/attendance': ['attendance.view', 'attendance.manage', 'attendance.override'],
  '/training-admin/sessions': ['live_session.manage_all'],
  '/trainer/sessions': ['live_session.manage_own', 'live_session.manage_all'],
  '/learner/live-sessions': ['attendance.checkin', 'course.browse'],
  '/training-admin/enrollments': ['student.manage', 'student.view', 'enrollment.view_all'],
  '/trainer/question-bank': ['question_bank.manage'],
  '/trainer/create-quiz': ['quiz.create'],
  '/content-approver/pending-approvals': ['course.approve_reject'],
  '/content-approver/approved-courses': ['course.approve_reject', 'course.view.all'],
  '/system-admin/pending-registrations': ['user.manage'],
  '/system-admin/register-actor': ['user.manage'],
  '/system-admin/bulk-register': ['user.manage'],
  '/system-admin/pending-course-approvals': ['course.approve_reject'],
  '/certificate-templates': ['certificate.manage'],
  '/system-admin/certificate-templates': ['certificate.manage'],
  '/system-admin/settings': ['user.manage', 'role.manage', 'permission.manage'],
  '/system-admin/audit-logs': ['audit.view'],
  '/learner/catalog': ['course.browse'],
  '/learner/certificates': ['certificate.view', 'certificate.manage'],
  '/learner/progress': ['progress.view', 'progress.mark_own'],
  '/training-admin/feedback': ['feedback.manage', 'feedback.view'],
};

/**
 * Dynamic cross-role capability items.
 * If the System Admin grants an actor (e.g. Content Approver, Course Owner, Training Admin)
 * permissions like `live_session.manage_all`, `live_session.manage_own`, `quiz.create`, etc.,
 * these nav items automatically appear in their sidebar navigation!
 */
export const DYNAMIC_CAPABILITY_NAV_ITEMS: NavItem[] = [
  {
    label: 'Course Feedback',
    href: '/training-admin/feedback',
    icon: MessageSquareQuote,
    permission: ['feedback.manage', 'feedback.view'],
  },
  {
    label: 'Sessions',
    icon: Presentation,
    children: [
      {
        label: 'All Sessions',
        href: '/training-admin/sessions',
        icon: Presentation,
        permission: ['live_session.manage_all'],
      },
      {
        label: 'My Sessions',
        href: '/trainer/sessions',
        icon: CalendarDays,
        permission: ['live_session.manage_own', 'live_session.manage_all'],
      },
    ],
  },
  {
    label: 'Question Bank',
    href: '/course-owner/question-bank',
    icon: FileQuestion,
    permission: 'question_bank.manage',
  },
  {
    label: 'Enrollments',
    href: '/training-admin/enrollments',
    icon: Users,
    permission: ['student.manage', 'student.view', 'enrollment.view_all'],
  },
  {
    label: 'Pending Approvals',
    href: '/content-approver/pending-approvals',
    icon: Hourglass,
    permission: 'course.approve_reject',
  },
  {
    label: 'Certificate Templates',
    href: '/certificate-templates',
    icon: FilePlus2,
    permission: 'certificate.manage',
  },
  {
    label: 'Registration',
    icon: UserPlus,
    children: [
      {
        label: 'Approve Registration',
        href: '/system-admin/pending-registrations',
        icon: UserPlus,
        permission: 'user.manage',
      },
      {
        label: 'Actor Registration',
        href: '/system-admin/register-actor',
        icon: UserCog,
        permission: 'user.manage',
      },
      {
        label: 'Bulk Register',
        href: '/system-admin/bulk-register',
        icon: UploadCloud,
        permission: 'user.manage',
      },
    ],
  },
  {
    label: 'Users & Roles',
    href: '/system-admin/users',
    icon: Users,
    permission: ['user.manage', 'user.view'],
  },
  {
    label: 'Roles & Permissions',
    href: '/system-admin/roles',
    icon: Lock,
    permission: ['role.manage', 'permission.manage'],
  },
  {
    label: 'Audit Logs',
    href: '/system-admin/audit-logs',
    icon: ScrollText,
    permission: 'audit.view',
  },
  {
    label: 'System Settings',
    href: '/system-admin/settings',
    icon: Settings,
    permission: ['user.manage', 'role.manage', 'permission.manage'],
  },
  {
    label: 'Policies',
    href: '/system-admin/policies',
    icon: SlidersHorizontal,
    permission: PERMISSION_GATED_PATHS['/system-admin/policies'],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  const base = NAV_ITEMS[role] ?? [];
  const existingHrefs = new Set<string>();
  const existingLabels = new Set<string>();

  const trackItems = (items: NavItem[]) => {
    for (const item of items) {
      if (item.href) existingHrefs.add(item.href);
      existingLabels.add(item.label.toLowerCase().replace(/^(my|training)\s+/, ''));
      if (item.children) trackItems(item.children);
    }
  };

  trackItems(base);

  // For any capability item, if the role already has an equivalent link or label, skip.
  // Otherwise, include it so filterNavItems can show it whenever the role holds the permission!
  const extraItems = DYNAMIC_CAPABILITY_NAV_ITEMS.filter((item) => {
    if (!item.href && !item.children) return false;
    if (item.href && existingHrefs.has(item.href)) return false;
    const normalizedLabel = item.label.toLowerCase().replace(/^(my|training)\s+/, '');
    if (existingLabels.has(normalizedLabel)) return false;
    return true;
  });

  return [...base, ...extraItems];
}
