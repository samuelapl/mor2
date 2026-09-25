'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BookOpen,
  BookOpenCheck,
  ClipboardPen,
  Clock,
  Globe2,
  Layers,
  ListChecks,
  Loader2,
  Paperclip,
  Target,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Badge, courseLevelLabel, courseLevelVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import { useLms } from '@/lib/lms-store';
import { fetchAssessment, fetchCourseAssessments } from '@/lib/api/quiz';
import type { ApiAssessment } from '@/lib/api/types';
import { getItemAttachments } from './wizard-components';

interface CatalogCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return 'Self-paced';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${mins} min`;
}

/**
 * Pre-enrollment course preview for the learner catalog. Shows a transparent,
 * modern curriculum syllabus roadmap, course objectives, metadata, and a
 * prominent Enroll CTA. Once the learner is enrolled, hands off to LearnCourseModal.
 */
export function CatalogCourseModal({ open, onClose, courseId }: CatalogCourseModalProps) {
  const router = useRouter();
  const { courseById, currentUser, userName, enrollSelf } = useLms();
  const course = courseById(courseId);

  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);

  // Fetch course assessments for quiz question count & stats
  useEffect(() => {
    if (!open || !courseId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchCourseAssessments(courseId);
        if (cancelled || list.length === 0) return;
        const details = await Promise.all(list.map((item) => fetchAssessment(item.id)));
        if (!cancelled) setAssessments(details);
      } catch {
        // assessments best effort
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);
  // Aggregated totals (unconditionally declared at top level)
  const totalLessons = useMemo(
    () => (course?.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
    [course?.modules],
  );

  const totalSubLessons = useMemo(
    () =>
      (course?.modules || []).reduce(
        (sum, m) =>
          sum + (m.lessons || []).reduce((sSum, l) => sSum + (l.subLessons?.length || 0), 0),
        0,
      ),
    [course?.modules],
  );

  const totalDurationMin = useMemo(() => {
    if (!course?.modules) return 0;
    return course.modules.reduce((sum, m) => {
      const moduleDuration = m.durationMinutes || 0;
      const lessonsDuration = (m.lessons || []).reduce((lSum, l) => {
        const lessonDur = l.durationMin || 0;
        const subLessonsDur = (l.subLessons || []).reduce(
          (sSum, s) => sSum + (s.durationMin || 0),
          0,
        );
        return lSum + lessonDur + subLessonsDur;
      }, 0);
      return sum + Math.max(moduleDuration, lessonsDuration);
    }, 0);
  }, [course?.modules]);

  const totalAttachments = useMemo(() => {
    if (!course) return 0;
    let count = (course.attachments || []).length;
    for (const mod of course.modules || []) {
      count += getItemAttachments(mod).length;
      for (const les of mod.lessons || []) {
        count += getItemAttachments(les).length;
        for (const sub of les.subLessons || []) {
          count += getItemAttachments(sub).length;
        }
      }
    }
    return count;
  }, [course]);

  const totalQuestions = useMemo(() => {
    return assessments.reduce((sum, a) => sum + (a.questions?.length || 0), 0);
  }, [assessments]);

  const finalAssessment = useMemo(() => {
    return (
      assessments.find((a) => /final/i.test(a.titleEn)) ||
      assessments[assessments.length - 1] ||
      null
    );
  }, [assessments]);

  const me = currentUser?.id;
  const enrolled = me && course ? course.enrolledLearnerIds.includes(me) : false;

  useEffect(() => {
    if (open && enrolled && courseId) {
      onClose();
      router.push(`/learner/courses/${courseId}/learn`);
    }
  }, [open, enrolled, courseId, onClose, router]);

  // Early return if not loaded or enrolled
  if (!course || enrolled) return null;

  const doEnroll = async () => {
    setEnrolling(true);
    setError(null);
    const result = await enrollSelf(courseId);
    setEnrolling(false);
    if (!result.ok) {
      setError(result.message);
    } else {
      onClose();
      router.push(`/learner/courses/${courseId}/learn`);
    }
  };

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={course.title}
      subtitle={`${course.code} · ${course.category}`}
      badge={
        <div className="flex items-center gap-2">
          <Badge variant={courseLevelVariant(course.level)}>{courseLevelLabel(course.level)}</Badge>
          <Badge variant="blue">Open for Enrollment</Badge>
        </div>
      }
      actions={
        <Button
          onClick={() => void doEnroll()}
          disabled={enrolling}
          className="shadow-sm font-semibold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
        >
          {enrolling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <BookOpen className="h-4 w-4" />
          )}
          {enrolling ? 'Enrolling…' : 'Enroll Now'}
        </Button>
      }
    >
      <div className="w-full space-y-7 pb-8">
        {/* Hero Cover Image & Header Details */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
          {course.cover ? (
            <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={course.cover}
                alt={`${course.title} cover`}
                className="h-full w-full object-cover opacity-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="rounded-md bg-indigo-600/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-white tracking-wide">
                    {course.code}
                  </span>
                  <span className="rounded-md bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white">
                    {course.category}
                  </span>
                  <span className="rounded-md bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white">
                    {courseLevelLabel(course.level)}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                  {course.title}
                </h1>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-md bg-indigo-500/30 border border-indigo-400/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-200">
                  {course.code}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90">
                  {course.category}
                </span>
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90">
                  {courseLevelLabel(course.level)}
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">{course.title}</h1>
            </div>
          )}

          {/* Trainer & Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              {course.trainerId ? (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-slate-200/80 px-2.5 py-1 font-medium text-slate-700 shadow-2xs">
                  <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Lead Trainer: {userName(course.trainerId)}</span>
                </div>
              ) : null}
              <div className="inline-flex items-center gap-1.5 text-slate-500">
                <Globe2 className="h-3.5 w-3.5 text-slate-400" />
                <span>Language: {course.language || 'English'}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDuration(totalDurationMin)} est. completion</span>
              </div>
            </div>

            <Button
              size="sm"
              onClick={() => void doEnroll()}
              disabled={enrolling}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {enrolling ? 'Enrolling…' : 'Enroll Now'}
            </Button>
          </div>
        </div>

        {/* 6-Stat Summary Cards Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Modules
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{course.modules.length}</p>
            <p className="text-[11px] text-slate-400">Structured units</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <ClipboardPen className="h-4 w-4 text-emerald-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Lessons
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{totalLessons}</p>
            <p className="text-[11px] text-slate-400">Core lectures</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <ListChecks className="h-4 w-4 text-violet-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Sub-Lessons
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{totalSubLessons}</p>
            <p className="text-[11px] text-slate-400">Topic deep-dives</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Duration
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {totalDurationMin > 0 ? `${totalDurationMin}m` : 'Self-paced'}
            </p>
            <p className="text-[11px] text-slate-400">Study estimate</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Paperclip className="h-4 w-4 text-blue-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Materials
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">{totalAttachments}</p>
            <p className="text-[11px] text-slate-400">Attached files</p>
          </div>

          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Award className="h-4 w-4 text-rose-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Assessment
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {totalQuestions > 0 ? `${totalQuestions} Qs` : 'Included'}
            </p>
            <p className="text-[11px] text-slate-400">
              {finalAssessment ? `${finalAssessment.passingScore}% pass mark` : 'Certified'}
            </p>
          </div>
        </div>

        {/* Course Overview */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Course Overview & Scope
          </h3>
          <div className="text-sm leading-relaxed text-slate-700">
            <RichContent html={course.description} />
          </div>
        </div>

        {/* Learning Objectives */}
        {course.objectives ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5 shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-indigo-900">
              <Target className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                Course Learning Objectives & Outcomes
              </h3>
            </div>
            <div className="text-xs text-indigo-950 leading-relaxed">
              <RichContent html={course.objectives} />
            </div>
          </div>
        ) : null}

        {/* Detailed Metadata Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 text-xs">
          <div>
            <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">
              Department / Ministry
            </span>
            <div className="font-semibold text-slate-800">
              <RichContent inline html={course.department} placeholder="Ministry of Revenues" />
            </div>
          </div>
          <div>
            <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">
              Target Audience
            </span>
            <div className="font-semibold text-slate-800">
              <RichContent inline html={course.targetAudience} placeholder="All Staff & Officers" />
            </div>
          </div>
          <div>
            <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">
              Delivery Method
            </span>
            <div className="font-semibold text-slate-800 capitalize">
              {(course.deliveryMethod || 'self_paced').replace('_', ' ')}
            </div>
          </div>
          <div>
            <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">
              Primary Language
            </span>
            <div className="font-semibold text-slate-800">{course.language || 'English'}</div>
          </div>
          {course.prerequisites ? (
            <div className="sm:col-span-2 lg:col-span-4 border-t border-slate-200/70 pt-2.5 mt-1">
              <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">
                Prerequisites & Recommended Background
              </span>
              <div className="font-normal text-slate-700 leading-relaxed">
                <RichContent html={course.prerequisites} />
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-xs">
            {error}
          </div>
        ) : null}

        {/* Prominent Bottom Enroll CTA Banner */}
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 sm:p-7 text-white shadow-md flex flex-wrap items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-indigo-200" />
              <h3 className="text-base sm:text-lg font-bold text-white">
                Ready to start your learning journey?
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
              Enroll now for immediate access to interactive video streams, study notes,
              downloadable documents, assignments, and accredited certification.
            </p>
          </div>

          <Button
            onClick={() => void doEnroll()}
            disabled={enrolling}
            className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-md font-bold text-sm px-6 py-2.5 shrink-0 transition-transform active:scale-95"
          >
            {enrolling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <BookOpen className="h-4 w-4 mr-2" />
            )}
            {enrolling ? 'Enrolling…' : 'Enroll in Course'}
          </Button>
        </div>
      </div>
    </WorkspaceDetailOverlay>
  );
}
