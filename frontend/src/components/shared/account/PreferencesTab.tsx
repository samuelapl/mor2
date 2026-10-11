'use client';

import { useState } from 'react';
import { Check, Globe, Mail } from 'lucide-react';
import { useLocaleStore } from '@/lib/stores/locale-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';
import { updateMyProfile } from '@/lib/api/users';
import type { ApiUser } from '@/lib/api/types';
import type { Lang } from '@/types';

interface PreferencesTabProps {
  profile: ApiUser | null;
  loading: boolean;
  onUpdated: (profile: ApiUser) => void;
}

export default function PreferencesTab({ profile, loading, onUpdated }: PreferencesTabProps) {
  const lang = useLocaleStore((s) => s.lang);
  const { changeLanguage, t } = useTranslation('common');
  const [saving, setSaving] = useState<Lang | null>(null);
  const [savingEmail, setSavingEmail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailOn = profile?.emailNotifications ?? true;

  const toggleEmail = async () => {
    if (!profile || savingEmail) return;
    setSavingEmail(true);
    setError(null);
    try {
      onUpdated(await updateMyProfile({ emailNotifications: !emailOn }));
    } catch {
      setError(
        t('preferencesTab.failedToUpdateEmailNotifications'),
      );
    } finally {
      setSavingEmail(false);
    }
  };

  const options: { key: Lang; label: string; native: string }[] = [
    { key: 'en', label: t('preferencesTab.english'), native: 'English (EN)' },
    { key: 'am', label: t('preferencesTab.amharic'), native: 'አማርኛ (AM)' },
  ];

  const handleSelect = async (option: Lang) => {
    if (option === lang || saving) return;
    setSaving(option);
    setError(null);
    const result = await changeLanguage(option);
    setSaving(null);
    if (!result.ok) {
      setError(result.message ?? t('preferencesTab.failedToUpdateLanguage'));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
          <Globe className="h-4 w-4 text-slate-400" />
          {t('preferencesTab.displayLanguage')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => void handleSelect(option.key)}
              disabled={saving !== null}
              className={cn(
                'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition disabled:opacity-60',
                lang === option.key
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300',
              )}
            >
              <span>
                <span className="block font-medium">{option.label}</span>
                <span className="text-xs text-slate-400">{option.native}</span>
              </span>
              {lang === option.key ? <Check className="h-4 w-4 text-indigo-600" /> : null}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Mail className="h-4 w-4 text-slate-400" />
            {t('preferencesTab.emailNotifications')}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            {t('preferencesTab.alsoEmailMeAboutEnrollmentsGrades')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={emailOn}
          aria-label={t('preferencesTab.emailNotifications')}
          onClick={() => void toggleEmail()}
          disabled={!profile || loading || savingEmail}
          className={cn(
            'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60',
            emailOn ? 'bg-indigo-600' : 'bg-slate-300',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
              emailOn ? 'translate-x-5' : 'translate-x-0.5',
            )}
          />
        </button>
      </div>
      {error ? (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      ) : null}
      <p className="text-xs text-slate-400">
        {t('preferencesTab.yourLanguageChoiceIsSavedTo')}
      </p>
    </div>
  );
}
