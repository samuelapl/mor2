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
import type { Course } from '@/types';
import type {
  ApiCourseProgress,
  ApiCertificate,
  ApiCertificateTemplate,
  ApiUser,
  ApiLearnerSession,
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

interface CertificateStageProps {
  course: Course;
  progress?: ApiCourseProgress | null;
  courseId: string;
  unlocked: boolean;
}

export function CertificateStage({ course, progress, courseId, unlocked }: CertificateStageProps) {
  const { tBilingual } = useTranslation();
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
      <div className="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 p-8 text-center text-slate-500">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        <p className="text-sm font-medium">
          {tBilingual(
            'Retrieving official certification credentials…',
            'ይፋዊ የሰርተፊኬት መረጃዎችን በማምጣት ላይ…',
          )}
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
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 dark:border-amber-900/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-orange-950/20 p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-600 ring-8 ring-amber-50 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-950/30">
            {isInPerson ? <Building2 className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </div>

          <div className="space-y-1.5 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 px-3 py-1 text-xs font-semibold">
              <Award className="h-3.5 w-3.5" />
              {tBilingual('Verified Certificate of Completion', 'የተረጋገጠ የማጠናቀቂያ ሰርተፊኬት')}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {isInPerson
                ? tBilingual(
                    'Certificate Pending Classroom Completion',
                    'ሰርተፊኬቱ የክፍል ስልጠና መጠናቀቅን እየጠበቀ ነው',
                  )
                : tBilingual('Certificate Currently Locked', 'ሰርተፊኬቱ በአሁኑ ጊዜ ተቆልፏል')}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {isInPerson
                ? tBilingual(
                    'For in-person practicum courses, certification is verified and issued upon physical classroom attendance, practicum evaluation, and trainer sign-off.',
                    'በአካል ለሚሰጡ የተግባር ኮርሶች፣ ሰርተፊኬቱ የሚረጋገጠውና የሚሰጠው በክፍል ውስጥ በመገኘት፣ በተግባር ግምገማ እና በአሰልጣኙ ማረጋገጫ ነው።',
                  )
                : tBilingual(
                    'Complete all lessons, exercises, and required assessments to unlock your verified credential issued by the Ministry of Revenues.',
                    'በገቢዎች ሚኒስቴር የተሰጠውን ይፋዊ ማረጋገጫ ለመክፈት ሁሉንም ትምህርቶች፣ መልመጃዎች እና አስፈላጊ ፈተናዎችን ያጠናቅቁ።',
                  )}
            </p>
          </div>

          {/* Progress Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-4">
            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  {tBilingual('Course Lessons Completed', 'የተጠናቀቁ የኮርስ ትምህርቶች')}
                </span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                  {completedLessons}/{totalLessons} ({lessonPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${lessonPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/80 p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  {isInPerson
                    ? tBilingual('In-Person Classroom Evaluation', 'በአካል የሚሰጥ የክፍል ግምገማ')
                    : tBilingual('Final Certification Exam', 'የማጠቃለያ የምስክር ወረቀት ፈተና')}
                </span>
                {isInPerson ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full">
                    <Building2 className="h-3 w-3" /> {tBilingual('Trainer Administered', 'በአሰልጣኝ የሚሰጥ')}
                  </span>
                ) : finalPassed ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {tBilingual('Passed', 'አልፏል')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                    <Lock className="h-3.5 w-3.5" /> {tBilingual('Required', 'ያስፈልጋል')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isInPerson
                  ? tBilingual(
                      'Assessed physically at the training venue by your instructor',
                      'በማሰልጠኛ ቦታው በአሰልጣኝዎ በአካል ይገመገማል',
                    )
                  : finalAssessment
                    ? tBilingual(
                        'Achieve passing score on the final assessment',
                        'በማጠቃለያ ፈተናው የማለፊያ ውጤት ያግኙ',
                      )
                    : tBilingual(
                        'All curriculum topics must be reviewed',
                        'ሁሉም የስርዓተ-ትምህርት ርዕሶች መከለስ አለባቸው',
                      )}
              </p>
            </div>
          </div>
        </div>

        {!isInPerson &&
          ((progress?.courseCompletion.sessionsPending ?? 0) > 0 ||
            (progress?.liveSessions ?? []).some((s) => s.status !== 'COMPLETED' || !s.attended)) && (
          <PendingSessionsNotice
            sessions={(progress?.liveSessions ?? []).filter(
              (s) => s.status !== 'COMPLETED' || !s.attended,
            )}
          />
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
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white dark:border-emerald-900/40 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/20 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 px-3 py-1 text-xs font-bold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {tBilingual('Course Completed & Certified', 'ኮርሱ ተጠናቅቆ ሰርተፊኬት ተሰጥቷል')}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Cert #{certificate?.certificateNumber || 'ETIMS-2026-PENDING'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {tBilingual('Official Certificate of Completion', 'ይፋዊ የማጠናቀቂያ ሰርተፊኬት')}{' '}
            <Award className="h-5 w-5 text-amber-500 shrink-0" />
          </h2>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300">
            {tBilingual(
              `Congratulations, ${recipientName}! Your credentials have been officially validated and archived by the Ministry of Revenues.`,
              `እንኳን ደስ አለዎት፣ ${recipientName}! የእርስዎ የትምህርት ማስረጃዎች በይፋ ተረጋግጠው በገቢዎች ሚኒስቴር ተመዝግበዋል።`,
            )}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={handleCopyVerification}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {tBilingual('Copied Link', 'ሊንኩ ተቀድቷል')}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                {tBilingual('Copy Verification', 'ማረጋገጫ ቅዳ')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
            {tBilingual('Print', 'አትም')}
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-slate-950 text-amber-400 hover:bg-slate-900 text-xs font-bold shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5" />
            {tBilingual('Download PDF', 'ፒዲኤፍ አውርድ')}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-4 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Certificate Viewport */}
      <div className="rounded-2xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 p-3 md:p-6 shadow-md overflow-x-auto print:border-none print:shadow-none print:p-0">
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
      <div className="text-center text-xs text-slate-400 pb-8 print:hidden">
        <p>
          {tBilingual(
            'This credential can be publicly verified at',
            'ይህ የትምህርት ማስረጃ በይፋ ሊረጋገጥ የሚችለው በ',
          )}{' '}
          <span className="font-mono text-slate-600">
            {typeof window !== 'undefined' ? window.location.origin : ''}/verify
          </span>{' '}
          {tBilingual('using code', 'በማረጋገጫ ኮድ')}{' '}
          <strong className="font-mono text-slate-700">
            {certificate?.verificationCode || '—'}
          </strong>
          .
        </p>
      </div>
    </div>
  );
}

/** Shown while a session quiz is still to come: the certificate waits for every session. */
function PendingSessionsNotice({ sessions }: { sessions: ApiLearnerSession[] }) {
  const { tBilingual, isAmharic } = useTranslation();
  return (
    <div className="flex gap-3 rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/80 dark:bg-sky-950/30 p-5 text-left">
      <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" />
      <div className="space-y-2">
        <p className="text-sm font-bold text-sky-900 dark:text-sky-200">
          {tBilingual(
            `You have ${sessions.length} live session${sessions.length === 1 ? '' : 's'} remaining to attend. Your certificate is issued after all live sessions have been held and attended.`,
            `የሚቀሩዎት ${sessions.length} የቀጥታ ክፍለ-ጊዜ(ዎች) አሉ። ሰርተፊኬትዎ የሚሰጠው ሁሉም ክፍለ-ጊዜዎች ተካሂደው ሲገኙባቸው ብቻ ነው።`,
          )}
        </p>
        <ul className="space-y-1 text-sm text-sky-900/90 dark:text-sky-200/90">
          {sessions.map((s) => (
            <li key={s.id}>
              <span className="font-medium">{s.titleEn}</span>
              {' — '}
              {s.scheduledAt
                ? new Date(s.scheduledAt).toLocaleString(isAmharic ? 'am-ET' : undefined, { dateStyle: 'medium', timeStyle: 'short' })
                : tBilingual('date to be announced', 'ቀኑ ይገለጻል')}
              {s.status === 'CANCELLED' ? ` (${tBilingual('cancelled — to be rescheduled', 'ተሰርዟል — እንደገና ይታቀዳል')})` : ''}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
