'use client';

import { useEffect, useState } from 'react';
import { fetchMyCertificates } from '@/lib/api/certificates';
import type { ApiCertificate } from '@/lib/api/types';
import { tr } from '@/constants/labels';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { CertificateCard } from '@/components/features/cert/CertificateCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Skeleton';

export default function CertificatesPage() {
  const { tBilingual } = useTranslation();
  const [certificates, setCertificates] = useState<ApiCertificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyCertificates()
      .then((certs) => {
        if (!cancelled) setCertificates(certs);
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load certificates.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const learnerName = 'Learner';
  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    certificates ?? [],
    6,
  );

  return (
    <PageShell
      role="learner"
      title={tBilingual('Certificates', 'የምስክር ወረቀቶች')}
      description={tBilingual(
        'Certificates you have earned for completed courses.',
        'ላጠናቀቋቸው ኮርሶች ያገኟቸው የምስክር ወረቀቶች።',
      )}
    >
      <div className="mb-6 flex justify-end">
        <LanguageToggle />
      </div>

      {error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : certificates === null ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={3} />
        </div>
      ) : certificates.length === 0 ? (
        <EmptyState
          title={tBilingual('No certificates yet', 'እስካሁን ምንም የምስክር ወረቀት የለም')}
          description={tBilingual(
            'Finish a course to earn your certificate.',
            'የምስክር ወረቀትዎን ለማግኘት ኮርስ ያጠናቅቁ።',
          )}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pageItems.map((certificate) => (
              <CertificateCard
                key={certificate.id}
                certificate={certificate}
                learnerName={
                  certificate.user
                    ? `${certificate.user.firstName} ${certificate.user.lastName}`
                    : learnerName
                }
              />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[6, 12, 24, 48]}
          />
        </>
      )}
    </PageShell>
  );
}
