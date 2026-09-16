"use client";

import { useState } from "react";
import { UserCog } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import PageShell from "@/components/shared/PageShell";
import PageSection from "@/components/shared/PageSection";
import { Button } from "@/components/ui/Button";
import { ROLE_LABELS, ROLES } from "@/constants/roles";
import type { Role } from "@/types";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

const VALID_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "learner" as Role,
};

export default function RegisterActorPage() {
  const { registerActor } = useLms();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<typeof form>) => {
    setForm((prev) => ({ ...prev, ...patch }));
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!VALID_EMAIL.test(form.email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    const result = await registerActor({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      password: form.password,
      role: form.role,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message ?? "Failed to register actor.");
      return;
    }

    setSuccess(`${form.firstName} ${form.lastName} was registered and approved — they can sign in now.`);
    setForm(EMPTY_FORM);
  };

  return (
    <PageShell
      role="system_admin"
      title="Actor Registration"
      description="Manually register a single actor with any role. The account is created already approved and active — no approval queue."
    >
      <PageSection title="New actor" description="Fill in the actor's details and choose a role.">
        <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>First name</label>
              <input
                className={inputClass}
                value={form.firstName}
                onChange={(e) => update({ firstName: e.target.value })}
                placeholder="John"
              />
            </div>
            <div>
              <label className={labelClass}>Last name</label>
              <input
                className={inputClass}
                value={form.lastName}
                onChange={(e) => update({ lastName: e.target.value })}
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="john.doe@mor.gov.et"
            />
          </div>

          <div>
            <label className={labelClass}>Phone (optional)</label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => update({ phone: e.target.value })}
              placeholder="+251911000000"
            />
          </div>

          <div>
            <label className={labelClass}>Role</label>
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => update({ role: e.target.value as Role })}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="text"
              className={inputClass}
              value={form.password}
              onChange={(e) => update({ password: e.target.value })}
              placeholder="Set the actor's initial password"
            />
          </div>

          {error ? (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{success}</p>
          ) : null}

          <Button type="submit" disabled={submitting} className="w-full justify-center gap-2">
            <UserCog className="h-4 w-4" />
            {submitting ? "Registering..." : "Register actor"}
          </Button>
        </form>
      </PageSection>
    </PageShell>
  );
}
