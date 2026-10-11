'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Lock, Save, ShieldCheck } from 'lucide-react';
import { fetchSystemSettings, updateSystemSettings } from '@/lib/api/monitoring';
import { useLocaleStore } from '@/lib/stores/locale-store';
import PageShell from '@/components/shared/PageShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { cn } from '@/lib/utils';

export default function SystemSettingsPage() {
  const lang = useLocaleStore((s) => s.lang);
  const { changeLanguage, t } = useTranslation('admin');
  const [sessionTimeout, setSessionTimeout] = useState('60');
  const [notifications, setNotifications] = useState(true);
  const [openRegistration, setOpenRegistration] = useState(false);
  const [ssoEnabled, setSSOEnabled] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchSystemSettings()
      .then((settings) => {
        if (!cancelled && settings) {
          if (settings.session_timeout) setSessionTimeout(settings.session_timeout);
          if (settings.notifications !== undefined)
            setNotifications(settings.notifications === 'true');
          if (settings.open_registration !== undefined)
            setOpenRegistration(settings.open_registration === 'true');
          if (settings.sso_enabled !== undefined) setSSOEnabled(settings.sso_enabled === 'true');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inputClass =
    'w-full rounded-xl border border-border/90 bg-card px-3.5 py-2.5 text-sm text-secondary-foreground shadow-sm outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:ring-4 focus:ring-ring/10';

  const toggleClass = (active: boolean) =>
    cn(
      'relative inline-flex h-6 w-11 items-center rounded-full shadow-inner transition-colors duration-200 cursor-pointer',
      active
        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 shadow-indigo-500/30'
        : 'bg-input',
    );

  const save = async () => {
    setSaving(true);
    setSaved(false);
    setErrorMessage(null);
    try {
      await updateSystemSettings({
        session_timeout: sessionTimeout,
        notifications: String(notifications),
        open_registration: String(openRegistration),
        sso_enabled: String(ssoEnabled),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to persist system settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      role="system_admin"
      title={t('systemAdminDashboardPage.systemSettings')}
      description={t('systemSettingsPage.configurePlatformDefaultsInstitutionalSe')}
    >
      <div className="max-w-2xl space-y-6 pb-8">
        {errorMessage && (
          <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-xs font-semibold text-danger">
            {errorMessage}
          </div>
        )}

        {/* General System Information */}
        <div className="space-y-4 rounded-2xl border border-border/80 bg-card p-6 shadow-soft ring-super-soft">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
              {t('systemSettingsPage.systemName')}
            </label>
            <input
              value={t('systemSettingsPage.ministryOfRevenuesLearningManagementSyst')}
              readOnly
              className={cn(inputClass, 'bg-muted')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                {t('systemSettingsPage.defaultLanguage')}
              </label>
              <select
                value={lang}
                onChange={(event) => void changeLanguage(event.target.value as 'en' | 'am')}
                className={inputClass}
              >
                <option value="en">English (እንግሊዝኛ)</option>
                <option value="am">አማርኛ (Amharic)</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-secondary-foreground">
                {t('systemSettingsPage.sessionTimeoutMinutes')}
              </label>
              <input
                type="number"
                min={5}
                max={240}
                value={sessionTimeout}
                onChange={(event) => setSessionTimeout(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Platform Integration Toggles */}
        <div className="divide-y divide-border/50 rounded-2xl border border-border/80 bg-card shadow-soft ring-super-soft">
          {[
            {
              label: t('systemSettingsPage.emailNotifications'),
              description: t('systemSettingsPage.sendEmailUpdatesAndSessionReminders'),
              value: notifications,
              set: setNotifications,
            },
            {
              label: t('systemSettingsPage.openRegistration'),
              description: t('systemSettingsPage.allowNewUsersToSelfRegister'),
              value: openRegistration,
              set: setOpenRegistration,
            },
            {
              label: t('systemSettingsPage.ssoEServicesIntegration'),
              description: t('systemSettingsPage.singleSignOnWithTheMor'),
              value: ssoEnabled,
              set: setSSOEnabled,
            },
          ].map((setting) => (
            <div key={setting.label} className="flex items-center justify-between px-6 py-4">
              <div>
                <p className="text-sm font-medium text-foreground">{setting.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{setting.description}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={setting.value}
                onClick={() => setting.set(!setting.value)}
                className={toggleClass(setting.value)}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-xs',
                    setting.value ? 'translate-x-5' : 'translate-x-0.5',
                  )}
                />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={save}
            disabled={saving}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Save className="h-4 w-4" />
            {saving
              ? t('systemSettingsPage.savingSettings')
              : t('systemSettingsPage.saveSettings')}
          </Button>
          {saved && (
            <Badge variant="green" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {t('systemSettingsPage.settingsUpdatedSuccessfully')}
            </Badge>
          )}
        </div>
      </div>
    </PageShell>
  );
}
