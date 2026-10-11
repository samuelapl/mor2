'use client';

import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ROLE_LABELS } from '@/constants/roles';
import { roleFromApi } from '@/lib/api/transform';
import type { ApiUser } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

type BadgeVariant = Parameters<typeof Badge>[0]['variant'];

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">{label}</span>
      <span className="text-sm text-secondary-foreground">{value}</span>
    </div>
  );
}

interface DetailsTabProps {
  profile: ApiUser | null;
  loading: boolean;
}

export default function DetailsTab({ profile, loading }: DetailsTabProps) {
  const { tRole, t } = useTranslation('common');

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-12 text-subtle-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const statusOf = (user: ApiUser): { label: string; variant: BadgeVariant } => {
    if (user.registrationStatus === 'PENDING') {
      return { label: t('userStatusBadge.emailNotVerified'), variant: 'amber' };
    }
    if (user.registrationStatus === 'REJECTED') {
      return { label: t('status.rejected'), variant: 'red' };
    }
    return user.isActive
      ? { label: t('active'), variant: 'green' }
      : { label: t('status.suspended'), variant: 'red' };
  };

  const status = statusOf(profile);

  return (
    <div className="divide-y divide-border/60">
      <Row label={t('email')} value={profile.email} />
      <Row
        label={t('publicFooter.roles')}
        value={
          <div className="flex flex-wrap justify-end gap-1.5">
            {profile.roles.map((r) => {
              const roleKey = roleFromApi(r.role);
              return (
                <Badge key={r.id} variant="indigo">
                  {tRole(roleKey) || ROLE_LABELS[roleKey]}
                </Badge>
              );
            })}
          </div>
        }
      />
      <Row
        label={t('detailsTab.status')}
        value={
          <Badge variant={status.variant} dot>
            {status.label}
          </Badge>
        }
      />
      <Row
        label={t('detailsTab.memberSince')}
        value={new Date(profile.createdAt).toLocaleDateString()}
      />
      <Row
        label={t('detailsTab.lastLogin')}
        value={
          profile.lastLogin
            ? new Date(profile.lastLogin).toLocaleString()
            : t('detailsTab.never')
        }
      />
    </div>
  );
}
