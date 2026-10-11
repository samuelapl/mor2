'use client';

import { CertificateTemplatesAdmin } from '@/components/features/certificates/CertificateTemplatesAdmin';
import PageShell from '@/components/shared/PageShell';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CertificateTemplatesPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { t } = useTranslation('certificates');

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      title={t('certificateTemplatesPage.certificateTemplates')}
      description={t('certificateTemplatesPage.manageTheLayoutsAndBrandAssets')}
    >
      <CertificateTemplatesAdmin />
    </PageShell>
  );
}
