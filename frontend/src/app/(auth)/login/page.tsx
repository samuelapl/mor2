'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ChevronDown, KeyRound, Loader2, Lock, Mail } from 'lucide-react';
import { MOCK_ACCOUNTS, MOCK_PASSWORD } from '@/constants/auth';
import { ROLE_LABELS, ROLE_PATHS } from '@/constants/roles';
import { ROLE_ICONS } from '@/constants/navigation';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import LanguageToggle from '@/components/shared/LanguageToggle';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600';

export default function LoginPage() {
  const router = useRouter();
  const { login, ready } = useLms();
  const { tBilingual, tRole } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
        router.push(ROLE_PATHS[result.role]);
      } else if (result.passwordChangeRequired) {
        // Admin-created account: a code was emailed, finish on the first-login page.
        router.push('/first-login');
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {tBilingual('Back to home', 'ወደ ዋና ገጽ ተመለስ')}
          </Link>
          <LanguageToggle />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="text-center">
            <Link
              href="/"
              title={tBilingual('Back to home', 'ወደ ዋና ገጽ ተመለስ')}
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
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">
              {tBilingual('Sign in to MoR LMS', 'ወደ ገቢዎች ሚ/ር LMS ይግቡ')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {tBilingual(
                'Staff demo accounts or a learner registration.',
                'የሰራተኞች ማሳያ መለያዎች ወይም የተማሪ ምዝገባ።',
              )}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                {tBilingual('Email address', 'የኢሜይል አድራሻ')}
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
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
                  {tBilingual('Password', 'የይለፍ ቃል')}
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] font-semibold text-indigo-500 transition-colors hover:text-indigo-700"
                >
                  {tBilingual('Forgot password?', 'የይለፍ ቃል ረሱ?')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  className={inputClass}
                />
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
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
                  <span>{tBilingual('Signing in…', 'በመግባት ላይ…')}</span>
                </>
              ) : (
                <>
                  <span>{tBilingual('Sign in', 'ግባ')}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            {tBilingual('Non-staff user?', 'ሰራተኛ አይደሉም?')}{' '}
            <Link href="/register" className="font-semibold text-indigo-500 hover:text-indigo-700">
              {tBilingual('Create an account', 'መለያ ፍጠር')}
            </Link>
          </p>

          <div className="mt-7">
            <button
              type="button"
              onClick={() => setDemoAccountsOpen((prev) => !prev)}
              aria-expanded={demoAccountsOpen}
              className="flex w-full items-center gap-3"
            >
              <span className="h-px flex-1 bg-slate-200" />
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition-colors hover:text-indigo-500">
                <KeyRound className="h-3.5 w-3.5" />
                {tBilingual('Demo accounts', 'የማሳያ መለያዎች')}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    demoAccountsOpen && 'rotate-180',
                  )}
                />
              </span>
              <span className="h-px flex-1 bg-slate-200" />
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
                          'group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left transition-all duration-200',
                          'hover:border-indigo-300 hover:bg-indigo-50/60',
                        )}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600 ring-1 ring-slate-200 transition-colors duration-200 group-hover:from-indigo-500 group-hover:to-violet-500 group-hover:text-white">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-slate-800">
                            {tRole(account.role)}
                          </span>
                          <span className="block truncate text-[11px] text-slate-500">
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

        <p className="mt-4 text-center text-[11px] text-slate-400">
          {tBilingual(
            'New registrations require administrator approval before the first sign-in.',
            'አዳዲስ ምዝገባዎች ከመጀመሪያው መግቢያ በፊት የአስተዳዳሪ ማረጋገጫ ያስፈልጋቸዋል።',
          )}
        </p>
      </div>
    </main>
  );
}
