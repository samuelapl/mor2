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
import type { ApiVenue } from '@/lib/api/types';

const inputClass =
  'w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10';

const labelClass = 'mb-1.5 block text-xs font-semibold text-slate-600';

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  role: 'trainer' as Role,
  primaryVenueId: '',
};

export default function RegisterActorPage() {
  const { registerActor } = useLms();
  const { tBilingual, tRole } = useTranslation();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [venues, setVenues] = useState<ApiVenue[]>([]);

  useEffect(() => {
    void fetchVenues()
      .then(setVenues)
      .catch(() => {});
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
      });

      if (!result.ok) {
        toast.error(result.message ?? 'Failed to register actor.');
        return;
      }

      toast.success(
        `${form.firstName} ${form.lastName} was registered and approved — they can sign in now.`,
      );
      setForm(EMPTY_FORM);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to register actor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      role="system_admin"
      title={tBilingual('Actor Registration', 'የተጠቃሚ ምዝገባ')}
      description={tBilingual(
        'Manually register a single actor with any role. The account is created already approved and active — no approval queue.',
        'ማንኛውንም ሚና የያዘ ተጠቃሚ በእጅ ይመዝግቡ። መለያው በቀጥታ የጸደቀና ንቁ ሆኖ ይፈጠራል — የይሁንታ ወረፋ አይጠብቅም።',
      )}
    >
      <PageSection
        title={tBilingual('New actor', 'አዲስ ተጠቃሚ')}
        description={tBilingual(
          "Fill in the actor's details and choose a role.",
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
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {tRole(role)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>
              Primary Venue / Branch Assignment{' '}
              {form.role === 'trainer' && '(Recommended for Trainers)'}
            </label>
            <select
              className={inputClass}
              value={form.primaryVenueId}
              onChange={(e) => update({ primaryVenueId: e.target.value })}
            >
              <option value="">No Primary Venue (Virtual / Multiple Branches)</option>
              {venues.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.branch} — {v.name} ({v.capacity} seats)
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">
              Linking a trainer to their primary branch helps auto-populate venues when scheduling
              in-person sessions.
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
                "Set the actor's initial password",
                'የተጠቃሚውን የመነሻ ይለፍ ቃል ያስገቡ',
              )}
            />
          </div>

          <Button
            type="submit"
            isLoading={submitting}
            loadingText={tBilingual('Registering actor…', 'ተጠቃሚውን በመመዝገብ ላይ…')}
            className="w-full justify-center gap-2"
          >
            <UserCog className="h-4 w-4" />
            {tBilingual('Register actor', 'ተጠቃሚውን መዝግብ')}
          </Button>
        </form>
      </PageSection>
    </PageShell>
  );
}
