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
  const { tBilingual } = useTranslation();

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
          tBilingual(
            'No certificate found matching this verification code.',
            'በዚህ የማረጋገጫ ኮድ የተገኘ ሰርተፊኬት የለም።',
          ),
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition">
          <Image
            src="/logo.jpg"
            alt="MoR Logo"
            width={36}
            height={36}
            className="rounded-full object-contain shadow-xs"
          />
          <div>
            <p className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight">
              Ministry of Revenues
            </p>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              ETIMS Academy Credential Verification
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link href="/login">
            <Button size="sm" variant="outline" className="text-xs">
              {tBilingual('Sign In', 'ግባ')}
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-12">
        <div className="text-center space-y-3 mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-900/50">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white">
            {tBilingual('Certificate Verification Portal', 'የሰርተፊኬት ማረጋገጫ መድረክ')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            {tBilingual(
              'Verify the authenticity, issuance details, and status of Ministry of Revenues ETIMS credentials.',
              'የገቢዎች ሚኒስቴር ኢቲኤምኤስ ሰርተፊኬቶችን ትክክለኛነት፣ የተሰጡበትን ዝርዝር እና ሁኔታ ያረጋግጡ።',
            )}
          </p>
        </div>

        {/* Verification Input Box */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleVerify(code);
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={tBilingual(
                  'Enter verification code (e.g. VERIF-0001)...',
                  'የማረጋገጫ ኮድ ያስገቡ (ለምሳሌ VERIF-0001)...',
                )}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono font-medium"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !code.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 font-semibold"
            >
              {loading
                ? tBilingual('Verifying...', 'በማረጋገጥ ላይ...')
                : tBilingual('Verify', 'አረጋግጥ')}
            </Button>
          </form>
        </div>

        {/* Verification Result Card */}
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-6 text-rose-800 dark:text-rose-300 space-y-3">
            <div className="flex items-center gap-3">
              <XCircle className="h-6 w-6 text-rose-600 shrink-0" />
              <div>
                <h3 className="font-bold text-base">
                  {tBilingual('Invalid or Unrecognized Credential', 'ያልተረጋገጠ ወይም የማይታወቅ ሰርተፊኬት')}
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-400 mt-0.5">{error}</p>
              </div>
            </div>
          </div>
        ) : result ? (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-md space-y-6">
            {/* Status Banner */}
            {result.status === 'ACTIVE' && result.valid ? (
              <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-emerald-900 dark:text-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-display font-extrabold text-base">
                      {tBilingual('Authentic & Verified Credential', 'ኦፊሴላዊ እና የተረጋገጠ ሰርተፊኬት')}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      {tBilingual(
                        'This certificate is officially issued and actively recognized by Ministry of Revenues.',
                        'ይህ ሰርተፊኬት በገቢዎች ሚኒስቴር በይፋ የተሰጠ እና ንቁ እውቅና ያለው ነው።',
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="green" dot>
                  {tBilingual('Verified Active', 'የተረጋገጠ ንቁ')}
                </Badge>
              </div>
            ) : result.status === 'REVOKED' ? (
              <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-rose-900 dark:text-rose-200">
                <div className="flex items-center gap-3">
                  <XCircle className="h-7 w-7 text-rose-600 dark:text-rose-400 shrink-0" />
                  <div>
                    <p className="font-display font-extrabold text-base">
                      {tBilingual('Revoked Credential', 'የተሰረዘ ሰርተፊኬት')}
                    </p>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      {tBilingual(
                        'This certificate was officially revoked and is no longer valid.',
                        'ይህ ሰርተፊኬት በይፋ የተሰረዘ ሲሆን ከአሁን በኋላ ዋጋ የለውም።',
                      )}
                    </p>
                    {result.revokedReason && (
                      <p className="text-xs font-semibold text-rose-800 dark:text-rose-200 mt-1">
                        {tBilingual('Reason:', 'ምክንያት፦')} {result.revokedReason}
                      </p>
                    )}
                  </div>
                </div>
                <Badge variant="red" dot>
                  {tBilingual('Revoked', 'ተሰርዟል')}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center justify-between flex-wrap gap-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-4 text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-7 w-7 text-amber-600 dark:text-amber-400 shrink-0" />
                  <div>
                    <p className="font-display font-extrabold text-base">
                      {tBilingual('Expired Credential', 'ጊዜው ያለፈበት ሰርተፊኬት')}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {tBilingual(
                        'This certificate was authentic but its validity period has expired.',
                        'ይህ ሰርተፊኬት ትክክለኛ የነበረ ቢሆንም የአገልግሎት ጊዜው አልፏል።',
                      )}
                    </p>
                  </div>
                </div>
                <Badge variant="amber" dot>
                  {tBilingual('Expired', 'ጊዜው ያለፈ')}
                </Badge>
              </div>
            )}

            {/* Credential Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {tBilingual('Recipient Holder', 'የሰርተፊኬቱ ባለቤት')}
                </span>
                <p className="font-display font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600 shrink-0" />
                  {result.holder}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {tBilingual('Certificate Number', 'የሰርተፊኬት ቁጥር')}
                </span>
                <p className="font-mono font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-600 shrink-0" />
                  {result.certificateNumber}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 md:col-span-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {tBilingual('Completed Training Program', 'የተጠናቀቀው የስልጠና ፕሮግራም')}
                </span>
                <p className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600 shrink-0" />
                  {result.course} {result.courseCode ? `(${result.courseCode})` : ''}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {tBilingual('Issue Date', 'የተሰጠበት ቀን')}
                </span>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  {formatDate(result.issuedAt)}
                </p>
              </div>

              <div className="space-y-1 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {tBilingual('Expiry Date', 'የሚያበቃበት ቀን')}
                </span>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  {formatDate(result.expiresAt)}
                </p>
              </div>
            </div>

            {/* PDF Download if available */}
            {result.downloadUrl && result.valid && (
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                <a href={result.downloadUrl} target="_blank" rel="noreferrer">
                  <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Download className="h-4 w-4" />
                    {tBilingual('Download Original Verified PDF', 'ኦሪጅናል የተረጋገጠውን PDF አውርድ')}
                  </Button>
                </a>
              </div>
            )}
          </div>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-400">
        <p>© 2026 Ministry of Revenues · ETIMS Academy · All Rights Reserved</p>
      </footer>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
          Loading verification portal...
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
