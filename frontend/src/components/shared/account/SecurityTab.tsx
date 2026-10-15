'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { changePasswordSchema, type ChangePasswordFormValues } from '@/lib/validation/auth.schemas';

const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>>(
  function PasswordInput(props, ref) {
    const { t } = useTranslation('common');
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input {...props} ref={ref} type={visible ? 'text' : 'password'} className={`${inputClass} pr-10`} />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle-foreground transition-colors hover:text-secondary-foreground focus:outline-none"
          aria-label={
            visible
              ? t('passwordInput.hidePassword')
              : t('passwordInput.showPassword')
          }
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);

export default function SecurityTab() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const { t } = useTranslation('common');
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordFormValues) => {
    setServerError(null);
    setSaving(true);
    const result = await changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    setSaving(false);

    if (!result.ok) {
      const msg = result.message ?? t('securityTab.failedToChangePassword');
      setServerError(msg);
      toast.error(msg);
      return;
    }
    toast.success(t('securityTab.passwordChangedSuccessfullyPleaseSignIn'));
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-sm space-y-4">
      <div>
        <label className={labelClass}>{t('securityTab.currentPassword')}</label>
        <PasswordInput
          autoComplete="current-password"
          {...register('currentPassword')}
        />
        {errors.currentPassword && (
          <p className="mt-1 text-xs text-danger">{errors.currentPassword.message}</p>
        )}
      </div>
      <div>
        <label className={labelClass}>{t('securityTab.newPassword')}</label>
        <PasswordInput
          autoComplete="new-password"
          placeholder={t('securityTab.atLeast8CharactersWithA')}
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="mt-1 text-xs text-danger">{errors.newPassword.message}</p>
        )}
      </div>
      <div>
        <label className={labelClass}>
          {t('securityTab.confirmNewPassword')}
        </label>
        <PasswordInput
          autoComplete="new-password"
          {...register('confirmPassword')}
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-danger">{errors.confirmPassword.message}</p>
        )}
      </div>

      {serverError ? (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{serverError}</p>
      ) : null}

      <Button
        type="submit"
        isLoading={saving}
        loadingText={t('securityTab.changingPassword')}
        className="gap-2"
      >
        <KeyRound className="h-4 w-4" />
        {t('securityTab.changePassword')}
      </Button>
    </form>
  );
}
