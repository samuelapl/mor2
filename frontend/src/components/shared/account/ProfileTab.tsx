'use client';

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import { uploadAvatar } from '@/lib/api/files';
import { Button } from '@/components/ui/Button';
import { toast } from '@/lib/toast';
import type { ApiUser } from '@/lib/api/types';
import { useTranslation } from '@/lib/i18n/useTranslation';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600';

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

interface ProfileTabProps {
  profile: ApiUser | null;
  loading: boolean;
  onUpdated: (profile: ApiUser) => void;
}

export default function ProfileTab({ profile, loading, onUpdated }: ProfileTabProps) {
  const { updateProfile } = useLms();
  const { tBilingual } = useTranslation();
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
          tBilingual('Profile avatar updated successfully!', 'የመገለጫ ፎቶ በተሳካ ሁኔታ ተቀይሯል!'),
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
      const msg = tBilingual('First and last name are required.', 'ስም እና የአባት ስም ያስፈልጋሉ።');
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
      const msg = result.message ?? tBilingual('Failed to update profile.', 'መገለጫን ማደስ አልተሳካም።');
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
    toast.success(tBilingual('Profile updated successfully!', 'መገለጫዎ በተሳካ ሁኔታ ተሻሽሏል!'));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
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
              className="h-16 w-16 rounded-full object-cover shadow-md ring-2 ring-white"
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
            className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-500 shadow ring-1 ring-slate-200 transition hover:text-indigo-600 disabled:opacity-50"
            aria-label={tBilingual('Change avatar', 'ፎቶ ቀይር')}
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
          <p className="truncate text-sm font-medium text-slate-900">
            {form.firstName} {form.lastName}
          </p>
          <p className="truncate text-xs text-slate-500">{profile?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{tBilingual('First name', 'ስም')}</label>
          <input
            className={inputClass}
            value={form.firstName}
            onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>{tBilingual('Last name', 'የአባት ስም')}</label>
          <input
            className={inputClass}
            value={form.lastName}
            onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{tBilingual('Phone', 'ስልክ')}</label>
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+251911000000"
          />
        </div>
        <div>
          <label className={labelClass}>{tBilingual('TIN', 'የግብር ከፋይ መለያ (TIN)')}</label>
          <input
            className={inputClass}
            value={form.tin}
            onChange={(e) => setForm((prev) => ({ ...prev, tin: e.target.value }))}
            placeholder={tBilingual('Taxpayer ID', 'የግብር ከፋይ መለያ')}
          />
        </div>
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
      ) : null}

      <Button
        type="submit"
        isLoading={saving}
        loadingText={tBilingual('Saving changes...', 'ለውጦችን በማስቀመጥ ላይ...')}
        className="gap-2"
      >
        {tBilingual('Save changes', 'ለውጦችን አስቀምጥ')}
      </Button>
    </form>
  );
}
