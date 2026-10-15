'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, KeyRound, Lock, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPassword } from '@/lib/api/auth';
import { resetPasswordSchema, type ResetPasswordFormValues } from '@/lib/validation/auth.schemas';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from '@/components/shared/LanguageToggle';

const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 pl-10 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation('auth');

  // Both email and code come from the URL: /reset-password?email=...&code=...
  const email = searchParams.get('email') ?? '';
  const code = searchParams.get('code') ?? '';

  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  });

  // Guard: if someone navigates here directly without email/code, redirect back
  if (!email || !code) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-card px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />
        <div className="absolute top-4 right-4 z-20">
          <LanguageToggle />
        </div>
        <div className="relative w-full max-w-md text-center">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-slate-200/60">
            <p className="text-sm text-muted-foreground">
              {t('resetPasswordForm.thisLinkIsIncomplete')}
              <Link
                href="/forgot-password"
                className="font-semibold text-indigo-500 hover:text-primary"
              >
                {t('resetPasswordForm.requestANewCode')}
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setServerError(null);
    setSaving(true);
    try {
      await resetPassword(email, code, data.password);
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error
          ? err.message
          : t('resetPasswordForm.invalidOrExpiredCodeRequestA'),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-card px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          {done ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
                <CheckCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
                {t('resetPasswordForm.passwordUpdated')}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('resetPasswordForm.yourPasswordHasBeenResetSign')}
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
              >
                {t('resetPasswordForm.goToSignIn')}
              </Link>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                  <KeyRound className="h-7 w-7" />
                </div>
                <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
                  {t('resetPasswordForm.setANewPassword')}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {t('resetPasswordForm.atLeast8CharactersWithA')}
                </p>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="password" className={labelClass}>
                    {t('firstLoginForm.newPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      autoFocus
                      placeholder="••••••••"
                      className={cn(inputClass, 'pr-10', errors.password && 'border-danger')}
                      {...register('password')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground transition-colors hover:text-secondary-foreground focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    {t('firstLoginForm.confirmPassword')}
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className={cn(inputClass, 'pr-10', errors.confirmPassword && 'border-danger')}
                      {...register('confirmPassword')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground transition-colors hover:text-secondary-foreground focus:outline-none"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>}
                </div>

                {serverError && (
                  <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
                    {serverError}{' '}
                    {serverError.includes('expired') || serverError.includes('Invalid') ? (
                      <Link href="/forgot-password" className="underline hover:text-danger">
                        {t('resetPasswordForm.requestANewCode2')}
                      </Link>
                    ) : null}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving
                    ? t('firstLoginForm.saving')
                    : t('resetPasswordForm.resetPassword')}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                <Link
                  href={`/verify-code?email=${encodeURIComponent(email)}`}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:text-primary"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('resetPasswordForm.backToCodeEntry')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
