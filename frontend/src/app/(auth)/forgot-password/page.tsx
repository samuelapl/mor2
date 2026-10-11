'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Loader2, Mail, Send } from 'lucide-react';
import { forgotPassword } from '@/lib/api/auth';
import { isValidEmail } from '@/constants/auth';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 pl-10 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { lang, t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError(t('forgotPasswordPage.enterAValidEmailAddress'));
      return;
    }
    setError(null);
    setSending(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      router.push(`/verify-code?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('forgotPasswordPage.couldNotSendTheCodeTry'),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-card px-4 py-12 transition-colors duration-200">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70 dark:opacity-30" />
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
              {t('forgotPasswordPage.forgotYourPassword')}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('forgotPasswordPage.enterYourEmailAndWeLl')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                {t('forgotPasswordPage.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{t('firstLoginForm.sending')}</span>
                </>
              ) : (
                <>
                  <span>{t('forgotPasswordPage.sendResetCode')}</span>
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('firstLoginForm.backToSignIn')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
