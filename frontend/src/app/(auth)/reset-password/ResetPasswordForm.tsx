"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Lock } from "lucide-react";
import { resetPassword } from "@/lib/api/auth";
import { passwordIssues } from "@/constants/auth";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("This reset link is invalid or incomplete. Request a new one.");
      return;
    }
    const issue = passwordIssues(password);
    if (issue) {
      setError(issue);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "This reset link is invalid or has expired.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient" />
      <div className="pointer-events-none absolute inset-0 bg-grid-dark opacity-60" />
      <div className="pointer-events-none absolute -top-24 left-1/3 h-96 w-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-6 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-2xl shadow-indigo-900/50 ring-1 ring-white/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-white">
              Set a new password
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              At least 8 characters with a letter and a number.
            </p>
          </div>

          {done ? (
            <div className="mt-7 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
              Your password has been reset successfully.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div>
                <label htmlFor="password" className={labelClass}>
                  New password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className={labelClass}>
                  Confirm password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="confirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => {
                      setConfirm(event.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20 transition-all duration-200 hover:shadow-indigo-700/50 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Reset password"}
              </button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-slate-400">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 font-semibold text-indigo-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}