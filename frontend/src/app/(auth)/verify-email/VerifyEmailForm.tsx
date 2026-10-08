'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { resendVerification } from '@/lib/api/auth';
import { getRoleHomePath } from '@/constants/roles';
import { useLms } from '@/lib/lms-store';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageToggle } from '@/components/shared/LanguageToggle';
import { toast } from '@/lib/toast';

const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Self-registered accounts land here after registering, or after signing in before
 * verifying. `?email=` is the address as entered; `?dev=` carries the code in development
 * without SMTP.
 */
export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const devCode = searchParams.get('dev') ?? '';
  const { verifyEmail } = useLms();
  const { tBilingual } = useTranslation();

  const [digits, setDigits] = useState(() => (/^\d{6}$/.test(devCode) ? devCode.split('') : ['', '', '', '', '', '']));
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  // A code was just sent (registration or sign-in), so start with the cooldown running.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-advance to next box on input
  const handleDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1); // keep only last digit
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
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Paste full code at once (e.g. from email client)
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError(tBilingual('Enter all 6 digits.', 'ሁሉንም 6 አሃዞች ያስገቡ።'));
      return;
    }
    if (!email) {
      setError(tBilingual('Email is missing. Sign in again to get a new code.', 'ኢሜይል አልተገኘም። አዲስ ኮድ ለማግኘት እንደገና ይግቡ።'));
      return;
    }
    setVerifying(true);
    const result = await verifyEmail(email, code);
    if (result.ok) {
      toast.success(tBilingual('Email verified. Welcome!', 'ኢሜይልዎ ተረጋግጧል። እንኳን በደህና መጡ!'));
      router.push(getRoleHomePath(result.role, result.user?.permissions));
      return;
    }
    setError(result.message);
    setVerifying(false);
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      const res = await resendVerification(email);
      setDigits(res.devCode && /^\d{6}$/.test(res.devCode) ? res.devCode.split('') : ['', '', '', '', '', '']);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
      toast.success(tBilingual('A new code is on its way.', 'አዲስ ኮድ ተልኳል።'));
    } catch {
      setError(tBilingual('Could not resend the code. Try again.', 'ኮዱን በድጋሚ መላክ አልተቻለም። እንደገና ይሞክሩ።'));
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />
      <div className="absolute top-4 right-4 z-20">
        <LanguageToggle />
      </div>

      <div className="relative w-full max-w-md animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          {/* Header */}
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
              <MailCheck className="h-7 w-7" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">{tBilingual('Verify your email', 'ኢሜይልዎን ያረጋግጡ')}</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              {tBilingual('We sent a 6-digit code to ', 'ባለ 6-አሃዝ ኮድ ልከናል ወደ ')}
              {email ? <span className="font-semibold text-indigo-500">{email}</span> : tBilingual('your email', 'ኢሜይልዎ')}
              {tBilingual('. Enter it to activate your account. It expires in 10 minutes.', '። መለያዎን ለማንቃት ያስገቡት። በ10 ደቂቃ ውስጥ ያበቃል።')}
            </p>
          </div>

          {/* OTP boxes */}
          <div className="mt-8">
            <label className="mb-3 block text-xs font-semibold text-slate-600">{tBilingual('Verification code', 'የማረጋገጫ ኮድ')}</label>
            <div className="flex gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  aria-label={`${tBilingual('Digit', 'አሃዝ')} ${i + 1}`}
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
                disabled={resending || cooldown > 0}
                className="text-xs text-slate-500 underline-offset-2 hover:text-indigo-600 hover:underline disabled:opacity-50 disabled:hover:no-underline"
              >
                {resending
                  ? tBilingual('Sending…', 'በመላክ ላይ…')
                  : cooldown > 0
                    ? tBilingual(`Resend code in ${cooldown}s`, `ኮዱን በ${cooldown} ሰከንድ ውስጥ በድጋሚ ላክ`)
                    : tBilingual('Resend code', 'ኮዱን በድጋሚ ላክ')}
              </button>
              <Link href="/register" className="text-xs text-slate-500 underline-offset-2 hover:text-indigo-600 hover:underline">
                {tBilingual('Wrong email?', 'የተሳሳተ ኢሜይል?')}
              </Link>
            </div>
          </div>

          {error && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">{error}</div>}

          <button
            type="button"
            onClick={handleVerify}
            disabled={code.length !== 6 || verifying}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {verifying ? tBilingual('Verifying…', 'በማረጋገጥ ላይ…') : tBilingual('Verify and sign in', 'አረጋግጥና ግባ')}
          </button>

          <p className="mt-5 text-center text-sm text-slate-500">
            <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-indigo-500 hover:text-indigo-700">
              <ArrowLeft className="h-3.5 w-3.5" />
              {tBilingual('Back to sign in', 'ወደ መግቢያ ገጽ ተመለስ')}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
