'use client';

import { CertificateTemplatesAdmin } from '@/components/features/certificates/CertificateTemplatesAdmin';
import PageShell from '@/components/shared/PageShell';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function CertificateTemplatesPage() {
  const { currentUser } = useLms();
  const { tBilingual } = useTranslation();

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      title={tBilingual('Certificate Templates', 'የሰርተፍኬት ቴምፕሌቶች')}
      description={tBilingual(
        'Manage the layouts and brand assets used to issue official completion certificates.',
        'ይፋዊ የኮርስ ማጠናቀቂያ ሰርተፍኬቶችን ለማውጣት የሚያገለግሉ ቅርጾችን እና አርማዎችን ያስተዳድሩ።',
      )}
    >
      <CertificateTemplatesAdmin />
    </PageShell>
  );
}
