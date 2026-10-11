'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarRange,
  ChevronDown,
  Download,
  GraduationCap,
  Monitor,
  ShieldCheck,
  FileCheck2,
  BarChart3,
  CheckCircle2,
  UserPlus,
  Users,
  Video,
} from 'lucide-react';

import { fetchLandingStats } from '@/lib/api/dashboard';
import type { ApiLandingStats as LandingStats } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import PublicHeader from '@/components/layout/PublicHeader';
import PublicFooter from '@/components/layout/PublicFooter';

export default function LandingPage() {
  const { t } = useTranslation('landing');
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState<LandingStats | null>(null);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(
      (window as any).electronAPI?.isDesktop ||
      (window as any).isElectron ||
      /electron/i.test(navigator.userAgent) ||
      document.documentElement.getAttribute('data-is-desktop') === 'true' ||
      document.documentElement.classList.contains('is-electron'),
    );
  });

  useEffect(() => {
    // Detect whether page is running inside Electron desktop shell
    if (
      typeof window !== 'undefined' &&
      ((window as any).electronAPI?.isDesktop ||
        (window as any).isElectron ||
        /electron/i.test(navigator.userAgent) ||
        document.documentElement.getAttribute('data-is-desktop') === 'true')
    ) {
      setIsDesktop(true);
    }

    let cancelled = false;
    fetchLandingStats()
      .then((data) => {
        if (!cancelled && data) {
          setStats(data);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const enterpriseFeatures = [
    {
      icon: BookOpen,
      title: t('landingPage.courseLifecycleArchitecture'),
      description: t('landingPage.authorStructuredTaxDomainCurriculaCompos'),
    },
    {
      icon: FileCheck2,
      title: t('landingPage.fourEyeReviewQualityGates'),
      description: t('landingPage.enforceInstitutionalAccountabilityConten'),
    },
    {
      icon: CalendarRange,
      title: t('landingPage.synchronousVirtualClassroom'),
      description: t('landingPage.hostScheduledWebinarsWithAutomatedAttend'),
    },
    {
      icon: BarChart3,
      title: t('landingPage.auditableCompetencyAnalytics'),
      description: t('landingPage.realTimeDashboardsAggregateCompletionRat'),
    },
    {
      icon: Award,
      title: t('landingPage.cryptographicallySignedCerts'),
      description: t('landingPage.generateTamperEvidentVerifiableCertifica'),
    },
    {
      icon: ShieldCheck,
      title: t('landingPage.govGradeAccessAuditLogs'),
      description: t('landingPage.granularRoleBasedControlsRbacEnsure'),
    },
  ];

  // Step-by-step Learner Flow from Signup to Certificate
  const learnerFlowSteps = [
    {
      step: '01',
      icon: UserPlus,
      title: t('landingPage.signUpAccountSetup'),
      description: t('landingPage.registerUsingYourMinistryCredentialsOr'),
      tag: t('landingPage.instantActivation'),
    },
    {
      step: '02',
      icon: BookOpen,
      title: t('landingPage.exploreEnrollInCourses'),
      description: t('landingPage.browseTheInstitutionalCatalogCoveringCus'),
      tag: t('landingPage.taxCustomsTracks'),
    },
    {
      step: '03',
      icon: Video,
      title: t('landingPage.interactiveLearningLiveSessions'),
      description: t('landingPage.completeMultimediaModulesAtYourOwn'),
      tag: t('landingPage.synchronousOnDemand'),
    },
    {
      step: '04',
      icon: FileCheck2,
      title: t('landingPage.assessmentsKnowledgeChecks'),
      description: t('landingPage.reinforceUnderstandingThroughModuleQuizz'),
      tag: t('landingPage.competencyEvaluated'),
    },
    {
      step: '05',
      icon: Award,
      title: t('landingPage.earnVerifiableCertificate'),
      description: t('landingPage.uponMeetingAllCompletionAndAttendance'),
      tag: t('landingPage.tamperProofQr'),
    },
  ];

  const faqs = [
    {
      question: t('landingPage.whatIsTheMinistryOfRevenues'),
      answer: t('landingPage.theMorLmsIsTheOfficial'),
    },
    {
      question: t('landingPage.howDoesALearnerEarnAnd'),
      answer: t('landingPage.learnersMustCompleteAllLessonsSatisfy'),
    },
    {
      question: t('landingPage.canIAttendLiveSessionsFrom'),
      answer: t('landingPage.yesSynchronousLiveSessionsRunOn'),
    },
    {
      question: t('landingPage.isThePlatformFullyAvailableIn'),
      answer: t('landingPage.yesTheSystemIsArchitectedWith'),
    },
  ];

  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-700 antialiased selection:bg-sky-600 selection:text-white dark:bg-slate-950 dark:text-slate-300">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05]" />

      <PublicHeader />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-20 lg:px-8 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200/80 bg-sky-50 px-4 py-1.5 text-xs font-semibold text-sky-800 shadow-sm backdrop-blur dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <span>{t('landingPage.unifiedNationalTaxCustomsTrainingPlatfor')}</span>
            </div>

            <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-6xl lg:text-7xl">
              {t('landingPage.learningManagementSystemFor')}{' '}
              <span className="bg-gradient-to-r from-sky-600 via-blue-700 to-amber-500 bg-clip-text text-transparent dark:from-sky-400 dark:via-blue-400 dark:to-amber-400">
                {t('landingPage.ministryOfRevenues')}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              {t('landingPage.aSingleStandardizedInfrastructureBridgin')}
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/login"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-700/25 transition hover:from-sky-500 hover:to-blue-600 active:scale-[0.98]"
              >
                {t('landingPage.signInToPlatform')}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </Link>

              <a
                href="#learner-flow"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300/90 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {t('landingPage.howItWorks')}
              </a>
            </div>
          </div>

          {/* REAL-TIME IMPACT METRICS CARDS */}
          <div className="mt-12 w-full">
            <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-8 xl:gap-10">
                {/* 1. Accredited Courses */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-sky-800 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-sky-700 dark:text-sky-400 sm:text-4xl">
                    {stats?.courses ? `${stats.courses}+` : '7+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                    {t('landingPage.accreditedCourses')}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('landingPage.taxCustomsPolicy')}
                  </div>
                </div>

                {/* 2. Active MoR Personnel */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-emerald-800 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 sm:text-4xl">
                    {stats?.staff ? `${stats.staff}+` : '22+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                    {t('landingPage.activeMorPersonnel')}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('landingPage.acrossAllRegionalBranches')}
                  </div>
                </div>

                {/* 3. Live Sessions Completed */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-violet-800 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 group-hover:scale-110 transition-transform">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-violet-600 dark:text-violet-400 sm:text-4xl">
                    {stats?.sessions ? `${stats.sessions}+` : '17+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                    {t('landingPage.liveSessionsCompleted')}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('landingPage.trainerLedInteractive')}
                  </div>
                </div>

                {/* 4. Verifiable Credentials */}
                <div className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-amber-800 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400 sm:text-4xl">
                    {stats?.certificates ? `${stats.certificates}+` : '1+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-slate-900 dark:text-white sm:text-sm">
                    {t('landingPage.verifiableCredentials')}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {t('landingPage.qrAuthenticated')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* PLATFORM CAPABILITIES */}
      <section id="capabilities" className="scroll-mt-16 px-4 pt-6 pb-16 sm:px-6 sm:pt-8 sm:pb-20 lg:px-8 lg:pt-10 lg:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {t('landingPage.enterpriseArchitecture')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {t('landingPage.builtForInstitutionalGovernanceAndScale')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              {t('landingPage.replaceScatteredSpreadsheetsAndUnverifie')}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enterpriseFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative rounded-2xl border border-slate-200/90 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-sky-800"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-50 text-sky-600 transition group-hover:bg-sky-600 group-hover:text-white dark:bg-sky-950/50 dark:text-sky-400">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-base font-bold text-slate-950 dark:text-white">{feat.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LEARNER JOURNEY: STEP-BY-STEP FLOW FROM SIGNUP TO CERTIFICATE */}
      <section
        id="learner-flow"
        className="scroll-mt-16 bg-slate-100/60 px-4 py-20 dark:bg-slate-900/40 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300">
              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>{t('landingPage.learnerJourney')}</span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              {t('landingPage.fromSignupToVerifiedCertification')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              {t('landingPage.aSeamless5StepPathwayFor')}
            </p>
          </div>

          {/* 5-Step Process Grid */}
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {learnerFlowSteps.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-sky-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-sky-800"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-600/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-2xl font-black text-slate-300 dark:text-slate-700">
                        {item.step}
                      </span>
                    </div>

                    <div className="mt-4 inline-block rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-950/50 dark:text-sky-300">
                      {item.tag}
                    </div>

                    <h3 className="mt-2.5 font-display text-sm font-bold text-slate-950 dark:text-white">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-1.5 text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>
                      {idx === 4
                        ? t('landingPage.accreditationComplete')
                        : t('landingPage.phaseMilestone', { value: idx + 1 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Callout */}
          <div className="mt-12 overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-r from-sky-600 via-blue-700 to-sky-800 p-8 text-white shadow-xl dark:border-sky-900 sm:p-10">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="space-y-2 text-center sm:text-left">
                <h3 className="font-display text-xl font-bold sm:text-2xl">
                  {t('landingPage.readyToAdvanceYourTaxCustoms')}
                </h3>
                <p className="text-xs text-sky-100 sm:text-sm">
                  {t('landingPage.joinThousandsOfMinistryOfRevenues')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-xs font-bold text-sky-700 shadow-md transition hover:bg-sky-50 active:scale-[0.98]"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t('landingPage.createAccount')}</span>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-xs font-bold text-white transition hover:bg-white/20 active:scale-[0.98]"
                >
                  <span>{t('landingPage.signInToPlatform')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WINDOWS DESKTOP APP SECTION - ONLY SHOWN ON WEB */}
      {!isDesktop && (
        <section id="desktop" data-desktop-app-only="true" className="scroll-mt-16 px-4 py-16 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-3xl border border-sky-200/60 bg-gradient-to-br from-slate-900 via-sky-950 to-slate-950 p-8 text-white shadow-2xl sm:p-12 lg:p-16">
              {/* Decorative Background */}
              <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

              <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
                {/* LEFT SIDE */}
                <div>
                  {/* Badge */}
                  <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300">
                    <Monitor className="h-3.5 w-3.5" />

                    <span>{t('landingPage.enterpriseClient')}</span>
                  </div>

                  {/* Heading */}
                  <h2 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                    {t('landingPage.morLmsForWindowsWorkstations')}
                  </h2>

                  {/* Description */}
                  <p className="mt-4 text-sm leading-relaxed text-slate-300 sm:text-base">
                    {t('landingPage.engineeredForMinistryBranchTrainingFacil')}
                  </p>

                  {/* Features */}
                  <div className="mt-6 grid grid-cols-1 gap-3 text-xs text-slate-300 sm:grid-cols-2">
                    {/* Windows Compatibility */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                      <span>{t('landingPage.windows101164Bit')}</span>
                    </div>

                    {/* Exam Mode */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                      <span>{t('landingPage.secureExamKioskMode')}</span>
                    </div>

                    {/* Offline Cache */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                      <span>{t('landingPage.localCourseCaching')}</span>
                    </div>

                    {/* Installer */}
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />

                      <span>{t('landingPage.windowsInstaller')}</span>
                    </div>
                  </div>
                </div>

                {/* RIGHT SIDE - DOWNLOAD CARD */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center backdrop-blur sm:p-8">
                  {/* Download Icon */}
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg">
                    <Download className="h-8 w-8" />
                  </div>

                  {/* Installer Name */}
                  <h4 className="mt-4 font-display text-lg font-bold text-white">MoR-LMS-Setup.exe</h4>

                  {/* Version */}
                  <p className="mt-1 text-xs text-slate-400">{t('landingPage.version240WindowsInstaller')}</p>

                  {/* Download Button */}
                  <a
                    href="/downloads/MoR-LMS-Setup.exe"
                    download
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-xs font-bold text-slate-950 shadow-md transition hover:bg-slate-100 active:scale-95"
                  >
                    <Download className="h-4 w-4" />

                    <span>{t('landingPage.downloadForWindows')}</span>
                  </a>

                  {/* Additional Information */}
                  <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                    {t('landingPage.compatibleWithSupported64BitWindows')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FAQ SECTION */}
      <section
        id="faq"
        className="scroll-mt-16 bg-slate-50/50 px-4 py-20 dark:bg-slate-900/30 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 dark:text-sky-400">
              {t('landingPage.clearAnswers')}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
              {t('landingPage.frequentlyAskedQuestions')}
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              {t('landingPage.keyOperationalAndTechnicalQuestionsRegar')}
            </p>
          </div>

          <div className="mt-12 space-y-3">
            {faqs.map((faq, index) => {
              const open = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className={cn(
                    'overflow-hidden rounded-2xl border transition',
                    open
                      ? 'border-sky-300 bg-sky-50/30 dark:border-sky-900/80 dark:bg-sky-950/20'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-bold text-slate-950 dark:text-white"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                        open && 'rotate-180 text-sky-600 dark:text-sky-400',
                      )}
                    />
                  </button>

                  {open && <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm">{faq.answer}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
