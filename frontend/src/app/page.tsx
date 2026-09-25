"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  Landmark,
  UsersRound,
} from "lucide-react";
import { fetchLandingStats } from "@/lib/api/dashboard";
import type { ApiLandingStats as LandingStats } from "@/lib/api/types";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { LanguageToggle } from "@/components/shared/LanguageToggle";

function DashboardPreview({ stats }: { stats: LandingStats | null }) {
  const { tBilingual } = useTranslation();

  return (
    <div className="relative mx-auto w-full max-w-3xl">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-r from-indigo-500/20 via-violet-500/15 to-fuchsia-500/15 blur-2xl" />
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-slate-900/80 shadow-2xl shadow-slate-400/30 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-slate-300">
            {tBilingual("MoR LMS · Instructor Dashboard", "የገቢዎች ሚኒስቴር ኤልኤምኤስ · የአሰልጣኝ ዳሽቦርድ")}
          </span>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-4">
          {[
            { label: tBilingual("Courses", "ኮርሶች"), value: stats ? String(stats.courses) : "—", icon: BookOpen },
            { label: tBilingual("Staff", "ሰራተኞች"), value: stats ? String(stats.staff) : "—", icon: UsersRound },
            { label: tBilingual("Sessions", "ክፍለ-ጊዜዎች"), value: stats ? String(stats.sessions) : "—", icon: CalendarRange },
            { label: tBilingual("Certificates", "ሰርተፍኬቶች"), value: stats ? String(stats.certificates) : "—", icon: Layers },
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
            { title: tBilingual("Customs Modernization", "የጉምሩክ ዘመናዊ አሰራር"), pct: 82, color: "from-indigo-500 to-violet-500" },
            { title: tBilingual("Taxpayer Service Excellence", "የላቀ የግብር ከፋዮች አገልግሎት"), pct: 64, color: "from-indigo-500 to-violet-500" },
            { title: tBilingual("Advance Pricing Agreements", "የቅድመ ዋጋ ስምምነቶች (APA)"), pct: 100, color: "from-emerald-500 to-teal-400" },
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
  const { tBilingual } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState<LandingStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLandingStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const navLinks = [
    { label: tBilingual("How it works", "እንዴት እንደሚሰራ"), href: "#how-it-works" },
    { label: tBilingual("FAQ", "ተደጋጋሚ ጥያቄዎች"), href: "#faq" },
  ];

  const steps = [
    {
      step: "01",
      title: tBilingual("Design & build courses", "ኮርሶችን ማዘጋጀትና መገንባት"),
      description: tBilingual(
        "Course owners structure the catalog into modules, lessons and quizzes and submit them for review.",
        "የኮርስ ባለቤቶች ካታሎጉን በሞጁል፣ በትምህርት እና በፈተናዎች አደራጅተው ለግምገማ ያቀርባሉ።"
      ),
      icon: BookOpen,
    },
    {
      step: "02",
      title: tBilingual("Review & approve content", "ይዘቶችን መገምገም እና ማጽደቅ"),
      description: tBilingual(
        "Content approvers validate every course for accuracy before it is allowed to reach learners.",
        "የይዘት አጽዳቂዎች ኮርሱ ለተማሪዎች ከመድረሱ በፊት ትክክለኛነቱንና ጥራቱን ያረጋግጣሉ።"
      ),
      icon: BadgeCheck,
    },
    {
      step: "03",
      title: tBilingual("Schedule & publish", "ማስተካከልና ማሰራጨት"),
      description: tBilingual(
        "Training administrators approve, publish, and enroll staff while trainers run live sessions and quizzes.",
        "የስልጠና አስተዳዳሪዎች ሰራተኞችን ይመዘግባሉ፣ ያሰራጫሉ፤ አሰልጣኞች ደግሞ የቀጥታ ክፍለ-ጊዜዎችንና ፈተናዎችን ያካሂዳሉ።"
      ),
      icon: CalendarRange,
    },
    {
      step: "04",
      title: tBilingual("Learn & get certified", "መማርና ሰርተፍኬት መቀበል"),
      description: tBilingual(
        "Learners work through courses at their own pace, take quizzes, attend live sessions and earn certificates.",
        "ተማሪዎች በራሳቸው ፍጥነት ተምረው ፈተናዎችን በማለፍ እና ቀጥታ ክፍለ-ጊዜዎችን በመከታተል ሰርተፍኬት ያገኛሉ።"
      ),
      icon: Award,
    },
  ];

  const rolesBrief = [
    {
      title: tBilingual("Course Owner", "የኮርስ ባለቤት"),
      description: tBilingual(
        "Builds and manages the course catalog.",
        "የኮርስ ካታሎጉን ያዘጋጃል እና ያስተዳድራል።"
      ),
      icon: BookOpen,
      hue: "from-sky-500 to-blue-600",
    },
    {
      title: tBilingual("Content Approver", "ይዘት አጽዳቂ"),
      description: tBilingual(
        "Reviews courses before they go live.",
        "ኮርሶች ከመሰራጨታቸው በፊት ይገመግማል እንዲሁም ያጸድቃል።"
      ),
      icon: BadgeCheck,
      hue: "from-violet-500 to-purple-600",
    },
    {
      title: tBilingual("Training Admin", "የስልጠና አስተዳዳሪ"),
      description: tBilingual(
        "Publishes and schedules training.",
        "ስልጠናዎችን ያዘጋጃል፣ ያሰራጫል እንዲሁም መርሃ-ግብር ያወጣል።"
      ),
      icon: CalendarRange,
      hue: "from-amber-500 to-orange-600",
    },
    {
      title: tBilingual("Trainer", "አሰልጣኝ"),
      description: tBilingual(
        "Delivers live sessions and quizzes.",
        "የቀጥታ ስብሰባዎችንና ፈተናዎችን ይመራል።"
      ),
      icon: Presentation,
      hue: "from-emerald-500 to-teal-600",
    },
    {
      title: tBilingual("Learner", "ተማሪ / ሰልጣኝ"),
      description: tBilingual(
        "Enrolls, completes and earns certificates.",
        "ይመዘገባል፣ ተምሮ ያጠናቅቃል እንዲሁም ሰርተፍኬት ይቀበላል።"
      ),
      icon: GraduationCap,
      hue: "from-indigo-500 to-violet-600",
    },
    {
      title: tBilingual("System Admin", "የስርዓት አስተዳዳሪ"),
      description: tBilingual(
        "Governs users, roles and audit logs.",
        "ተጠቃሚዎችን፣ የስራ ሚናዎችን እና የክትትል መዝገቦችን ያስተዳድራል።"
      ),
      icon: ShieldCheck,
      hue: "from-rose-500 to-pink-600",
    },
  ];

  const faqs = [
    {
      question: tBilingual(
        "What is the MoR Learning Management System?",
        "የገቢዎች ሚኒስቴር የስልጠና ማስተዳደሪያ ስርዓት (LMS) ምንድን ነው?"
      ),
      answer: tBilingual(
        "It is the Ministry of Revenues' training platform — a connected front-end backed by a live API and database that runs course creation, approval, scheduling, live sessions, quizzes, progress tracking and certification end-to-end.",
        "ይህ የገቢዎች ሚኒስቴር ይፋዊ የስልጠና መድረክ ሲሆን፤ የኮርስ ዝግጅትን፣ ማጽደቅን፣ መርሃ-ግብር ማውጣትን፣ የቀጥታ ስብሰባዎችን፣ ፈተናዎችን፣ የተማሪዎችን ውጤት መከታተያ እና ይፋዊ ሰርተፍኬት አሰጣጥን ሙሉ በሙሉ የሚያከናውን ዘመናዊ ስርዓት ነው።"
      ),
    },
    {
      question: tBilingual(
        "How do I sign in?",
        "እንዴት መግባት እችላለሁ?"
      ),
      answer: tBilingual(
        "Sign in with your staff account email and password. If you're evaluating the platform, demo accounts for every role are available on the sign-in page — expand the “Demo accounts” panel and tap one to auto-fill its credentials.",
        "በሰራተኛ ኢሜይልዎ እና በይለፍ ቃልዎ ይግቡ። መድረኩን ለመሞከር የሚፈልጉ ከሆነ የመግቢያ ገጹ ላይ ለሁሉም የስራ ድርሻዎች የሙከራ አካውንቶች ተዘጋጅተዋል - “Demo accounts” የሚለውን በመጫን በቀላሉ ይምረጡ።"
      ),
    },
    {
      question: tBilingual(
        "How do role-based dashboards work?",
        "የስራ ድርሻ ዳሽቦርዶች እንዴት ይሰራሉ?"
      ),
      answer: tBilingual(
        "Each account opens a dedicated dashboard tailored to that role — course owners manage courses, trainers run sessions, learners track progress, and system admins audit activity. Use “Switch role” in the sidebar to return to the sign-in page.",
        "እያንዳንዱ አካውንት ለተመደበው የስራ ድርሻ የተዘጋጀ ዳሽቦርድ ይከፍታል - የኮርስ ባለቤቶች ኮርሶችን ያስተዳድራሉ፣ አሰልጣኞች ስብሰባዎችን ይመራሉ፣ ተማሪዎች ትምህርታቸውን ይከታተላሉ፣ አስተዳዳሪዎች ደግሞ የስርዓቱን እንቅስቃሴ ይቆጣጠራሉ።"
      ),
    },
    {
      question: tBilingual(
        "Which account should I try first?",
        "መጀመሪያ የትኛውን አካውንት ልሞክር?"
      ),
      answer: tBilingual(
        "Start with the learner account (learner@gmail.com) to explore course progress, live sessions and certificates, then try the trainer or training administrator to see how content gets built and published.",
        "የኮርስ ሂደትን፣ የቀጥታ ስብሰባዎችን እና ሰርተፍኬቶችን ለመመልከት በተማሪ አካውንት (learner@gmail.com) ይጀምሩ፤ በመቀጠልም ይዘት እንዴት እንደሚዘጋጅና እንደሚሰራጭ ለማየት የአሰልጣኝ ወይም የስልጠና አስተዳዳሪ አካውንቶችን ይሞክሩ።"
      ),
    },
    {
      question: tBilingual(
        "Is course and progress data really saved?",
        "የኮርስ እና የተማሪዎች መረጃ በትክክል ይቀመጣል?"
      ),
      answer: tBilingual(
        "Yes. Courses, enrollments, live sessions, attendance and certificates are stored in the platform's database — advancing progress, scheduling sessions and marking attendance all persist for real.",
        "አዎ። ሁሉም ኮርሶች፣ ምዝገባዎች፣ የቀጥታ ስብሰባዎች፣ የተሰብሳቢዎች መዝገብ እና ሰርተፍኬቶች በመረጃ ቋት (Database) ውስጥ ተቀምጠው ይቀጥላሉ።"
      ),
    },
    {
      question: tBilingual(
        "Can I switch between languages?",
        "ቋንቋዎችን መቀያየር እችላለሁ?"
      ),
      answer: tBilingual(
        "Yes. The platform fully supports English and Amharic (አማርኛ) across all dashboards, courses, navigation, tables, and settings.",
        "አዎ። መድረኩ በሁሉም ዳሽቦርዶች፣ ኮርሶች፣ አሰሳዎች፣ ሠንጠረዦች እና ቅንብሮች ውስጥ በእንግሊዝኛ እና በአማርኛ ቋንቋዎች ሙሉ በሙሉ ይሰራል፤ በማንኛውም ጊዜ መቀያየር ይችላሉ።"
      ),
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-white text-slate-600">
      <div className="pointer-events-none fixed inset-0 bg-hero-gradient opacity-70" />

      {/* ---- NAV ---- */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.jpg"
              alt="Ministry of Revenues"
              width={36}
              height={36}
              className="h-9 w-9 rounded-full object-contain"
            />
            <div className="leading-tight">
              <p className="font-display text-sm font-bold tracking-tight text-slate-900">MoR LMS</p>
              <p className="text-[10px] text-slate-500">
                {tBilingual("Learning Management System", "የስልጠና ማስተዳደሪያ ስርዓት")}
              </p>
            </div>
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <Link
              href="/login"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              {tBilingual("Sign in", "ግባ")}
            </Link>
            <Link
              href="/login"
              className="hidden rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all hover:brightness-110 active:scale-95 sm:inline-flex"
            >
              {tBilingual("Get started", "ጀምር")}
            </Link>
          </div>
        </nav>
      </header>

      {/* ---- HERO ---- */}
      <section className="relative px-6 pb-20 pt-16 sm:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-medium text-indigo-600">
            <Landmark className="h-3.5 w-3.5" />
            {tBilingual("Ministry of Revenues · Ethiopia", "የገቢዎች ሚኒስቴር · ኢትዮጵያ")}
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            {tBilingual("Modern e-learning for the ", "ዘመናዊ የኢ-ትምህርት ለ")}
            <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
              {tBilingual("Ministry of Revenues", "ገቢዎች ሚኒስቴር")}
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-500 sm:text-lg">
            {tBilingual(
              "The MoR Learning Management System brings course creation, content approval, live sessions, quizzes, progress tracking and certificates into one connected training platform — built around the way the Ministry of Revenues actually works.",
              "የገቢዎች ሚኒስቴር የስልጠና ማስተዳደሪያ ስርዓት የኮርስ ዝግጅትን፣ የይዘት ማጽደቅን፣ የቀጥታ ስብሰባዎችን፣ ፈተናዎችን፣ የተማሪዎችን ውጤት መከታተያ እና ሰርተፍኬት አሰጣጥን በአንድ ስርዓት የሚያገናኝ ዘመናዊ መድረክ ነው።"
            )}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20 transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
            >
              {tBilingual("Sign in to the platform", "ወደ ስርዓቱ ግባ")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
            >
              {tBilingual("See how it works", "እንዴት እንደሚሰራ ተመልከት")}
            </a>
          </div>
          <div className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {stats
                ? tBilingual(`${stats.courses} courses in the catalog`, `${stats.courses} ኮርሶች በካታሎግ ውስጥ`)
                : tBilingual("Growing course catalog", "እያደገ ያለ የኮርስ ካታሎግ")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {stats
                ? tBilingual(`${stats.staff} staff accounts`, `${stats.staff} የሰራተኞች አካውንቶች`)
                : tBilingual("Staff accounts across every role", "በሁሉም የስራ ድርሻ የሰራተኞች አካውንቶች")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {tBilingual("Live sessions & quizzes", "የቀጥታ ክፍለ-ጊዜዎች እና ፈተናዎች")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              {tBilingual("Bilingual EN / አማርኛ", "ሁለት ቋንቋ እንግሊዝኛ / አማርኛ")}
            </span>
          </div>
        </div>

        <div className="mt-16">
          <DashboardPreview stats={stats} />
        </div>
      </section>

      {/* ---- ROLES BAND ---- */}
      <section className="relative border-y border-slate-200 bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {tBilingual("One platform, six roles working together", "አንድ መድረክ፣ ስድስት የጋራ የስራ ድርሻዎች")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {tBilingual(
                "Every function of the training lifecycle has a dedicated workspace — from authoring content to issuing certificates.",
                "የስልጠናው ሂደት ከይዘት ዝግጅት እስከ ሰርተፍኬት አሰጣጥ ለእያንዳንዱ የስራ ድርሻ ምቹ የስራ ቦታ አዘጋጅቷል።"
              )}
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rolesBrief.map((role) => {
              const Icon = role.icon;
              return (
                <div
                  key={role.title}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                >
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-200 group-hover:scale-110",
                      role.hue,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
                    {role.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">
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
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
              {tBilingual("How it works", "እንዴት እንደሚሰራ")}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {tBilingual("From course idea to certificate in four steps", "ከኮርስ ሀሳብ እስከ ሰርተፍኬት በአራት ደረጃዎች")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {tBilingual(
                "A clear approval and delivery pipeline keeps quality high and every stakeholder aligned.",
                "ግልጽ የይዘት ማጽደቂያ እና የስልጠና ሂደት ጥራትን በማስጠበቅ ሂደቱን የተሳለጠ ያደርገዋል።"
              )}
            </p>
          </div>

          <div className="relative mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent lg:block" />
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative">
                  <div className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-md">
                    <div className="flex items-center justify-between">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="font-display text-3xl font-extrabold text-slate-100">
                        {step.step}
                      </span>
                    </div>
                    <h3 className="mt-4 font-display text-sm font-semibold text-slate-900">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
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
      <section id="faq" className="relative scroll-mt-20 border-y border-slate-200 bg-slate-50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500">
              {tBilingual("FAQ", "ተደጋጋሚ ጥያቄዎች")}
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {tBilingual("Frequently asked questions", "ተደጋጋሚ ጥያቄዎች")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              {tBilingual(
                "Everything you need to know before exploring the demo platform.",
                "የስልጠና መድረኩን ከመጠቀምዎ በፊት ማወቅ የሚገቡዎት ጠቃሚ መረጃዎች።"
              )}
            </p>
          </div>

          <div className="mt-10 space-y-3">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className={cn(
                    "overflow-hidden rounded-2xl border transition-all duration-200",
                    open
                      ? "border-indigo-200 bg-indigo-50/50 shadow-md"
                      : "border-slate-200 bg-white hover:bg-slate-50",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-900">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-indigo-500 transition-transform duration-200",
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
                      <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500">
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
          <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-violet-50 to-fuchsia-50 p-10 text-center sm:p-14">
            <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-indigo-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-violet-200/40 blur-3xl" />
            <div className="relative">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-white/20">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {tBilingual("Ready to get started?", "ለመጀመር ዝግጁ ነዎት?")}
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
                {tBilingual(
                  "Sign in with any role to experience live sessions, quizzes, progress tracking and certificates — powered by connected backend services and database.",
                  "በማንኛውም የስራ ድርሻ በመግባት የቀጥታ ክፍለ-ጊዜዎችን፣ ፈተናዎችን፣ የተማሪዎችን ውጤት መከታተያ እና ሰርተፍኬቶችን ይለማመዱ።"
                )}
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition-all duration-200 hover:bg-slate-800 active:scale-[0.97]"
                >
                  {tBilingual("Get started now", "አሁን ይጀምሩ")}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  {tBilingual("View demo accounts", "የሙከራ አካውንቶችን ይመልከቱ")}
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-slate-500">
                {tBilingual("All accounts use the password “password”.", "ሁሉም የሙከራ አካውንቶች “password” የሚለውን የይለፍ ቃል ይጠቀማሉ።")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="relative border-t border-slate-200 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.jpg"
              alt="Ministry of Revenues"
              width={32}
              height={32}
              className="h-8 w-8 rounded-full object-contain"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">MoR LMS</p>
              <p className="text-[10px] text-slate-500">
                {tBilingual("Learning Management System", "የስልጠና ማስተዳደሪያ ስርዓት")}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span>{tBilingual("Ministry of Revenues · Ethiopia", "የገቢዎች ሚኒስቴር · ኢትዮጵያ")}</span>
            <a href="#how-it-works" className="transition-colors hover:text-slate-900">
              {tBilingual("How it works", "እንዴት እንደሚሰራ")}
            </a>
            <a href="#faq" className="transition-colors hover:text-slate-900">
              {tBilingual("FAQ", "ተደጋጋሚ ጥያቄዎች")}
            </a>
            <Link href="/login" className="transition-colors hover:text-slate-900">
              {tBilingual("Sign in", "ግባ")}
            </Link>
          </div>
          <p className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} {tBilingual("MoR Learning Management System", "የገቢዎች ሚኒስቴር የስልጠና ማስተዳደሪያ ስርዓት")}
          </p>
        </div>
      </footer>
    </main>
  );
}
