"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardPen,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  Film,
  Globe2,
  Headphones,
  HelpCircle,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Paperclip,
  Pencil,
  Presentation,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import {
  Badge,
  CourseStatusBadge,
  courseLevelLabel,
  courseLevelVariant,
} from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { RichContent, stripHtmlTags } from "@/components/ui/RichContent";
import { RichTextArea } from "@/components/ui/RichTextArea";
import { CourseCreationWizard } from "@/components/features/courses/CourseCreationWizard";
import { toast } from "@/lib/toast";
import { useLms } from "@/lib/lms-store";
import { usePermissions } from "@/lib/usePermissions";
import { fetchAssessment, fetchCourseAssessments } from "@/lib/api/quiz";
import { fetchTrainers } from "@/lib/api/users";
import { userFromApi } from "@/lib/api/transform";
import type { ApiAssessment, ApiAssessmentQuestion } from "@/lib/api/types";
import type { UploadedResource, User } from "@/types";
import { cn } from "@/lib/utils";
import { formatFileSize } from "./wizard-components";

interface CourseDetailModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  /**
   * @deprecated Review actions now derive from permissions + course status
   */
  reviewActions?: {
    onApprove: () => void;
    onReject: () => void;
    onRequestChanges?: () => void;
  };
}

type ReasonPromptKind = "reject" | "request_changes";

/**
 * Returns all attached files for an item by combining resources, attachments,
 * and legacy resourceUrl/fileName into a uniform list.
 */
function getItemAttachments(item: {
  resources?: UploadedResource[];
  attachments?: UploadedResource[];
  resourceUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}): UploadedResource[] {
  const map = new Map<string, UploadedResource>();

  const list = [...(item.resources || []), ...(item.attachments || [])];
  for (const f of list) {
    if (f.url) map.set(f.url, f);
  }

  if (item.resourceUrl && !map.has(item.resourceUrl)) {
    map.set(item.resourceUrl, {
      name: item.fileName || item.resourceUrl.split("/").pop() || "Attached File",
      url: item.resourceUrl,
      size: item.fileSize || undefined,
    });
  }

  return Array.from(map.values());
}

/**
 * Determines appropriate icon and color based on file extension or URL.
 */
function getFileBadge(file: UploadedResource) {
  const url = (file.url || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  const ext = name.split(".").pop() || url.split(".").pop() || "";

  if (["pdf"].includes(ext)) {
    return {
      icon: FileText,
      bgColor: "bg-rose-50 text-rose-700 border-rose-200",
      badgeLabel: "PDF",
    };
  }
  if (["doc", "docx"].includes(ext)) {
    return {
      icon: FileText,
      bgColor: "bg-blue-50 text-blue-700 border-blue-200",
      badgeLabel: "Word",
    };
  }
  if (["xls", "xlsx", "csv"].includes(ext)) {
    return {
      icon: FileSpreadsheet,
      bgColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      badgeLabel: "Spreadsheet",
    };
  }
  if (["ppt", "pptx"].includes(ext)) {
    return {
      icon: Presentation,
      bgColor: "bg-orange-50 text-orange-700 border-orange-200",
      badgeLabel: "Presentation",
    };
  }
  if (["mp4", "webm", "mov", "mkv"].includes(ext)) {
    return {
      icon: Film,
      bgColor: "bg-purple-50 text-purple-700 border-purple-200",
      badgeLabel: "Video",
    };
  }
  if (["mp3", "wav", "m4a", "aac"].includes(ext)) {
    return {
      icon: Headphones,
      bgColor: "bg-amber-50 text-amber-700 border-amber-200",
      badgeLabel: "Audio",
    };
  }
  return {
    icon: Paperclip,
    bgColor: "bg-slate-100 text-slate-700 border-slate-200",
    badgeLabel: ext.toUpperCase() || "File",
  };
}

/**
 * Renders an attachment card with file details and open/download action buttons.
 */
function AttachmentCard({ file }: { file: UploadedResource }) {
  const badge = getFileBadge(file);
  const Icon = badge.icon;
  const fileName = file.name || file.url.split("/").pop() || "Attachment";

  return (
    <div className="group flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-white p-2.5 px-3 shadow-2xs hover:border-indigo-300 hover:shadow-xs transition">
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
            badge.bgColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-xs font-semibold text-slate-800 group-hover:text-indigo-700 transition"
            title={fileName}
          >
            {fileName}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-medium text-slate-600">{badge.badgeLabel}</span>
            {file.size ? (
              <>
                <span>•</span>
                <span>{formatFileSize(file.size)}</span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition shadow-2xs"
          title="Open file in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open</span>
        </a>
        <a
          href={file.url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/80 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition shadow-2xs"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}

/**
 * Helper to get content type icon and styling
 */
function getContentTypeBadge(type?: string) {
  const norm = (type || "").toUpperCase();
  switch (norm) {
    case "VIDEO":
      return { label: "Video Lesson", icon: Film, color: "text-purple-700 bg-purple-50 border-purple-200" };
    case "AUDIO":
      return { label: "Audio Lesson", icon: Headphones, color: "text-amber-700 bg-amber-50 border-amber-200" };
    case "DOCUMENT":
      return { label: "Document / Reading", icon: FileText, color: "text-blue-700 bg-blue-50 border-blue-200" };
    case "PRESENTATION":
      return { label: "Slide Presentation", icon: Presentation, color: "text-orange-700 bg-orange-50 border-orange-200" };
    case "QUIZ":
    case "ASSESSMENT":
      return { label: "Quiz Assessment", icon: FileQuestion, color: "text-emerald-700 bg-emerald-50 border-emerald-200" };
    case "ASSIGNMENT":
      return { label: "Graded Assignment", icon: Award, color: "text-rose-700 bg-rose-50 border-rose-200" };
    default:
      return { label: norm || "Lesson", icon: BookOpen, color: "text-slate-700 bg-slate-100 border-slate-200" };
  }
}

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
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { can, hasRole } = usePermissions();
  const canAssignTrainer = can("course.assign_trainer");
  const canUnpublish = can("course.unpublish");
  const canPublish = can("course.publish") && course?.status === "approved" && !course.published;

  // Initialize all module and lesson IDs for default-expanded review view
  const allModuleIds = useMemo(() => new Set((course?.modules || []).map((m) => m.id)), [course?.modules]);
  const allLessonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const m of course?.modules || []) {
      for (const l of m.lessons || []) {
        ids.add(l.id);
        if (l.subLessons) {
          for (const s of l.subLessons) {
            ids.add(s.id);
          }
        }
      }
    }
    return ids;
  }, [course?.modules]);

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  // Keep expanded states sync'd on open
  useEffect(() => {
    if (open && course?.modules) {
      setExpandedModules(new Set(course.modules.map((m) => m.id)));
      const lIds = new Set<string>();
      for (const m of course.modules) {
        for (const l of m.lessons || []) {
          lIds.add(l.id);
          if (l.subLessons) {
            for (const s of l.subLessons) {
              lIds.add(s.id);
            }
          }
        }
      }
      setExpandedLessons(lIds);
    }
  }, [open, course?.modules]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleLesson = (id: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(allModuleIds);
    setExpandedLessons(allLessonIds);
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
    setExpandedLessons(new Set());
  };

  // Aggregated totals (unconditionally declared at the top level)
  const totalLessons = useMemo(
    () => (course?.modules || []).reduce((sum, m) => sum + (m.lessons?.length || 0), 0),
    [course?.modules],
  );

  const totalSubLessons = useMemo(
    () =>
      (course?.modules || []).reduce(
        (sum, m) =>
          sum + (m.lessons || []).reduce((s, l) => s + (l.subLessons?.length || 0), 0),
        0,
      ),
    [course?.modules],
  );

  const courseLevelAttachments: UploadedResource[] = useMemo(() => {
    return (course?.attachments || []).map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      type: a.type,
    }));
  }, [course?.attachments]);

  const totalAttachments = useMemo(() => {
    let count = courseLevelAttachments.length;
    for (const m of course?.modules || []) {
      count += getItemAttachments(m).length;
      for (const l of m.lessons || []) {
        count += getItemAttachments(l).length;
        if (l.subLessons) {
          for (const s of l.subLessons) {
            count += getItemAttachments(s).length;
          }
        }
      }
    }
    for (const ass of assessments) {
      if (ass.resourceUrl) count += 1;
    }
    return count;
  }, [course?.modules, courseLevelAttachments, assessments]);

  const totalQuestions = useMemo(() => {
    return assessments.reduce((sum, ass) => sum + (ass.questions?.length || 0), 0);
  }, [assessments]);

  const totalEstimatedDurationMin = useMemo(() => {
    let total = 0;
    for (const m of course?.modules || []) {
      if (m.durationMinutes) {
        total += m.durationMinutes;
      } else {
        const lessonDuration = (m.lessons || []).reduce((s, l) => {
          const subSum = (l.subLessons || []).reduce((ss, sub) => ss + (sub.durationMin || 0), 0);
          return s + (l.durationMin || 0) + subSum;
        }, 0);
        total += lessonDuration || 60;
      }
    }
    return total;
  }, [course?.modules]);

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
        // trainer picker is best-effort
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
    if (ok) {
      toast.success(message);
    } else {
      toast.error(message);
    }
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
    setBusy(true);
    const result = await archiveCourse(course.id);
    setBusy(false);
    setConfirmArchiveOpen(false);
    notify(result.ok, result.ok ? "Course archived." : result.message);
  };

  const doDelete = async () => {
    setBusy(true);
    const result = await deleteCourse(course.id);
    setBusy(false);
    setConfirmDeleteOpen(false);
    if (result.ok) {
      toast.success("Course deleted successfully.");
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
  const canRequestChanges = can("course.approve_reject") && course.status === "under_review";
  const canRejectAction = can("course.approve_reject") && course.status === "under_review";
  const canApproveAction = can("course.approve_reject") && course.status === "under_review";
  const canArchiveAction =
    can("course.archive") &&
    course.status !== "archived" &&
    course.status !== "under_review" &&
    (isPrivilegedAdmin || course.status === "draft");
  const canDeleteAction =
    can("course.delete") &&
    course.status !== "published" &&
    (isPrivilegedAdmin || course.status === "draft");

  const headerActions = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canEdit ? (
        <Button size="sm" variant="outline" onClick={() => setMode("edit")} className="gap-1.5 shadow-2xs">
          <Pencil className="h-3.5 w-3.5" />
          Edit course
        </Button>
      ) : null}
      {canSubmit ? (
        <Button size="sm" disabled={busy} onClick={() => void doSubmit()} className="gap-1.5 shadow-2xs">
          <Send className="h-3.5 w-3.5" />
          {course.status === "rejected" ? "Resubmit for approval" : "Submit for approval"}
        </Button>
      ) : null}
      {canRequestChanges ? (
        <Button size="sm" variant="outline" onClick={() => openReasonPrompt("request_changes")} className="gap-1.5 shadow-2xs">
          Request changes
        </Button>
      ) : null}
      {canRejectAction ? (
        <Button size="sm" variant="danger" onClick={() => openReasonPrompt("reject")} className="gap-1.5 shadow-2xs">
          Reject
        </Button>
      ) : null}
      {canApproveAction ? (
        <Button size="sm" variant="success" disabled={busy} onClick={() => void doApprove()} className="gap-1.5 shadow-2xs bg-emerald-600 hover:bg-emerald-700 text-white">
          Approve
        </Button>
      ) : null}
      {canPublish ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => void doPublish()}
          className="gap-1.5 shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white"
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
          className="gap-1.5 shadow-2xs"
          title="Hide this course from the learner catalog"
        >
          <Globe2 className="h-3.5 w-3.5" />
          Unpublish course
        </Button>
      ) : null}
      {canArchiveAction ? (
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setConfirmArchiveOpen(true)} className="gap-1.5 shadow-2xs">
          <Archive className="h-3.5 w-3.5" />
          Archive course
        </Button>
      ) : null}
      {canDeleteAction ? (
        <Button size="sm" variant="danger" disabled={busy} onClick={() => setConfirmDeleteOpen(true)} className="gap-1.5 shadow-2xs">
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
          <div className="w-full space-y-7">
            {/* ── Global Controls Banner & Quick Expand ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50 via-indigo-50/20 to-white p-5 shadow-xs">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 px-2.5 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-xs">
                    {course.code}
                  </span>
                  <h3 className="font-display text-lg font-bold text-slate-900">
                    Comprehensive Course Review
                  </h3>
                </div>
                <p className="text-xs text-slate-500">
                  Full overview of course curriculum, learning objectives, attached documents, and evaluation questions.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                  className="gap-1.5 text-xs text-slate-700 hover:text-indigo-700 border-slate-200 bg-white shadow-2xs"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Expand All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                  className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200 bg-white shadow-2xs"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Collapse All
                </Button>
              </div>
            </div>

            {/* ── Summary Stat Pills Bar ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Modules</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{course.modules.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lessons</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{totalLessons}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Sub-Lessons</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{totalSubLessons}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attachments</p>
                <p className="mt-1 text-xl font-bold text-indigo-600">{totalAttachments}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Questions</p>
                <p className="mt-1 text-xl font-bold text-emerald-600">{totalQuestions}</p>
              </div>
              <div className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Est. Time</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {totalEstimatedDurationMin >= 60
                    ? `${Math.floor(totalEstimatedDurationMin / 60)}h ${totalEstimatedDurationMin % 60}m`
                    : `${totalEstimatedDurationMin}m`}
                </p>
              </div>
            </div>

            {/* Flash messages */}
            {flash ? (
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm shadow-2xs",
                  flashError
                    ? "border-red-200/70 bg-red-50/80 text-red-700"
                    : "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
                )}
              >
                {flash}
              </div>
            ) : null}

            {/* Needs Trainer For Publish Notice */}
            {needsTrainerForPublish ? (
              <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-4 shadow-2xs space-y-3">
                <p className="text-sm font-semibold text-amber-900">
                  ⚠ This course needs a trainer assigned before it can be published to learners.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={publishTrainerId}
                    onChange={(event) => setPublishTrainerId(event.target.value)}
                    className="rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-sm text-slate-700 shadow-xs outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-500/10"
                  >
                    <option value="">
                      {trainerOptions.length ? "Select a trainer…" : "No trainers available"}
                    </option>
                    {trainerOptions.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.name} ({trainer.email})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!publishTrainerId || busy}
                    onClick={() => void doAssignAndPublish()}
                    className="shadow-xs"
                  >
                    Assign & Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setNeedsTrainerForPublish(false)}
                    className="shadow-xs bg-white"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {/* ── Section 1: Course Details Overview ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                    1. Course Overview & Attributes
                  </h4>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("edit")}
                    className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Details
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-start">
                {/* Cover Image */}
                <div className="w-full md:w-52 shrink-0">
                  {course.cover ? (
                    <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-2xs aspect-video md:aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={course.cover}
                        alt="Course Cover"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center aspect-video md:aspect-[4/3]">
                      <BookOpen className="h-8 w-8 text-slate-300 mb-1" />
                      <p className="text-xs text-slate-400 font-medium">No cover image</p>
                    </div>
                  )}
                </div>

                {/* Title & Metadata */}
                <div className="space-y-3 flex-1 min-w-0">
                  <div className="space-y-1">
                    <span className="inline-block rounded-md bg-indigo-50 px-2.5 py-0.5 font-mono text-xs font-bold text-indigo-700 border border-indigo-100 uppercase tracking-wider">
                      <RichContent inline html={course.code} placeholder="NO-CODE" />
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 leading-snug">
                      <RichContent inline html={course.title} placeholder="Untitled Course" />
                    </h2>
                    {(course as any).titleAm ? (
                      <p className="text-sm text-slate-600 font-medium">
                        የስልጠና ርዕስ (አማርኛ): <RichContent inline html={(course as any).titleAm} />
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Badge variant="outline" className="border-slate-300 text-slate-700 bg-slate-50 font-medium">
                      {course.category}
                    </Badge>
                    <Badge variant={courseLevelVariant(course.level)} className="font-bold tracking-wider">
                      {courseLevelLabel(course.level)}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                      <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                      Owner: {userName(course.ownerId)}
                    </span>
                    {(course.trainerIds?.length ?? 0) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                        <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                        Trainers: {(course.trainerIds ?? []).map(userName).join(", ")}
                      </span>
                    ) : course.trainerId ? (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200">
                        <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                        Trainer: {userName(course.trainerId)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                        No trainer assigned
                      </span>
                    )}
                  </div>

                  {/* Department / Audience / Prerequisites */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="font-semibold text-slate-500 block mb-0.5">Department:</span>
                      <span className="text-slate-800 font-medium">
                        <RichContent inline html={course.department} placeholder="Not specified" />
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="font-semibold text-slate-500 block mb-0.5">Target Audience:</span>
                      <span className="text-slate-800 font-medium">
                        <RichContent inline html={course.targetAudience} placeholder="All Staff" />
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-50/80 p-2.5 border border-slate-100">
                      <span className="font-semibold text-slate-500 block mb-0.5">Prerequisites:</span>
                      <span className="text-slate-800 font-medium">
                        <RichContent inline html={course.prerequisites} placeholder="None" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Description */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Course Description
                </p>
                {course.description && stripHtmlTags(course.description) ? (
                  <div
                    className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none bg-slate-50/50 p-4 rounded-xl border border-slate-100"
                    dangerouslySetInnerHTML={{ __html: course.description }}
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800 italic">
                    ⚠ No course description provided.
                  </div>
                )}
              </div>

              {/* Course Learning Objectives */}
              <div className="space-y-1.5">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Learning Objectives & Outcomes
                </p>
                {course.objectives && stripHtmlTags(course.objectives) ? (
                  <div className="rounded-xl bg-blue-50/60 p-4 border border-blue-100/90 space-y-1">
                    <div
                      className="text-sm text-blue-950 leading-relaxed prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ __html: course.objectives }}
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800 italic">
                    ⚠ No learning objectives specified.
                  </div>
                )}
              </div>

              {/* Trainer Assignment Management (if permitted) */}
              {canAssignTrainer ? (
                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Trainer Assignment Management
                  </p>
                  <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                    <div className="space-y-2">
                      {(course.trainerIds?.length ?? 0) > 0 ? (
                        course.trainerIds?.map((trainerId) => (
                          <div
                            key={trainerId}
                            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs shadow-2xs"
                          >
                            <span className="font-semibold text-slate-800 flex items-center gap-2">
                              <UserRound className="h-3.5 w-3.5 text-indigo-600" />
                              {userName(trainerId)}
                            </span>
                            <button
                              type="button"
                              onClick={() => void removeTrainer(trainerId)}
                              className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove trainer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">
                          No trainer assigned yet. Course publication requires at least one trainer.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value=""
                        onChange={(event) => void addTrainer(event.target.value)}
                        className="w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-700 shadow-xs outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                      >
                        <option value="">{trainerOptions.length ? "Assign a trainer…" : "No trainers available"}</option>
                        {trainerOptions.map((trainer) => (
                          <option key={trainer.id} value={trainer.id}>
                            {trainer.name} ({trainer.email})
                          </option>
                        ))}
                      </select>
                      <Button size="sm" variant="outline" disabled={trainerOptions.length === 0} className="text-xs gap-1 shadow-2xs">
                        <UserPlus className="h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* ── Section 2: Complete Curriculum Hierarchy & Attachments ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-600" />
                    <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                      2. Curriculum Structure & Uploaded Materials
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Review all modules, lessons, reading notes, and attached documents.
                  </p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setMode("edit")}
                    className="gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Curriculum
                  </Button>
                ) : null}
              </div>

              {course.modules.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-5 text-center text-xs text-amber-800">
                  ⚠ No modules added to this course yet.
                </div>
              ) : (
                <div className="space-y-5">
                  {course.modules.map((module, mIdx) => {
                    const isModExpanded = expandedModules.has(module.id);
                    const moduleAttachments = getItemAttachments(module);
                    const lockedModule = module.unlocked === false;

                    return (
                      <div
                        key={module.id}
                        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-2xs transition hover:border-slate-300"
                      >
                        {/* Module Header Bar */}
                        <div
                          onClick={() => toggleModule(module.id)}
                          className="flex cursor-pointer flex-wrap items-center justify-between gap-3 border-l-4 border-l-indigo-600 bg-white p-4.5 px-5 transition hover:bg-slate-50/80 select-none"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="flex h-7 px-2.5 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xs shadow-2xs">
                              Module {mIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <h5 className="font-display text-base font-bold text-slate-900 truncate">
                                {lockedModule ? <Lock className="mr-1.5 inline h-3.5 w-3.5 text-slate-400" /> : null}
                                {module.title.trim() || (
                                  <span className="text-amber-600 italic font-normal">
                                    Untitled Module
                                  </span>
                                )}
                              </h5>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {module.durationMinutes ? `${module.durationMinutes} min` : "60 min"}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                              {module.lessons.length} Lesson{module.lessons.length !== 1 ? "s" : ""}
                            </span>
                            {moduleAttachments.length > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                <Paperclip className="h-3.5 w-3.5" />
                                {moduleAttachments.length} Attachment
                                {moduleAttachments.length !== 1 ? "s" : ""}
                              </span>
                            ) : null}
                            <button
                              type="button"
                              className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
                              title={isModExpanded ? "Collapse Module" : "Expand Module"}
                            >
                              {isModExpanded ? (
                                <ChevronUp className="h-5 w-5" />
                              ) : (
                                <ChevronDown className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Module Expanded Content */}
                        {isModExpanded && (
                          <div className="border-t border-slate-200/80 p-5 space-y-5">
                            {/* Module Description */}
                            {module.description && stripHtmlTags(module.description) ? (
                              <div className="rounded-xl bg-white p-4 border border-slate-200/70 space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Module Overview & Description
                                </p>
                                <div
                                  className="text-xs text-slate-700 leading-relaxed prose prose-xs max-w-none"
                                  dangerouslySetInnerHTML={{ __html: module.description }}
                                />
                              </div>
                            ) : null}

                            {/* Module Objectives */}
                            {module.objectives && stripHtmlTags(module.objectives) ? (
                              <div className="rounded-xl bg-indigo-50/50 p-3.5 border border-indigo-100 space-y-1">
                                <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                                  Module Learning Objectives
                                </p>
                                <div
                                  className="text-xs text-indigo-950 leading-relaxed prose prose-xs max-w-none"
                                  dangerouslySetInnerHTML={{ __html: module.objectives }}
                                />
                              </div>
                            ) : null}

                            {/* Module Attached Materials */}
                            {moduleAttachments.length > 0 && (
                              <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-4 space-y-2.5">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 uppercase tracking-wider">
                                  <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                                  <span>Module Attachments & Reference Materials ({moduleAttachments.length})</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {moduleAttachments.map((file, fIdx) => (
                                    <AttachmentCard key={file.id || file.url || fIdx} file={file} />
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Module Lessons List */}
                            <div className="space-y-3">
                              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                Lessons in Module {mIdx + 1} ({module.lessons.length})
                              </p>

                              {module.lessons.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-3.5 text-xs text-amber-800 italic">
                                  ⚠ No lessons created for this module.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {module.lessons.map((lesson, lIdx) => {
                                    const isLessExpanded = expandedLessons.has(lesson.id);
                                    const lessonBadge = getContentTypeBadge(lesson.contentType);
                                    const LessonTypeIcon = lessonBadge.icon;
                                    const lessonAttachments = getItemAttachments(lesson);
                                    const subLessons = lesson.subLessons || [];
                                    const lockedLesson = lesson.unlocked === false;

                                    return (
                                      <div
                                        key={lesson.id}
                                        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xs"
                                      >
                                        {/* Lesson Card Header */}
                                        <div
                                          onClick={() => toggleLesson(lesson.id)}
                                          className="flex cursor-pointer flex-wrap items-center justify-between gap-2.5 p-3.5 px-4 transition hover:bg-slate-50/60 select-none"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <span className="flex h-6 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 font-mono text-xs font-bold text-slate-700">
                                              {mIdx + 1}.{lIdx + 1}
                                            </span>
                                            <span className="font-semibold text-slate-900 text-sm truncate">
                                              {lockedLesson ? <Lock className="mr-1 inline h-3 w-3 text-slate-400" /> : null}
                                              {lesson.title.trim() || (
                                                <span className="text-amber-600 italic font-normal">
                                                  Untitled Lesson
                                                </span>
                                              )}
                                            </span>
                                          </div>

                                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            <span
                                              className={cn(
                                                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold",
                                                lessonBadge.color,
                                              )}
                                            >
                                              <LessonTypeIcon className="h-3 w-3" />
                                              {lessonBadge.label}
                                            </span>
                                            <span className="text-xs font-medium text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                              {lesson.durationMin || 15} min
                                            </span>
                                            {(lesson as any).required === false ? (
                                              <Badge variant="outline" className="text-slate-500 border-slate-300">
                                                Optional
                                              </Badge>
                                            ) : (
                                              <Badge variant="slate" className="bg-slate-100 text-slate-700">
                                                Required
                                              </Badge>
                                            )}
                                            {lessonAttachments.length > 0 ? (
                                              <Badge variant="blue" className="gap-1">
                                                <Paperclip className="h-3 w-3" />
                                                {lessonAttachments.length}
                                              </Badge>
                                            ) : null}
                                            <button
                                              type="button"
                                              className="rounded p-1 text-slate-400 hover:text-slate-600"
                                              title={isLessExpanded ? "Collapse Lesson" : "Expand Lesson"}
                                            >
                                              {isLessExpanded ? (
                                                <ChevronUp className="h-4 w-4" />
                                              ) : (
                                                <ChevronDown className="h-4 w-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>

                                        {/* Lesson Body (Visible by default) */}
                                        {isLessExpanded && (
                                          <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/30 text-xs">
                                            {/* Lesson Reading Notes */}
                                            <div className="space-y-1.5">
                                              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                Reading Notes & Detailed Content
                                              </p>
                                              {lesson.content && stripHtmlTags(lesson.content) ? (
                                                <div
                                                  className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-slate-700 leading-relaxed prose prose-sm max-w-none shadow-2xs"
                                                  dangerouslySetInnerHTML={{ __html: lesson.content }}
                                                />
                                              ) : (
                                                <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-2.5 text-xs text-amber-700 italic">
                                                  ⚠ No reading notes or instructions written for this lesson.
                                                </div>
                                              )}
                                            </div>

                                            {/* Lesson Attachments */}
                                            {lessonAttachments.length > 0 && (
                                              <div className="space-y-1.5">
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                  Lesson Attachments ({lessonAttachments.length})
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  {lessonAttachments.map((file, fIdx) => (
                                                    <AttachmentCard
                                                      key={file.id || file.url || fIdx}
                                                      file={file}
                                                    />
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Sub-lessons Tree */}
                                            {subLessons.length > 0 && (
                                              <div className="space-y-2.5 pt-2">
                                                <div className="flex items-center gap-2">
                                                  <div className="h-2 w-2 rounded-full bg-indigo-500" />
                                                  <p className="text-xs font-bold text-slate-800">
                                                    Sub-Lessons ({subLessons.length})
                                                  </p>
                                                </div>

                                                <div className="space-y-2.5 pl-3 sm:pl-4 border-l-2 border-indigo-200">
                                                  {subLessons.map((sub, sIdx) => {
                                                    const subBadge = getContentTypeBadge(sub.contentType);
                                                    const SubIcon = subBadge.icon;
                                                    const subAttachments = getItemAttachments(sub);

                                                    return (
                                                      <div
                                                        key={sub.id}
                                                        className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-2xs"
                                                      >
                                                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                                            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                              {mIdx + 1}.{lIdx + 1}.{sIdx + 1}
                                                            </span>
                                                            <span className="font-semibold text-slate-800 text-xs truncate">
                                                              {sub.title.trim() || (
                                                                <span className="text-amber-600 italic font-normal">
                                                                  Untitled Sub-lesson
                                                                </span>
                                                              )}
                                                            </span>
                                                          </div>
                                                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                            <span
                                                              className={cn(
                                                                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold border",
                                                                subBadge.color,
                                                              )}
                                                            >
                                                              <SubIcon className="h-3 w-3" />
                                                              {subBadge.label}
                                                            </span>
                                                            <span className="text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-[11px]">
                                                              {sub.durationMin || 10} min
                                                            </span>
                                                          </div>
                                                        </div>

                                                        {/* Sub-lesson content */}
                                                        {sub.content && stripHtmlTags(sub.content) ? (
                                                          <div
                                                            className="rounded-lg bg-slate-50/70 p-2.5 text-slate-700 text-xs leading-relaxed prose prose-xs max-w-none border border-slate-100"
                                                            dangerouslySetInnerHTML={{ __html: sub.content }}
                                                          />
                                                        ) : null}

                                                        {/* Sub-lesson attachments */}
                                                        {subAttachments.length > 0 && (
                                                          <div className="space-y-1.5 pt-1">
                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                                              Sub-Lesson Files ({subAttachments.length})
                                                            </p>
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                              {subAttachments.map((file, sfIdx) => (
                                                                <AttachmentCard
                                                                  key={file.id || file.url || sfIdx}
                                                                  file={file}
                                                                />
                                                              ))}
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Section 3: Course-Level Attachments ── */}
            {courseLevelAttachments.length > 0 && (
              <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Paperclip className="h-4 w-4 text-indigo-600" />
                  <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Course-Level General Reference Materials ({courseLevelAttachments.length})
                  </h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {courseLevelAttachments.map((file, idx) => (
                    <AttachmentCard key={file.id || file.url || idx} file={file} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Section 4: Final Assessment & Evaluation Rules ── */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                    <h4 className="font-display text-sm font-bold text-slate-900 uppercase tracking-wide">
                      3. Final Assessment & Evaluation Rules
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Review passing thresholds, time limits, and all exam questions.
                  </p>
                </div>
                {assessments.length > 0 ? (
                  <Badge variant="green" dot className="font-bold">
                    {assessments.length} Assessment{assessments.length > 1 ? "s" : ""} Attached
                  </Badge>
                ) : null}
              </div>

              {assessmentLoading ? (
                <div className="flex items-center justify-center py-6 text-xs text-slate-400">
                  Loading assessment and question bank…
                </div>
              ) : assessments.length > 0 ? (
                <div className="space-y-6">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="space-y-4">
                      <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50/70 p-4 shadow-2xs">
                        <h5 className="font-bold text-slate-900 text-sm">{assessment.titleEn}</h5>
                        {assessment.descriptionEn ? (
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {assessment.descriptionEn}
                          </p>
                        ) : null}
                      </div>

                      {/* Metrics cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                          <p className="text-slate-500 font-medium">Passing Score</p>
                          <p className="text-lg font-bold text-emerald-600 mt-1">
                            {assessment.passingScore}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                          <p className="text-slate-500 font-medium">Time Limit</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">
                            {assessment.timeLimitMinutes ? `${assessment.timeLimitMinutes} min` : "No limit"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                          <p className="text-slate-500 font-medium">Attempts Allowed</p>
                          <p className="text-lg font-bold text-slate-900 mt-1">
                            {assessment.maxAttempts}
                          </p>
                        </div>
                        <div className="rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 shadow-2xs">
                          <p className="text-slate-500 font-medium">Total Questions</p>
                          <p className="text-lg font-bold text-indigo-600 mt-1">
                            {assessment.questions.length}
                          </p>
                        </div>
                      </div>

                      {/* Assessment Attached Reference File */}
                      {assessment.resourceUrl ? (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/30 p-3.5 space-y-2">
                          <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Paperclip className="h-3.5 w-3.5 text-indigo-600" />
                            Exam Reference Material
                          </p>
                          <AttachmentCard
                            file={{
                              name: assessment.fileName || "Exam Reference File",
                              url: assessment.resourceUrl,
                              size: assessment.fileSize || undefined,
                            }}
                          />
                        </div>
                      ) : null}

                      {/* All Questions Preview */}
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Exam Questions Preview ({assessment.questions.length})
                        </p>

                        {assessment.questions.length === 0 ? (
                          <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/70 p-4 text-amber-800 text-xs">
                            ⚠ No questions added to this assessment yet.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {assessment.questions.map((q, qIdx) => {
                              const isMultipleChoice =
                                q.type === "MULTIPLE_CHOICE" || !q.type;
                              const isTrueFalse = q.type === "TRUE_FALSE";
                              const isShortAnswer = q.type === "SHORT_ANSWER";

                              return (
                                <div
                                  key={q.id || qIdx}
                                  className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 text-xs space-y-2.5 shadow-2xs hover:border-slate-300 transition"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white text-[11px] font-bold">
                                        {qIdx + 1}
                                      </span>
                                      <Badge variant="slate" className="font-semibold text-slate-700 bg-white border-slate-200">
                                        {isMultipleChoice
                                          ? "Multiple Choice"
                                          : isTrueFalse
                                            ? "True / False"
                                            : "Short Answer"}
                                      </Badge>
                                    </div>
                                    <span className="font-bold text-indigo-700 text-xs">
                                      10 Points
                                    </span>
                                  </div>

                                  {/* Prompt */}
                                  <div
                                    className="font-medium text-slate-800 text-sm prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                      __html: q.question || "<em>No question prompt</em>",
                                    }}
                                  />

                                  {/* Image preview */}
                                  {q.imageUrl ? (
                                    <div className="pt-1">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={q.imageUrl}
                                        alt="Question Context"
                                        className="max-h-48 rounded-lg border border-slate-200 object-cover"
                                      />
                                    </div>
                                  ) : null}

                                  {/* Multiple Choice Options */}
                                  {isMultipleChoice && Array.isArray(q.options) && (
                                    <div className="space-y-1.5 pt-1">
                                      {q.options.map((opt, optIdx) => {
                                        const isCorrect =
                                          q.correctAnswer === optIdx ||
                                          q.correctAnswer === opt;
                                        return (
                                          <div
                                            key={optIdx}
                                            className={cn(
                                              "flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition",
                                              isCorrect
                                                ? "bg-emerald-50 border-emerald-300 font-semibold text-emerald-900 shadow-2xs"
                                                : "bg-white border-slate-200 text-slate-600",
                                            )}
                                          >
                                            <span
                                              className={cn(
                                                "flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-xs font-bold",
                                                isCorrect
                                                  ? "bg-emerald-600 text-white"
                                                  : "bg-slate-100 text-slate-500",
                                              )}
                                            >
                                              {String.fromCharCode(65 + optIdx)}
                                            </span>
                                            <span className="flex-1">{opt}</span>
                                            {isCorrect && (
                                              <Badge
                                                variant="green"
                                                className="ml-auto text-xs py-0.5 px-2 bg-emerald-100 text-emerald-800 font-bold border-emerald-200"
                                              >
                                                Correct Answer ✓
                                              </Badge>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* True / False Options */}
                                  {isTrueFalse && (
                                    <div className="flex items-center gap-3 pt-1">
                                      {["True", "False"].map((opt, optIdx) => {
                                        const isCorrect =
                                          q.correctAnswer === optIdx ||
                                          q.correctAnswer === opt ||
                                          (q.correctAnswer === 0 && opt === "True") ||
                                          (q.correctAnswer === 1 && opt === "False");
                                        return (
                                          <span
                                            key={opt}
                                            className={cn(
                                              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs",
                                              isCorrect
                                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                                : "bg-white border-slate-200 text-slate-500",
                                            )}
                                          >
                                            {opt}
                                            {isCorrect && (
                                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                                            )}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* Short Answer Rubric */}
                                  {isShortAnswer && (
                                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                                      <span className="font-semibold text-slate-700 block mb-1">
                                        Expected Keywords & Grading Rubric:
                                      </span>
                                      <p className="text-slate-600">
                                        {typeof q.correctAnswer === "string"
                                          ? q.correctAnswer
                                          : "No grading criteria specified."}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No assessment has been attached yet.</p>
              )}
            </div>
          </div>
        )}
      </WorkspaceDetailOverlay>

      {/* Reject / Request Changes Modal */}
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
        <RichTextArea
          id="courseReasonPrompt"
          label={reasonPrompt === "reject" ? "Reason for rejection" : "Required changes and feedback"}
          required
          rows={3}
          value={reason}
          onChange={(val) => {
            setReason(val);
            setReasonError(null);
          }}
          placeholder={
            reasonPrompt === "reject"
              ? "Specify why this course is rejected and cannot be approved (supports bold, lists, headings)..."
              : "Describe the required updates, missing materials, or corrections the course owner needs to make before approval..."
          }
          error={reasonError}
        />
      </Modal>

      <ConfirmModal
        open={confirmArchiveOpen}
        title="Archive Course"
        description={`Archive "${course.title}"? It will move out of the active catalog.`}
        confirmText="Archive Course"
        variant="warning"
        isLoading={busy}
        onConfirm={doArchive}
        onClose={() => !busy && setConfirmArchiveOpen(false)}
      />

      <ConfirmModal
        open={confirmDeleteOpen}
        title="Delete Course"
        description={`Delete "${course.title}"? This action cannot be undone and will permanently remove all associated course content.`}
        confirmText="Delete Course"
        variant="danger"
        isLoading={busy}
        onConfirm={doDelete}
        onClose={() => !busy && setConfirmDeleteOpen(false)}
      />
    </>
  );
}
