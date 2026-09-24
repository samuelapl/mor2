"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle, KeyRound, Lock } from "lucide-react";
import { resetPassword } from "@/lib/api/auth";
import { passwordIssues } from "@/constants/auth";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Both email and code come from the URL: /reset-password?email=...&code=...
  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Guard: if someone navigates here directly without email/code, redirect back
  if (!email || !code) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />
        <div className="relative w-full max-w-md text-center">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
            <p className="text-sm text-slate-500">
              This link is incomplete.{" "}
              <Link href="/forgot-password" className="font-semibold text-indigo-500 hover:text-indigo-700">
                Request a new code
              </Link>
            </p>
          </div>
        </div>
      </main>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const issue = passwordIssues(password);
    if (issue) { setError(issue); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setError(null);
    setSaving(true);
    try {
      await resetPassword(email, code, password);
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid or expired code. Request a new one."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">

          {done ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/20">
                <CheckCircle className="h-7 w-7" />
              </div>
              <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">
                Password updated!
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Your password has been reset. Sign in with your new password.
              </p>
              <Link
                href="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
              >
                Go to sign in
              </Link>
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                  <KeyRound className="h-7 w-7" />
                </div>
                <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">
                  Set a new password
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  At least 8 characters with a letter and a number.
                </p>
              </div>

              {/* ── Form ── */}
              <form onSubmit={handleSubmit} className="mt-7 space-y-4">
                <div>
                  <label htmlFor="password" className={labelClass}>New password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="password"
                      type="password"
                      required
                      autoComplete="new-password"
                      autoFocus
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm" className={labelClass}>Confirm password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                      placeholder="••••••••"
                      className={inputClass}
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                    {error}{" "}
                    {error.includes("expired") || error.includes("Invalid") ? (
                      <Link href="/forgot-password" className="underline hover:text-red-800">
                        Request a new code.
                      </Link>
                    ) : null}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Reset password"}
                </button>
              </form>

              <p className="mt-5 text-center text-sm text-slate-500">
                <Link
                  href={`/verify-code?email=${encodeURIComponent(email)}`}
                  className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:text-indigo-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to code entry
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}