'use client';

import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import { passwordIssues } from '@/constants/auth';
import { useTranslation } from '@/lib/i18n/useTranslation';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600';

const EMPTY_FORM = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function SecurityTab() {
  const { changePassword } = useLms();
  const { tBilingual } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.currentPassword) {
      const msg = tBilingual('Enter your current password.', 'የአሁኑን የይለፍ ቃልዎን ያስገቡ።');
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
      const msg = tBilingual(
        'New password and confirmation do not match.',
        'አዲሱ የይለፍ ቃል እና ማረጋገጫው አይመሳሰሉም።',
      );
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
        result.message ?? tBilingual('Failed to change password.', 'የይለፍ ቃል መቀየር አልተሳካም።');
      setError(msg);
      toast.error(msg);
      return;
    }
    toast.success(
      tBilingual(
        'Password changed successfully. Please sign in again on your other devices.',
        'የይለፍ ቃልዎ በተሳካ ሁኔታ ተቀይሯል። እባክዎ በሌሎች መሳሪያዎችዎ ላይ እንደገና ይግቡ።',
      ),
    );
    setForm(EMPTY_FORM);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label className={labelClass}>{tBilingual('Current password', 'የአሁኑ የይለፍ ቃል')}</label>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={form.currentPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelClass}>{tBilingual('New password', 'አዲስ የይለፍ ቃል')}</label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={form.newPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          placeholder={tBilingual(
            'At least 8 characters with a letter and a number',
            'ቢያንስ 8 ቁምፊዎች (ፊደላት እና ቁጥሮች የያዘ)',
          )}
        />
      </div>
      <div>
        <label className={labelClass}>
          {tBilingual('Confirm new password', 'አዲሱን የይለፍ ቃል አረጋግጥ')}
        </label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={form.confirmPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      ) : null}

      <Button
        type="submit"
        isLoading={saving}
        loadingText={tBilingual('Changing password...', 'የይለፍ ቃል በመቀየር ላይ...')}
        className="gap-2"
      >
        <KeyRound className="h-4 w-4" />
        {tBilingual('Change password', 'የይለፍ ቃል ቀይር')}
      </Button>
    </form>
  );
}
