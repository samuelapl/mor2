'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronDown, Eye, EyeOff, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { MOCK_ACCOUNTS, MOCK_PASSWORD } from '@/constants/auth';
import { ROLE_LABELS, ROLE_PATHS, getRoleHomePath } from '@/constants/roles';
import { ROLE_ICONS } from '@/constants/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-xl border border-border bg-card px-3.5 py-2.5 pl-10 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const ready = useAuthStore((s) => s.ready);
  const { tRole, t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [demoAccountsOpen, setDemoAccountsOpen] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await login(email, password);
      if (result.ok) {
        toast.success('Welcome back! Signing you in…');
        const redirect = new URLSearchParams(window.location.search).get('redirect');
        const safeRedirect = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : null;
        router.push(safeRedirect ?? getRoleHomePath(result.role, result.user?.permissions));
      } else if (result.passwordChangeRequired) {
        router.push('/first-login');
      } else if (result.emailVerificationRequired) {
        const params = new URLSearchParams({ email: email.trim() });
        if (result.devCode) params.set('dev', result.devCode);
        router.push(`/verify-email?${params.toString()}`);
      } else {
        setError(result.message);
        toast.error(result.message || 'Invalid credentials.');
      }
    } catch {
      setError('Unable to connect to service. Please try again.');
      toast.error('Unable to connect to service. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    setPassword(MOCK_PASSWORD);
    setError(null);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-card px-4 py-12 transition-colors duration-200">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70 dark:opacity-30" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-4 flex items-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('loginPage.backToHome')}
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 sm:p-8">
          <div className="text-center">
            <Link
              href="/"
              title={t('loginPage.backToHome')}
              className="inline-block transition-opacity hover:opacity-80"
            >
              <Image
                src="/logo.jpg"
                alt="Ministry of Revenues"
                width={56}
                height={56}
                className="mx-auto h-14 w-14 rounded-full object-contain shadow-md"
              />
            </Link>
            <h1 className="mt-5 font-display text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              {t('loginPage.welcomeToMorELearningManagement')}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('loginPage.signIn')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                {t('forgotPasswordPage.emailAddress')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError(null);
                  }}
                  placeholder="you@gmail.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className={labelClass}>
                  {t('loginPage.password')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-500 transition-colors hover:text-primary"
                >
                  {t('loginPage.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  className={cn(inputClass, 'pr-10')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-secondary-foreground transition-colors focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={!ready || submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>{t('loginPage.signingIn')}</span>
                </>
              ) : (
                <>
                  <span>{t('loginPage.signIn')}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t('loginPage.nonStaffUser')}{' '}
            <Link href="/register" className="font-semibold text-indigo-500 hover:text-indigo-400 transition-colors">
              {t('loginPage.createAnAccount')}
            </Link>
          </p>

          <div className="mt-7">
            <button
              type="button"
              onClick={() => setDemoAccountsOpen((prev) => !prev)}
              aria-expanded={demoAccountsOpen}
              className="flex w-full items-center gap-3"
            >
              <span className="h-px flex-1 bg-border" />
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-subtle-foreground transition-colors hover:text-primary">
                <KeyRound className="h-3.5 w-3.5" />
                {t('loginPage.demoAccounts')}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    demoAccountsOpen && 'rotate-180',
                  )}
                />
              </span>
              <span className="h-px flex-1 bg-border" />
            </button>

            <div
              className={cn(
                'grid transition-all duration-200 ease-out',
                demoAccountsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
            >
              <div className="overflow-hidden">
                <div className="mt-4 grid grid-cols-1 gap-2">
                  {MOCK_ACCOUNTS.map((account) => {
                    const Icon = ROLE_ICONS[account.role];
                    return (
                      <button
                        key={account.role}
                        type="button"
                        onClick={() => fillAccount(account.email)}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl border border-border bg-muted px-3 py-2.5 text-left transition-all duration-200',
                          'hover:border-primary/30 hover:bg-primary-soft/60',
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-border to-input text-muted-foreground ring-1 ring-border transition-colors duration-200 group-hover:from-indigo-500 group-hover:to-violet-500 group-hover:text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-foreground">
                            {tRole(account.role)}
                          </span>
                          <span className="block truncate text-[11px] text-muted-foreground">
                            {account.email} · {account.password}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
