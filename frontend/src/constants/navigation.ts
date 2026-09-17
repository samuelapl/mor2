import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  FilePlus2,
  FileQuestion,
  GraduationCap,
  Hourglass,
  LayoutDashboard,
  Lock,
  Presentation,
  ScrollText,
  Settings,
  ShieldCheck,
  Store,
  UploadCloud,
  Users,
  UserPlus,
  UserCog,
  Video,
} from "lucide-react";
import type { Role } from "@/types";

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
    { label: "Dashboard", href: "/course-owner", icon: LayoutDashboard },
    { label: "My Courses", href: "/course-owner/my-courses", icon: BookOpen },
  ],
  content_approver: [
    { label: "Dashboard", href: "/content-approver", icon: LayoutDashboard },
    {
      label: "Pending Approvals",
      href: "/content-approver/pending-approvals",
      icon: Hourglass,
      permission: ["course.approve", "course.reject"],
    },
    { label: "Approved Courses", href: "/content-approver/approved-courses", icon: BadgeCheck },
  ],
  training_admin: [
    { label: "Dashboard", href: "/training-admin", icon: LayoutDashboard },
    { label: "Pending to Publish", href: "/training-admin/publish", icon: Hourglass, permission: "course.publish" },
    { label: "View Published Course", href: "/training-admin/courses", icon: BookOpenCheck },
    { label: "Enrollments", href: "/training-admin/enrollments", icon: Users, permission: "student.manage" },
    { label: "Training Sessions", href: "/training-admin/sessions", icon: Presentation },
    { label: "Calendar", href: "/training-admin/calendar", icon: CalendarDays },
  ],
  trainer: [
    { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
    { label: "My Sessions", href: "/trainer/sessions", icon: Presentation },
    { label: "Create Quiz", href: "/trainer/create-quiz", icon: FileQuestion, permission: "quiz.create" },
    { label: "Attendance", href: "/trainer/attendance", icon: ClipboardCheck, permission: "attendance.manage" },
  ],
  learner: [
    { label: "Dashboard", href: "/learner", icon: LayoutDashboard },
    { label: "Available Courses", href: "/learner/catalog", icon: Store, permission: "course.browse" },
    { label: "My Courses", href: "/learner/my-courses", icon: BookOpen },
    { label: "Live Sessions", href: "/learner/live-sessions", icon: Video },
    { label: "Certificates", href: "/learner/certificates", icon: Award, permission: "certificate.view" },
    { label: "Progress", href: "/learner/progress", icon: BarChart3 },
  ],
  system_admin: [
    { label: "Dashboard", href: "/system-admin", icon: LayoutDashboard },
    { label: "Users & Roles", href: "/system-admin/users", icon: Users, permission: ["user.manage", "user.view"] },
    {
      label: "Registration",
      icon: UserPlus,
      children: [
        {
          label: "Approve Registration",
          href: "/system-admin/pending-registrations",
          icon: UserPlus,
          permission: "user.manage",
        },
        {
          label: "Actor Registration",
          href: "/system-admin/register-actor",
          icon: UserCog,
          permission: "user.manage",
        },
        {
          label: "Bulk Register",
          href: "/system-admin/bulk-register",
          icon: UploadCloud,
          permission: "user.manage",
        },
      ],
    },
    {
      label: "Pending Course Approvals",
      href: "/system-admin/pending-course-approvals",
      icon: Hourglass,
      permission: ["course.approve", "course.reject"],
    },
    {
      label: "Certificate Templates",
      href: "/system-admin/certificate-templates",
      icon: FilePlus2,
      permission: "certificate.manage",
    },
    {
      label: "Roles & Permissions",
      href: "/system-admin/roles",
      icon: Lock,
      permission: ["role.manage", "permission.manage"],
    },
    { label: "System Settings", href: "/system-admin/settings", icon: Settings },
    { label: "Audit Logs", href: "/system-admin/audit-logs", icon: ScrollText, permission: "audit.view" },
  ],
};

/**
 * Permission-gated pages that any role can reach once granted the permission — access to
 * these is NOT restricted to the role whose path segment they happen to live under.
 * `DashboardShell` bypasses its normal role-redirect for these exact paths and checks the
 * listed permissions (OR semantics) instead.
 */
export const PERMISSION_GATED_PATHS: Record<string, string[]> = {
  "/system-admin/users": ["user.manage", "user.view"],
  "/system-admin/roles": ["role.manage", "permission.manage"],
};

/**
 * Nav entries for permission-gated pages, injected into every role's sidebar (not just
 * System Admin's) so a role granted the permission at runtime sees the entry immediately —
 * `filterNavItems` still hides it for anyone lacking the permission.
 */
const CROSS_ROLE_ADMIN_ITEMS: NavItem[] = [
  {
    label: "Users & Roles",
    href: "/system-admin/users",
    icon: Users,
    permission: PERMISSION_GATED_PATHS["/system-admin/users"],
  },
  {
    label: "Roles & Permissions",
    href: "/system-admin/roles",
    icon: Lock,
    permission: PERMISSION_GATED_PATHS["/system-admin/roles"],
  },
];

export function navItemsForRole(role: Role): NavItem[] {
  if (role === "system_admin") return NAV_ITEMS[role];
  return [...NAV_ITEMS[role], ...CROSS_ROLE_ADMIN_ITEMS];
}