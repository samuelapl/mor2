'use client';

import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { fetchMyProfile } from '@/lib/api/users';
import type { ApiUser } from '@/lib/api/types';
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
  const [tab, setTab] = useState<TabKey>('profile');
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('common');

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'profile', label: t('accountModal.profile') },
    { key: 'security', label: t('accountModal.security') },
    { key: 'details', label: t('accountModal.details') },
    { key: 'preferences', label: t('accountModal.preferences') },
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
      title={t('accountModal.accountSettings')}
      subtitle={t('accountModal.manageYourProfileSecurityAndPreferences')}
      size="lg"
    >
      <div className="mb-5 flex gap-1 border-b border-border/60 pb-3">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              tab === t.key
                ? 'bg-primary-soft text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
      {tab === 'preferences' ? (
        <PreferencesTab profile={profile} loading={loading} onUpdated={setProfile} />
      ) : null}
    </Modal>
  );
}
