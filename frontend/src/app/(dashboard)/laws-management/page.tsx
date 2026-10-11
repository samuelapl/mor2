'use client';

import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { LawsSplitView } from '@/components/features/laws/LawsSplitView';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';
import { ShieldAlert } from 'lucide-react';

export default function LawsManagementPage() {
  const { t } = useTranslation('laws');
  const { can } = usePermissions();
  const canManage = can('laws.manage');

  if (!canManage) {
    return (
      <PageShell
        title={t('lawsManagementPage.accessRestricted')}
        description={t('lawsManagementPage.youNeedLawsManagePermissionsTo')}
      >
        <div className="p-12 text-center bg-card rounded-2xl border border-border max-w-lg mx-auto">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {t('lawsManagementPage.permissionRequired')}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t('lawsManagementPage.yourAccountRoleDoesNotHave')}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t('lawsManagementPage.taxCustomsLawsManagement')}
      description={t('lawsManagementPage.manageLegalCategoriesUploadDecreesAnd')}
    >
      <LawsSplitView isAdmin={true} />
    </PageShell>
  );
}

