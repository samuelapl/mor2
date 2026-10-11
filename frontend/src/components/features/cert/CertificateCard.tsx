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
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import {
  fetchActiveCertificateTemplate,
  fetchCertificateDownloadUrl,
  downloadCertificateDirectly,
} from '@/lib/api/certificates';
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
  const { lang, isAmharic, t } = useTranslation('certificates');
  const [open, setOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<ApiCertificateTemplate | null>(null);
  const [selectedLang, setSelectedLang] = useState<string>(lang || 'en');
  const [downloading, setDownloading] = useState(false);
  const course = certificate.course;

  useEffect(() => {
    if (lang) {
      setSelectedLang(lang);
    }
  }, [lang]);

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
      const filename = `${certificate.certificateNumber || 'certificate'}_${selectedLang}.pdf`;
      await downloadCertificateDirectly(certificate.id, selectedLang, filename);
    } catch (err) {
      console.error('Failed to download certificate directly:', err);
      if (certificate.downloadUrl) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = certificate.downloadUrl;
        a.download = `${certificate.certificateNumber || 'certificate'}.pdf`;
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
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            {certificate.certificateNumber}
          </span>
          <div className="flex items-center gap-1.5">
            <a
              href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`}
              target="_blank"
              rel="noreferrer"
              title={t('certificateCard.verifyCredentialAuthenticity')}
            >
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-subtle-foreground hover:text-primary">
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </a>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
              className="gap-1.5 h-8 px-2.5 text-secondary-foreground"
              title={t('certificateCard.viewCertificate')}
            >
              <Eye className="h-3.5 w-3.5" />
              <span>{t('certificateCard.view')}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownload}
              disabled={downloading}
              className="gap-1.5 h-8 px-2.5 text-primary border-primary/30 hover:bg-primary-soft"
              title={t('certificateCard.downloadCertificatePdf')}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloading ? t('certificateCard.text') : t('certificateCard.download')}</span>
            </Button>
          </div>
        </div>
      </Card>

      <WorkspaceDetailOverlay
        open={open}
        onClose={() => setOpen(false)}
        title={t('certificateCard.officialCertificateOfCompletion')}
        subtitle={`${course.titleEn || course.titleAm || course.title} (${course.code}) · ${t('certificateCard.verifiedCredential')}`}
        fullViewport={true}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Extensible Certificate Language Selector */}
            <CertificateLanguageDropdown
              value={selectedLang}
              onChange={setSelectedLang}
            />

            {/* Theme Toggle */}
            <ThemeToggle />

            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer className="h-4 w-4" />
              {t('certificateCard.print')}
            </Button>

            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Download className="h-4 w-4" />
              {downloading ? t('certificateCard.preparing') : t('certificateCard.downloadPdf')}
            </Button>

            <a
              href={`/verify?code=${encodeURIComponent(certificate.verificationCode)}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline" className="gap-1.5 text-secondary-foreground">
                <ExternalLink className="h-4 w-4" />
                {t('certificateCard.verify')}
              </Button>
            </a>
          </div>
        }
      >
        <div className="w-full space-y-6 pb-12">
          {/* Status warning banner if Revoked or Expired */}
          {isRevoked && (
            <div className="flex items-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">
              <XCircle className="h-5 w-5 shrink-0 text-danger" />
              <div>
                <p className="font-bold text-sm">
                  {t('certificateCard.thisCertificateHasBeenRevokedBy')}
                </p>
                {certificate.revokedReason && (
                  <p className="text-xs text-danger mt-0.5">
                    {t('certificateCard.reason')} {certificate.revokedReason}
                  </p>
                )}
              </div>
            </div>
          )}

          {isExpired && !isRevoked && (
            <div className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-warning">
              <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
              <div>
                <p className="font-bold text-sm">
                  {t('certificateCard.thisCertificateHasExpired')}
                </p>
                <p className="text-xs text-warning mt-0.5">
                  {t('certificateCard.validityEndedOn')} {formatDate(certificate.expiresAt)}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-muted p-4 shadow-inner overflow-hidden flex items-center justify-center">
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
                courseHours={certificate.course?.estimatedHours ?? 30}
                editable={false}
              />
            </div>
          </div>
        </div>
      </WorkspaceDetailOverlay>
    </>
  );
}

export default CertificateCard;
