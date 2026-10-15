'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { registerSchema, type RegisterFormValues } from '@/lib/validation/auth.schemas';

const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 pl-10 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

const labelClass = 'mb-1.5 flex items-center gap-1 text-xs font-semibold text-secondary-foreground';

export default function RegisterPage() {
  const router = useRouter();
  const registerUser = useAuthStore((s) => s.register);
  const ready = useAuthStore((s) => s.ready);
  const { t } = useTranslation('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        tin: data.tin?.trim() || undefined,
        password: data.password,
        confirmPassword: data.confirmPassword,
        department: data.department,
      });
      if (!result.ok) {
        setServerError(result.message);
        toast.error(result.message || 'Failed to submit registration.');
        setSubmitting(false);
        return;
      }
      toast.success(t('registerPage.accountCreatedCheckYourEmailFor'));
      const params = new URLSearchParams({ email: result.email });
      if (result.devCode) params.set('dev', result.devCode);
      router.push(`/verify-email?${params.toString()}`);
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-card px-4 py-12 transition-colors duration-200">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70 dark:opacity-30" />

      <div className="relative w-full max-w-lg animate-fade-in-up">
        <div className="mb-4 flex items-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('firstLoginForm.backToSignIn')}
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
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-foreground">
              {t('registerPage.registration')}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t('registerPage.createALearnerAccountWeWill')}
            </p>
          </div>

          <>
              <form onSubmit={handleSubmit(onSubmit)} className="mt-7 space-y-4" noValidate>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className={labelClass}>
                      <span>{t('registerPage.firstName')}</span>
                      <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                      <input
                        id="firstName"
                        aria-required="true"
                        className={cn(inputClass, errors.firstName && 'border-danger')}
                        {...register('firstName')}
                      />
                    </div>
                    {errors.firstName && <p className="mt-1 text-xs text-danger">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClass}>
                      <span>{t('registerPage.lastName')}</span>
                      <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                      <input
                        id="lastName"
                        aria-required="true"
                        className={cn(inputClass, errors.lastName && 'border-danger')}
                        {...register('lastName')}
                      />
                    </div>
                    {errors.lastName && <p className="mt-1 text-xs text-danger">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div>
                  <label htmlFor="reg-email" className={labelClass}>
                    <span>{t('registerPage.email')}</span>
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                    <input
                      id="reg-email"
                      type="email"
                      aria-required="true"
                      autoComplete="email"
                      className={cn(inputClass, errors.email && 'border-danger')}
                      {...register('email')}
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="reg-password" className={labelClass}>
                      <span>{t('loginPage.password')}</span>
                      <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                      <input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        aria-required="true"
                        autoComplete="new-password"
                        className={cn(inputClass, 'pr-10', errors.password && 'border-danger')}
                        {...register('password')}
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
                    {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className={labelClass}>
                      <span>{t('firstLoginForm.confirmPassword')}</span>
                      <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <div className="relative">
                      <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        aria-required="true"
                        autoComplete="new-password"
                        className={cn(inputClass, 'pr-10', errors.confirmPassword && 'border-danger')}
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-secondary-foreground transition-colors focus:outline-none"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>}
                  </div>
                </div>
                <p className="text-[11px] text-subtle-foreground">
                  {t('registerPage.useAtLeast8CharactersIncluding')}
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      <span>{t('registerPage.phoneNumber')}</span>
                      <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                      <input
                        id="phone"
                        aria-required="true"
                        placeholder="+2519…"
                        className={cn(inputClass, errors.phone && 'border-danger')}
                        {...register('phone')}
                      />
                    </div>
                    {errors.phone && <p className="mt-1 text-xs text-danger">{errors.phone.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="tin" className={labelClass}>
                      <span>{t('registerPage.tin')}</span>
                      <span className="text-xs font-normal text-subtle-foreground">
                        ({t('registerPage.optional')})
                      </span>
                    </label>
                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
                      <input
                        id="tin"
                        placeholder="e.g. 0012345678"
                        className={inputClass}
                        {...register('tin')}
                      />
                    </div>
                  </div>
                </div>

                {serverError ? (
                  <div className="rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-xs text-danger">
                    {serverError}
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
                      <span>{t('registerPage.submittingRegistration')}</span>
                    </>
                  ) : (
                    <>
                      <span>{t('registerPage.submitRegistration')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-muted-foreground">
                {t('registerPage.alreadyRegistered')}{' '}
                <Link href="/login" className="font-semibold text-indigo-500 hover:text-indigo-400 transition-colors">
                  {t('loginPage.signIn')}
                </Link>
              </p>
          </>
        </div>
      </div>
    </main>
  );
}
