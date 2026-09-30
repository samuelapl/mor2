'use client';

import { useEffect, useState } from 'react';
import { Building2, UserCog } from 'lucide-react';
import { useLms } from '@/lib/lms-store';
import PageShell from '@/components/shared/PageShell';
import PageSection from '@/components/shared/PageSection';
import { Button } from '@/components/ui/Button';
import { ROLE_LABELS, ROLES } from '@/constants/roles';
import { useTranslation } from '@/lib/i18n/useTranslation';
import type { Role } from '@/types';
import { toast } from '@/lib/toast';
import { fetchVenues } from '@/lib/api/venues';
import { fetchRolesWithPermissions } from '@/lib/api/permissions';
import type { ApiVenue } from '@/lib/api/types';

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
  const { currentUser, registerActor } = useLms();
  const { tBilingual, tRole } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
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
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register user.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      role={currentUser?.role ?? 'system_admin'}
      title={tBilingual('User Registration', 'የተጠቃሚ ምዝገባ')}
      description={tBilingual(
        'Manually register a user with any role. The account is created already approved and active — no approval queue.',
        'ማንኛውንም ሚና የያዘ ተጠቃሚ በእጅ ይመዝግቡ። መለያው በቀጥታ የጸደቀና ንቁ ሆኖ ይፈጠራል — የይሁንታ ወረፋ አይጠብቅም።',
      )}
    >
      <PageSection
        title={tBilingual('New user', 'አዲስ ተጠቃሚ')}
        description={tBilingual(
          "Fill in the user's details and choose a role.",
          'የተጠቃሚውን ዝርዝሮች ይሙሉ እና ሚና ይምረጡ።',
        )}
      >
        <form
          onSubmit={handleSubmit}
          className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{tBilingual('First name', 'ስም')}</label>
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
                placeholder="Abebe"
              />
            </div>
            <div>
              <label className={labelClass}>{tBilingual('Last name', 'የአባት ስም')}</label>
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
                placeholder="Kebede"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>{tBilingual('Email', 'ኢሜይል')}</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="abebe.kebede@mor.gov.et"
            />
          </div>

          <div>
            <label className={labelClass}>{tBilingual('Phone (optional)', 'ስልክ (አማራጭ)')}</label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+251911000000"
            />
          </div>

          <div>
            <label className={labelClass}>{tBilingual('Role', 'ሚና')}</label>
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
              {tBilingual('Primary Venue / Branch Assignment', 'ዋና የስልጠና ማዕከል / ቅርንጫፍ ምደባ')}{' '}
              {form.role === 'trainer' && `(${tBilingual('Recommended for Trainers', 'ለአሰልጣኞች የሚመከር')})`}
            </label>
            <select
              className={inputClass}
              value={form.primaryVenueId}
              onChange={(e) => update({ primaryVenueId: e.target.value })}
            >
              <option value="">{tBilingual('No Primary Venue (Virtual / Multiple Branches)', 'ዋና ማዕከል የለም (ምናባዊ / በርካታ ቅርንጫፎች)')}</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.branch} — {v.name} ({v.capacity} {tBilingual('seats', 'ወንበሮች')})
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              {tBilingual(
                'Linking a trainer to their primary branch helps auto-populate venues when scheduling in-person sessions.',
                'አሰልጣኝን ከዋና ቅርንጫፋቸው ጋር ማገናኘት በአካል የሚሰጡ ክፍለ-ጊዜዎችን ሲመድቡ ማዕከላትን በራስ-ሰር ለመሙላት ይረዳል።',
              )}
            </p>
          </div>

          <div>
            <label className={labelClass}>{tBilingual('Password', 'የይለፍ ቃል')}</label>
            <input
              type="text"
              className={inputClass}
              value={form.password}
              onChange={(e) => update({ password: e.target.value })}
              placeholder={tBilingual(
                "Set the user's initial password",
                'የተጠቃሚውን የመነሻ ይለፍ ቃል ያስገቡ',
              )}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              id="mustChangePassword"
              type="checkbox"
              checked={form.mustChangePassword}
              onChange={(e) => update({ mustChangePassword: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label
              htmlFor="mustChangePassword"
              className="text-xs text-slate-600 dark:text-slate-400 select-none cursor-pointer"
            >
              {tBilingual(
                'Require password change on first sign-in (sends email code)',
                'በመጀመሪያው መግቢያ ላይ የይለፍ ቃል መቀየር ይጠይቁ (የኢሜይል ኮድ ይልካል)',
              )}
            </label>
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            loadingText={tBilingual('Registering user…', 'ተጠቃሚውን በመመዝገብ ላይ…')}
            className="w-full justify-center gap-2"
          >
            <UserCog className="h-4 w-4" />
            {tBilingual('Register user', 'ተጠቃሚውን መዝግብ')}
          </Button>
        </form>
      </PageSection>
    </PageShell>
  );
}
