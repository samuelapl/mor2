"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  CalendarRange,
  Check,
  ChevronDown,
  GraduationCap,
  Layers,
  PlayCircle,
  Presentation,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEMO_COURSES = 8;
const DEMO_USERS = 14;
const DEMO_SESSIONS = 12;

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
];

const STEPS = [
  {
    step: "01",
    title: "Design & build courses",
    description:
      "Course owners structure the catalog into modules, lessons and quizzes and submit them for review.",
    icon: BookOpen,
  },
  {
    step: "02",
    title: "Review & approve content",
    description:
      "Content approvers validate every course for accuracy before it is allowed to reach learners.",
    icon: BadgeCheck,
  },
  {
    step: "03",
    title: "Schedule & publish",
    description:
      "Training administrators approve, publish, and enroll staff while trainers run live sessions and quizzes.",
    icon: CalendarRange,
  },
  {
    step: "04",
    title: "Learn & get certified",
    description:
      "Learners work through courses at their own pace, take quizzes, attend live sessions and earn certificates.",
    icon: Award,
  },
];

const ROLES_BRIEF = [
  {
    title: "Course Owner",
    description: "Builds and manages the course catalog.",
    icon: BookOpen,
    hue: "from-sky-500 to-blue-600",
  },
  {
    title: "Content Approver",
    description: "Reviews courses before they go live.",
    icon: BadgeCheck,
    hue: "from-violet-500 to-purple-600",
  },
  {
    title: "Training Admin",
    description: "Publishes and schedules training.",
    icon: CalendarRange,
    hue: "from-amber-500 to-orange-600",
  },
  {
    title: "Trainer",
    description: "Delivers live sessions and quizzes.",
    icon: Presentation,
    hue: "from-emerald-500 to-teal-600",
  },
  {
    title: "Learner",
    description: "Enrolls, completes and earns certificates.",
    icon: GraduationCap,
    hue: "from-indigo-500 to-violet-600",
  },
  {
    title: "System Admin",
    description: "Governs users, roles and audit logs.",
    icon: ShieldCheck,
    hue: "from-rose-500 to-pink-600",
  },
];

const FAQS = [
  {
    question: "Is ELTMS a real production system?",
    answer:
      "No — ELTMS is a demonstration platform. It combines an interactive front-end with a live local API and database so you can try realistic workflows end-to-end. Data persists in the demo database on the machine running the app.",
  },
  {
    question: "How do I sign in?",
    answer:
      "Every role has a demo account. Use the email for the role you want to try (e.g. learner@gmail.com) with the password “password”, or tap a demo account chip on the sign-in page to auto-fill the credentials.",
  },
  {
    question: "How do role-based dashboards work?",
    answer:
      "Each account opens a dedicated dashboard tailored to that role — course owners manage courses, trainers run sessions, learners track progress, and system admins audit activity. Use “Switch role” in the sidebar to return to the sign-in page.",
  },
  {
    question: "Which account should I try first?",
    answer:
      "Start with the learner account (learner@gmail.com) to explore course progress, live sessions and certificates, then try the trainer or training administrator to see how content gets built and published.",
  },
  {
    question: "Are the courses and progress real?",
    answer:
      "The courses, sessions and user data are mock records. Actions like advancing progress, scheduling sessions and marking attendance are simulated for demonstration purposes.",
  },
  {
    question: "Can I switch between languages?",
    answer:
      "Yes. The learner pages currently support a bilingual toggle between English and Amharic (አማርኛ), with more sections planned.",
  },
];

function DashboardPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-indigo-500/30 via-violet-500/25 to-fuchsia-500/25 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl shadow-indigo-950/60 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-300">
            ELTMS · Instructor Dashboard
          </span>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-4">
          {[
            { label: "Courses", value: String(DEMO_COURSES), icon: BookOpen },
            { label: "Staff", value: String(DEMO_USERS), icon: UsersRound },
            { label: "Sessions", value: String(DEMO_SESSIONS), icon: CalendarRange },
            { label: "Modules", value: "24", icon: Layers },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>
                <stat.icon className="h-3.5 w-3.5 text-indigo-300" />
              </div>
              <p className="mt-1 font-display text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3 px-5 pb-5">
          {[
            { title: "Customs Modernization", pct: 82, color: "from-indigo-500 to-violet-500" },
            { title: "Taxpayer Service Excellence", pct: 64, color: "from-indigo-500 to-violet-500" },
            { title: "Advance Pricing Agreements", pct: 100, color: "from-emerald-500 to-teal-400" },
          ].map((row) => (
            <div
              key={row.title}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <PlayCircle className="h-4 w-4 shrink-0 text-indigo-300" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">
                {row.title}
              </span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r", row.color)}
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="w-9 text-right text-[11px] font-semibold text-white">
                {row.pct}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-300">
      <div className="pointer-events-none fixed inset-0 bg-hero-gradient" />
      <div className="pointer-events-none fixed inset-0 bg-grid-dark opacity-60" />

      {/* ---- NAV ---- */}
      <header className="sticky top-0 z-50">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-tight text-white">ELTMS</p>
              <p className="text-[10px] text-slate-400">MoR Training System</p>
            </div>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="hidden rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-95 sm:inline-flex"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      {/* ---- HERO ---- */}
      <section className="relative px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-indigo-200 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Ministry of Revenues · Ethiopia
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl">
            Modern e-learning for the{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Ministry of Revenues
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            ELTMS brings course creation, content approval, live sessions, quizzes,
            progress tracking and certificates into one connected training platform —
            built around the way the Ministry of Revenues actually works.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20 transition-all duration-200 hover:shadow-indigo-700/50 hover:brightness-110 active:scale-[0.97]"
            >
              Sign in to the platform
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-slate-200 backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              See how it works
            </a>
          </div>
          <div className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              {DEMO_COURSES} courses in the catalog
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              {DEMO_USERS} staff accounts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Live sessions & quizzes
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              Bilingual EN / አማርኛ
            </span>
          </div>
        </div>

        <div className="mt-16">
          <DashboardPreview />
        </div>
      </section>

      {/* ---- ROLES BAND ---- */}
      <section className="relative border-y border-white/5 bg-white/[0.02] px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              One platform, six roles working together
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Every function of the training lifecycle has a dedicated workspace —
              from authoring content to issuing certificates.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES_BRIEF.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-white/10"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-110",
                      role.hue,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold text-white">
                    {role.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">
                    {role.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- HOW IT WORKS ---- */}
      <section id="how-it-works" className="relative scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              How it works
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              From course idea to certificate in four steps
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              A clear approval and delivery pipeline keeps quality high and every
              stakeholder aligned.
            </p>
          </div>

          <div className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent lg:block" />
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative">
                  <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-400/30">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-900/40">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-display text-3xl font-extrabold text-white/10">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-sm font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- FAQ ---- */}
      <section id="faq" className="relative scroll-mt-20 border-y border-white/5 bg-white/[0.02] px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Everything you need to know before exploring the demo platform.
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {FAQS.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-all duration-200",
                    open
                      ? "border-indigo-400/30 bg-white/10 shadow-lg shadow-indigo-950/30"
                      : "border-white/10 bg-white/5 hover:bg-white/10",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-white">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-indigo-300 transition-transform duration-200",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-out",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-sm leading-relaxed text-slate-400">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section id="cta" className="relative scroll-mt-20 px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-600/20 via-violet-600/20 to-fuchsia-600/20 p-10 text-center backdrop-blur-xl sm:p-14">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Ready to explore ELTMS?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-300">
                Sign in with any role to experience live sessions, quizzes, progress
                tracking and certificates — all running on realistic mock data.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-indigo-950/30 transition-all duration-200 hover:bg-slate-100 active:scale-[0.97]"
                >
                  Get started now
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                >
                  View demo accounts
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-slate-400">
                All accounts use the password “password”.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="relative border-t border-white/5 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-white ring-1 ring-white/20">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-white">ELTMS</p>
              <p className="text-[10px] text-slate-500">
                Tele E-Learning Training Management System
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>Ministry of Revenues · Ethiopia</span>
            <a href="#how-it-works" className="transition-colors hover:text-slate-300">
              How it works
            </a>
            <a href="#faq" className="transition-colors hover:text-slate-300">
              FAQ
            </a>
            <Link href="/login" className="transition-colors hover:text-slate-300">
              Sign in
            </Link>
          </div>
          <p className="text-[11px] text-slate-600">
            © {new Date().getFullYear()} ELTMS · Demo prototype
          </p>
        </div>
      </footer>
    </main>
  );
}
