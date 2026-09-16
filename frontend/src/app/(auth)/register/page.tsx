"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, CreditCard, Lock, Mail, Phone, UserRound } from "lucide-react";
import { isValidEmail, passwordIssues } from "@/constants/auth";
import { useLms } from "@/lib/lms-store";

const inputClass =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 pl-10 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";

const labelClass = "mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-600";

export default function RegisterPage() {
  const { register, ready } = useLms();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tin, setTin] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (): string | null => {
    if (!firstName.trim() || !lastName.trim()) return "First name and last name are required.";
    if (!isValidEmail(email)) return "Please enter a valid email address.";
    if (!phone.trim()) return "Phone number is required.";
    const pwdError = passwordIssues(password);
    if (pwdError) return pwdError;
    if (password !== confirmPassword) return "Confirm password must match.";
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const localError = validate();
    if (localError) {
      setError(localError);
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await register({
      firstName,
      lastName,
      email,
      phone,
      tin: tin.trim() || undefined,
      password,
      confirmPassword,
      department,
    });
    if (!result.ok) {
      setError(result.message);
      setSubmitting(false);
      return;
    }
    setSubmitted(true);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-12">
      <div className="pointer-events-none absolute inset-0 bg-hero-gradient opacity-70" />

      <div className="relative w-full max-w-lg animate-fade-in-up">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
          <div className="text-center">
            <Image
              src="/logo.jpg"
              alt="Ministry of Revenues"
              width={56}
              height={56}
              className="mx-auto h-14 w-14 rounded-full object-contain shadow-md"
            />
            <h1 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900">
              Non-staff registration
            </h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Create a learner account. Your registration requires administrator approval before
              you can sign in.
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Your account is currently awaiting approval — future public guardrails prohibit
              access until it is granted.
            </p>
          </div>

          {submitted ? (
            <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-3 font-display text-lg font-bold text-slate-900">
                Registration submitted
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Your request has been sent to the learning administration team. Once an
                administrator approves your account you will be able to sign in and start
                learning.
              </p>
              <Link
                href="/login"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110"
              >
                Back to sign in
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
          <>
          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClass}>
                    <span>First name</span>
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="firstName"
                      required
                      aria-required="true"
                      value={firstName}
                      onChange={(event) => {
                        setFirstName(event.target.value);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className={labelClass}>
                    <span>Last name</span>
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="lastName"
                      required
                      aria-required="true"
                      value={lastName}
                      onChange={(event) => {
                        setLastName(event.target.value);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="reg-email" className={labelClass}>
                  <span>Email</span>
                  <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    aria-required="true"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setError(null);
                    }}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className={labelClass}>
                    <span>Phone number</span>
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="phone"
                      required
                      aria-required="true"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.target.value);
                        setError(null);
                      }}
                      placeholder="+2519…"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tin" className={labelClass}>
                    <span>TIN</span>
                    <span className="text-xs font-normal text-slate-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="tin"
                      value={tin}
                      onChange={(event) => {
                        setTin(event.target.value);
                        setError(null);
                      }}
                      placeholder="e.g. 0012345678"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="department" className={labelClass}>
                  <span>Department / organization</span>
                  <span className="text-xs font-normal text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="department"
                    value={department}
                    onChange={(event) => {
                      setDepartment(event.target.value);
                      setError(null);
                    }}
                    placeholder="e.g. External taxpayer / Trader"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reg-password" className={labelClass}>
                    <span>Password</span>
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="reg-password"
                      type="password"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className={labelClass}>
                    <span>Confirm password</span>
                    <span className="text-red-500 font-bold" aria-hidden="true">*</span>
                    <span className="sr-only">(required)</span>
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      aria-required="true"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => {
                        setConfirmPassword(event.target.value);
                        setError(null);
                      }}
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Use at least 8 characters, including one letter and one number.
              </p>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={!ready || submitting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 disabled:opacity-50"
              >
                Submit registration
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already registered?{" "}
            <Link href="/login" className="font-semibold text-indigo-500 hover:text-indigo-700">
              Sign in
            </Link>
          </p>
          </>
          )}
        </div>
      </div>
    </main>
  );
}
