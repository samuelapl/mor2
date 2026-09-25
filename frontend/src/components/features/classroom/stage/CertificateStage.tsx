'use client';

import { useEffect, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  Lock,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { Course } from '@/types';
import type {
  ApiCourseProgress,
  ApiCertificate,
  ApiCertificateTemplate,
  ApiUser,
} from '@/lib/api/types';
import {
  fetchMyCertificates,
  claimCertificate,
  fetchActiveCertificateTemplate,
} from '@/lib/api/certificates';
import { fetchMyProfile } from '@/lib/api/users';
import { CertificateRenderer } from '../../certificates/CertificateRenderer';
import { CourseFeedbackSurvey } from './CourseFeedbackSurvey';
import { hasSubmittedFeedback } from '@/lib/api/feedback';
import { useTranslation } from '@/lib/i18n/useTranslation';

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

  const isCompleted =
    unlocked ||
    Boolean(progress?.courseCompletion.certificateEligible) ||
    Boolean(
      progress?.courseCompletion.contentCompleted &&
      (!progress?.courseCompletion.finalAssessment ||
        progress?.courseCompletion.finalAssessmentPassed),
    );

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
          if (alreadySubmitted) {
            setFeedbackDone(true);
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
          (feedbackDone || (profile && hasSubmittedFeedback(courseId, profile.id)))
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
  }, [courseId, isCompleted, feedbackDone]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    if (certificate?.downloadUrl) {
      window.open(certificate.downloadUrl, '_blank');
    } else {
      window.print();
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

  const estimatedHours =
    Math.round(
      (course.modules.flatMap((m) => m.lessons).reduce((acc, l) => acc + (l.durationMin || 0), 0) /
        60) *
        10,
    ) / 10 || 12;

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

  // 1. Locked State: Course not yet completed
  if (!isCompleted) {
    const totalLessons =
      progress?.stats.totalLessons ?? course.modules.flatMap((m) => m.lessons).length;
    const completedLessons = progress?.stats.completedLessons ?? 0;
    const overallPercent = progress?.stats.overallPercent ?? 0;
    const finalAssessment = progress?.courseCompletion.finalAssessment;
    const finalPassed = progress?.courseCompletion.finalAssessmentPassed ?? false;

    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
        {/* Locked Header Card */}
        <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-8 shadow-xs text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100/80 text-amber-600 ring-8 ring-amber-50">
            <Lock className="h-7 w-7" />
          </div>

          <div className="space-y-1.5 max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/90 px-3 py-1 text-xs font-semibold text-amber-900">
              <Award className="h-3.5 w-3.5" />
              {tBilingual('Verified Certificate of Completion', 'የተረጋገጠ የማጠናቀቂያ ሰርተፊኬት')}
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {tBilingual('Certificate Currently Locked', 'ሰርተፊኬቱ በአሁኑ ጊዜ ተቆልፏል')}
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              {tBilingual(
                'Complete all lessons, exercises, and required assessments to unlock your verified credential issued by the Ministry of Revenues.',
                'በገቢዎች ሚኒስቴር የተሰጠውን ይፋዊ ማረጋገጫ ለመክፈት ሁሉንም ትምህርቶች፣ መልመጃዎች እና አስፈላጊ ፈተናዎችን ያጠናቅቁ።',
              )}
            </p>
          </div>

          {/* Progress Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left pt-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">
                  {tBilingual('Course Lessons Completed', 'የተጠናቀቁ የኮርስ ትምህርቶች')}
                </span>
                <span className="font-mono text-indigo-600">
                  {completedLessons}/{totalLessons} ({overallPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-700">
                  {tBilingual('Final Certification Exam', 'የማጠቃለያ የምስክር ወረቀት ፈተና')}
                </span>
                {finalPassed ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {tBilingual('Passed', 'አልፏል')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-amber-600 font-bold">
                    <Lock className="h-3.5 w-3.5" /> {tBilingual('Required', 'ያስፈልጋል')}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                {finalAssessment
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

        {/* Certificate Watermark Preview */}
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 overflow-hidden shadow-2xs">
          <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center p-6 text-center">
            <div className="rounded-full bg-white/95 px-4 py-2 text-xs font-bold text-slate-800 shadow-md flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-500" />
              {tBilingual('Official Certificate Sample Preview', 'ይፋዊ የሰርተፊኬት ቅድመ-ዕይታ')}
            </div>
            <p className="text-xs text-slate-600 mt-2 max-w-sm">
              {tBilingual(
                'Your name, official digital signature, QR verification key, and course ID will be minted automatically once complete.',
                'ስምዎ፣ ይፋዊ ዲጂታል ፊርማ፣ የQR ማረጋገጫ ቁልፍ እና የኮርስ መለያ ኮርሱን ሲያጠናቅቁ በራስ-ሰር ይዘጋጃሉ።',
              )}
            </p>
          </div>

          <div className="filter blur-[1.5px] opacity-70 pointer-events-none select-none">
            <CertificateRenderer
              template={template}
              studentName={recipientName}
              courseTitle={course.title}
              completionDate={issueDateFormatted}
              certificateNumber="ETIMS-XXXX-XXXX-XXXX"
              verificationCode="SAMPLE-CODE"
              durationHours={estimatedHours}
            />
          </div>
        </div>
      </div>
    );
  }

  // 2. Pre-Certificate Feedback Gate:
  // If the course is completed, but the student hasn't completed feedback yet, show the survey!
  const userFeedbackGiven =
    feedbackDone || (user ? hasSubmittedFeedback(courseId, user.id) : false);

  if (!userFeedbackGiven) {
    return (
      <CourseFeedbackSurvey
        course={course}
        user={user}
        onSubmitted={async () => {
          setFeedbackDone(true);
          if (!certificate) {
            try {
              setClaiming(true);
              const claimed = await claimCertificate(courseId);
              if (claimed) setCertificate(claimed);
            } catch (claimErr) {
              console.warn('Notice claiming certificate:', claimErr);
            } finally {
              setClaiming(false);
            }
          }
        }}
      />
    );
  }

  // 3. Unlocked State: Certificate Ready or Claiming
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in print:p-0 print:m-0">
      {/* Celebration Header Card (Hidden on Print) */}
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50/40 to-white p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:hidden">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              {tBilingual('Course Completed & Certified', 'ኮርሱ ተጠናቅቆ ሰርተፊኬት ተሰጥቷል')}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              Cert #{certificate?.certificateNumber || 'ETIMS-2026-PENDING'}
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            {tBilingual('Official Certificate of Completion', 'ይፋዊ የማጠናቀቂያ ሰርተፊኬት')}{' '}
            <Award className="h-5 w-5 text-amber-500 shrink-0" />
          </h2>
          <p className="text-xs md:text-sm text-slate-600">
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
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                {tBilingual('Copied Link', 'ሊንኩ ተቀድቷል')}
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5 text-slate-500" />
                {tBilingual('Copy Verification', 'ማረጋገጫ ቅዳ')}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <Printer className="h-3.5 w-3.5 text-slate-600" />
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
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Certificate Viewport */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 md:p-6 shadow-md overflow-x-auto print:border-none print:shadow-none print:p-0">
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
