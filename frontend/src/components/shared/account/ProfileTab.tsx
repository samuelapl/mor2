'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { uploadAvatar } from '@/lib/api/files';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import type { ApiUser } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

const inputClass =
  'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-secondary-foreground';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

interface ProfileTabProps {
  profile: ApiUser | null;
  loading: boolean;
  onUpdated: (profile: ApiUser) => void;
}

export default function ProfileTab({ profile, loading, onUpdated }: ProfileTabProps) {
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const { t } = useTranslation('common');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', tin: '' });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      phone: profile.phone ?? '',
      tin: profile.tin ?? '',
    });
  }, [profile]);

  const avatarUrl = avatarPreview ?? profile?.avatarUrl ?? null;

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setUploadingAvatar(true);
    setError(null);
    try {
      const url = await uploadAvatar(file);
      const result = await updateProfile({ avatarUrl: url });
      if (!result.ok) {
        const msg = result.message ?? 'Failed to save avatar.';
        setError(msg);
        toast.error(msg);
      } else if (profile) {
        onUpdated({ ...profile, avatarUrl: url });
        toast.success(
          t('profileTab.profileAvatarUpdatedSuccessfully'),
        );
      }
    } catch {
      setError('Failed to upload avatar.');
      toast.error('Failed to upload avatar.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!form.firstName.trim() || !form.lastName.trim()) {
      const msg = t('profileTab.firstAndLastNameAreRequired');
      setError(msg);
      toast.error(msg);
      return;
    }
    setSaving(true);
    const result = await updateProfile({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || undefined,
      tin: form.tin.trim() || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      const msg = result.message ?? t('profileTab.failedToUpdateProfile');
      setError(msg);
      toast.error(msg);
      return;
    }
    if (profile) {
      onUpdated({
        ...profile,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        tin: form.tin.trim() || null,
      });
    }
    toast.success(t('profileTab.profileUpdatedSuccessfully'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-subtle-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Avatar"
              className="h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-popover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-lg font-semibold text-white shadow-md">
              {getInitials(form.firstName, form.lastName)}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-card text-muted-foreground shadow ring-1 ring-border transition hover:text-primary disabled:opacity-50"
            aria-label={t('profileTab.changeAvatar')}
          >
            {uploadingAvatar ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">
            {form.firstName} {form.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('profileTab.firstName')}</label>
          <input
            className={inputClass}
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>{t('profileTab.lastName')}</label>
          <input
            className={inputClass}
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('phone')}</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+251911000000"
          />
        </div>
        <div>
          <label className={labelClass}>{t('profileTab.tin')}</label>
          <input
            className={inputClass}
            value={form.tin}
            onChange={(e) => setForm((prev) => ({ ...prev, tin: e.target.value }))}
            placeholder={t('profileTab.taxpayerId')}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{error}</p>
      ) : null}

      <Button
        type="submit"
        isLoading={saving}
        loadingText={t('profileTab.savingChanges')}
        className="gap-2"
      >
        {t('profileTab.saveChanges')}
      </Button>
    </form>
  );
}
