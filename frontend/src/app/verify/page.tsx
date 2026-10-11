'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Download,
  Calendar,
  Award,
  BookOpen,
  User,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import { verifyCertificateByCode, type VerifyCertificateResult } from '@/lib/api/certificates';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageToggle from '@/components/shared/LanguageToggle';

function formatDate(val: string | null | undefined): string {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return val;
  }
}

function VerifyContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  const { t } = useTranslation('certificates');

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyCertificateResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (codeToVerify: string) => {
    const clean = codeToVerify.trim();
    if (!clean) return;
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      const res = await verifyCertificateByCode(clean);
      setResult(res);
    } catch (err: any) {
      setError(
        err?.message ||
          t('verifyContent.noCertificateFoundMatchingThisVerificati'),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      void handleVerify(initialCode);
    }
  }, [initialCode]);

  return (
    <div className="min-h-screen bg-muted text-foreground flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition">
          <Image
            src="/logo.jpg"
            alt="MoR Logo"
            width={36}
            height={36}
            className="rounded-full object-contain shadow-xs"
          />
          <div>
            <p className="font-display font-bold text-sm tracking-tight text-foreground leading-tight">
              Ministry of Revenues
            </p>
            <p className="text-[10px] text-subtle-foreground font-semibold uppercase tracking-wider">
              ETIMS Academy Credential Verification
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link href="/login">
            <Button size="sm" variant="outline" className="text-xs">
              {t('verifyContent.signIn')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary shadow-sm border border-primary/30">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-foreground">
            {t('verifyContent.certificateVerificationPortal')}
          </h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            {t('verifyContent.verifyTheAuthenticityIssuanceDetailsAnd')}
          </p>
        </div>

        {/* Verification Input Box */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify(code);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('verifyContent.enterVerificationCodeEGVerif')}
                className="w-full rounded-xl border border-border bg-muted pl-10 pr-4 py-2.5 text-sm text-foreground placeholder-subtle-foreground focus:outline-hidden focus:ring-2 focus:ring-ring/20 font-mono font-medium"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !code.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-semibold"
            >
              {loading
                ? t('verifyContent.verifying')
                : t('certificateCard.verify')}
            </Button>
          </form>
        </div>

        {/* Verification Result Card */}
        {error ? (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-6 text-danger space-y-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-danger shrink-0" />
              <div>
                <h3 className="font-bold text-base">
                  {t('verifyContent.invalidOrUnrecognizedCredential')}
                </h3>
                <p className="text-xs text-danger mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        ) : result ? (
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-md space-y-6">
            {/* Status Banner */}
            {result.status === 'ACTIVE' && result.valid ? (
              <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-success/30 bg-success-soft p-4 text-success">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-success shrink-0" />
                  <div>
                    <p className="font-display font-extrabold text-base">
                      {t('verifyContent.authenticVerifiedCredential')}
                    </p>
                    <p className="text-xs text-success">
                      {t('verifyContent.thisCertificateIsOfficiallyIssuedAnd')}
                    </p>
                  </div>
                </div>
                <Badge variant="green" dot>
                  {t('verifyContent.verifiedActive')}
                </Badge>
              </div>
            ) : result.status === 'REVOKED' ? (
              <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-danger/30 bg-danger-soft p-4 text-danger">
                <div className="flex items-center gap-3">
                  <XCircle className="h-7 w-7 text-danger shrink-0" />
                  <div>
                    <p className="font-display font-extrabold text-base">
                      {t('verifyContent.revokedCredential')}
                    </p>
                    <p className="text-xs text-danger">
                      {t('verifyContent.thisCertificateWasOfficiallyRevokedAnd')}
                    </p>
                    {result.revokedReason && (
                      <p className="text-xs font-semibold text-danger mt-1">
                        {t('certificateCard.reason')} {result.revokedReason}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="red" dot>
                  {t('certificateCard.revoked')}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-warning/30 bg-warning-soft p-4 text-warning">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-7 w-7 text-warning shrink-0" />
                  <div>
                    <p className="font-display font-extrabold text-base">
                      {t('verifyContent.expiredCredential')}
                    </p>
                    <p className="text-xs text-warning">
                      {t('verifyContent.thisCertificateWasAuthenticButIts')}
                    </p>
                  </div>
                </div>
                <Badge variant="amber" dot>
                  {t('verifyContent.expired')}
                </Badge>
              </div>
            )}

            {/* Credential Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1 p-3.5 rounded-xl border border-border/60 bg-muted/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  {t('verifyContent.recipientHolder')}
                </span>
                <p className="font-display font-bold text-base text-foreground flex items-center gap-2">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  {result.holder}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-border/60 bg-muted/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  {t('verifyContent.certificateNumber')}
                </span>
                <p className="font-mono font-bold text-base text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-warning shrink-0" />
                  {result.certificateNumber}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-border/60 bg-muted/70 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  {t('verifyContent.completedTrainingProgram')}
                </span>
                <p className="font-bold text-sm text-foreground flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  {result.course} {result.courseCode ? `(${result.courseCode})` : ''}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-border/60 bg-muted/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  {t('verifyContent.issueDate')}
                </span>
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-subtle-foreground shrink-0" />
                  {formatDate(result.issuedAt)}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-border/60 bg-muted/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                  {t('verifyContent.expiryDate')}
                </span>
                <p className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-subtle-foreground shrink-0" />
                  {formatDate(result.expiresAt)}
                </p>
              </div>
            </div>

            {/* PDF Download if available */}
            {result.downloadUrl && result.valid && (
              <div className="flex justify-end pt-2 border-t border-border/60">
                <a href={result.downloadUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Download className="h-4 w-4" />
                    {t('verifyContent.downloadOriginalVerifiedPdf')}
                  </Button>
                </a>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-subtle-foreground">
        <p>© 2026 Ministry of Revenues · ETIMS Academy · All Rights Reserved</p>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-muted text-subtle-foreground">
          Loading verification portal...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
