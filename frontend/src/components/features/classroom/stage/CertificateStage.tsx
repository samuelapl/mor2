'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  Building2,
  CheckCircle2,
  Download,
  Lock,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import { formatSessionDateTime } from '@/lib/app-time';
import type { Course } from '@/types';
import type {
  ApiCourseProgress,
  ApiCertificate,
  ApiCertificateTemplate,
  ApiUser,
  ApiMissingSession,
} from '@/lib/api/types';
import {
  fetchMyCertificates,
  claimCertificate,
  fetchActiveCertificateTemplate,
  downloadCertificateDirectly,
} from '@/lib/api/certificates';
import { fetchMyProfile } from '@/lib/api/users';
import { CertificateRenderer } from '../../certificates/CertificateRenderer';
import { CourseFeedbackSurvey } from './CourseFeedbackSurvey';
import { CourseGradeSummary } from './CourseGradeSummary';
import { hasSubmittedFeedback, hasSkippedFeedback, markFeedbackSkipped } from '@/lib/api/feedback';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { calculateEstimatedHours, getCourseDurationMinutes } from '@/lib/duration';
import { missingLiveSessions } from '@/lib/live-attendance';

interface CertificateStageProps {
  course: Course;
  progress?: ApiCourseProgress | null;
  courseId: string;
  unlocked: boolean;
}

export function CertificateStage({ course, progress, courseId, unlocked }: CertificateStageProps) {
  const { t } = useTranslation('classroom');
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [certificate, setCertificate] = useState<ApiCertificate | null>(null);
  const [template, setTemplate] = useState<ApiCertificateTemplate | null>(null);
  const [user, setUser] = useState<ApiUser | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [feedbackSkipped, setFeedbackSkipped] = useState(false);

  const isInPerson = course.deliveryMode === 'IN_PERSON_ONLY';

  // The backend's eligibility verdict is the only source of truth: it requires all content,
  // every assessment passed, AND the weighted course grade at the global pass mark.
  const isCompleted = !isInPerson && (progress ? progress.courseCompletion.certificateEligible : unlocked);

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [profile, activeTpl, myCerts] = await Promise.all([
          fetchMyProfile().catch(() => null),
          fetchActiveCertificateTemplate().catch(() => null),
          fetchMyCertificates().catch(() => []),
        ]);

        if (!mounted) return;
        if (profile) {
          setUser(profile);
          const alreadySubmitted = hasSubmittedFeedback(courseId, profile.id);
          const alreadySkipped = hasSkippedFeedback(courseId, profile.id);
          if (alreadySubmitted) {
            setFeedbackDone(true);
          } else if (alreadySkipped) {
            setFeedbackSkipped(true);
          }
        }
        if (activeTpl) setTemplate(activeTpl);

        const existing = myCerts.find(
          (c) => c.course?.id === courseId || (c as any).courseId === courseId,
        );

        if (existing) {
          setCertificate(existing);
        } else if (
          isCompleted &&
          (feedbackDone ||
            feedbackSkipped ||
            (profile && (hasSubmittedFeedback(courseId, profile.id) || hasSkippedFeedback(courseId, profile.id))))
        ) {
          try {
            setClaiming(true);
            const claimed = await claimCertificate(courseId);
            if (mounted && claimed) {
              setCertificate(claimed);
            }
          } catch (claimErr) {
            console.warn('Notice claiming certificate:', claimErr);
          } finally {
            if (mounted) setClaiming(false);
          }
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to load certificate data.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void init();

    return () => {
      mounted = false;
    };
  }, [courseId, isCompleted, feedbackDone, feedbackSkipped]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!certificate) {
      window.print();
      return;
    }
    try {
      const filename = `${certificate.certificateNumber || 'certificate'}.pdf`;
      await downloadCertificateDirectly(certificate.id, 'en', filename);
    } catch {
      if (certificate.downloadUrl) {
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = certificate.downloadUrl;
        a.download = `${certificate.certificateNumber || 'certificate'}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) document.body.removeChild(a);
        }, 1000);
      } else {
        window.print();
      }
    }
  };

  const handleCopyVerification = () => {
    const code = certificate?.verificationCode;
    if (!code) return;
    const url = `${window.location.origin}/verify?code=${encodeURIComponent(code)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recipientName =
    `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() ||
    (certificate?.user?.firstName
      ? `${certificate.user.firstName} ${certificate.user.lastName}`.trim()
      : 'Meron Kassa');

  const issueDateFormatted = certificate?.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

  const estimatedHours = calculateEstimatedHours(getCourseDurationMinutes(course)) || 12;

  if (loading) {
    return (
      <div className="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        <p className="text-sm font-medium">
          {t('certificateStage.retrievingOfficialCertificationCredentia')}
        </p>
      </div>
    );
  }

  // 1. Locked State: Course not yet completed (a certificate already issued is always shown)
  if (!isCompleted && !certificate) {
    const totalLessons =
      progress?.stats.totalLessons ?? course.modules.flatMap((m) => m.lessons).length;
    const completedLessons = progress?.stats.completedLessons ?? 0;
    // This checklist item is about lessons only; assessments have their own items below.
    const lessonPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
    const finalAssessment = progress?.courseCompletion.finalAssessment;
    const finalPassed = progress?.courseCompletion.finalAssessmentPassed ?? false;

    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
        {/* Locked Header Card */}
        <div className="rounded-2xl border border-warning/25 bg-gradient-to-br from-warning-soft/70 via-card to-warning-soft/40 p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-soft/80 text-warning ring-8 ring-warning-soft">
            {isInPerson ? <Building2 className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>

          <div className="space-y-1.5 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft/90 text-warning px-3 py-1 text-xs font-semibold">
              <Award className="h-3.5 w-3.5" />
              {t('certificateStage.verifiedCertificateOfCompletion')}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {isInPerson
                ? t('certificateStage.certificatePendingClassroomCompletion')
                : t('certificateStage.certificateCurrentlyLocked')}
            </h2>
            <p className="text-sm text-secondary-foreground leading-relaxed">
              {isInPerson
                ? t('certificateStage.forInPersonPracticumCoursesCertification')
                : t('certificateStage.completeAllLessonsExercisesAndRequired')}
            </p>
          </div>

          {/* Progress Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-secondary-foreground">
                  {t('certificateStage.courseLessonsCompleted')}
                </span>
                <span className="font-mono text-primary">
                  {completedLessons}/{totalLessons} ({lessonPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${lessonPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-secondary-foreground">
                  {isInPerson
                    ? t('classroomSidebar.inPersonClassroomEvaluation')
                    : t('certificateStage.finalCertificationExam')}
                </span>
                {isInPerson ? (
                  <span className="inline-flex items-center gap-1 text-warning font-bold text-[11px] bg-warning-soft border border-warning/30 px-2 py-0.5 rounded-full">
                    <Building2 className="h-3 w-3" /> {t('certificateStage.trainerAdministered')}
                  </span>
                ) : finalPassed ? (
                  <span className="inline-flex items-center gap-1 text-success font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('certificateStage.passed')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-warning font-bold">
                    <Lock className="h-3.5 w-3.5" /> {t('certificateStage.required')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                {isInPerson
                  ? t('certificateStage.assessedPhysicallyAtTheTrainingVenue')
                  : finalAssessment
                    ? t('certificateStage.achievePassingScoreOnTheFinal')
                    : t('certificateStage.allCurriculumTopicsMustBeReviewed')}
              </p>
            </div>
          </div>
        </div>

        {!isInPerson && missingLiveSessions(progress).length > 0 && (
          <PendingSessionsNotice sessions={missingLiveSessions(progress)} />
        )}
      </div>
    );
  }

  // 2. Pre-Certificate Feedback Gate (Optional):
  // If the course is completed, but the student hasn't submitted or skipped feedback yet, offer the survey with skip option!
  const userFeedbackGivenOrSkipped =
    feedbackDone ||
    feedbackSkipped ||
    (user
      ? hasSubmittedFeedback(courseId, user.id) || hasSkippedFeedback(courseId, user.id)
      : false);

  const handleClaimCertificate = async () => {
    if (certificate) return;
    try {
      setClaiming(true);
      const claimed = await claimCertificate(courseId);
      if (claimed) setCertificate(claimed);
    } catch (claimErr) {
      console.warn('Notice claiming certificate:', claimErr);
    } finally {
      setClaiming(false);
    }
  };

  if (!userFeedbackGivenOrSkipped) {
    return (
      <CourseFeedbackSurvey
        course={course}
        user={user}
        onSubmitted={async () => {
          setFeedbackDone(true);
          await handleClaimCertificate();
        }}
        onSkip={async () => {
          setFeedbackSkipped(true);
          if (user) {
            markFeedbackSkipped(courseId, user.id);
          }
          await handleClaimCertificate();
        }}
      />
    );
  }

  // 3. Unlocked State: Certificate Ready or Claiming
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in print:p-0 print:m-0">
      {/* Celebration Header Card (Hidden on Print) */}
      <div className="rounded-2xl border border-success/30 bg-gradient-to-r from-success-soft via-success-soft/40 to-card p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft text-success px-3 py-1 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {t('certificateStage.courseCompletedCertified')}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              Cert #{certificate?.certificateNumber || 'ETIMS-2026-PENDING'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {t('certificateStage.officialCertificateOfCompletion')}{' '}
            <Award className="h-5 w-5 text-amber-500 shrink-0" />
          </h2>
          <p className="text-xs md:text-sm text-secondary-foreground">
            {t('certificateStage.congratulationsYourCredentialsHaveBeenOf', { recipientName })}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyVerification}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-secondary-foreground shadow-2xs hover:bg-muted transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success" />
                {t('certificateStage.copiedLink')}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                {t('certificateStage.copyVerification')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-secondary-foreground shadow-2xs hover:bg-muted transition"
          >
            <Printer className="h-3.5 w-3.5 text-secondary-foreground" />
            {t('certificateStage.print')}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-950 text-amber-400 hover:bg-slate-900 text-xs font-bold shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5" />
            {t('certificateStage.downloadPdf')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-xs text-danger flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Certificate Viewport */}
      <div className="rounded-2xl border border-border/80 bg-card p-3 md:p-6 shadow-md overflow-x-auto print:border-none print:shadow-none print:p-0">
        <CertificateRenderer
          template={template}
          studentName={recipientName}
          courseTitle={course.title}
          completionDate={issueDateFormatted}
          certificateNumber={certificate?.certificateNumber || 'ETIMS-CERT-2026-001'}
          verificationCode={certificate?.verificationCode || 'VERIFY-ETIMS'}
          durationHours={estimatedHours}
        />
      </div>

      {/* Verification footer note */}
      <div className="text-center text-xs text-subtle-foreground pb-8 print:hidden">
        <p>
          {t('certificateStage.thisCredentialCanBePubliclyVerified')}{' '}
          <span className="font-mono text-secondary-foreground">
            {typeof window !== 'undefined' ? window.location.origin : ''}/verify
          </span>{' '}
          {t('certificateStage.usingCode')}{' '}
          <strong className="font-mono text-secondary-foreground">
            {certificate?.verificationCode || '—'}
          </strong>
          .
        </p>
      </div>
    </div>
  );
}

/**
 * Live sessions still to attend: the certificate waits for every one. A missed session is
 * rescheduled, so each shows its next round, or that none is scheduled yet.
 */
function PendingSessionsNotice({ sessions }: { sessions: ApiMissingSession[] }) {
  const { isAmharic, t } = useTranslation('classroom');
  return (
    <div className="flex gap-3 rounded-2xl border border-info/30 bg-info-soft/80 p-5 text-left">
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-info" />
      <div className="space-y-2">
        <p className="text-sm font-bold text-info">
          {t(sessions.length === 1 ? 'pendingSessions.remainingOne' : 'pendingSessions.remainingOther', { count: sessions.length })}
        </p>
        <ul className="space-y-1 text-sm text-info/90">
          {sessions.map((s) => (
            <li key={s.id}>
              <span className="font-medium">{s.title}</span>
              {' — '}
              {s.nextSessionAt
                ? t('pendingSessionsNotice.nextSession', {
                    date: formatSessionDateTime(s.nextSessionAt, isAmharic ? 'am-ET' : undefined),
                  })
                : t('pendingSessionsNotice.notScheduledYet')}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
