'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { lookupIn } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';

type BadgeVariant = 'slate' | 'amber' | 'blue' | 'green' | 'red' | 'outline' | 'indigo';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  slate: 'bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-300 ring-slate-600/15 dark:ring-slate-400/20',
  amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 ring-amber-600/25 dark:ring-amber-500/30',
  blue: 'bg-blue-50/90 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-blue-600/25 dark:ring-blue-500/30',
  green: 'bg-emerald-50/90 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 ring-emerald-600/25 dark:ring-emerald-500/30',
  red: 'bg-red-50/90 dark:bg-red-900/30 text-red-700 dark:text-red-400 ring-red-600/25 dark:ring-red-500/30',
  indigo: 'bg-indigo-50/90 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 ring-indigo-600/25 dark:ring-indigo-500/30',
  outline: 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 ring-slate-400/30 dark:ring-slate-600/50',
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

export function courseLevelVariant(level: string): BadgeVariant {
  return LEVEL_VARIANT[level] ?? 'slate';
}

/** Course level label (locales common.courseLevel.*). English unless `isAmharic` is passed. */
export function courseLevelLabel(level: string, isAmharic?: boolean): string {
  const key = `common.courseLevel.${(level || '').toLowerCase()}`;
  return (isAmharic && lookupIn('am', key)) || lookupIn('en', key) || level;
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

export function CourseStatusBadge({ status }: { status: string }) {
  const { lang } = useTranslation();
  const norm = (status || '').toLowerCase();
  const key = `common.status.${norm}`;
  const label = lookupIn(lang, key) ?? lookupIn('en', key) ?? status;

  return (
    <Badge variant={statusBadgeVariant(norm)} dot>
      {label}
    </Badge>
  );
}

export function UserStatusBadge({ status }: { status: string }) {
  const { isAmharic, t } = useTranslation('common');
  // A pending user is a self-registration that has not verified its email yet.
  if (status.toLowerCase() === 'pending') {
    return (
      <Badge variant="amber" dot>
        {t('userStatusBadge.emailNotVerified')}
      </Badge>
    );
  }
  return <CourseStatusBadge status={status} />;
}
