'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';

type BadgeVariant = 'slate' | 'amber' | 'blue' | 'green' | 'red' | 'outline' | 'indigo';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  slate: 'bg-slate-100/90 text-slate-700 ring-slate-600/15',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/25',
  blue: 'bg-blue-50/90 text-blue-700 ring-blue-600/25',
  green: 'bg-emerald-50/90 text-emerald-700 ring-emerald-600/25',
  red: 'bg-red-50/90 text-red-700 ring-red-600/25',
  indigo: 'bg-indigo-50/90 text-indigo-700 ring-indigo-600/25',
  outline: 'bg-white text-slate-600 ring-slate-400/30',
};

export function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case 'under_review':
    case 'pending':
    case 'pending_approval':
      return 'blue';
    case 'approved':
    case 'published':
    case 'active':
    case 'completed':
      return 'green';
    case 'draft':
    case 'not_published':
      return 'amber';
    case 'rejected':
    case 'suspended':
      return 'red';
    case 'archived':
      return 'slate';
    default:
      return 'slate';
  }
}

const LEVEL_VARIANT: Record<string, BadgeVariant> = {
  basic: 'slate',
  intermediate: 'amber',
  advanced: 'indigo',
};

const LEVEL_LABEL_EN: Record<string, string> = {
  basic: 'Basic',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

const LEVEL_LABEL_AM: Record<string, string> = {
  basic: 'መሰረታዊ',
  intermediate: 'መካከለኛ',
  advanced: 'ከፍተኛ',
};

export function courseLevelVariant(level: string): BadgeVariant {
  return LEVEL_VARIANT[level] ?? 'slate';
}

export function courseLevelLabel(level: string, isAmharic?: boolean): string {
  const norm = (level || '').toLowerCase();
  if (isAmharic) {
    return LEVEL_LABEL_AM[norm] ?? LEVEL_LABEL_EN[norm] ?? level;
  }
  return LEVEL_LABEL_EN[norm] ?? level;
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  variant = 'slate',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  const dotClass: Record<BadgeVariant, string> = {
    slate: 'bg-slate-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
    outline: 'bg-slate-400',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium shadow-sm ring-1 ring-inset',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    >
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dotClass[variant])} /> : null}
      {children}
    </span>
  );
}

const STATUS_LABELS_EN: Record<string, string> = {
  draft: 'Draft',
  under_review: 'Pending Approval',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  published: 'Published',
  not_published: 'Not Published',
  completed: 'Completed',
  rejected: 'Rejected',
  archived: 'Archived',
  pending: 'Pending',
  active: 'Active',
  suspended: 'Suspended',
};

const STATUS_LABELS_AM: Record<string, string> = {
  draft: 'ረቂቅ',
  under_review: 'ማጽደቅ የሚጠብቅ',
  pending_approval: 'ማጽደቅ የሚጠብቅ',
  approved: 'የጸደቀ',
  published: 'የታተመ',
  not_published: 'ያልታተመ',
  completed: 'የተጠናቀቀ',
  rejected: 'ውድቅ የተደረገ',
  archived: 'የተቀመጠ',
  pending: 'በመጠባበቅ ላይ',
  active: 'ንቁ',
  suspended: 'የታገደ',
};

export function CourseStatusBadge({ status }: { status: string }) {
  const { isAmharic } = useTranslation();
  const norm = (status || '').toLowerCase();
  const label = isAmharic
    ? (STATUS_LABELS_AM[norm] ?? STATUS_LABELS_EN[norm] ?? status)
    : (STATUS_LABELS_EN[norm] ?? status);

  return (
    <Badge variant={statusBadgeVariant(norm)} dot>
      {label}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: string }) {
  return <CourseStatusBadge status={status} />;
}
