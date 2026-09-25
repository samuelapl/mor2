"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  UserRound,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Badge, courseLevelLabel, courseLevelVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RichContent } from "@/components/ui/RichContent";
import { useLms } from "@/lib/lms-store";
import { fetchAssessment, fetchCourseAssessments } from "@/lib/api/quiz";
import { fetchLiveSessions } from "@/lib/api/monitoring";
import type { ApiAssessment, ApiLiveSession } from "@/lib/api/types";
import { getItemAttachments } from "./wizard-components";

interface CatalogCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "Self-paced";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? "s" : ""}`;
  return `${mins} min`;
}

function formatDate(value: string): string {
  try {
    return new Date(value).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function formatTime(value: string): string {
  try {
    return new Date(value).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Set once doEnroll succeeds so the "already enrolled" redirect below doesn't double-navigate.
  const justEnrolledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);

  // Delivery mode & Session selection
  const defaultMode: "ONLINE_ONLY" | "IN_PERSON_ONLY" =
    course?.deliveryMode === "IN_PERSON_ONLY" ? "IN_PERSON_ONLY" : "ONLINE_ONLY";
  const [selectedDeliveryMode, setSelectedDeliveryMode] =
    useState<"ONLINE_ONLY" | "IN_PERSON_ONLY">(defaultMode);
  const [availableSessions, setAvailableSessions] = useState<ApiLiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");

  useEffect(() => {
    if (course?.deliveryMode === "IN_PERSON_ONLY") {
      setSelectedDeliveryMode("IN_PERSON_ONLY");
    } else if (course?.deliveryMode === "ONLINE_ONLY") {
      setSelectedDeliveryMode("ONLINE_ONLY");
    }
  }, [course?.deliveryMode]);

  // Fetch in-person scheduled sessions for this course
  useEffect(() => {
    if (!open || !courseId) return;
    let cancelled = false;
    setLoadingSessions(true);
    fetchLiveSessions({ courseId, status: "SCHEDULED", limit: 50 })
      .then((res) => {
        if (!cancelled) {
          const inPerson = res.data.filter(
            (s) => s.sessionType === "IN_PERSON" || Boolean(s.venueId),
          );
          setAvailableSessions(inPerson);
          if (inPerson.length > 0) {
            const firstAvailable = inPerson.find((s) => {
              const cap = s.venue?.capacity ?? 30;
              const booked = s.attendees?.length ?? 0;
              return cap - booked > 0;
            });
            if (firstAvailable) {
              setSelectedSessionId(firstAvailable.id);
            } else {
              setSelectedSessionId(inPerson[0].id);
            }
          }
          setLoadingSessions(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAvailableSessions([]);
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
    if (open && enrolled && courseId && !justEnrolledRef.current) {
      onClose();
      router.push(`/learner/courses/${courseId}/learn`);
    }
  }, [open, enrolled, courseId, onClose, router]);

  // Early return if not loaded or enrolled
  if (!course || enrolled) return null;

  const isSeatFull =
    selectedDeliveryMode === "IN_PERSON_ONLY" &&
    (() => {
      const chosen = availableSessions.find((s) => s.id === selectedSessionId);
      if (!chosen) return false;
      const cap = chosen.venue?.capacity ?? 30;
      const booked = chosen.attendees?.length ?? 0;
      return cap - booked <= 0;
    })();

  const canEnroll =
    !enrolling &&
    !isSeatFull &&
    (selectedDeliveryMode !== "IN_PERSON_ONLY" ||
      availableSessions.length === 0 ||
      Boolean(selectedSessionId));

  const enrollButtonLabel = enrolling
    ? "Processing Enrollment…"
    : isSeatFull
    ? "Classroom Full"
    : selectedDeliveryMode === "IN_PERSON_ONLY"
    ? "Reserve Seat & Enroll"
    : "Enroll in Online Course";

  const chosenSession = availableSessions.find((s) => s.id === selectedSessionId);

  const doEnroll = async () => {
    setEnrolling(true);
    setError(null);
    let result;
    if (selectedDeliveryMode === "IN_PERSON_ONLY") {
      result = await enrollSelf(courseId, {
        deliveryMode: "IN_PERSON_ONLY",
        venueId: chosenSession?.venueId || undefined,
        sessionId: chosenSession?.id,
      });
    } else {
      result = await enrollSelf(courseId, {
        deliveryMode: "ONLINE_ONLY",
      });
    }
    setEnrolling(false);
    setConfirmOpen(false);
    if (!result.ok) {
      setError(result.message);
    } else {
      justEnrolledRef.current = true;
      onClose();
      router.push(`/learner/courses/${courseId}/learn`);
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
          <Badge variant={courseLevelVariant(course.level)}>
            {courseLevelLabel(course.level)}
          </Badge>
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
          ) : selectedDeliveryMode === "IN_PERSON_ONLY" ? (
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
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-rose-900">Enrollment Notice</p>
              <p className="mt-0.5 leading-relaxed">{error}</p>
            </div>
          </div>
        ) : null}

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
                <span>Language: {course.language || "English"}</span>
              </div>
              <div className="inline-flex items-center gap-1.5 text-slate-500">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                <span>{formatDuration(totalDurationMin)} est. completion</span>
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
              ) : selectedDeliveryMode === "IN_PERSON_ONLY" ? (
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
          <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs">
            <div className="flex items-center gap-2 text-slate-400">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Modules
              </span>
            </div>
            <p className="mt-1 text-lg font-bold text-slate-900">
              {course.modules.length}
            </p>
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
              {totalDurationMin > 0 ? `${totalDurationMin}m` : "Self-paced"}
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
              {totalQuestions > 0 ? `${totalQuestions} Qs` : "Included"}
            </p>
            <p className="text-[11px] text-slate-400">
              {finalAssessment ? `${finalAssessment.passingScore}% pass mark` : "Certified"}
            </p>
          </div>
        </div>

        {/* Delivery Mode & Classroom Selection */}
        <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-b from-indigo-50/50 via-white to-white p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                Enrollment Options
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Course Training Delivery Mode
              </h3>
            </div>
            <span className="text-xs font-medium text-slate-500">
              Select how you prefer to attend this training
            </span>
          </div>

          {/* Mode Selector */}
          {course.deliveryMode === "BOTH" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedDeliveryMode("ONLINE_ONLY")}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  selectedDeliveryMode === "ONLINE_ONLY"
                    ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 border border-sky-200">
                      <Laptop className="h-3.5 w-3.5" />
                      🌐 Pure Online
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        selectedDeliveryMode === "ONLINE_ONLY"
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedDeliveryMode === "ONLINE_ONLY" && (
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      )}
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-bold text-slate-900">
                    Self-Paced Online Learning
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Study anytime, anywhere with interactive lessons, quizzes, and instant certificate issuance upon passing.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Instant Access Upon Enrollment
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDeliveryMode("IN_PERSON_ONLY")}
                className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all ${
                  selectedDeliveryMode === "IN_PERSON_ONLY"
                    ? "border-indigo-600 bg-white ring-2 ring-indigo-500/20 shadow-xs"
                    : "border-slate-200 bg-white/70 hover:border-slate-300 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 border border-amber-200">
                      <Building2 className="h-3.5 w-3.5" />
                      🏢 In-Person Classroom
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                        selectedDeliveryMode === "IN_PERSON_ONLY"
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {selectedDeliveryMode === "IN_PERSON_ONLY" && (
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      )}
                    </span>
                  </div>
                  <h4 className="mt-2.5 text-sm font-bold text-slate-900">
                    Ministry Branch Classroom Training
                  </h4>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Attend scheduled instructor-led sessions at an official Ministry training hall with direct trainer guidance.
                  </p>
                </div>
                <div className="mt-3 text-[11px] font-medium text-amber-700 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Limited Classroom Capacity & Seat Reservation
                </div>
              </button>
            </div>
          ) : course.deliveryMode === "IN_PERSON_ONLY" ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
              <Building2 className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Mandatory In-Person Training</p>
                <p className="mt-0.5 text-amber-800">
                  This course is exclusively delivered through physical classroom sessions at Ethiopian Ministry of Revenues branch venues. Please reserve your seat in a scheduled session below.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-3.5 text-xs text-sky-900">
              <Laptop className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Pure Online Training</p>
                <p className="mt-0.5 text-sky-800">
                  This course is delivered 100% online through interactive modules, multimedia lessons, and knowledge checks.
                </p>
              </div>
            </div>
          )}

          {/* In-Person Session Picker */}
          {selectedDeliveryMode === "IN_PERSON_ONLY" && (
            <div className="mt-4 space-y-3 pt-3 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Select Training Venue & Scheduled Session:
                </span>
                <span className="text-[11px] text-slate-500">
                  {availableSessions.length} session{availableSessions.length === 1 ? "" : "s"} scheduled
                </span>
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center p-6 text-xs text-slate-500 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                  Loading scheduled classroom sessions…
                </div>
              ) : availableSessions.length === 0 ? (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">No classroom sessions scheduled yet</p>
                    <p className="mt-0.5">
                      Training coordinators have not yet scheduled in-person sessions for this course. Please contact your branch training administrator or check back soon.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {availableSessions.map((session) => {
                    const venue = session.venue;
                    const capacity = venue?.capacity ?? 30;
                    const booked = session.attendees?.length ?? 0;
                    const seatsLeft = Math.max(0, capacity - booked);
                    const isFull = seatsLeft <= 0;
                    const isSelected = selectedSessionId === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          if (!isFull) setSelectedSessionId(session.id);
                        }}
                        className={`relative rounded-xl border p-3.5 text-left transition-all ${
                          isFull
                            ? "opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed"
                            : isSelected
                            ? "border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 cursor-pointer shadow-xs"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 cursor-pointer"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                              <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                              <span>{venue?.branch || "Ministry Branch"}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-semibold text-slate-700">{venue?.name || "Room"}</span>
                            </div>
                            {venue?.building ? (
                              <p className="text-[11px] text-slate-500 mt-0.5 ml-5">
                                Building: {venue.building}
                              </p>
                            ) : null}
                          </div>

                          <span
                            className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                          </span>
                        </div>

                        {/* Date & Time */}
                        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {formatDate(session.scheduledAt)}
                          </span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {formatTime(session.scheduledAt)} ({session.durationMinutes}m)
                          </span>
                        </div>

                        {/* Trainer & Seat Capacity Meter */}
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 truncate max-w-[130px]">
                            {session.trainer
                              ? `${session.trainer.firstName} ${session.trainer.lastName}`
                              : "Assigned Trainer"}
                          </span>

                          {isFull ? (
                            <span className="font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                              Classroom Full
                            </span>
                          ) : seatsLeft <= 5 ? (
                            <span className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                              Only {seatsLeft} seat{seatsLeft === 1 ? "" : "s"} left
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
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
          )}
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
              <Sparkles className="h-4 w-4 text-indigo-600" />
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
              {(course.deliveryMethod || "self_paced").replace("_", " ")}
            </div>
          </div>
          <div>
            <span className="block font-bold uppercase tracking-wider text-[10px] text-slate-400 mb-0.5">
              Primary Language
            </span>
            <div className="font-semibold text-slate-800">
              {course.language || "English"}
            </div>
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
              Enroll now for immediate access to interactive video streams, study notes, downloadable documents, assignments, and accredited certification.
            </p>
          </div>

          <Button
            onClick={() => setConfirmOpen(true)}
            disabled={!canEnroll}
            className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-md font-bold text-sm px-6 py-2.5 shrink-0 transition-transform active:scale-95"
          >
            {enrolling ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <BookOpen className="h-4 w-4 mr-2" />
            )}
            {enrolling ? "Enrolling…" : "Enroll in Course"}
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
      confirmText={selectedDeliveryMode === "IN_PERSON_ONLY" ? "Reserve Seat & Enroll" : "Confirm & Enroll"}
      description={
        <div className="space-y-2">
          <p>
            You are about to enroll in <strong className="text-slate-900">{course.title}</strong> ({course.code}).
          </p>
          <ul className="space-y-1 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <li>
              <span className="text-slate-500">Delivery: </span>
              <strong className="text-slate-800">
                {selectedDeliveryMode === "IN_PERSON_ONLY" ? "In-Person Classroom" : "Pure Online"}
              </strong>
            </li>
            {selectedDeliveryMode === "IN_PERSON_ONLY" && chosenSession ? (
              <>
                <li>
                  <span className="text-slate-500">Session: </span>
                  <strong className="text-slate-800">
                    {chosenSession.titleEn} · {new Date(chosenSession.scheduledAt).toLocaleString()}
                  </strong>
                </li>
                {chosenSession.venue ? (
                  <li>
                    <span className="text-slate-500">Venue: </span>
                    <strong className="text-slate-800">
                      {chosenSession.venue.name} · {chosenSession.venue.branch}
                    </strong>
                  </li>
                ) : null}
              </>
            ) : null}
          </ul>
          <p className="text-xs text-slate-500">You will be taken to the course once enrollment is complete.</p>
        </div>
      }
    />
    </>
  );
}
