'use client';

import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { LawsSplitView } from '@/components/features/laws/LawsSplitView';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function LawsLearnerPortalPage() {
  const { tBilingual } = useTranslation();

  return (
    <PageShell
      title={tBilingual('Tax & Customs Laws Library', 'የታክስ እና የጉምሩክ ሕጎች ቤተ-መጽሐፍት')}
      description={tBilingual(
        'Explore, search, preview, and download official Ethiopian proclamations, regulations, and tax directives.',
        'ይፋዊ የኢትዮጵያ የታክስና የጉምሩክ አዋጆች፣ ደንቦችና መመሪያዎችን ያስሱ፣ ያንብቡ እና ያውርዱ።',
      )}
    >
      <LawsSplitView isAdmin={false} />
    </PageShell>
  );
}

