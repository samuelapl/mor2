"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { forgotPassword } from "@/lib/api/auth";

export default function VerifyCodeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join("");

  // Auto-advance to next box on input
  const handleDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1); // keep only last digit
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError(null);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Move back on Backspace when box is already empty
  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Paste full code at once (e.g. from email client)
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(""));
      inputRefs.current[5]?.focus();
    }
  };

  const handleContinue = () => {
    if (code.length !== 6) {
      setError("Enter all 6 digits.");
      return;
    }
    if (!email) {
      setError("Email is missing. Go back and enter your email again.");
      return;
    }
    // Pass both email and code to the password-change page via query params
    router.push(
      `/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`
    );
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setError(null);
    try {
      await forgotPassword(email);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Could not resend the code. Try again.");
    } finally {
      setResending(false);
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
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-white">
              Check your email
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">
              We sent a 6-digit code to{" "}
              {email ? (
                <span className="font-semibold text-indigo-300">{email}</span>
              ) : (
                "your email"
              )}
              . It expires in 10 minutes.
            </p>
          </div>

          {/* OTP boxes */}
          <div className="mt-8">
            <label className="mb-3 block text-xs font-semibold text-slate-600">
              Verification code
            </label>
            <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="h-14 w-full rounded-xl border border-slate-200/90 bg-white text-center text-xl font-bold text-slate-800 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                />
              ))}
            </div>

            {/* Resend */}
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-xs text-slate-400 underline-offset-2 hover:text-indigo-300 hover:underline disabled:opacity-50"
              >
                {resending ? "Sending…" : "Resend code"}
              </button>
              <Link
                href="/forgot-password"
                className="text-xs text-slate-400 underline-offset-2 hover:text-indigo-300 hover:underline"
              >
                Wrong email?
              </Link>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
              {error}
            </div>
          )}

          {/* Continue button */}
          <button
            type="button"
            onClick={handleContinue}
            disabled={code.length !== 6}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20 transition-all duration-200 hover:shadow-indigo-700/50 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            Continue
          </button>

          <p className="mt-5 text-center text-sm text-slate-400">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-1 font-semibold text-indigo-300 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
