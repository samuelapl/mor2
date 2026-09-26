'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Loader2, Mail, Send } from 'lucide-react';
import { forgotPassword } from '@/lib/api/auth';
import { isValidEmail } from '@/constants/auth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-2xs outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-500';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { tBilingual } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(tBilingual('Enter a valid email address.', 'ትክክለኛ የኢሜይል አድራሻ ያስገቡ።'));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Pass email via query param so the next page knows where the code was sent
      router.push(`/verify-code?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tBilingual('Could not send the code. Try again.', 'ኮዱን መላክ አልተቻለም። እንደገና ይሞክሩ።'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12 transition-colors duration-200 dark:bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70 dark:opacity-20" />
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle size="sm" />
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 transition-colors duration-200 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {tBilingual('Forgot your password?', 'የይለፍ ቃልዎን ረሱት?')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {tBilingual(
                "Enter your account's email and we'll send a 6-digit verification code.",
                'የመለያዎን ኢሜይል ያስገቡ እና ባለ 6-አሃዝ የማረጋገጫ ኮድ እንልክልዎታለን።',
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-300">
                {tBilingual('Email address', 'የኢሜይል አድራሻ')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@domain.gov.et"
                  className={inputClass}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{tBilingual('Sending code…', 'ኮድ በመላክ ላይ…')}</span>
                </>
              ) : (
                <>
                  <span>{tBilingual('Send reset code', 'የዳግም ማስጀመሪያ ኮድ ላክ')}</span>
                  <Send className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {tBilingual('Back to sign in', 'ወደ መግቢያ ገጽ ተመለስ')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
