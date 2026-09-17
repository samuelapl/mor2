"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import { Button } from "@/components/ui/Button";
import { passwordIssues } from "@/constants/auth";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

const EMPTY_FORM = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function SecurityTab() {
  const { changePassword } = useLms();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.currentPassword) {
      setError("Enter your current password.");
      return;
    }
    const issue = passwordIssues(form.newPassword);
    if (issue) {
      setError(issue);
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setSaving(true);
    const result = await changePassword({
      currentPassword: form.currentPassword,
      newPassword: form.newPassword,
    });
    setSaving(false);

    if (!result.ok) {
      setError(result.message ?? "Failed to change password.");
      return;
    }
    setSuccess("Password changed. You'll need to sign in again on your other devices.");
    setForm(EMPTY_FORM);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm space-y-4">
      <div>
        <label className={labelClass}>Current password</label>
        <input
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={form.currentPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
        />
      </div>
      <div>
        <label className={labelClass}>New password</label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={form.newPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
          placeholder="At least 8 characters with a letter and a number"
        />
      </div>
      <div>
        <label className={labelClass}>Confirm new password</label>
        <input
          type="password"
          autoComplete="new-password"
          className={inputClass}
          value={form.confirmPassword}
          onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
        />
      </div>

      {error ? <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600">{error}</p> : null}
      {success ? (
        <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700">{success}</p>
      ) : null}

      <Button type="submit" disabled={saving} className="gap-2">
        <KeyRound className="h-4 w-4" />
        {saving ? "Changing..." : "Change password"}
      </Button>
    </form>
  );
}
