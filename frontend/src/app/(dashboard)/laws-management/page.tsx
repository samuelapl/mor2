'use client';

import React from 'react';
import PageShell from '@/components/shared/PageShell';
import { LawsSplitView } from '@/components/features/laws/LawsSplitView';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { usePermissions } from '@/lib/usePermissions';
import { ShieldAlert } from 'lucide-react';

export default function LawsManagementPage() {
  const { tBilingual } = useTranslation();
  const { can } = usePermissions();
  const canManage = can('laws.manage');

  if (!canManage) {
    return (
      <PageShell
        title={tBilingual('Access Restricted', 'የተከለከለ ፈቃድ')}
        description={tBilingual(
          'You need laws.manage permissions to access this management console.',
          'ይህንን የአስተዳደር ገጽ ለመጠቀም laws.manage ፈቃድ ያስፈልግዎታል።',
        )}
      >
        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-lg mx-auto">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {tBilingual('Permission Required', 'ፈቃድ ያስፈልጋል')}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {tBilingual(
              'Your account role does not have administrative rights to manage tax and customs laws.',
              'የእርስዎ አካውንት የታክስ እና የጉምሩክ ሕጎችን ለማስተዳደር የሚያስችል ፈቃድ የለውም።',
            )}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={tBilingual('Tax & Customs Laws Management', 'የታክስ እና የጉምሩክ ሕጎች አስተዳደር')}
      description={tBilingual(
        'Manage legal categories, upload decrees and regulations, attach Negarit Gazeta PDFs, and configure legal statuses.',
        'የሕግ ምድቦችን ያስተዳድሩ፣ አዋጆችንና ደንቦችን ይጫኑ፣ የነጋሪት ጋዜጣ ፒዲኤፍ ሰነዶችን ያያይዙ።',
      )}
    >
      <LawsSplitView isAdmin={true} />
    </PageShell>
  );
}

