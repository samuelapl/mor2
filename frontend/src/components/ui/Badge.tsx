'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { lookupIn } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n/useTranslation';

type BadgeVariant = 'slate' | 'amber' | 'blue' | 'green' | 'red' | 'outline' | 'indigo';

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  slate: 'bg-secondary/90 text-secondary-foreground ring-foreground/15',
  amber: 'bg-warning-soft text-warning ring-warning/25',
  blue: 'bg-info-soft/90 text-info ring-info/25',
  green: 'bg-success-soft/90 text-success ring-success/25',
  red: 'bg-danger-soft/90 text-danger ring-danger/25',
  indigo: 'bg-primary-soft/90 text-primary ring-primary/25',
  outline: 'bg-card text-secondary-foreground ring-subtle-foreground/30',
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
    slate: 'bg-muted-foreground',
    amber: 'bg-warning',
    blue: 'bg-info',
    green: 'bg-success',
    red: 'bg-danger',
    indigo: 'bg-primary',
    outline: 'bg-subtle-foreground',
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
