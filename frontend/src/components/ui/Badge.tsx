import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "slate" | "amber" | "blue" | "green" | "red" | "outline" | "indigo";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  slate: "bg-slate-100/90 text-slate-700 ring-slate-600/15",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/25",
  blue: "bg-blue-50/90 text-blue-700 ring-blue-600/25",
  green: "bg-emerald-50/90 text-emerald-700 ring-emerald-600/25",
  red: "bg-red-50/90 text-red-700 ring-red-600/25",
  indigo: "bg-indigo-50/90 text-indigo-700 ring-indigo-600/25",
  outline: "bg-white text-slate-600 ring-slate-400/30",
};

export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "under_review":
    case "pending":
      return "blue";
    case "approved":
    case "published":
    case "active":
    case "completed":
      return "green";
    case "draft":
    case "not_published":
      return "amber";
    case "rejected":
    case "suspended":
      return "red";
    case "archived":
      return "slate";
    default:
      return "slate";
  }
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({ variant = "slate", dot = false, className, children, ...props }: BadgeProps) {
  const dotClass: Record<BadgeVariant, string> = {
    slate: "bg-slate-500",
    amber: "bg-amber-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
    indigo: "bg-indigo-500",
    outline: "bg-slate-400",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-sm ring-1 ring-inset",
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", dotClass[variant])} /> : null}
      {children}
    </span>
  );
}

export function CourseStatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    draft: "Draft",
    under_review: "Pending Approval",
    approved: "Approved",
    published: "Published",
    not_published: "Not Published",
    completed: "Completed",
    rejected: "Rejected",
    archived: "Archived",
    pending: "Pending",
    active: "Active",
    suspended: "Suspended",
  };
  return <Badge variant={statusBadgeVariant(status)} dot>{labels[status] ?? status}</Badge>;
}

export function UserStatusBadge({ status }: { status: string }) {
  return <CourseStatusBadge status={status} />;
}