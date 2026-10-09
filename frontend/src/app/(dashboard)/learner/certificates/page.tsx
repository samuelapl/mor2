'use client';

import { useEffect, useState, useMemo } from 'react';
import { fetchMyCertificates } from '@/lib/api/certificates';
import type { ApiCertificate } from '@/lib/api/types';
import { usePagination } from '@/lib/usePagination';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PageShell from '@/components/shared/PageShell';
import { CertificateCard } from '@/components/features/cert/CertificateCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { Search, Filter, Award, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLms } from '@/lib/lms-store';

export default function CertificatesPage() {
  const { tBilingual } = useTranslation();
  const { currentUser } = useLms();
  const [certificates, setCertificates] = useState<ApiCertificate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'REVOKED'>('ALL');

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMyCertificates();
      setCertificates(data);
    } catch {
      setError(tBilingual('Unable to load certificates.', 'ሰርተፊኬቶችን መጫን አልተቻለም።'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCertificates();
  }, []);

  const filteredCertificates = useMemo(() => {
    if (!certificates) return [];
    return certificates.filter((cert) => {
      // 1. Text search match
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const numMatch = cert.certificateNumber?.toLowerCase().includes(q);
        const codeMatch = cert.course?.code?.toLowerCase().includes(q);
        const titleMatch = (cert.course?.title || cert.course?.titleEn || '')
          .toLowerCase()
          .includes(q);
        const verifMatch = cert.verificationCode?.toLowerCase().includes(q);
        if (!numMatch && !codeMatch && !titleMatch && !verifMatch) {
          return false;
        }
      }

      // 2. Status filter
      const isRevoked = cert.status === 'REVOKED';
      const isExpired = cert.expiresAt ? new Date(cert.expiresAt) < new Date() : false;

      if (statusFilter === 'ACTIVE') {
        return !isRevoked && !isExpired;
      }
      if (statusFilter === 'EXPIRED') {
        return !isRevoked && isExpired;
      }
      if (statusFilter === 'REVOKED') {
        return isRevoked;
      }
      return true;
    });
  }, [certificates, search, statusFilter]);

  const { page, totalPages, setPage, pageItems, pageSize, setPageSize, totalItems } = usePagination(
    filteredCertificates,
    6,
  );

  const learnerDisplayName =
    currentUser?.firstName && currentUser?.lastName
      ? `${currentUser.firstName} ${currentUser.lastName}`
      : 'Learner';

  return (
    <PageShell
      role="learner"
      title={tBilingual('My Certificates', 'የእኔ ሰርተፊኬቶች')}
      description={tBilingual(
        'View, download, and verify verified certificates you earned upon completing courses.',
        'ኮርሶችን በማጠናቀቅ ያገኟቸውን የተረጋገጡ ሰርተፊኬቶች ይመልከቱ፣ ያውርዱ እና ያረጋግጡ።',
      )}
    >
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tBilingual(
              'Search by course title, code, or certificate #...',
              'በኮርስ ስም፣ ኮድ ወይም የሰርተፊኬት ቁጥር ፈልግ...',
            )}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadCertificates}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            title="Refresh list"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">{tBilingual('Refresh', 'አድስ')}</span>
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        {[
          { key: 'ALL', label: tBilingual('All Certificates', 'ሁሉም ሰርተፊኬቶች') },
          { key: 'ACTIVE', label: tBilingual('Active', 'ንቁ') },
          { key: 'EXPIRED', label: tBilingual('Expired', 'ጊዜያቸው ያለፈ') },
          { key: 'REVOKED', label: tBilingual('Revoked', 'የተሰረዙ') },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setStatusFilter(tab.key as any)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition',
              statusFilter === tab.key
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : loading && !certificates ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton count={3} />
        </div>
      ) : filteredCertificates.length === 0 ? (
        <EmptyState
          title={
            search || statusFilter !== 'ALL'
              ? tBilingual('No matching certificates', 'ምንም የሚዛመድ ሰርተፊኬት አልተገኘም')
              : tBilingual('No certificates yet', 'እስካሁን ምንም የምስክር ወረቀት የለም')
          }
          description={
            search || statusFilter !== 'ALL'
              ? tBilingual(
                  'Try adjusting your search terms or filter criteria.',
                  'የፍለጋ ቃላትን ወይም ማጣሪያዎችን አስተካክለው ይሞክሩ።',
                )
              : tBilingual(
                  'Finish all course modules and pass the final evaluation to automatically earn your verified certificate.',
                  'ሁሉንም የኮርስ ክፍሎች በማጠናቀቅ እና የመጨረሻውን ፈተና በማለፍ የተረጋገጠ ሰርተፊኬትዎን በራስ-ሰር ያግኙ።',
                )
          }
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
                    : learnerDisplayName
                }
              />
            ))}
          </div>

          <div className="mt-8">
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[6, 12, 24, 48]}
            />
          </div>
        </>
      )}
    </PageShell>
  );
}
