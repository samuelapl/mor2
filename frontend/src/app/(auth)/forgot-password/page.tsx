"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Mail, Send } from "lucide-react";
import { forgotPassword } from "@/lib/api/auth";
import { isValidEmail } from "@/constants/auth";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValidEmail(email)) {
      setError("Enter a valid email address.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      // Pass email via query param so the next page knows where the code was sent
      router.push(`/verify-code?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code. Try again.");
    } finally {
      setSending(false);
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

          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-2xl shadow-indigo-900/50 ring-1 ring-white/20">
              <KeyRound className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-white">
              Forgot your password?
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              Enter your email and we&apos;ll send you a 6-digit reset code.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-600">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com"
                  className={inputClass}
                />

              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20 transition-all duration-200 hover:shadow-indigo-700/50 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <span>Send reset code</span>
                  <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>



          </form>

          <p className="mt-5 text-center text-sm text-slate-400">
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