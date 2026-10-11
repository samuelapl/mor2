'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, UserCog } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useUserStore } from '@/lib/stores/user-store';
import PageShell from '@/components/shared/PageShell';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ROLE_LABELS, ROLES } from '@/constants/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Role } from '@/types';
import { toast } from '@/lib/toast';
import { fetchVenues } from '@/lib/api/venues';
import { fetchRolesWithPermissions } from '@/lib/api/permissions';
import type { ApiVenue } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface RoleOption {
  name: string;
  label: string;
}

const BUILT_IN_ROLE_OPTIONS: RoleOption[] = ROLES.map((role) => ({
  name: role,
  label: ROLE_LABELS[role] ?? role,
}));

const inputClass =
  'w-full rounded-xl border border-slate-200/90 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-sm text-slate-700 dark:text-slate-200 shadow-sm outline-none transition placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600 dark:text-slate-400';

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'learner' as Role,
  primaryVenueId: '',
  mustChangePassword: false,
};

export default function RegisterActorPage() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const registerActor = useUserStore((s) => s.registerActor);
  const { tRole, t } = useTranslation('users');
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [venues, setVenues] = useState<ApiVenue[]>([]);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>(BUILT_IN_ROLE_OPTIONS);

  useEffect(() => {
    void fetchVenues()
      .then(setVenues)
      .catch(() => {});

    let cancelled = false;
    fetchRolesWithPermissions()
      .then((roles) => {
        if (cancelled || !roles || roles.length === 0) return;
        setRoleOptions(
          roles.map((r) => ({
            name: r.name,
            label: r.label || r.name,
          })),
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required.');
      return;
    }
    if (!VALID_EMAIL.test(form.email.trim())) {
      toast.error('Enter a valid email address.');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await registerActor({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        role: form.role,
        primaryVenueId: form.primaryVenueId || undefined,
        mustChangePassword: form.mustChangePassword,
      });

      if (!result.ok) {
        toast.error(result.message ?? 'Failed to register user.');
        return;
      }

      toast.success(
        `${form.firstName} ${form.lastName} was registered and approved — they can sign in now.`,
      );
      setForm(EMPTY_FORM);
      router.push('/system-admin/users');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      centered
      title={t('registerActorPage.userRegistration')}
      description={t('registerActorPage.manuallyRegisterAUserWithAny')}
    >
      <Modal
        open
        onClose={() => router.push('/system-admin/users')}
        title={t('registerActorPage.registerUser')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('bulkRegisterPage.firstName')}</label>
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
                placeholder="Abebe"
              />
            </div>
            <div>
              <label className={labelClass}>{t('bulkRegisterPage.lastName')}</label>
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
                placeholder="Kebede"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('usersPage.email')}</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="abebe.kebede@mor.gov.et"
            />
          </div>

          <div>
            <label className={labelClass}>{t('registerActorPage.phoneOptional')}</label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+251911000000"
            />
          </div>

          <div>
            <label className={labelClass}>{t('usersPage.role')}</label>
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => update({ role: e.target.value as Role })}
            >
              {roleOptions.map((opt) => {
                const isBuiltIn = ROLES.includes(opt.name.toLowerCase() as Role);
                const displayLabel = isBuiltIn ? tRole(opt.name.toLowerCase() as Role) : opt.label;
                return (
                  <option key={opt.name} value={opt.name}>
                    {displayLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              {t('registerActorPage.primaryVenueBranchAssignment')}{' '}
              {form.role === 'trainer' && `(${t('registerActorPage.recommendedForTrainers')})`}
            </label>
            <select
              className={inputClass}
              value={form.primaryVenueId}
              onChange={(e) => update({ primaryVenueId: e.target.value })}
            >
              <option value="">{t('registerActorPage.noPrimaryVenueVirtualMultipleBranches')}</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.branch} — {v.name} ({v.capacity} {t('registerActorPage.seats')})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              {t('registerActorPage.linkingATrainerToTheirPrimary')}
            </p>
          </div>

          <div>
            <label className={labelClass}>{t('bulkRegisterPage.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className={cn(inputClass, 'pr-10')}
                value={form.password}
                onChange={(e) => update({ password: e.target.value })}
                placeholder={t('registerActorPage.setTheUserSInitialPassword')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus:outline-none dark:hover:text-slate-200"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="mustChangePassword"
              type="checkbox"
              checked={form.mustChangePassword}
              onChange={(e) => update({ mustChangePassword: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-800"
            />
            <label
              htmlFor="mustChangePassword"
              className="cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400"
            >
              {t('registerActorPage.requirePasswordChangeOnFirstSign')}
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/system-admin/users')}
            >
              {t('registerActorPage.cancel')}
            </Button>
            <Button
              type="submit"
              isLoading={submitting}
              loadingText={t('registerActorPage.registeringUser')}
              className="gap-2"
            >
              <UserCog className="h-4 w-4" />
              {t('registerActorPage.registerUser2')}
            </Button>
          </div>
        </form>
      </Modal>
    </PageShell>
  );
}
