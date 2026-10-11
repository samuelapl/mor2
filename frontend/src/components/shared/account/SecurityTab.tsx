'use client';

import { useState, type FormEvent, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { passwordIssues } from '@/constants/auth';
import { useTranslation } from '@/lib/i18n/useTranslation';

const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={`${inputClass} pr-10`} />
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
}

export default function SecurityTab() {
  const changePassword = useAuthStore((s) => s.changePassword);
  const { t } = useTranslation('common');
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.currentPassword) {
      const msg = t('securityTab.enterYourCurrentPassword');
      setError(msg);
      toast.error(msg);
      return;
    }
    const issue = passwordIssues(form.newPassword);
    if (issue) {
      setError(issue);
      toast.error(issue);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      const msg = t('securityTab.newPasswordAndConfirmationDoNot');
      setError(msg);
      toast.error(msg);
      return;
    }

    setSaving(true);
    const result = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    setSaving(false);

    if (!result.ok) {
      const msg =
        result.message ?? t('securityTab.failedToChangePassword');
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success(
      t('securityTab.passwordChangedSuccessfullyPleaseSignIn'),
    );
    setForm(EMPTY_FORM);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label className={labelClass}>{t('securityTab.currentPassword')}</label>
        <PasswordInput
          autoComplete="current-password"
          value={form.currentPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelClass}>{t('securityTab.newPassword')}</label>
        <PasswordInput
          autoComplete="new-password"
          value={form.newPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          placeholder={t('securityTab.atLeast8CharactersWithA')}
        />
      </div>
      <div>
        <label className={labelClass}>
          {t('securityTab.confirmNewPassword')}
        </label>
        <PasswordInput
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>
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
