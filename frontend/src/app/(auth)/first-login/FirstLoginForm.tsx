"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Hash, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useLms } from "@/lib/lms-store";
import {
  readFirstLoginChallenge,
  resendFirstLoginCode,
  verifyFirstLoginCode,
} from "@/lib/api/auth";
import { MIN_PASSWORD_LENGTH, passwordIssues } from "@/constants/auth";
import { ROLE_PATHS } from "@/constants/roles";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "@/components/shared/LanguageToggle";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 block text-xs font-semibold text-slate-600";

/** Matches the backend's resend cooldown. */
const RESEND_COOLDOWN_SECONDS = 60;

type Challenge = { challengeToken: string; email: string };

const submitClass =
  "flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>
      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          {children}
        </div>
      </div>
    </main>
  );
}

function Rule({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-center gap-1.5 ${met ? "text-emerald-600" : "text-slate-400"}`}>
      <Check className={`h-3 w-3 ${met ? "opacity-100" : "opacity-30"}`} />
      {children}
    </li>
  );
}

export default function FirstLoginForm() {
  const router = useRouter();
  const { completeFirstLogin } = useLms();
  const { tBilingual } = useTranslation();

  // undefined = not read yet (sessionStorage is client-only), null = missing.
  const [challenge, setChallenge] = useState<Challenge | null | undefined>(undefined);
  // The code is checked on its own first; the password form only opens once it passes.
  const [step, setStep] = useState<"code" | "password">("code");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    setChallenge(readFirstLoginChallenge());
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (challenge === undefined) return null;

  if (challenge === null) {
    return (
      <Shell>
        <p className="text-center text-sm text-slate-500">
          {tBilingual("Your password-change session has expired. ", "የይለፍ ቃል መቀየሪያ ክፍለ-ጊዜዎ አልቋል። ")}
          <Link href="/login" className="font-semibold text-indigo-500 hover:text-indigo-700">
            {tBilingual("Sign in again", "እንደገና ይግቡ")}
          </Link>{" "}
          {tBilingual("to get a new code.", "አዲስ ኮድ ለማግኘት።")}
        </p>
      </Shell>
    );
  }

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setNotice(null);
    try {
      const res = await resendFirstLoginCode(challenge.challengeToken);
      setNotice(
        tBilingual(
          `A new code was sent to ${res.email}.`,
          `አዲስ ኮድ ወደ ${res.email} ተልኳል።`
        )
      );
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setCode("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tBilingual("Could not resend the code. Try again.", "ኮዱን መላክ አልተቻለም። እንደገና ይሞክሩ።")
      );
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    if (code.length !== 6) {
      setError(tBilingual("Enter all 6 digits.", "ሁሉንም 6 አሃዞች ያስገቡ።"));
      return;
    }
    setError(null);
    setNotice(null);
    setSaving(true);
    try {
      await verifyFirstLoginCode(challenge.challengeToken, code);
      setStep("password");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : tBilingual("Invalid or expired code. Try again.", "ልክ ያልሆነ ወይም ጊዜው ያለፈበት ኮድ። እንደገና ይሞክሩ።")
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const issue = passwordIssues(password);
    if (issue) {
      setError(issue);
      return;
    }
    if (password !== confirm) {
      setError(tBilingual("Passwords do not match.", "የይለፍ ቃሎች አይዛመዱም።"));
      return;
    }
    setError(null);
    setSaving(true);
    const result = await completeFirstLogin({
      code,
      newPassword: password,
      confirmPassword: confirm,
    });
    setSaving(false);
    if (result.ok) {
      router.push(ROLE_PATHS[result.role]);
      return;
    }
    setError(result.message);
  };

  const backToCode = () => {
    setStep("code");
    setError(null);
    setNotice(null);
  };

  const sessionExpired = error?.toLowerCase().includes("sign in again") ?? false;

  const messages = (
    <>
      {notice && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-700">
          {notice}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
          {error}{" "}
          {sessionExpired ? (
            <Link href="/login" className="underline hover:text-red-800">
              {tBilingual("Go to sign in.", "ወደ መግቢያ ገጽ ይሂዱ።")}
            </Link>
          ) : null}
        </div>
      )}
    </>
  );

  if (step === "code") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">
            {tBilingual("Verify your email", "ኢሜይልዎን ያረጋግጡ")}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {tBilingual(
              "Your account was created by an administrator. We sent a 6-digit code to ",
              "አካውንትዎ በአስተዳዳሪ ተፈጥሯል። ባለ 6-አሃዝ ኮድ ልከናል ወደ "
            )}
            <span className="font-semibold text-slate-800">{challenge.email}</span>
            {tBilingual(" — enter it below to continue.", " — ለመቀጠል ከታች ያስገቡት።")}
          </p>
        </div>

        <form onSubmit={handleVerify} className="mt-7 space-y-4">
          <div>
            <label htmlFor="code" className={labelClass}>
              {tBilingual("Verification code", "የማረጋገጫ ኮድ")}
            </label>
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={6}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.replace(/\D/g, ""));
                  setError(null);
                }}
                placeholder="123456"
                className={`${inputClass} tracking-[0.3em]`}
              />
            </div>
            <div className="mt-1.5 text-right text-xs">
              {cooldown > 0 ? (
                <span className="text-slate-500">
                  {tBilingual(`Resend code in ${cooldown}s`, `ኮዱን በድጋሚ ላክ በ ${cooldown}ሰከንድ`)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-indigo-500 hover:text-indigo-700 disabled:opacity-50"
                >
                  {resending
                    ? tBilingual("Sending…", "በመላክ ላይ…")
                    : tBilingual("Resend code", "ኮዱን በድጋሚ ላክ")}
                </button>
              )}
            </div>
          </div>

          {messages}

          <button
            type="submit"
            disabled={saving || code.length !== 6}
            className={submitClass}
          >
            {saving
              ? tBilingual("Verifying…", "በማረጋገጥ ላይ…")
              : tBilingual("Verify code", "ኮዱን አረጋግጥ")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:text-indigo-700"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {tBilingual("Back to sign in", "ወደ መግቢያ ገጽ ተመለስ")}
          </Link>
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">
          {tBilingual("Set your own password", "የራስዎን የይለፍ ቃል ያስገቡ")}
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          {tBilingual(
            "Email verified. Choose a new password for your account.",
            "ኢሜይልዎ ተረጋግጧል። ለአካውንትዎ አዲስ የይለፍ ቃል ይምረጡ።"
          )}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="password" className={labelClass}>
            {tBilingual("New password", "አዲስ የይለፍ ቃል")}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="password"
              type="password"
              required
              autoFocus
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className={labelClass}>
            {tBilingual("Confirm password", "የይለፍ ቃል አረጋግጥ")}
          </label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => {
                setConfirm(e.target.value);
                setError(null);
              }}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-1 text-[11px]">
          <Rule met={password.length >= MIN_PASSWORD_LENGTH}>
            {tBilingual(`${MIN_PASSWORD_LENGTH}+ characters`, `${MIN_PASSWORD_LENGTH}+ ቁምፊዎች`)}
          </Rule>
          <Rule met={/[A-Za-z]/.test(password)}>
            {tBilingual("A letter", "ፊደል")}
          </Rule>
          <Rule met={/[0-9]/.test(password)}>
            {tBilingual("A number", "ቁጥር")}
          </Rule>
          <Rule met={password.length > 0 && password === confirm}>
            {tBilingual("Passwords match", "የይለፍ ቃሎች ይዛመዳሉ")}
          </Rule>
        </ul>

        {messages}

        <button type="submit" disabled={saving} className={submitClass}>
          {saving
            ? tBilingual("Saving…", "በማስቀመጥ ላይ…")
            : tBilingual("Set password and continue", "የይለፍ ቃል አዘጋጅተህ ቀጥል")}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        <button
          type="button"
          onClick={backToCode}
          className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:text-indigo-700"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {tBilingual("Back to verification", "ወደ ማረጋገጫ ተመለስ")}
        </button>
      </p>
    </Shell>
  );
}
