'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { fetchMyProfile } from '@/lib/api/users';
import type { ApiUser } from '@/lib/api/types';
import { useLms } from '@/lib/lms-store';
import ProfileTab from './ProfileTab';
import SecurityTab from './SecurityTab';
import DetailsTab from './DetailsTab';
import PreferencesTab from './PreferencesTab';
import { useTranslation } from '@/lib/i18n/useTranslation';

type TabKey = 'profile' | 'security' | 'details' | 'preferences';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AccountModal({ open, onClose }: AccountModalProps) {
  const router = useRouter();
  const { logout } = useLms();
  const [tab, setTab] = useState<TabKey>('profile');
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const { tBilingual } = useTranslation();

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: tBilingual('Profile', 'መገለጫ') },
    { key: 'security', label: tBilingual('Security', 'ደህንነት') },
    { key: 'details', label: tBilingual('Details', 'ዝርዝር መረጃ') },
    { key: 'preferences', label: tBilingual('Preferences', 'ምርጫዎች') },
  ];

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchMyProfile()
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tBilingual('Account settings', 'የመለያ ቅንብሮች')}
      subtitle={tBilingual(
        'Manage your profile, security, and preferences',
        'የግል መገለጫዎን፣ ደህንነትዎን እና ምርጫዎችዎን ያስተዳድሩ',
      )}
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/30 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/50"
          >
            <LogOut className="h-4 w-4" />
            <span>{tBilingual('Sign out', 'ውጣ')}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {tBilingual('Close', 'ዝጋ')}
          </button>
        </div>
      }
    >
      <div className="mb-5 flex gap-1 border-b border-slate-100 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <ProfileTab profile={profile} loading={loading} onUpdated={setProfile} />
      ) : null}
      {tab === 'security' ? <SecurityTab /> : null}
      {tab === 'details' ? <DetailsTab profile={profile} loading={loading} /> : null}
      {tab === 'preferences' ? <PreferencesTab /> : null}
    </Modal>
  );
}
