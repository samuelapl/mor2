'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Award,
  Search,
  Filter,
  Download,
  Eye,
  ShieldAlert,
  ShieldCheck,
  History,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Printer,
  RefreshCw,
  User,
  Users,
  BookOpen,
  Calendar,
} from 'lucide-react';
import PageShell from '@/components/shared/PageShell';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { CertificateRenderer } from '@/components/features/certificates/CertificateRenderer';
import { CertificateLanguageDropdown } from '@/components/features/certificates/CertificateLanguageDropdown';
import {
  fetchManageCertificates,
  fetchCertificateStats,
  type CertificateStats,
  revokeCertificate,
  reissueCertificate,
  fetchCertificateAudit,
  fetchCertificateDownloadUrl,
  downloadCertificateDirectly,
  type ApiCertificateAuditItem,
} from '@/lib/api/certificates';
import type { ApiCertificate } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/stores/auth-store';

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return val;
  }
}

function formatDateTime(val: string | null | undefined): string {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return val;
  }
}

export default function ManageCertificatesPage() {
  const { isAmharic, t } = useTranslation('certificates');
  const currentUser = useAuthStore((s) => s.currentUser);

  const [certificates, setCertificates] = useState<ApiCertificate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED' | 'EXPIRED'>('ALL');

  // Overlays & Modals
  const [previewCert, setPreviewCert] = useState<ApiCertificate | null>(null);
  const [previewLang, setPreviewLang] = useState<string>('en');
  const [downloading, setDownloading] = useState(false);

  // Revoke state
  const [revokingCert, setRevokingCert] = useState<ApiCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);

  // Reissue state
  const [reissuingCert, setReissuingCert] = useState<ApiCertificate | null>(null);
  const [reissueReason, setReissueReason] = useState('');
  const [reissueLoading, setReissueLoading] = useState(false);

  // Audit state
  const [auditCert, setAuditCert] = useState<ApiCertificate | null>(null);
  const [auditLogs, setAuditLogs] = useState<ApiCertificateAuditItem[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [stats, setStats] = useState<CertificateStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await fetchCertificateStats();
      setStats(res);
    } catch {
      // Best-effort stats loading
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchManageCertificates({
        search: debouncedSearch,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        page,
        limit: pageSize,
      });
      setCertificates(res.items || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, page, pageSize]);

  useEffect(() => {
    void loadData();
    void loadStats();
  }, [loadData, loadStats]);

  // Handle Revoke
  const handleConfirmRevoke = async () => {
    if (!revokingCert) return;
    try {
      setRevokeLoading(true);
      await revokeCertificate(revokingCert.id, revokeReason.trim() || undefined);
      toast.success(t('manageCertificatesPage.certificateRevokedSuccessfully'));
      setRevokingCert(null);
      setRevokeReason('');
      void loadData();
      void loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to revoke certificate');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Handle Reissue
  const handleConfirmReissue = async () => {
    if (!reissuingCert) return;
    try {
      setReissueLoading(true);
      await reissueCertificate(reissuingCert.id, reissueReason.trim() || undefined);
      toast.success(t('manageCertificatesPage.certificateReissuedSuccessfully'));
      setReissuingCert(null);
      setReissueReason('');
      void loadData();
      void loadStats();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reissue certificate');
    } finally {
      setReissueLoading(false);
    }
  };

  // Handle Open Audit
  const handleOpenAudit = async (cert: ApiCertificate) => {
    setAuditCert(cert);
    try {
      setAuditLoading(true);
      const logs = await fetchCertificateAudit(cert.id);
      setAuditLogs(logs || []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load certificate audit logs');
    } finally {
      setAuditLoading(false);
    }
  };

  // Handle Download PDF
  const handleDownload = async (cert: ApiCertificate, lang: string) => {
    try {
      setDownloading(true);
      const filename = `${cert.certificateNumber || 'certificate'}_${lang}.pdf`;
      await downloadCertificateDirectly(cert.id, lang, filename);
      toast.success(t('manageCertificatesPage.certificateDownloadStarted'));
    } catch (err: any) {
      toast.error(err?.message || 'Download error');
      if (cert.downloadUrl) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = cert.downloadUrl;
        a.download = `${cert.certificateNumber || 'certificate'}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) document.body.removeChild(a);
        }, 1000);
      }
    } finally {
      setDownloading(false);
    }
  };

  const userRole = currentUser?.role || 'system_admin';

  return (
    <PageShell
      role={userRole as any}
      title={t('manageCertificatesPage.manageCertificates')}
      description={t('manageCertificatesPage.authoritativeManagementOfIssuedCourseCer')}
    >
      {/* Executive Metrics & Analytics Dashboard Report */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Issued */}
        <div
          onClick={() => {
            setStatusFilter('ALL');
            setPage(1);
          }}
          className={cn(
            'cursor-pointer group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01]',
            statusFilter === 'ALL'
              ? 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/25 ring-1 ring-indigo-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('manageCertificatesPage.totalIssued')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? '...' : (stats?.totalIssued ?? total)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('manageCertificatesPage.certificates')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('manageCertificatesPage.acrossAllPublishedCourses')}
          </p>
        </div>

        {/* Active & Valid */}
        <div
          onClick={() => {
            setStatusFilter('ACTIVE');
            setPage(1);
          }}
          className={cn(
            'cursor-pointer group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01]',
            statusFilter === 'ACTIVE'
              ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/25 ring-1 ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('manageCertificatesPage.activeValid')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? '...' : (stats?.activeCount ?? 0)}
            </span>
            <Badge variant="green" className="text-[10px] py-0 px-1.5">
              {stats?.totalIssued
                ? `${Math.round(((stats.activeCount || 0) / stats.totalIssued) * 100)}%`
                : '100%'}
            </Badge>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('manageCertificatesPage.fullyVerifiedCompliant')}
          </p>
        </div>

        {/* Certificate Downloads */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('manageCertificatesPage.totalDownloads')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? '...' : (stats?.totalDownloads ?? 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('manageCertificatesPage.downloads')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('manageCertificatesPage.pdfExportAuditEvents')}
          </p>
        </div>

        {/* Certified Learners */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('manageCertificatesPage.certifiedLearners')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading ? '...' : (stats?.uniqueLearners ?? 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              {t('manageCertificatesPage.graduates')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t('manageCertificatesPage.distinctGraduatedUsers')}
          </p>
        </div>

        {/* Revoked / Expired */}
        <div
          onClick={() => {
            setStatusFilter('REVOKED');
            setPage(1);
          }}
          className={cn(
            'cursor-pointer group relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:shadow-md hover:scale-[1.01]',
            statusFilter === 'REVOKED' || statusFilter === 'EXPIRED'
              ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/25 ring-1 ring-rose-500/20'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('manageCertificatesPage.revokedExpired')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {statsLoading
                ? '...'
                : (stats?.revokedCount ?? 0) + (stats?.expiredCount ?? 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              {stats?.revokedCount ?? 0} {t('manageCertificatesPage.revoked')}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-rose-600 dark:text-rose-400">
            {stats?.expiredCount ?? 0} {t('manageCertificatesPage.expiredCertificates')}
          </p>
        </div>
      </div>

      {/* Top Bar: Search, Status Tabs & Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('manageCertificatesPage.searchCertificateVerificationCodeStudent')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                void loadData();
                void loadStats();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', (loading || statsLoading) && 'animate-spin')} />
              <span>{t('manageCertificatesPage.refresh')}</span>
            </button>
            <LanguageToggle />
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
          {[
            { key: 'ALL', label: t('manageCertificatesPage.allIssued') },
            { key: 'ACTIVE', label: t('certificateCard.active') },
            { key: 'EXPIRED', label: t('manageCertificatesPage.expired') },
            { key: 'REVOKED', label: t('manageCertificatesPage.revoked2') },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setStatusFilter(tab.key as any);
                setPage(1);
              }}
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
      </div>

      {/* Main Table Content */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">
                  {t('manageCertificatesPage.certificate')}
                </th>
                <th className="px-5 py-3.5">
                  {t('manageCertificatesPage.learner')}
                </th>
                <th className="px-5 py-3.5">
                  {t('manageCertificatesPage.course')}
                </th>
                <th className="px-5 py-3.5">
                  {t('manageCertificatesPage.issuedExpires')}
                </th>
                <th className="px-5 py-3.5">
                  {t('manageCertificatesPage.status')}
                </th>
                <th className="px-5 py-3.5 text-right">
                  {t('manageCertificatesPage.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    <span>{t('manageCertificatesPage.loadingCertificates')}</span>
                  </td>
                </tr>
              ) : certificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Award className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">
                      {t('manageCertificatesPage.noCertificatesFound')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('manageCertificatesPage.certificatesAreAutomaticallyGeneratedWhe')}
                    </p>
                  </td>
                </tr>
              ) : (
                certificates.map((cert) => {
                  const isRevoked = cert.status === 'REVOKED';
                  const isExpired = cert.expiresAt ? new Date(cert.expiresAt) < new Date() : false;

                  return (
                    <tr
                      key={cert.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Certificate # and code */}
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">
                          {cert.certificateNumber}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                          <span>Code: {cert.verificationCode}</span>
                        </div>
                      </td>

                      {/* Learner */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-bold shrink-0">
                            {cert.user?.firstName?.[0] || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {cert.user?.firstName} {cert.user?.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400">{cert.user?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Course */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-100 line-clamp-1 max-w-xs">
                          {cert.course?.title || cert.course?.titleEn}
                        </div>
                        <div className="text-xs text-slate-400 font-mono">
                          {cert.course?.code}
                        </div>
                      </td>

                      {/* Dates */}
                      <td className="px-5 py-4 text-xs">
                        <div>
                          <span className="text-slate-400">{t('manageCertificatesPage.issued')} </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-200">
                            {formatDate(cert.issuedAt)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          <span>{t('manageCertificatesPage.expires')} </span>
                          <span>{formatDate(cert.expiresAt)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {isRevoked ? (
                          <Badge variant="red" dot>
                            {t('certificateCard.revoked')}
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="amber" dot>
                            {t('certificateCard.expired')}
                          </Badge>
                        ) : (
                          <Badge variant="green" dot>
                            {t('certificateCard.active')}
                          </Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Preview Action */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPreviewCert(cert);
                              setPreviewLang('en');
                            }}
                            title={t('manageCertificatesPage.previewCertificate')}
                            className="h-8 px-2.5 gap-1 text-slate-700 dark:text-slate-300"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t('manageCertificatesPage.preview')}</span>
                          </Button>

                          {/* Direct Download Action */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(cert, 'en')}
                            disabled={downloading}
                            title={t('certificateCard.downloadCertificatePdf')}
                            className="h-8 px-2.5 gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">{t('certificateCard.download')}</span>
                          </Button>

                          {/* Quick Verify */}
                          <a
                            href={`/verify?code=${encodeURIComponent(cert.verificationCode)}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Verify Public Credential"
                          >
                            <Button size="sm" variant="ghost" className="h-8 px-2 text-slate-500 hover:text-indigo-600">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </Button>
                          </a>

                          {/* Audit History */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenAudit(cert)}
                            title="Audit History"
                            className="h-8 px-2 text-slate-500 hover:text-slate-700"
                          >
                            <History className="h-3.5 w-3.5" />
                          </Button>

                          {/* Revoke or Reissue action */}
                          {isRevoked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setReissuingCert(cert);
                                setReissueReason('');
                              }}
                              title="Reissue / Restore Certificate"
                              className="h-8 px-2.5 gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span className="hidden md:inline">{t('manageCertificatesPage.reissue')}</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRevokingCert(cert);
                                setRevokeReason('');
                              }}
                              title="Revoke Certificate"
                              className="h-8 px-2 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            >
                              <ShieldAlert className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="border-t border-slate-200 dark:border-slate-800 p-4">
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={total}
            pageSize={pageSize}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. Preview Overlay with Extensible Language Dropdown & Print/Download */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {previewCert && (
        <WorkspaceDetailOverlay
          open={Boolean(previewCert)}
          onClose={() => setPreviewCert(null)}
          title={t('manageCertificatesPage.certificatePreview')}
          subtitle={`${previewCert.certificateNumber} · ${previewCert.user?.firstName || ''} ${previewCert.user?.lastName || ''} · ${previewCert.course?.title || previewCert.course?.titleEn || 'Course'}`}
          fullViewport={true}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {/* Extensible Language Dropdown */}
              <CertificateLanguageDropdown
                value={previewLang}
                onChange={setPreviewLang}
              />

              {/* Theme Toggle */}
              <ThemeToggle />

              <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
                <Printer className="h-4 w-4" />
                {t('certificateCard.print')}
              </Button>

              <Button
                size="sm"
                onClick={() => handleDownload(previewCert, previewLang)}
                disabled={downloading}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                <Download className="h-4 w-4" />
                {downloading
                  ? t('certificateCard.preparing')
                  : t('certificateCard.downloadPdf')}
              </Button>

              <a
                href={`/verify?code=${encodeURIComponent(previewCert.verificationCode)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Button size="sm" variant="outline" className="gap-1.5 text-slate-600 dark:text-slate-300">
                  <ExternalLink className="h-4 w-4" />
                  {t('manageCertificatesPage.verifyLink')}
                </Button>
              </a>
            </div>
          }
        >
          <div className="w-full space-y-6 pb-12">
            {/* Status alerts */}
            {previewCert.status === 'REVOKED' && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                <div>
                  <p className="font-bold text-sm">
                    {t('manageCertificatesPage.thisCertificateIsRevoked')}
                  </p>
                  {previewCert.revokedReason && (
                    <p className="text-xs text-red-700 mt-0.5">
                      {t('manageCertificatesPage.revocationReason')} {previewCert.revokedReason}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950/40 p-4 shadow-inner overflow-hidden flex items-center justify-center">
              <div className="w-full max-w-4xl">
                <CertificateRenderer
                  template={previewCert.template}
                  studentName={`${previewCert.user?.firstName || ''} ${previewCert.user?.lastName || ''}`.trim() || 'Learner'}
                  courseTitle={previewCert.course?.title || previewCert.course?.titleEn || 'Course'}
                  courseCode={previewCert.course?.code}
                  certificateNumber={previewCert.certificateNumber}
                  verificationCode={previewCert.verificationCode}
                  completionDate={previewCert.issuedAt}
                  lang={previewLang}
                  courseHours={previewCert.course?.estimatedHours ?? 30}
                  editable={false}
                />
              </div>
            </div>
          </div>
        </WorkspaceDetailOverlay>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. Revoke Modal                                                     */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(revokingCert)}
        onClose={() => setRevokingCert(null)}
        title={t('manageCertificatesPage.revokeCertificate')}
        subtitle={t('manageCertificatesPage.revokingWillInvalidateThisCertificateAnd')}
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-800">
            <span className="font-bold">{t('manageCertificatesPage.target')} </span>
            {revokingCert?.certificateNumber} ({revokingCert?.user?.firstName} {revokingCert?.user?.lastName})
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('manageCertificatesPage.revocationReasonRequiredForAuditLog')}
            </label>
            <textarea
              rows={3}
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              placeholder={t('manageCertificatesPage.enterJustificationForRevokingThisCertifi')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRevokingCert(null)}>
              {t('manageCertificatesPage.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRevoke}
              disabled={revokeLoading}
              className="gap-1.5"
            >
              <ShieldAlert className="h-4 w-4" />
              {revokeLoading
                ? t('manageCertificatesPage.revoking')
                : t('manageCertificatesPage.confirmRevocation')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. Reissue Modal                                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(reissuingCert)}
        onClose={() => setReissuingCert(null)}
        title={t('manageCertificatesPage.reissueCertificate')}
        subtitle={t('manageCertificatesPage.reissuingRestoresAnActiveStatusGenerates')}
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-xs text-emerald-800">
            <span className="font-bold">{t('manageCertificatesPage.target2')} </span>
            {reissuingCert?.certificateNumber} ({reissuingCert?.user?.firstName} {reissuingCert?.user?.lastName})
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('manageCertificatesPage.reissueNoteReason')}
            </label>
            <textarea
              rows={3}
              value={reissueReason}
              onChange={(e) => setReissueReason(e.target.value)}
              placeholder={t('manageCertificatesPage.enterNoteExplainingTheReissueE')}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setReissuingCert(null)}>
              {t('manageCertificatesPage.cancel')}
            </Button>
            <Button
              onClick={handleConfirmReissue}
              disabled={reissueLoading}
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <RotateCcw className="h-4 w-4" />
              {reissueLoading
                ? t('manageCertificatesPage.reissuing')
                : t('manageCertificatesPage.confirmReissue')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. Audit Trail Modal                                                */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <Modal
        open={Boolean(auditCert)}
        onClose={() => setAuditCert(null)}
        title={t('manageCertificatesPage.certificateAuditHistory')}
        subtitle={`${auditCert?.certificateNumber} · ${auditCert?.course?.code}`}
      >
        <div className="space-y-4 pt-2">
          {auditLoading ? (
            <div className="py-8 text-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-500" />
              <span>{t('manageCertificatesPage.loadingAuditLogs')}</span>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400">
              <History className="h-6 w-6 mx-auto mb-2 opacity-40" />
              <p>{t('manageCertificatesPage.noAuditLogsRecordedForThis')}</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 rounded-full bg-indigo-500" />
                      {log.action}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-slate-500">
                    <User className="h-3 w-3" />
                    <span>
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})`
                        : log.userId || 'System'}
                    </span>
                  </div>

                  {log.newValues && (
                    <div className="mt-1 rounded bg-white dark:bg-slate-900 p-2 font-mono text-[10px] text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                      {JSON.stringify(log.newValues, null, 2)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="ghost" onClick={() => setAuditCert(null)}>
              {t('manageCertificatesPage.close')}
            </Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
}
