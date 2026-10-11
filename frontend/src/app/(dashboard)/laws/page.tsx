'use client';

import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { LawsSplitView } from '@/components/features/laws/LawsSplitView';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LawsLearnerPortalPage() {
  const { t } = useTranslation('laws');

  return (
    <PageShell
      title={t('lawsLearnerPortalPage.taxCustomsLawsLibrary')}
      description={t('lawsLearnerPortalPage.exploreSearchPreviewAndDownloadOfficial')}
    >
      <LawsSplitView isAdmin={false} />
    </PageShell>
  );
}

