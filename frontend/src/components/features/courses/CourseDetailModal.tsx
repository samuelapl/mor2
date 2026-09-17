import { useEffect, useState } from "react";
import {
  Archive,
  CalendarDays,
  ChevronDown,
  ClipboardPen,
  Clock,
  FileText,
  Globe2,
  Lock,
  Pencil,
  Send,
  Trash2,
  UserPlus,
  UserRound,
  Video,
} from "lucide-react";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Badge, CourseStatusBadge, courseLevelLabel, courseLevelVariant } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RichContent } from "@/components/ui/RichContent";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { fetchAssessment, fetchCourseAssessments } from "@/lib/api/quiz";
import { fetchTrainers } from "@/lib/api/users";
import { userFromApi } from "@/lib/api/transform";
import type { ApiAssessment } from "@/lib/api/types";
import type { User } from "@/types";
import { cn } from "@/lib/utils";

interface CourseDetailModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  /**
   * @deprecated Review actions now derive from permissions + course status
   * (see the header actions built below). Kept only so existing call sites
   * still compile; it no longer affects what renders.
   */
  reviewActions?: {
    onApprove: () => void;
    onReject: () => void;
    onRequestChanges?: () => void;
  };
}

type ReasonPromptKind = "reject" | "request_changes";

export function CourseDetailModal({
  open,
  onClose,
  courseId,
}: CourseDetailModalProps) {
  const {
    courseById,
    userName,
    assignTrainerToCourse,
    unassignTrainerFromCourse,
    submitForApproval,
    approveCourse,
    rejectCourse,
    requestChangesCourse,
    publishCourse,
    unpublishCourse,
    archiveCourse,
    deleteCourse,
  } = useLms();
  const course = courseById(courseId);
  const [assessments, setAssessments] = useState<ApiAssessment[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [flashError, setFlashError] = useState(false);
  const [trainerOptions, setTrainerOptions] = useState<User[]>([]);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [busy, setBusy] = useState(false);
  const [reasonPrompt, setReasonPrompt] = useState<ReasonPromptKind | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [needsTrainerForPublish, setNeedsTrainerForPublish] = useState(false);
  const [publishTrainerId, setPublishTrainerId] = useState("");

  const { can, hasRole } = usePermissions();
  const canAssignTrainer = can("course.assign_trainer");
  const canUnpublish = can("course.unpublish");
  const canPublish = can("course.publish") && course?.status === "approved" && !course.published;
  const showTrainerSection = canAssignTrainer;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAssessments([]);
    setFlash(null);
    setFlashError(false);
    setMode("view");
    setReasonPrompt(null);
    setReason("");
    setReasonError(null);
    setNeedsTrainerForPublish(false);
    setPublishTrainerId("");
    setAssessmentLoading(true);
    (async () => {
      try {
        const list = await fetchCourseAssessments(courseId);
        if (cancelled || list.length === 0) return;
        const details = await Promise.all(list.map((item) => fetchAssessment(item.id)));
        if (!cancelled) setAssessments(details);
      } catch {
        // assessment preview is best-effort
      } finally {
        if (!cancelled) setAssessmentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  useEffect(() => {
    if (!open || !(canAssignTrainer || canPublish)) {
      setTrainerOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchTrainers();
        if (!cancelled) {
          setTrainerOptions(
            res.data.map(userFromApi).filter((u) => u.status === "active"),
          );
        }
      } catch {
        // trainer picker is best-effort; leave empty on failure
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, canAssignTrainer, canPublish]);

  if (!course) return null;

  const notify = (ok: boolean, message: string) => {
    setFlashError(!ok);
    setFlash(message);
  };

  const addTrainer = async (trainerId: string) => {
    if (!trainerId) return;
    const result = await assignTrainerToCourse(course.id, trainerId);
    notify(result.ok, result.ok ? "Trainer assigned." : result.message);
  };

  const removeTrainer = async (trainerId: string) => {
    const result = await unassignTrainerFromCourse(course.id, trainerId);
    notify(result.ok, result.ok ? "Trainer removed." : result.message);
  };

  const doPublish = async () => {
    if (!course.trainerId) {
      if (canAssignTrainer) {
        setPublishTrainerId("");
        setNeedsTrainerForPublish(true);
      } else {
        notify(false, "Assign a trainer before publishing the course.");
      }
      return;
    }
    setBusy(true);
    const result = await publishCourse(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? "Course published. Learners can now enroll." : result.message);
  };

  const doAssignAndPublish = async () => {
    if (!publishTrainerId) return;
    setBusy(true);
    const assigned = await assignTrainerToCourse(course.id, publishTrainerId);
    if (!assigned.ok) {
      setBusy(false);
      notify(false, assigned.message);
      return;
    }
    const result = await publishCourse(course.id);
    setBusy(false);
    setNeedsTrainerForPublish(false);
    notify(
      result.ok,
      result.ok ? "Trainer assigned and course published." : result.message,
    );
  };

  const doUnpublish = async () => {
    setBusy(true);
    const result = await unpublishCourse(course.id);
    setBusy(false);
    notify(
      result.ok,
      result.ok
        ? "Course unpublished. It no longer appears in the learner catalog."
        : result.message,
    );
  };

  const doSubmit = async () => {
    setBusy(true);
    const result = await submitForApproval(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? "Course submitted for approval." : result.message);
  };

  const doApprove = async () => {
    setBusy(true);
    const result = await approveCourse(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? "Course approved." : result.message);
  };

  const openReasonPrompt = (kind: ReasonPromptKind) => {
    setReason("");
    setReasonError(null);
    setReasonPrompt(kind);
  };

  const confirmReasonPrompt = async () => {
    if (!reasonPrompt) return;
    const trimmed = reason.trim();
    if (!trimmed) {
      setReasonError("A reason is required.");
      return;
    }
    setBusy(true);
    const result =
      reasonPrompt === "reject"
        ? await rejectCourse(course.id, trimmed)
        : await requestChangesCourse(course.id, trimmed);
    setBusy(false);
    if (!result.ok) {
      setReasonError(result.message);
      return;
    }
    setReasonPrompt(null);
    notify(true, reasonPrompt === "reject" ? "Course rejected." : "Changes requested.");
  };

  const doArchive = async () => {
    if (!window.confirm("Archive this course? It will move out of the active catalog.")) return;
    setBusy(true);
    const result = await archiveCourse(course.id);
    setBusy(false);
    notify(result.ok, result.ok ? "Course archived." : result.message);
  };

  const doDelete = async () => {
    if (!window.confirm("Delete this course? This cannot be undone.")) return;
    setBusy(true);
    const result = await deleteCourse(course.id);
    setBusy(false);
    if (result.ok) {
      onClose();
      return;
    }
    notify(false, result.message);
  };

  const isPrivilegedAdmin = hasRole("training_admin") || hasRole("system_admin");
  const canEdit =
    (can("course.update.own") || can("course.update.all")) &&
    (course.status === "draft" || course.status === "rejected");
  const canSubmit =
    can("course.submit_approval") && (course.status === "draft" || course.status === "rejected");
  const canRequestChanges = can("course.reject") && course.status === "under_review";
  const canRejectAction = can("course.reject") && course.status === "under_review";
  const canApproveAction = can("course.approve") && course.status === "under_review";
  const canArchiveAction =
    can("course.archive") &&
    course.status !== "archived" &&
    course.status !== "under_review" &&
    (isPrivilegedAdmin || course.status === "draft");
  const canDeleteAction =
    can("course.delete") &&
    course.status !== "published" &&
    (isPrivilegedAdmin || course.status === "draft");

  const lessonCount = course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const attachmentCount = course.attachments?.length ?? 0;

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canEdit ? (
        <Button size="sm" variant="outline" onClick={() => setMode("edit")}>
          <Pencil className="h-3.5 w-3.5" />
          Edit course
        </Button>
      ) : null}
      {canSubmit ? (
        <Button size="sm" disabled={busy} onClick={() => void doSubmit()}>
          <Send className="h-3.5 w-3.5" />
          {course.status === "rejected" ? "Resubmit for approval" : "Submit for approval"}
        </Button>
      ) : null}
      {canRequestChanges ? (
        <Button size="sm" variant="outline" onClick={() => openReasonPrompt("request_changes")}>
          Request changes
        </Button>
      ) : null}
      {canRejectAction ? (
        <Button size="sm" variant="danger" onClick={() => openReasonPrompt("reject")}>
          Reject
        </Button>
      ) : null}
      {canApproveAction ? (
        <Button size="sm" variant="success" disabled={busy} onClick={() => void doApprove()}>
          Approve
        </Button>
      ) : null}
      {canPublish ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void doPublish()}
          title={
            course.trainerId
              ? "Publish this course to all learners"
              : "Assign a trainer before publishing"
          }
        >
          <Globe2 className="h-3.5 w-3.5" />
          Publish course
        </Button>
      ) : null}
      {canUnpublish && course.published ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => void doUnpublish()}
          title="Hide this course from the learner catalog"
        >
          <Globe2 className="h-3.5 w-3.5" />
          Unpublish course
        </Button>
      ) : null}
      {canArchiveAction ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => void doArchive()}>
          <Archive className="h-3.5 w-3.5" />
          Archive course
        </Button>
      ) : null}
      {canDeleteAction ? (
        <Button size="sm" variant="danger" disabled={busy} onClick={() => void doDelete()}>
          <Trash2 className="h-3.5 w-3.5" />
          Delete course
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <WorkspaceDetailOverlay
        open={open}
        onClose={onClose}
        title={mode === "edit" ? `Edit Course: ${course.title}` : course.title}
        subtitle={
          mode === "edit"
            ? `${course.code} · Update curriculum, objectives, materials, and assessment`
            : `${course.code} · ${course.category}`
        }
        badge={mode === "edit" ? undefined : <CourseStatusBadge status={course.published ? "published" : course.status} />}
        actions={mode === "view" ? headerActions : undefined}
      >
        {mode === "edit" ? (
          <div className="w-full">
            <CourseCreationWizard
              key={course.id}
              editingCourse={course}
              onDone={() => setMode("view")}
              onCancel={() => setMode("view")}
            />
          </div>
        ) : (
          <div className="w-full space-y-6">
            {course.cover ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={course.cover}
                  alt={`${course.title} cover`}
                  className="h-48 w-full object-cover"
                />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{course.category}</Badge>
              <Badge variant={courseLevelVariant(course.level)}>
                {courseLevelLabel(course.level)}
              </Badge>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
                <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
                Owner: {userName(course.ownerId)}
              </span>
              {(course.trainerIds?.length ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
                  <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
                  Trainers: {(course.trainerIds ?? []).map(userName).join(", ")}
                </span>
              ) : course.trainerId ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/80 px-2 py-1 text-xs text-slate-600">
                  <UserRound className="h-3.5 w-3.5 text-indigo-500/70" />
                  Trainer: {userName(course.trainerId)}
                </span>
              ) : null}
            </div>

            {flash ? (
              <div
                className={cn(
                  "rounded-xl border px-4 py-2.5 text-sm",
                  flashError
                    ? "border-red-200/70 bg-red-50/80 text-red-700"
                    : "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
                )}
              >
                {flash}
              </div>
            ) : null}

            {needsTrainerForPublish ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3">
                <p className="text-sm font-medium text-amber-800">
                  This course needs a trainer before it can be published.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <select
                    value={publishTrainerId}
                    onChange={(event) => setPublishTrainerId(event.target.value)}
                    className="rounded-xl border border-amber-200/90 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  >
                    <option value="">
                      {trainerOptions.length ? "Select a trainer…" : "No trainers available"}
                    </option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={!publishTrainerId || busy}
                    onClick={() => void doAssignAndPublish()}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Assign & Publish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNeedsTrainerForPublish(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Course Description */}
            <div>
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">
                Course Description
              </h3>
              <div className="text-sm leading-relaxed text-slate-700 prose prose-sm max-w-none">
                <RichContent html={course.description} />
              </div>
            </div>

            {/* Course Objectives */}
            {course.objectives ? (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
                <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-indigo-900">
                  Course Learning Objectives
                </h3>
                <div className="text-xs leading-relaxed text-indigo-950/90 prose prose-xs max-w-none">
                  <RichContent html={course.objectives} />
                </div>
              </div>
            ) : null}

            {/* Course Metadata Grid */}
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 text-xs text-slate-600">
              <div><span className="font-semibold text-slate-800">Department:</span> {course.department || "Ministry of Revenues"}</div>
              <div><span className="font-semibold text-slate-800">Target Audience:</span> {course.targetAudience || "All Staff"}</div>
              <div><span className="font-semibold text-slate-800">Delivery:</span> {(course.deliveryMethod || "self_paced").replace("_", " ")}</div>
              <div><span className="font-semibold text-slate-800">Language:</span> {course.language || "English"}</div>
              {course.prerequisites ? (
                <div className="sm:col-span-2 md:col-span-4 border-t border-slate-200/60 pt-2">
                  <span className="font-semibold text-slate-800">Prerequisites:</span> {course.prerequisites}
                </div>
              ) : null}
            </div>

            {course.rejectionReason ? (
              <div className="rounded-xl border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-red-700">
                <p className="font-medium">Admin feedback / Rejection Reason</p>
                <p className="mt-0.5">{course.rejectionReason}</p>
                {course.rejectedBy || course.rejectedAt ? (
                  <p className="mt-1 text-[11px] text-red-500/80">
                    {course.rejectedBy ? `Rejected by ${course.rejectedBy}` : null}
                    {course.rejectedAt ? ` · ${course.rejectedAt}` : null}
                  </p>
                ) : null}
              </div>
            ) : null}

            {!course.rejectionReason && course.lastRejectionReason ? (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">Previous admin feedback</p>
                <p className="mt-0.5">{course.lastRejectionReason}</p>
              </div>
            ) : null}

            {showTrainerSection ? (
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Trainer management · {lessonCount} lessons
                </h3>
                <div className="mt-3 space-y-2">
                  {course.trainerIds && course.trainerIds.length > 0 ? (
                    course.trainerIds.map((trainerId) => (
                      <div
                        key={trainerId}
                        className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-sm text-slate-700"
                      >
                        <span>{userName(trainerId)}</span>
                        {canAssignTrainer ? (
                          <button
                            type="button"
                            onClick={() => void removeTrainer(trainerId)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label="Remove trainer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">
                      No trainer assigned yet. Publication requires at least one trainer.
                    </p>
                  )}
                  {canAssignTrainer ? (
                    <div className="flex items-center gap-2">
                      <select
                        value=""
                        onChange={(event) => void addTrainer(event.target.value)}
                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="">{trainerOptions.length ? "Assign a trainer…" : "No trainers available"}</option>
                        {trainerOptions.map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.name}
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" disabled={trainerOptions.length === 0} title="Assign trainer">
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Curriculum Structure ({course.modules.length} Modules)
              </h3>
              <div className="space-y-4">
                {course.modules.map((module, index) => {
                  const lockedModule = module.unlocked === false;
                  return (
                    <div
                      key={module.id}
                      className={cn(
                        "overflow-hidden rounded-xl border bg-white shadow-xs",
                        lockedModule
                          ? "border-slate-200/60 bg-slate-50/40"
                          : "border-slate-200/80",
                      )}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                        <div>
                          <p
                            className={cn(
                              "text-sm font-bold",
                              lockedModule ? "text-slate-500" : "text-slate-800",
                            )}
                          >
                            {lockedModule ? <Lock className="mr-1.5 inline h-3.5 w-3.5" /> : null}
                            Module {index + 1}: {module.title}
                          </p>
                          {module.description ? (
                            <p className="text-xs text-slate-500 mt-0.5">{module.description}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          {module.durationMinutes ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                              <Clock className="h-3 w-3" />
                              {module.durationMinutes} min
                            </span>
                          ) : null}
                          <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200/70">
                            <ClipboardPen className="h-3.5 w-3.5 text-indigo-500/70" />
                            {module.lessons.length} lessons
                          </span>
                        </div>
                      </div>

                      {module.objectives ? (
                        <div className="border-b border-slate-100 bg-indigo-50/40 px-4 py-2 text-xs text-indigo-950">
                          <span className="font-semibold text-indigo-900">Module Learning Objectives: </span>
                          {module.objectives}
                        </div>
                      ) : null}

                      <ul className="divide-y divide-slate-100">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const lockedLesson = lesson.unlocked === false;
                          const openLessonId = openLesson === lesson.id;
                          return (
                            <li key={lesson.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenLesson(openLessonId ? null : lesson.id)
                                }
                                className={cn(
                                  "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors",
                                  lockedLesson
                                    ? "cursor-not-allowed text-slate-400"
                                    : "text-slate-600 hover:bg-indigo-50/30",
                                )}
                              >
                                <span>
                                  {index + 1}.{lessonIndex + 1} · {lesson.title}
                                </span>
                                <span className="inline-flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                                  {lockedLesson ? (
                                    <Lock className="h-3.5 w-3.5" />
                                  ) : (
                                    <CalendarDays className="h-3.5 w-3.5" />
                                  )}
                                  {lockedLesson ? "Locked" : `${lesson.durationMin} min`}
                                  <Badge variant="outline">{lesson.contentType}</Badge>
                                  {lesson.resourceUrl ? (
                                    <span className="text-emerald-600 font-medium">1 file</span>
                                  ) : null}
                                  <ChevronDown
                                    className={cn(
                                      "ml-1 h-3.5 w-3.5 transition-transform",
                                      openLessonId ? "rotate-180" : "",
                                    )}
                                  />
                                </span>
                              </button>

                              {/* Sub-lessons list if present */}
                              {lesson.subLessons && lesson.subLessons.length > 0 ? (
                                <div className="pl-8 pr-4 py-1.5 bg-slate-50/50 border-t border-slate-100 text-xs">
                                  <p className="font-semibold text-slate-500 mb-1 text-[11px]">Sub-lessons:</p>
                                  <ul className="space-y-1">
                                    {lesson.subLessons.map((sub, subIdx) => (
                                      <li key={sub.id} className="text-slate-600 flex items-center justify-between">
                                        <span>{index + 1}.{lessonIndex + 1}.{subIdx + 1} {sub.title}</span>
                                        <span className="text-[11px] text-slate-400">{sub.contentType} · {sub.durationMin}m</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null}

                              {openLessonId ? (
                                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-3">
                                  {lesson.resourceUrl ? (
                                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                      <span className="font-medium text-slate-700">Attached Resource / Media</span>
                                      <a
                                        href={lesson.resourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-indigo-600 hover:underline font-semibold"
                                      >
                                        View / Download File
                                      </a>
                                    </div>
                                  ) : null}
                                  {lesson.content ? <RichContent html={lesson.content} /> : null}
                                </div>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>

            {attachmentCount > 0 ? (
              <div>
                <h3 className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>Attachments & Resources</span>
                  <Badge variant="outline">{attachmentCount}</Badge>
                </h3>
                <ul className="space-y-2">
                  {course.attachments?.map((attachment) => (
                    <li
                      key={attachment.id}
                      className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 shadow-sm"
                    >
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600 font-medium"
                      >
                        {attachment.type === "video" ? (
                          <Video className="h-4 w-4 text-indigo-500/70" />
                        ) : (
                          <FileText className="h-4 w-4 text-indigo-500/70" />
                        )}
                        {attachment.name}
                      </a>
                      <Badge variant="outline">{attachment.type}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {assessmentLoading ? (
              <p className="text-xs text-slate-400">Loading assessments…</p>
            ) : assessments.length > 0 ? (
              <div className="space-y-4">
                <h3 className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <span>{assessments.length > 1 ? "Assessments" : "Final Assessment"}</span>
                  <Badge variant="green" dot>
                    {assessments.length} quiz{assessments.length > 1 ? "zes" : ""} ready
                  </Badge>
                </h3>
                {assessments.map((assessment) => (
                  <div key={assessment.id}>
                    <div className="rounded-xl bg-gradient-to-r from-indigo-50/80 to-violet-50/80 px-4 py-3 ring-1 ring-inset ring-indigo-200/50">
                      <p className="text-sm font-semibold text-slate-800">{assessment.titleEn}</p>
                      <p className="text-[11px] text-slate-500">
                        {assessment.questions.length} questions
                        · pass mark {assessment.passingScore}% · {assessment.maxAttempts} attempts
                        {assessment.timeLimitMinutes ? ` · ${assessment.timeLimitMinutes} min` : ""}
                      </p>
                    </div>
                    {assessment.questions.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {assessment.questions.map((question, index) => (
                          <div
                            key={question.id}
                            className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm"
                          >
                            <p className="text-sm font-medium text-slate-800">
                              {index + 1}. {question.question}
                            </p>
                            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                              {question.options.map((option, optionIndex) => (
                                <li
                                  key={optionIndex}
                                  className={cn(
                                    "rounded-lg px-2.5 py-1 text-xs",
                                    question.correctAnswer !== undefined &&
                                      question.correctAnswer === optionIndex
                                      ? "bg-emerald-50 font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200/60"
                                      : "text-slate-500",
                                  )}
                                >
                                  {option}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No assessment has been attached yet.</p>
            )}
          </div>
        )}
      </WorkspaceDetailOverlay>

      <Modal
        open={reasonPrompt !== null}
        onClose={() => setReasonPrompt(null)}
        title={reasonPrompt === "reject" ? "Reject course" : "Request changes"}
        subtitle={`${course.code} — ${course.title}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonPrompt(null)}>
              Cancel
            </Button>
            <Button
              variant={reasonPrompt === "reject" ? "danger" : "outline"}
              disabled={!reason.trim() || busy}
              onClick={() => void confirmReasonPrompt()}
            >
              {reasonPrompt === "reject" ? "Confirm Reject" : "Send Revision Request"}
            </Button>
          </>
        }
      >
        <label htmlFor="courseReasonPrompt" className="mb-1.5 block text-xs font-semibold text-slate-600">
          {reasonPrompt === "reject" ? "Reason for rejection *" : "Required changes and feedback *"}
        </label>
        <textarea
          id="courseReasonPrompt"
          required
          rows={4}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setReasonError(null);
          }}
          placeholder={
            reasonPrompt === "reject"
              ? "Specify why this course is rejected and cannot be approved..."
              : "Describe the required updates, missing materials, or corrections the course owner needs to make before approval..."
          }
          className="w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
        />
        {reasonError ? <p className="mt-2 text-xs text-red-600">{reasonError}</p> : null}
      </Modal>
    </>
  );
}
