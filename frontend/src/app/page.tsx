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
    <main className="relative min-h-screen bg-background text-secondary-foreground antialiased selection:bg-sky-600 selection:text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(#0284c7_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] dark:opacity-[0.05]" />

      <PublicHeader />

      {/* HERO SECTION */}
      <section className="relative overflow-hidden px-4 pb-8 pt-12 sm:px-6 sm:pb-10 sm:pt-20 lg:px-8 lg:pb-12">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-info/25 bg-info-soft px-4 py-1.5 text-xs font-semibold text-info shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              <span>{t('landingPage.unifiedNationalTaxCustomsTrainingPlatfor')}</span>
            </div>

            <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              {t('landingPage.learningManagementSystemFor')}{' '}
              <span className="bg-gradient-to-r from-info via-info to-warning bg-clip-text text-transparent">
                {t('landingPage.ministryOfRevenues')}
              </span>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-secondary-foreground sm:text-lg">
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
                className="inline-flex items-center gap-2 rounded-xl border border-input/90 bg-card px-6 py-3.5 text-sm font-semibold text-secondary-foreground shadow-sm transition hover:bg-muted"
              >
                {t('landingPage.howItWorks')}
              </a>
            </div>
          </div>

          {/* REAL-TIME IMPACT METRICS CARDS */}
          <div className="mt-12 w-full">
            <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4 lg:gap-8 xl:gap-10">
                {/* 1. Accredited Courses */}
                <div className="group relative overflow-hidden rounded-2xl border border-border/90 bg-card p-5 sm:p-6 shadow-sm transition hover:-translate-y-1 hover:border-info/30 hover:shadow-md text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info group-hover:scale-110 transition-transform">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-info sm:text-4xl">
                    {stats?.courses ? `${stats.courses}+` : '7+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-foreground sm:text-sm">
                    {t('landingPage.accreditedCourses')}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t('landingPage.taxCustomsPolicy')}
                  </div>
                </div>

                {/* 2. Active MoR Personnel */}
                <div className="group relative overflow-hidden rounded-2xl border border-border/90 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-success/30 hover:shadow-md text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success group-hover:scale-110 transition-transform">
                    <Users className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-success sm:text-4xl">
                    {stats?.staff ? `${stats.staff}+` : '22+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-foreground sm:text-sm">
                    {t('landingPage.activeMorPersonnel')}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t('landingPage.acrossAllRegionalBranches')}
                  </div>
                </div>

                {/* 3. Live Sessions Completed */}
                <div className="group relative overflow-hidden rounded-2xl border border-border/90 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-accent/30 hover:shadow-md text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent group-hover:scale-110 transition-transform">
                    <Video className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-accent sm:text-4xl">
                    {stats?.sessions ? `${stats.sessions}+` : '17+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-foreground sm:text-sm">
                    {t('landingPage.liveSessionsCompleted')}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {t('landingPage.trainerLedInteractive')}
                  </div>
                </div>

                {/* 4. Verifiable Credentials */}
                <div className="group relative overflow-hidden rounded-2xl border border-border/90 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-warning/30 hover:shadow-md text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-warning-soft text-warning group-hover:scale-110 transition-transform">
                    <Award className="h-5 w-5" />
                  </div>
                  <div className="font-display text-3xl font-extrabold tracking-tight text-warning sm:text-4xl">
                    {stats?.certificates ? `${stats.certificates}+` : '1+'}
                  </div>
                  <div className="mt-2.5 text-xs font-bold text-foreground sm:text-sm">
                    {t('landingPage.verifiableCredentials')}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
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
            <p className="text-xs font-bold uppercase tracking-widest text-info">
              {t('landingPage.enterpriseArchitecture')}
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('landingPage.builtForInstitutionalGovernanceAndScale')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-secondary-foreground sm:text-base">
              {t('landingPage.replaceScatteredSpreadsheetsAndUnverifie')}
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enterpriseFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group relative rounded-2xl border border-border/90 bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:border-info/30 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info-soft text-info transition group-hover:bg-sky-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 font-display text-base font-bold text-foreground">{feat.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-secondary-foreground sm:text-sm">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* LEARNER JOURNEY: STEP-BY-STEP FLOW FROM SIGNUP TO CERTIFICATE */}
      <section
        id="learner-flow"
        className="scroll-mt-16 bg-secondary/60 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-info/30 bg-info-soft px-3.5 py-1 text-xs font-semibold text-info">
              <GraduationCap className="h-4 w-4 text-info" />
              <span>{t('landingPage.learnerJourney')}</span>
            </div>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              {t('landingPage.fromSignupToVerifiedCertification')}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-secondary-foreground sm:text-base">
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
                  className="group relative flex flex-col justify-between rounded-2xl border border-border/90 bg-card p-6 shadow-sm transition hover:-translate-y-1 hover:border-info/30 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm shadow-sky-600/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-mono text-2xl font-black text-subtle-foreground">
                        {item.step}
                      </span>
                    </div>

                    <div className="mt-4 inline-block rounded-md bg-info-soft px-2 py-0.5 text-[10px] font-bold text-info">
                      {item.tag}
                    </div>

                    <h3 className="mt-2.5 font-display text-sm font-bold text-foreground">
                      {item.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-secondary-foreground">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center gap-1.5 text-[11px] font-semibold text-info">
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
          <div className="mt-12 overflow-hidden rounded-3xl border border-info/30 bg-gradient-to-r from-sky-600 via-blue-700 to-sky-800 p-8 text-white shadow-xl sm:p-10">
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
                  className="inline-flex items-center gap-2 rounded-xl bg-card px-5 py-3 text-xs font-bold text-info shadow-md transition hover:bg-info-soft active:scale-[0.98]"
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
                  <p className="mt-4 text-sm leading-relaxed text-subtle-foreground sm:text-base">
                    {t('landingPage.engineeredForMinistryBranchTrainingFacil')}
                  </p>

                  {/* Features */}
                  <div className="mt-6 grid grid-cols-1 gap-3 text-xs text-subtle-foreground sm:grid-cols-2">
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
                  <p className="mt-1 text-xs text-subtle-foreground">{t('landingPage.version240WindowsInstaller')}</p>

                  {/* Download Button */}
                  <a
                    href="/downloads/MoR-LMS-Setup.exe"
                    download
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-card px-6 py-3.5 text-xs font-bold text-foreground shadow-md transition hover:bg-secondary active:scale-95"
                  >
                    <Download className="h-4 w-4" />

                    <span>{t('landingPage.downloadForWindows')}</span>
                  </a>

                  {/* Additional Information */}
                  <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
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
        className="scroll-mt-16 bg-muted/50 px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-info">
              {t('landingPage.clearAnswers')}
            </span>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground">
              {t('landingPage.frequentlyAskedQuestions')}
            </h2>
            <p className="mt-3 text-sm text-secondary-foreground">
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
                      ? 'border-info/30 bg-info-soft/30'
                      : 'border-border bg-card',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : index)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-bold text-foreground"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-subtle-foreground transition-transform duration-200',
                        open && 'rotate-180 text-info',
                      )}
                    />
                  </button>

                  {open && <div className="px-5 pb-5 pt-1 text-xs leading-relaxed text-secondary-foreground sm:text-sm">{faq.answer}</div>}
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
