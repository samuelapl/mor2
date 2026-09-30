'use client';

import { useEffect, useState } from 'react';
import { Award, Download, Eye, Printer, ShieldCheck, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import type { ApiCertificate, ApiCertificateTemplate } from '@/lib/api/types';
import { Card, CardDescription, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { CertificateRenderer } from '@/components/features/certificates/CertificateRenderer';
import { CertificateLanguageDropdown } from '@/components/features/certificates/CertificateLanguageDropdown';
import { fetchActiveCertificateTemplate, fetchCertificateDownloadUrl } from '@/lib/api/certificates';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface CertificateCardProps {
  certificate: ApiCertificate;
  learnerName: string;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

export function CertificateCard({ certificate, learnerName }: CertificateCardProps) {
  const { tBilingual } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ApiCertificateTemplate | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>('en');
  const [downloading, setDownloading] = useState(false);
  const course = certificate.course;

  useEffect(() => {
    if (!certificate.template) {
      void fetchActiveCertificateTemplate()
        .then(setActiveTemplate)
        .catch(() => {});
    }
  }, [certificate.template]);

  const templateToUse = certificate.template || activeTemplate || undefined;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const res = await fetchCertificateDownloadUrl(certificate.id, selectedLang);
      if (res?.downloadUrl) {
        window.open(res.downloadUrl, '_blank');
      } else if (certificate.downloadUrl) {
        window.open(certificate.downloadUrl, '_blank');
      }
    } catch {
      if (certificate.downloadUrl) {
        window.open(certificate.downloadUrl, '_blank');
      }
    } finally {
      setDownloading(false);
    }
  };

  const isRevoked = certificate.status === 'REVOKED';
  const isExpired = certificate.expiresAt ? new Date(certificate.expiresAt) < new Date() : false;

  return (
    <>
      <Card interactive className="group flex h-full flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md shadow-amber-500/30 transition-transform duration-200 group-hover:scale-110">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{course.title || course.titleEn}</CardTitle>
                <CardDescription>
                  {course.code} · {formatDate(certificate.issuedAt)}
                </CardDescription>
              </div>
            </div>

            {/* Status indicator */}
            {isRevoked ? (
              <Badge variant="red" dot>
                {tBilingual('Revoked', 'ተሰርዟል')}
              </Badge>
            ) : isExpired ? (
              <Badge variant="amber" dot>
                {tBilingual('Expired', 'ጊዜው አልፏል')}
              </Badge>
            ) : (
              <Badge variant="green" dot>
                {tBilingual('Active', 'ንቁ')}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
            {certificate.certificateNumber}
          </span>
          <div className="flex gap-2">
            <a
              href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`}
              target="_blank"
              rel="noreferrer"
              title="Verify Credential Authenticity"
            >
              <Button size="sm" variant="ghost" className="gap-1 text-slate-500 hover:text-indigo-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="text-xs">{tBilingual('Verify', 'አረጋግጥ')}</span>
              </Button>
            </a>
            <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              {tBilingual('Preview', 'እይ')}
            </Button>
          </div>
        </div>
      </Card>

      <WorkspaceDetailOverlay
        open={open}
        onClose={() => setOpen(false)}
        title={tBilingual('Official Certificate of Completion', 'ኦፊሴላዊ የስልጠና ማጠናቀቂያ ሰርተፊኬት')}
        subtitle={`${course.titleEn || course.title} (${course.code}) · ${tBilingual('Verified Credential', 'የተረጋገጠ ማረጋገጫ')}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Extensible Certificate Language Selector */}
            <CertificateLanguageDropdown
              value={selectedLang}
              onChange={setSelectedLang}
            />

            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              {tBilingual('Print', 'አትም')}
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download className="h-4 w-4" />
              {downloading ? tBilingual('Preparing...', 'በማዘጋጀት ላይ...') : tBilingual('Download PDF', 'PDF አውርድ')}
            </Button>

            <a
              href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline" className="gap-1.5 text-slate-600">
                <ExternalLink className="h-4 w-4" />
                {tBilingual('Verify', 'አረጋግጥ')}
              </Button>
            </a>
          </div>
        }
      >
        <div className="w-full space-y-6 pb-12">
          {/* Status warning banner if Revoked or Expired */}
          {isRevoked && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <XCircle className="h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="font-bold text-sm">
                  {tBilingual('This certificate has been revoked by an administrator.', 'ይህ ሰርተፊኬት በአስተዳዳሪው ተሰርዟል።')}
                </p>
                {certificate.revokedReason && (
                  <p className="text-xs text-red-700 mt-0.5">
                    {tBilingual('Reason:', 'ምክንያት፦')} {certificate.revokedReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {isExpired && !isRevoked && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-sm">
                  {tBilingual('This certificate has expired.', 'የዚህ ሰርተፊኬት አገልግሎት ጊዜ አልፏል።')}
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {tBilingual('Validity ended on:', 'የማብቂያ ቀን፦')} {formatDate(certificate.expiresAt)}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/5 dark:bg-slate-950/40 p-4 shadow-inner overflow-hidden flex items-center justify-center">
            <div className="w-full max-w-4xl">
              <CertificateRenderer
                template={templateToUse}
                studentName={learnerName}
                courseTitle={course.titleEn || course.titleAm || course.title}
                courseCode={course.code}
                certificateNumber={certificate.certificateNumber}
                verificationCode={certificate.verificationCode}
                completionDate={certificate.issuedAt}
                lang={selectedLang}
                editable={false}
              />
            </div>
          </div>
        </div>
      </WorkspaceDetailOverlay>
    </>
  );
}
