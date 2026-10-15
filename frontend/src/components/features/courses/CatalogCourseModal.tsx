'use client';

import { formatDuration, getCourseDurationMinutes } from '@/lib/duration';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  BookOpenCheck,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardPen,
  Clock,
  Globe2,
  Info,
  Laptop,
  Layers,
  ListChecks,
  Loader2,
  MapPin,
  Paperclip,
  Radio,
  Sparkles,
  Target,
  UserRound,
  Users,
} from 'lucide-react';
import { formatSessionDate, formatSessionDateTime, formatSessionTime } from '@/lib/app-time';
import { useRouter } from 'next/navigation';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Badge, courseLevelLabel, courseLevelVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { RichContent } from '@/components/ui/RichContent';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useCourseById } from '@/lib/stores/course-store';
import { useEnrollmentStore } from '@/lib/stores/enrollment-store';
import { useUserName } from '@/lib/stores/user-store';
import { fetchAssessment, fetchCourseAssessments } from '@/lib/api/quiz';
import { fetchCourseRounds } from '@/lib/api/venues';
import type { ApiAssessment, ApiInPersonRound } from '@/lib/api/types';
import { getItemAttachments } from './wizard-components';

interface CatalogCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
}

function formatDate(value: string): string {
  try {
    return formatSessionDate(value, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
}

function formatTime(value: string): string {
  try {
    return formatSessionTime(value);
  } catch {
    return value;
  }
}

/**
 * Pre-enrollment course preview for the learner catalog. Shows a transparent,
 * modern curriculum syllabus roadmap, course objectives, metadata, and a
 * prominent Enroll CTA. Once the learner is enrolled, hands off to the classroom.
 */
export function CatalogCourseModal({ open, onClose, courseId }: CatalogCourseModalProps) {
  const { isAmharic } = useTranslation();
  const router = useRouter();
  const courseById = useCourseById();
  const currentUser = useAuthStore((s) => s.currentUser);
  const userName = useUserName();
  const enrollSelf = useEnrollmentStore((s) => s.enrollSelf);
  const course = courseById(courseId);

  const [enrolling, setEnrolling] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Set once doEnroll succeeds so the "already enrolled" redirect below doesn't double-navigate.
  const justEnrolledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);

  // Delivery mode & Round selection
  const defaultMode: 'ONLINE_ONLY' | 'IN_PERSON_ONLY' = course?.deliveryMode === 'IN_PERSON_ONLY' ? 'IN_PERSON_ONLY' : 'ONLINE_ONLY';
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState<'ONLINE_ONLY' | 'IN_PERSON_ONLY'>(defaultMode);
  const [availableRounds, setAvailableRounds] = useState<ApiInPersonRound[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('ALL');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('ALL');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  useEffect(() => {
    if (course?.deliveryMode === 'IN_PERSON_ONLY') {
      setSelectedDeliveryMode('IN_PERSON_ONLY');
    } else if (course?.deliveryMode === 'ONLINE_ONLY') {
      setSelectedDeliveryMode('ONLINE_ONLY');
    }
  }, [course?.deliveryMode]);

  // Fetch in-person scheduled rounds for this course
  useEffect(() => {
    if (!open || !courseId) return;
    let cancelled = false;
    setLoadingSessions(true);
    fetchCourseRounds(courseId)
      .then((rounds) => {
        if (!cancelled) {
          setAvailableRounds(rounds);
          if (rounds.length > 0) {
            const firstAvailable = rounds.find((r) => !r.isFull) ?? rounds[0];
            setSelectedSessionId(firstAvailable.primarySessionId);
            setSelectedBranch('ALL');
            setSelectedRoundFilter('ALL');
          }
          setLoadingSessions(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableRounds([]);
          setLoadingSessions(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  // Fetch course assessments for quiz question count & stats
  useEffect(() => {
    if (!open || !courseId) return;
    let cancelled = false;
    (async () => {
      try {
        // Session quizzes are run live in their session, not listed in the catalog.
        const list = (await fetchCourseAssessments(courseId)).filter((a) => a.type !== 'SESSION_ASSESSMENT');
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
  const totalLessons = useMemo(() => (course?.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0), [course?.modules]);

  const totalSubLessons = useMemo(
    () => (course?.modules || []).reduce((sum, m) => sum + (m.lessons || []).reduce((sSum, l) => sSum + (l.subLessons?.length || 0), 0), 0),
    [course?.modules],
  );

  const totalDurationMin = useMemo(() => (course ? getCourseDurationMinutes(course) : 0), [course]);

  const totalAttachments = useMemo(() => {
    if (!course) return 0;
    // Lesson files are hidden until the learner enrolls, so counting them here would come up short.
    if (course.materialCount !== undefined) return course.materialCount;
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
    return assessments.find((a) => /final/i.test(a.titleEn)) || assessments[assessments.length - 1] || null;
  }, [assessments]);

  const me = currentUser?.id;
  const enrolled = me && course ? course.enrolledLearnerIds.includes(me) : false;

  useEffect(() => {
    if (open && enrolled && courseId && !justEnrolledRef.current) {
      onClose();
      router.push(`/learner/courses/${course?.code || courseId}/learn`);
    }
  }, [open, enrolled, courseId, course?.code, onClose, router]);

  // Early return if not loaded or enrolled
  if (!course || enrolled) return null;

  const chosenRound = availableRounds.find((r) => r.primarySessionId === selectedSessionId);

  const isSeatFull =
    selectedDeliveryMode === 'IN_PERSON_ONLY' && Boolean(chosenRound?.isFull);

  const canEnroll =
    !enrolling && !isSeatFull && (selectedDeliveryMode !== 'IN_PERSON_ONLY' || availableRounds.length === 0 || Boolean(selectedSessionId));

  const enrollButtonLabel = enrolling
    ? 'Processing Enrollment…'
    : isSeatFull
      ? 'Classroom Full'
      : selectedDeliveryMode === 'IN_PERSON_ONLY'
        ? 'Reserve Seat & Enroll'
        : 'Enroll in Online Course';

  const doEnroll = async () => {
    setEnrolling(true);
    setError(null);
    let result;
    if (selectedDeliveryMode === 'IN_PERSON_ONLY') {
      result = await enrollSelf(courseId, {
        deliveryMode: 'IN_PERSON_ONLY',
        venueId: chosenRound?.venueId || undefined,
        sessionId: chosenRound?.primarySessionId,
      });
    } else {
      result = await enrollSelf(courseId, {
        deliveryMode: 'ONLINE_ONLY',
      });
    }
    setEnrolling(false);
    setConfirmOpen(false);
    if (!result.ok) {
      setError(result.message);
    } else {
      justEnrolledRef.current = true;
      onClose();
      router.push(`/learner/courses/${course?.code || courseId}/learn`);
    }
  };

  return (
    <>
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
            onClick={() => setConfirmOpen(true)}
            disabled={!canEnroll}
            className="shadow-sm font-semibold gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white transition-colors"
          >
            {enrolling ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selectedDeliveryMode === 'IN_PERSON_ONLY' ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            {enrollButtonLabel}
          </Button>
        }
      >
        <div className="w-full space-y-7 pb-8">
          {error ? (
            <div className="flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft/90 p-4 text-xs text-danger shadow-xs">
              <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-danger">Enrollment Notice</p>
                <p className="mt-0.5 leading-relaxed">{error}</p>
              </div>
            </div>
          ) : null}

          {/* Hero Cover Image & Header Details */}
          <div className="overflow-hidden rounded-2xl border border-border/90 bg-card shadow-xs">
            {course.cover ? (
              <div className="relative h-56 sm:h-64 w-full overflow-hidden bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={course.cover} alt={`${course.title} cover`} className="h-full w-full object-cover opacity-95" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/30 to-transparent" />
                <div className="absolute bottom-4 left-5 right-5 text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="rounded-md bg-indigo-600/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-white tracking-wide">
                      {course.code}
                    </span>
                    <span className="rounded-md bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white">{course.category}</span>
                    <span className="rounded-md bg-white/20 backdrop-blur-xs px-2 py-0.5 text-[11px] font-medium text-white">
                      {courseLevelLabel(course.level)}
                    </span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-sm">{course.title}</h1>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-6 text-white">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-md bg-primary/30 border border-indigo-400/30 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-200">
                    {course.code}
                  </span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90">{course.category}</span>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/90">{courseLevelLabel(course.level)}</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">{course.title}</h1>
              </div>
            )}

            {/* Trainer & Metadata Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/70 px-5 py-3 text-xs text-secondary-foreground">
              <div className="flex flex-wrap items-center gap-3">
                {course.trainerId ? (
                  <div className="inline-flex items-center gap-1.5 rounded-lg bg-card border border-border/80 px-2.5 py-1 font-medium text-secondary-foreground shadow-2xs">
                    <UserRound className="h-3.5 w-3.5 text-primary" />
                    <span>Lead Trainer: {userName(course.trainerId)}</span>
                  </div>
                ) : null}
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Globe2 className="h-3.5 w-3.5 text-subtle-foreground" />
                  <span>Language: {course.language || 'English'}</span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-subtle-foreground" />
                  <span>{formatDuration(totalDurationMin, isAmharic)} est. completion</span>
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => setConfirmOpen(true)}
                disabled={!canEnroll}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold shadow-2xs"
              >
                {enrolling ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : selectedDeliveryMode === 'IN_PERSON_ONLY' ? (
                  <Building2 className="h-3.5 w-3.5" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5" />
                )}
                {enrollButtonLabel}
              </Button>
            </div>
          </div>

          {/* 6-Stat Summary Cards Bar */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-subtle-foreground">
                <Layers className="h-4 w-4 text-indigo-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Modules</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{course.modules.length}</p>
              <p className="text-[11px] text-subtle-foreground">Structured units</p>
            </div>

            <div className="rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-subtle-foreground">
                <ClipboardPen className="h-4 w-4 text-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Lessons</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{totalLessons}</p>
              <p className="text-[11px] text-subtle-foreground">Core lectures</p>
            </div>

            <div className="rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-subtle-foreground">
                <ListChecks className="h-4 w-4 text-violet-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Sub-Lessons</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{totalSubLessons}</p>
              <p className="text-[11px] text-subtle-foreground">Topic deep-dives</p>
            </div>

            <div className="rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-subtle-foreground">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{formatDuration(totalDurationMin, isAmharic)}</p>
              <p className="text-[11px] text-subtle-foreground">Study estimate</p>
            </div>

            <div className="rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-subtle-foreground">
                <Paperclip className="h-4 w-4 text-blue-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Materials</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{totalAttachments}</p>
              <p className="text-[11px] text-subtle-foreground">Attached files</p>
            </div>

            <div className="rounded-xl border border-border/90 bg-card p-3.5 shadow-2xs">
              <div className="flex items-center gap-2 text-subtle-foreground">
                <Award className="h-4 w-4 text-rose-500" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assessment</span>
              </div>
              <p className="mt-1 text-lg font-bold text-foreground">{totalQuestions > 0 ? `${totalQuestions} Qs` : 'Included'}</p>
              <p className="text-[11px] text-subtle-foreground">{finalAssessment ? `${finalAssessment.passingScore}% pass mark` : 'Certified'}</p>
            </div>
          </div>

          {/* Delivery Mode & Classroom Selection */}
          <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary-soft/50 via-card to-card p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">Enrollment Options</span>
                <h3 className="text-base font-bold text-foreground">Course Training Delivery Mode</h3>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Select how you prefer to attend this training</span>
            </div>

            {/* Mode Selector */}
            {course.deliveryMode === 'BOTH' ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSelectedDeliveryMode('ONLINE_ONLY')}
                  className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    selectedDeliveryMode === 'ONLINE_ONLY'
                      ? 'border-primary bg-card ring-2 ring-ring/20 shadow-xs'
                      : 'border-border bg-card/70 hover:border-input hover:bg-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-info-soft px-2.5 py-1 text-xs font-semibold text-info border border-info/30">
                        <Laptop className="h-3.5 w-3.5" />
                        🌐 Pure Online
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          selectedDeliveryMode === 'ONLINE_ONLY' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-input'
                        }`}
                      >
                        {selectedDeliveryMode === 'ONLINE_ONLY' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </span>
                    </div>
                    <h4 className="mt-2.5 text-sm font-bold text-foreground">Self-Paced Online Learning</h4>
                    <p className="mt-1 text-xs text-secondary-foreground leading-relaxed">
                      Study anytime, anywhere with interactive lessons, quizzes, and instant certificate issuance upon passing.
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] font-medium text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Instant Access Upon Enrollment
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDeliveryMode('IN_PERSON_ONLY')}
                  className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                    selectedDeliveryMode === 'IN_PERSON_ONLY'
                      ? 'border-primary bg-card ring-2 ring-ring/20 shadow-xs'
                      : 'border-border bg-card/70 hover:border-input hover:bg-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning border border-warning/30">
                        <Building2 className="h-3.5 w-3.5" />
                        🏢 In-Person Classroom
                      </span>
                      <span
                        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                          selectedDeliveryMode === 'IN_PERSON_ONLY' ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-input'
                        }`}
                      >
                        {selectedDeliveryMode === 'IN_PERSON_ONLY' && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </span>
                    </div>
                    <h4 className="mt-2.5 text-sm font-bold text-foreground">Ministry Branch Classroom Training</h4>
                    <p className="mt-1 text-xs text-secondary-foreground leading-relaxed">
                      Attend scheduled instructor-led sessions at an official Ministry training hall with direct trainer guidance.
                    </p>
                  </div>
                  <div className="mt-3 text-[11px] font-medium text-warning flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Limited Classroom Capacity & Seat Reservation
                  </div>
                </button>
              </div>
            ) : course.deliveryMode === 'IN_PERSON_ONLY' ? (
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning-soft/80 p-3.5 text-xs text-warning">
                <Building2 className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Mandatory In-Person Training</p>
                  <p className="mt-0.5 text-warning">
                    This course is exclusively delivered through physical classroom sessions at Ethiopian Ministry of Revenues branch venues. Please
                    reserve your seat in a scheduled session below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-info/30 bg-info-soft/80 p-3.5 text-xs text-info">
                <Laptop className="h-4 w-4 text-info shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Pure Online Training</p>
                  <p className="mt-0.5 text-info">
                    This course is delivered 100% online through interactive modules, multimedia lessons, and knowledge checks.
                  </p>
                </div>
              </div>
            )}

            {/* In-Person Round Picker */}
            {selectedDeliveryMode === 'IN_PERSON_ONLY' && (() => {
              const branches = Array.from(
                new Set(
                  availableRounds
                    .map((r) => r.venue?.branch)
                    .filter((b): b is string => Boolean(b)),
                ),
              );

              const roundNumbers = Array.from(
                new Set(availableRounds.map((r) => r.roundNumber)),
              ).sort((a, b) => a - b);

              const displayedRounds = availableRounds.filter((r) => {
                const matchBranch = selectedBranch === 'ALL' || r.venue?.branch === selectedBranch;
                const matchRound = selectedRoundFilter === 'ALL' || String(r.roundNumber) === selectedRoundFilter;
                return matchBranch && matchRound;
              });

              const handleFilterChange = (newBranch: string, newRound: string) => {
                setSelectedBranch(newBranch);
                setSelectedRoundFilter(newRound);
                const nextFiltered = availableRounds.filter((r) => {
                  const matchBranch = newBranch === 'ALL' || r.venue?.branch === newBranch;
                  const matchRound = newRound === 'ALL' || String(r.roundNumber) === newRound;
                  return matchBranch && matchRound;
                });
                const stillPresent = nextFiltered.some((r) => r.primarySessionId === selectedSessionId);
                if (!stillPresent) {
                  const firstAvail = nextFiltered.find((r) => !r.isFull) ?? nextFiltered[0];
                  if (firstAvail) {
                    setSelectedSessionId(firstAvail.primarySessionId);
                  }
                }
              };

              return (
                <div className="mt-4 space-y-3.5 pt-3 border-t border-border/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-foreground">Step 1: Filter Available Rounds & Venues</span>
                      <p className="text-[11px] text-muted-foreground">Filter classroom locations and cohort rounds in your area</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {availableRounds.length} round{availableRounds.length === 1 ? '' : 's'} across {branches.length} branch venue{branches.length === 1 ? '' : 's'}
                      </span>
                      {(selectedBranch !== 'ALL' || selectedRoundFilter !== 'ALL') && (
                        <button
                          type="button"
                          onClick={() => handleFilterChange('ALL', 'ALL')}
                          className="text-[11px] font-semibold text-primary hover:underline ml-1"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Branch (First) and Round (Then) Dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/50 border border-border/80">
                    {/* 1. Branch Dropdown (First) */}
                    <div className="space-y-1.5">
                      <label htmlFor="learner-branch-select" className="flex items-center gap-1.5 text-xs font-semibold text-secondary-foreground">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Branch Venue</span>
                      </label>
                      <select
                        id="learner-branch-select"
                        value={selectedBranch}
                        onChange={(e) => handleFilterChange(e.target.value, selectedRoundFilter)}
                        className="w-full rounded-xl border border-border/90 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs outline-none transition hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/20 cursor-pointer"
                      >
                        <option value="ALL">All Branches ({availableRounds.length} sessions)</option>
                        {branches.map((b) => {
                          const count = availableRounds.filter((r) => r.venue?.branch === b).length;
                          return (
                            <option key={b} value={b}>
                              {b} ({count} {count === 1 ? 'round' : 'rounds'})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* 2. Round Dropdown (Then) */}
                    <div className="space-y-1.5">
                      <label htmlFor="learner-round-select" className="flex items-center gap-1.5 text-xs font-semibold text-secondary-foreground">
                        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>Cohort Round</span>
                      </label>
                      <select
                        id="learner-round-select"
                        value={selectedRoundFilter}
                        onChange={(e) => handleFilterChange(selectedBranch, e.target.value)}
                        className="w-full rounded-xl border border-border/90 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-xs outline-none transition hover:border-input focus:border-ring focus:ring-2 focus:ring-ring/20 cursor-pointer"
                      >
                        <option value="ALL">All Rounds ({availableRounds.length} sessions)</option>
                        {roundNumbers.map((num) => {
                          const countInBranch = availableRounds.filter(
                            (r) => r.roundNumber === num && (selectedBranch === 'ALL' || r.venue?.branch === selectedBranch),
                          ).length;
                          return (
                            <option key={num} value={String(num)}>
                              Round {num} ({countInBranch} {countInBranch === 1 ? 'venue' : 'venues'})
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-xs font-bold text-foreground">Step 2: Choose Available Round & Venue</span>
                  </div>

                  {loadingSessions ? (
                    <div className="flex items-center justify-center p-6 text-xs text-muted-foreground gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading scheduled classroom rounds…
                    </div>
                  ) : availableRounds.length === 0 ? (
                    <div className="rounded-xl border border-warning/25 bg-warning-soft/60 p-4 text-xs text-warning flex items-start gap-2.5">
                      <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">No classroom rounds scheduled yet</p>
                        <p className="mt-0.5">
                          Training coordinators have not yet scheduled in-person rounds for this course. Please contact your branch training
                          administrator or check back soon.
                        </p>
                      </div>
                    </div>
                  ) : displayedRounds.length === 0 ? (
                    <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground text-center space-y-2">
                      <p>No classroom rounds match the selected filters ({selectedBranch !== 'ALL' ? selectedBranch : 'All Branches'}, {selectedRoundFilter !== 'ALL' ? `Round ${selectedRoundFilter}` : 'All Rounds'}).</p>
                      <button
                        type="button"
                        onClick={() => handleFilterChange('ALL', 'ALL')}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {displayedRounds.map((round) => {
                        const venue = round.venue;
                        const { capacity, seatsLeft, isFull } = round;
                        const isSelected = selectedSessionId === round.primarySessionId;
                        const firstTrainer = round.sessions[0]?.trainer;

                        return (
                          <div
                            key={round.roundKey}
                            onClick={() => {
                              if (!isFull) setSelectedSessionId(round.primarySessionId);
                            }}
                            className={`relative rounded-xl border p-4 text-left transition-all ${
                              isFull
                                ? 'opacity-60 bg-muted border-border cursor-not-allowed'
                                : isSelected
                                  ? 'border-primary bg-primary-soft/40 ring-2 ring-ring/20 cursor-pointer shadow-xs'
                                  : 'border-border bg-card hover:border-input hover:bg-muted/60 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex flex-wrap items-center gap-1.5 font-bold text-xs text-foreground">
                                  <span className="rounded-md bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wide">
                                    {round.roundLabel}
                                  </span>
                                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <span>{venue?.branch || 'Ministry Branch'}</span>
                                  <span className="text-subtle-foreground">·</span>
                                  <span className="font-semibold text-secondary-foreground">{venue?.name || 'Classroom'}</span>
                                </div>
                                {venue?.building ? <p className="text-[11px] text-muted-foreground mt-0.5">Building: {venue.building}</p> : null}
                              </div>

                              <span
                                className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-input bg-card'
                                }`}
                              >
                                {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                              </span>
                            </div>

                            {/* Classroom Sessions inside this Round */}
                            <div className="mt-3 space-y-1.5 rounded-lg border border-border/70 bg-muted/50 p-2.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-subtle-foreground">
                                Classroom Sessions ({round.sessions.length})
                              </p>
                              {round.sessions.map((session, sIdx) => (
                                <div key={session.id} className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-secondary-foreground">
                                  <span className="font-semibold text-foreground truncate">
                                    {sIdx + 1}. {session.titleEn}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-muted-foreground shrink-0">
                                    <Calendar className="h-3 w-3 text-subtle-foreground" />
                                    {formatDate(session.scheduledAt)} · {formatTime(session.scheduledAt)} ({session.durationMinutes}m)
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Trainer & Seat Capacity Meter */}
                            <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px]">
                              <span className="text-secondary-foreground truncate max-w-[140px]">
                                {firstTrainer ? `${firstTrainer.firstName} ${firstTrainer.lastName}` : 'Assigned Trainer'}
                              </span>

                              {isFull ? (
                                <span className="font-bold text-danger bg-danger-soft px-2 py-0.5 rounded-md border border-danger/30">Classroom Full</span>
                              ) : seatsLeft <= 5 ? (
                                <span className="font-semibold text-warning bg-warning-soft px-2 py-0.5 rounded-md border border-warning/30">
                                  Only {seatsLeft} seat
                                  {seatsLeft === 1 ? '' : 's'} left
                                </span>
                              ) : (
                                <span className="font-semibold text-success bg-success-soft px-2 py-0.5 rounded-md border border-success/30">
                                  {seatsLeft} of {capacity} seats available
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Course Overview */}
          <div className="rounded-2xl border border-border/90 bg-card p-5 shadow-xs space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Course Overview & Scope</h3>
            <div className="text-sm leading-relaxed text-secondary-foreground">
              <RichContent html={course.description} />
            </div>
          </div>

          {/* Learning Objectives */}
          {course.objectives ? (
            <div className="rounded-2xl border border-primary/30 bg-primary-soft/60 p-5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Course Learning Objectives & Outcomes</h3>
              </div>
              <div className="text-xs text-primary leading-relaxed">
                <RichContent html={course.objectives} />
              </div>
            </div>
          ) : null}

          {/* Detailed Metadata Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-border/90 bg-muted/70 p-4 text-xs">
            <div>
              <span className="block font-bold uppercase tracking-wider text-[10px] text-subtle-foreground mb-0.5">Department / Ministry</span>
              <div className="font-semibold text-foreground">
                <RichContent inline html={course.department} placeholder="Ministry of Revenues" />
              </div>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[10px] text-subtle-foreground mb-0.5">Target Audience</span>
              <div className="font-semibold text-foreground">
                <RichContent inline html={course.targetAudience} placeholder="All Staff & Officers" />
              </div>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[10px] text-subtle-foreground mb-0.5">Delivery Method</span>
              <div className="font-semibold text-foreground capitalize">{(course.deliveryMethod || 'self_paced').replace('_', ' ')}</div>
            </div>
            <div>
              <span className="block font-bold uppercase tracking-wider text-[10px] text-subtle-foreground mb-0.5">Primary Language</span>
              <div className="font-semibold text-foreground">{course.language || 'English'}</div>
            </div>
            {course.prerequisites ? (
              <div className="sm:col-span-2 lg:col-span-4 border-t border-border/70 pt-2.5 mt-1">
                <span className="block font-bold uppercase tracking-wider text-[10px] text-subtle-foreground mb-0.5">
                  Prerequisites & Recommended Background
                </span>
                <div className="font-normal text-secondary-foreground leading-relaxed">
                  <RichContent html={course.prerequisites} />
                </div>
              </div>
            ) : null}
          </div>

          {error ? <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger shadow-xs">{error}</div> : null}

          {/* Prominent Bottom Enroll CTA Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 sm:p-7 text-white shadow-md flex flex-wrap items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-indigo-200" />
                <h3 className="text-base sm:text-lg font-bold text-white">Ready to start your learning journey?</h3>
              </div>
              <p className="text-xs sm:text-sm text-indigo-100 leading-relaxed">
                Enroll now for immediate access to interactive video streams, study notes, downloadable documents, assignments, and accredited
                certification.
              </p>
            </div>

            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={!canEnroll}
              className="bg-card text-primary hover:bg-primary-soft shadow-md font-bold text-sm px-6 py-2.5 shrink-0 transition-transform active:scale-95"
            >
              {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BookOpen className="h-4 w-4 mr-2" />}
              {enrolling ? 'Enrolling…' : 'Enroll in Course'}
            </Button>
          </div>
        </div>
      </WorkspaceDetailOverlay>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => !enrolling && setConfirmOpen(false)}
        onConfirm={() => void doEnroll()}
        isLoading={enrolling}
        variant="primary"
        title="Confirm Enrollment"
        confirmText={selectedDeliveryMode === 'IN_PERSON_ONLY' ? 'Reserve Seat & Enroll' : 'Confirm & Enroll'}
        description={
          <div className="space-y-2">
            <p>
              You are about to enroll in <strong className="text-foreground">{course.title}</strong> ({course.code}).
            </p>
            <ul className="space-y-1 rounded-xl border border-border bg-muted p-3 text-xs">
              <li>
                <span className="text-muted-foreground">Delivery: </span>
                <strong className="text-foreground">{selectedDeliveryMode === 'IN_PERSON_ONLY' ? 'In-Person Classroom' : 'Pure Online'}</strong>
              </li>
              {selectedDeliveryMode === 'IN_PERSON_ONLY' && chosenRound ? (
                <>
                  <li>
                    <span className="text-muted-foreground">Scheduled Round: </span>
                    <strong className="text-foreground">
                      {chosenRound.roundLabel} ({chosenRound.sessions.length} Classroom Session{chosenRound.sessions.length === 1 ? '' : 's'})
                    </strong>
                  </li>
                  {chosenRound.venue ? (
                    <li>
                      <span className="text-muted-foreground">Venue: </span>
                      <strong className="text-foreground">
                        {chosenRound.venue.name} · {chosenRound.venue.branch}
                      </strong>
                    </li>
                  ) : null}
                </>
              ) : null}
            </ul>
            <p className="text-xs text-muted-foreground">You will be taken to the course once enrollment is complete.</p>
          </div>
        }
      />
    </>
  );
}
