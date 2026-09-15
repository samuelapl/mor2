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
  ClipboardList,
  FilePlus2,
  FileQuestion,
  GraduationCap,
  Hourglass,
  LayoutDashboard,
  Presentation,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  Store,
  UploadCloud,
  Users,
  UserPlus,
  Video,
} from "lucide-react";
import type { Role } from "@/types";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
    { label: "Create Course", href: "/course-owner/create-course", icon: FilePlus2 },
    { label: "Content Status", href: "/course-owner/content-status", icon: ClipboardList },
  ],
  content_approver: [
    { label: "Dashboard", href: "/content-approver", icon: LayoutDashboard },
    { label: "Pending Approvals", href: "/content-approver/pending-approvals", icon: Hourglass },
    { label: "Approved Courses", href: "/content-approver/approved-courses", icon: BadgeCheck },
  ],
  training_admin: [
    { label: "Dashboard", href: "/training-admin", icon: LayoutDashboard },
    { label: "Course Management", href: "/training-admin/courses", icon: BookOpenCheck },
    { label: "Enrollments", href: "/training-admin/enrollments", icon: Users },
    { label: "Publish Courses", href: "/training-admin/publish", icon: Send },
    { label: "Calendar", href: "/training-admin/calendar", icon: CalendarDays },
  ],
  trainer: [
    { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
    { label: "My Sessions", href: "/trainer/sessions", icon: Presentation },
    { label: "Create Quiz", href: "/trainer/create-quiz", icon: FileQuestion },
    { label: "Attendance", href: "/trainer/attendance", icon: ClipboardCheck },
  ],
  learner: [
    { label: "Dashboard", href: "/learner", icon: LayoutDashboard },
    { label: "Available Courses", href: "/learner/catalog", icon: Store },
    { label: "My Courses", href: "/learner/my-courses", icon: BookOpen },
    { label: "Live Sessions", href: "/learner/live-sessions", icon: Video },
    { label: "Certificates", href: "/learner/certificates", icon: Award },
    { label: "Progress", href: "/learner/progress", icon: BarChart3 },
  ],
  system_admin: [
    { label: "Dashboard", href: "/system-admin", icon: LayoutDashboard },
    { label: "Users & Roles", href: "/system-admin/users", icon: Users },
    { label: "Registration", href: "/system-admin/pending-registrations", icon: UserPlus },
    { label: "Bulk Register", href: "/system-admin/bulk-register", icon: UploadCloud },
    { label: "Pending Course Approvals", href: "/system-admin/pending-course-approvals", icon: Hourglass },
    { label: "Certificate Templates", href: "/system-admin/certificate-templates", icon: FilePlus2 },
    { label: "System Settings", href: "/system-admin/settings", icon: Settings },
    { label: "Audit Logs", href: "/system-admin/audit-logs", icon: ScrollText },
  ],
};