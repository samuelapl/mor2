'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Award,
  BookOpen,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Film,
  Headphones,
  ListChecks,
  Loader2,
  Lock,
  Paperclip,
  PlayCircle,
  Presentation,
  Target,
  Trash2,
  UploadCloud,
  Video,
} from 'lucide-react';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { RichContent } from '@/components/ui/RichContent';
import { QuizTakerModal } from '@/components/features/quiz/QuizTakerModal';
import { useLms } from '@/lib/lms-store';
import { addLessonTime, fetchCourseProgress, markLessonComplete } from '@/lib/api/progress';
import { fetchCourseDetail } from '@/lib/api/courses';
import { courseFromDetail } from '@/lib/api/transform';
import { uploadAttachment } from '@/lib/api/files';
import { ApiError } from '@/lib/api/client';
import type {
  ApiCourseProgress,
  ApiProgressLesson,
  ApiProgressModule,
  ApiProgressSubLesson,
} from '@/lib/api/types';
import type { Course, Lesson, Module, UploadedResource } from '@/types';
import { cn } from '@/lib/utils';
import { formatFileSize, getItemAttachments, getFileBadge } from './wizard-components';

interface LearnCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  showQuiz?: boolean;
}

interface AssignmentSubmission {
  fileUrl: string;
  fileName: string;
  sizeBytes: number;
  submittedAt: string;
}

interface ActiveQuizContext {
  assessmentId: string;
  kind: 'lesson' | 'module' | 'final';
  moduleIndex: number;
  lessonIndex?: number;
  subIndex?: number;
}

function formatMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

/**
 * Reusable card for attached resources with dedicated Open (view) and Download actions.
 */
function AttachmentCard({ file, label }: { file: UploadedResource; label?: string }) {
  const badge = getFileBadge(file);
  const Icon = badge.icon;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition hover:border-indigo-300">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
            badge.bgColor,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate" title={file.name}>
            {file.name}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
              {badge.badgeLabel}
            </span>
            {file.size ? <span>{formatFileSize(file.size)}</span> : null}
            {label ? <span>· {label}</span> : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-2xs"
          title="Open in new tab"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          <span>Open</span>
        </a>
        <a
          href={file.url}
          download={file.name}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-2xs"
          title="Download file"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}

export function LearnCourseModal({
  open,
  onClose,
  courseId,
  courseTitle,
  showQuiz = true,
}: LearnCourseModalProps) {
  const { courseById } = useLms();
  const storeCourse = courseById(courseId);
  const [liveCourse, setLiveCourse] = useState<Course | null>(null);
  const course = liveCourse || storeCourse;

  const [progress, setProgress] = useState<ApiCourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<Record<string, string>>({});
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [openSubLesson, setOpenSubLesson] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedSubLessons, setExpandedSubLessons] = useState<Record<string, boolean>>({});
  const [activeQuiz, setActiveQuiz] = useState<ActiveQuizContext | null>(null);
  const [liveTime, setLiveTime] = useState<Record<string, number>>({});
  const quizPassedRef = useRef(false);
  const lastFlushRef = useRef<{ itemId: string; at: number } | null>(null);

  // Assignment submissions state
  const [assignmentFiles, setAssignmentFiles] = useState<Record<string, AssignmentSubmission>>({});
  const [assignmentUploading, setAssignmentUploading] = useState<Record<string, boolean>>({});
  const [assignmentError, setAssignmentError] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (!courseId) return;
    try {
      const raw = localStorage.getItem(`lms_assignment_submissions_${courseId}`);
      if (raw) {
        setAssignmentFiles(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, [courseId]);

  const saveSubmission = (lessonId: string, sub: AssignmentSubmission) => {
    setAssignmentFiles((prev) => {
      const next = { ...prev, [lessonId]: sub };
      try {
        localStorage.setItem(`lms_assignment_submissions_${courseId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const removeSubmission = (lessonId: string) => {
    setAssignmentFiles((prev) => {
      const next = { ...prev };
      delete next[lessonId];
      try {
        localStorage.setItem(`lms_assignment_submissions_${courseId}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleAssignmentUpload = async (lessonId: string, file: File) => {
    setAssignmentUploading((prev) => ({ ...prev, [lessonId]: true }));
    setAssignmentError((prev) => ({ ...prev, [lessonId]: null }));
    try {
      const uploaded = await uploadAttachment(file, {
        courseId,
        lessonId,
        purpose: 'attachment',
      });
      saveSubmission(lessonId, {
        fileUrl: uploaded.fileUrl,
        fileName: uploaded.fileName || file.name,
        sizeBytes: uploaded.sizeBytes || file.size,
        submittedAt: new Date().toISOString(),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to upload assignment file.';
      setAssignmentError((prev) => ({ ...prev, [lessonId]: msg }));
    } finally {
      setAssignmentUploading((prev) => ({ ...prev, [lessonId]: false }));
    }
  };

  const refresh = useCallback(async () => {
    if (!open || !courseId) return;
    setLoading(true);
    try {
      const [resProgress, detail] = await Promise.all([
        fetchCourseProgress(courseId),
        fetchCourseDetail(courseId).catch(() => null),
      ]);
      setProgress(resProgress);
      if (detail) {
        setLiveCourse(courseFromDetail(detail));
      }
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [open, courseId]);

  useEffect(() => {
    setOpenLesson(null);
    setOpenSubLesson(null);
    setActiveQuiz(null);
    setActionError({});
    void refresh();
  }, [refresh]);

  // Auto-open the first unlocked, incomplete lesson once progress loads
  useEffect(() => {
    if (!progress || openLesson) return;
    for (const mod of progress.modules) {
      if (!mod.unlocked) break;
      for (const lesson of mod.lessons) {
        if (lesson.completed) continue;
        if (!lesson.unlocked) break;
        setExpandedModules((prev) => ({ ...prev, [mod.moduleId]: true }));
        setOpenLesson(lesson.lessonId);
        // If lesson has sub-lessons, auto-expand sub-lessons and open first incomplete sub-lesson
        const modObj = course?.modules.find((m) => m.id === mod.moduleId);
        const lessonObj = modObj?.lessons.find((l) => l.id === lesson.lessonId);
        if (lessonObj?.subLessons && lessonObj.subLessons.length > 0) {
          setExpandedSubLessons((prev) => ({ ...prev, [lesson.lessonId]: true }));
          const incompleteSub = lesson.subLessons?.find((s) => !s.completed);
          if (incompleteSub) {
            setOpenSubLesson(incompleteSub.lessonId);
          } else if (lessonObj.subLessons[0]) {
            setOpenSubLesson(lessonObj.subLessons[0].id);
          }
        }
        return;
      }
    }
  }, [progress, openLesson, course]);

  // Expand first module by default
  useEffect(() => {
    if (course && course.modules.length > 0) {
      setExpandedModules((prev) => {
        if (Object.keys(prev).length === 0 && course.modules[0]) {
          return { [course.modules[0].id]: true };
        }
        return prev;
      });
    }
  }, [course]);

  // Heartbeat flushes wall-clock time
  const flushHeartbeat = useCallback(async (itemId: string) => {
    const ref = lastFlushRef.current;
    if (!ref || ref.itemId !== itemId) return null;
    if (document.visibilityState !== 'visible') return null;

    const now = Date.now();
    const deltaSeconds = Math.min(300, Math.round((now - ref.at) / 1000));
    if (deltaSeconds <= 0) return null;
    lastFlushRef.current = { itemId, at: now };

    try {
      const res = await addLessonTime(itemId, deltaSeconds);
      setLiveTime((prev) => ({ ...prev, [itemId]: res.timeSpentSeconds }));
      return res;
    } catch {
      return null;
    }
  }, []);

  // Heartbeat periodic timer
  useEffect(() => {
    const activeItemId = openSubLesson ?? openLesson;
    if (!open || !activeItemId) return;

    lastFlushRef.current = { itemId: activeItemId, at: Date.now() };

    const interval = setInterval(() => {
      void flushHeartbeat(activeItemId).then((res) => {
        if (res?.satisfied) void refresh();
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [open, openLesson, openSubLesson, refresh, flushHeartbeat]);

  if (!course) return null;

  const findModuleProgress = (moduleId: string): ApiProgressModule | undefined =>
    progress?.modules.find((m) => m.moduleId === moduleId);

  const findLessonProgress = (
    moduleProg: ApiProgressModule | undefined,
    lessonId: string,
  ): ApiProgressLesson | undefined => moduleProg?.lessons.find((l) => l.lessonId === lessonId);

  const clearActionError = (itemId: string) =>
    setActionError((prev) => {
      if (!(itemId in prev)) return prev;
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

  const applyActionError = (itemId: string, err: unknown) => {
    if (err instanceof ApiError) {
      if (err.reason === 'TIME_NOT_MET') {
        const remaining = err.remainingSeconds ?? 0;
        setActionError((prev) => ({
          ...prev,
          [itemId]: `Spend ${formatMMSS(remaining)} more on this activity before continuing.`,
        }));
        return;
      }
      if (err.reason === 'ASSESSMENT_NOT_PASSED' || err.reason === 'ASSESSMENT_REQUIRED') {
        setActionError((prev) => ({
          ...prev,
          [itemId]: 'You must pass the assessment for this activity before continuing.',
        }));
        return;
      }
      if (err.reason === 'LOCKED') {
        setActionError((prev) => ({
          ...prev,
          [itemId]: 'This activity is locked. Refreshing your progress…',
        }));
        void refresh();
        return;
      }
      setActionError((prev) => ({ ...prev, [itemId]: err.message }));
      return;
    }
    setActionError((prev) => ({ ...prev, [itemId]: 'Something went wrong. Please try again.' }));
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  const toggleSubLessonGroup = (lessonId: string) => {
    setExpandedSubLessons((prev) => ({
      ...prev,
      [lessonId]: !prev[lessonId],
    }));
  };

  /**
   * Toggles a lesson open/closed. If the lesson has sub-lessons, it automatically
   * expands the sub-lessons branch and opens the first incomplete sub-lesson.
   */
  const toggleLesson = (mod: Module, lesson: Lesson) => {
    const modProg = findModuleProgress(mod.id);
    const lesProg = findLessonProgress(modProg, lesson.id);
    const locked = !(modProg?.unlocked ?? false) || !(lesProg?.unlocked ?? false);
    if (locked) return;

    if (openLesson === lesson.id) {
      setOpenLesson(null);
      setOpenSubLesson(null);
    } else {
      setOpenLesson(lesson.id);
      if (lesson.subLessons && lesson.subLessons.length > 0) {
        setExpandedSubLessons((prev) => ({ ...prev, [lesson.id]: true }));
        const firstIncomplete = lesProg?.subLessons?.find((s) => !s.completed);
        if (firstIncomplete) {
          setOpenSubLesson(firstIncomplete.lessonId);
        } else if (lesson.subLessons[0]) {
          setOpenSubLesson(lesson.subLessons[0].id);
        }
      } else {
        setOpenSubLesson(null);
      }
    }
  };

  const overall = progress?.stats.overallPercent ?? 0;
  const courseCompletion = progress?.courseCompletion;
  const certificateEligible = courseCompletion?.certificateEligible ?? false;
  const contentCompleted = courseCompletion?.contentCompleted ?? false;
  const finalAssessment = courseCompletion?.finalAssessment ?? null;

  const advanceToNextModule = (moduleIndex: number) => {
    const nextModule = course.modules[moduleIndex + 1];
    if (nextModule) {
      setExpandedModules((prev) => ({ ...prev, [nextModule.id]: true }));
      if (nextModule.lessons && nextModule.lessons.length > 0) {
        const nextLesson = nextModule.lessons[0];
        setOpenLesson(nextLesson.id);
        if (nextLesson.subLessons && nextLesson.subLessons.length > 0) {
          setExpandedSubLessons((prev) => ({ ...prev, [nextLesson.id]: true }));
          setOpenSubLesson(nextLesson.subLessons[0].id);
        } else {
          setOpenSubLesson(null);
        }
      }
    }
  };

  const advanceAfter = (moduleIndex: number, lessonIndex: number, subIndex?: number) => {
    const mod = course.modules[moduleIndex];
    const lesson = mod?.lessons[lessonIndex];

    // Case 1: Just finished parent lesson reading and it HAS sub-lessons -> auto-expand sub-lessons and open first sub-lesson!
    if (subIndex === undefined && lesson?.subLessons && lesson.subLessons.length > 0) {
      setExpandedSubLessons((prev) => ({ ...prev, [lesson.id]: true }));
      setOpenSubLesson(lesson.subLessons[0].id);
      return;
    }

    // Case 2: Just finished a sub-lesson -> advance to next sub-lesson if one exists
    if (subIndex !== undefined && lesson?.subLessons) {
      const nextSub = lesson.subLessons[subIndex + 1];
      if (nextSub) {
        setOpenSubLesson(nextSub.id);
        return;
      }
      // All sub-lessons for this lesson completed
      setOpenSubLesson(null);
    }

    // Case 3: Move to next lesson in the current module
    const nextLessonInModule = mod?.lessons[lessonIndex + 1];
    if (nextLessonInModule) {
      setOpenLesson(nextLessonInModule.id);
      if (nextLessonInModule.subLessons && nextLessonInModule.subLessons.length > 0) {
        setExpandedSubLessons((prev) => ({ ...prev, [nextLessonInModule.id]: true }));
        setOpenSubLesson(nextLessonInModule.subLessons[0].id);
      } else {
        setOpenSubLesson(null);
      }
      return;
    }

    // Case 4: Last lesson of module -> advance to next module
    advanceToNextModule(moduleIndex);
  };

  const handleNext = async (moduleIndex: number, lessonIndex: number, subIndex?: number) => {
    const mod = course.modules[moduleIndex];
    const lesson = mod?.lessons[lessonIndex];
    const item = subIndex !== undefined ? lesson?.subLessons?.[subIndex] : lesson;
    if (!mod || !lesson || !item) return;

    const moduleProg = findModuleProgress(mod.id);
    const lessonProg = findLessonProgress(moduleProg, lesson.id);
    const itemProg =
      subIndex !== undefined
        ? lessonProg?.subLessons?.find((s) => s.lessonId === item.id)
        : lessonProg;

    if (!itemProg) return;
    clearActionError(item.id);

    // If on parent lesson and it has sub-lessons:
    // Seamlessly transition the learner into the sub-lesson with auto-expansion!
    if (subIndex === undefined && lesson.subLessons && lesson.subLessons.length > 0) {
      try {
        await flushHeartbeat(item.id);
        await markLessonComplete(item.id, { completed: true, lastPosition: 0 });
      } catch {
        // Parent completion might require sub-lessons first, so proceed to sub-lesson
      }
      setExpandedSubLessons((prev) => ({ ...prev, [lesson.id]: true }));
      const firstIncompleteSub = lessonProg?.subLessons?.find((s) => !s.completed);
      if (firstIncompleteSub) {
        setOpenSubLesson(firstIncompleteSub.lessonId);
      } else if (lesson.subLessons[0]) {
        setOpenSubLesson(lesson.subLessons[0].id);
      }
      void refresh();
      return;
    }

    const freshHeartbeat = await flushHeartbeat(item.id);
    const spent =
      freshHeartbeat?.timeSpentSeconds ?? liveTime[item.id] ?? itemProg.timeSpentSeconds;
    const required = freshHeartbeat?.requiredSeconds ?? itemProg.requiredSeconds;
    if (spent < required) {
      const remaining = Math.max(required - spent, 0);
      const isCurrentlyOpen =
        subIndex !== undefined ? openSubLesson === item.id : openLesson === item.id;
      if (!isCurrentlyOpen) {
        if (subIndex !== undefined) {
          setOpenLesson(lesson.id);
          setExpandedSubLessons((prev) => ({ ...prev, [lesson.id]: true }));
          setOpenSubLesson(item.id);
        } else {
          setOpenLesson(item.id);
        }
        setActionError((prev) => ({
          ...prev,
          [item.id]: `Open this activity to start tracking time — spend ${formatMMSS(remaining)} more before continuing.`,
        }));
        return;
      }
      setActionError((prev) => ({
        ...prev,
        [item.id]: `Spend ${formatMMSS(remaining)} more on this activity before continuing.`,
      }));
      return;
    }

    const itemAssessment = (itemProg as ApiProgressLesson)?.assessment;
    if (itemAssessment && !itemAssessment.passed) {
      quizPassedRef.current = false;
      setActiveQuiz({
        assessmentId: itemAssessment.id,
        kind: 'lesson',
        moduleIndex,
        lessonIndex,
        subIndex,
      });
      return;
    }

    setActionBusyId(item.id);
    try {
      await markLessonComplete(item.id, { completed: true, lastPosition: 0 });
      await refresh();

      // If this was the last sub-lesson and the parent lesson has a pending assessment:
      if (
        subIndex !== undefined &&
        lesson.subLessons &&
        subIndex + 1 >= lesson.subLessons.length &&
        lessonProg?.assessment &&
        !lessonProg.assessment.passed
      ) {
        quizPassedRef.current = false;
        setActiveQuiz({
          assessmentId: lessonProg.assessment.id,
          kind: 'lesson',
          moduleIndex,
          lessonIndex,
        });
        return;
      }

      advanceAfter(moduleIndex, lessonIndex, subIndex);
    } catch (err) {
      applyActionError(item.id, err);
    } finally {
      setActionBusyId(null);
    }
  };

  const openModuleAssessment = (moduleIndex: number) => {
    const mod = course.modules[moduleIndex];
    const moduleProg = findModuleProgress(mod.id);
    if (!moduleProg?.assessment) return;
    quizPassedRef.current = false;
    setActiveQuiz({ assessmentId: moduleProg.assessment.id, kind: 'module', moduleIndex });
  };

  const openFinalAssessment = () => {
    if (!finalAssessment) return;
    quizPassedRef.current = false;
    setActiveQuiz({ assessmentId: finalAssessment.id, kind: 'final', moduleIndex: -1 });
  };

  const closeActiveQuiz = () => {
    const ctx = activeQuiz;
    const passed = quizPassedRef.current;
    quizPassedRef.current = false;
    setActiveQuiz(null);
    void refresh();
    if (!passed || !ctx) return;
    if (ctx.kind === 'lesson' && ctx.lessonIndex !== undefined) {
      advanceAfter(ctx.moduleIndex, ctx.lessonIndex, ctx.subIndex);
    } else if (ctx.kind === 'module') {
      advanceToNextModule(ctx.moduleIndex);
    }
  };

  const renderActivityIcon = (type?: string) => {
    switch (type) {
      case 'VIDEO':
        return <Video className="h-4 w-4 text-rose-500" />;
      case 'AUDIO':
        return <Headphones className="h-4 w-4 text-purple-500" />;
      case 'PRESENTATION':
        return <Presentation className="h-4 w-4 text-amber-500" />;
      case 'INTERACTIVE':
        return <ListChecks className="h-4 w-4 text-emerald-500" />;
      case 'EXTERNAL_LINK':
        return <ExternalLink className="h-4 w-4 text-indigo-500" />;
      case 'ASSIGNMENT':
        return <ClipboardList className="h-4 w-4 text-orange-500" />;
      case 'DOCUMENT':
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const renderVideoEmbed = (url: string) => {
    const ytMatch = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/,
    );
    if (ytMatch) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xs">
          <iframe
            src={`https://www.youtube.com/embed/${ytMatch[1]}`}
            title="Video lecture"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      );
    }

    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xs">
          <iframe
            src={`https://player.vimeo.com/video/${vimeoMatch[1]}`}
            title="Video lecture"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      );
    }

    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-xs">
          <video src={url} controls className="h-full w-full" />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
        <div className="flex items-center gap-3">
          <PlayCircle className="h-6 w-6 text-indigo-600" />
          <div>
            <p className="text-xs font-semibold text-slate-800">External Video Stream / Resource</p>
            <p className="text-[11px] text-slate-500 truncate max-w-md">{url}</p>
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Open Video
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  };

  const renderTimeIndicator = (spent: number, required: number, satisfied: boolean) => {
    if (required <= 0) return null;
    const pct = Math.min(100, Math.round((spent / required) * 100));
    return (
      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
        <Clock className="h-3 w-3 shrink-0" />
        <span
          className={cn(
            'font-medium',
            satisfied ? 'text-emerald-600' : 'text-indigo-600 font-semibold',
          )}
        >
          {formatMMSS(spent)} / {formatMMSS(required)}
        </span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn('h-full rounded-full', satisfied ? 'bg-emerald-500' : 'bg-indigo-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        {satisfied ? <Badge variant="green">Time met</Badge> : null}
      </div>
    );
  };

  const renderNextButton = (
    itemId: string,
    itemProg: ApiProgressLesson | ApiProgressSubLesson | undefined,
    onClick: () => void,
    size: 'sm' = 'sm',
    customLabel?: string,
  ) => {
    if (!itemProg) return null;
    const spent = liveTime[itemId] ?? itemProg.timeSpentSeconds;
    const timeSatisfied = itemProg.requiredSeconds <= 0 || spent >= itemProg.requiredSeconds;
    const itemAssessment = (itemProg as ApiProgressLesson)?.assessment;
    const needsAssessment = !!itemAssessment && !itemAssessment.passed && timeSatisfied;

    return (
      <Button
        size={size}
        variant={needsAssessment ? 'primary' : 'success'}
        disabled={actionBusyId === itemId}
        onClick={onClick}
        className={cn(
          'shadow-2xs font-semibold gap-1.5',
          needsAssessment
            ? 'bg-indigo-600 hover:bg-indigo-700'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white',
        )}
      >
        {actionBusyId === itemId ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : needsAssessment ? (
          <BookOpenCheck className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {needsAssessment ? 'Take Assessment' : customLabel || 'Next'}
      </Button>
    );
  };

  const renderAssignmentSection = (
    item: any,
    moduleIndex: number,
    lessonIndex: number,
    subIndex?: number,
  ) => {
    const submission = assignmentFiles[item.id];
    const isUploading = assignmentUploading[item.id] ?? false;
    const uploadErr = assignmentError[item.id];
    const mod = course.modules[moduleIndex];
    const lesson = mod?.lessons[lessonIndex];
    const moduleProg = mod ? findModuleProgress(mod.id) : undefined;
    const lessonProg = lesson ? findLessonProgress(moduleProg, lesson.id) : undefined;
    const itemProg =
      subIndex !== undefined
        ? lessonProg?.subLessons?.find((s) => s.lessonId === item.id)
        : lessonProg;
    const isCompleted = itemProg?.completed ?? false;
    const error = actionError[item.id];
    const attachedTemplates = getItemAttachments(item);

    return (
      <div className="space-y-4 rounded-2xl border border-orange-200/90 bg-orange-50/30 p-5">
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Assignment Brief & Instructions</h4>
            <p className="text-[11px] text-slate-500">
              Review assignment requirements, download template resources, and upload your completed
              solution.
            </p>
          </div>
        </div>

        {item.content ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-[15px] sm:text-base leading-relaxed text-slate-800 shadow-2xs">
            <RichContent
              html={item.content}
              className="text-[15px] sm:text-base leading-relaxed text-slate-800"
            />
          </div>
        ) : null}

        {/* Attached Starter Templates */}
        {attachedTemplates.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Starter Templates & Brief Materials ({attachedTemplates.length}):
            </p>
            <div className="grid gap-2">
              {attachedTemplates.map((file, i) => (
                <AttachmentCard key={i} file={file} label="Starter Template" />
              ))}
            </div>
          </div>
        ) : null}

        {/* Student Submission Card */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4 text-indigo-600" />
              Your Solution Submission
            </h5>
            {submission ? (
              <Badge variant="green" dot>
                Uploaded
              </Badge>
            ) : (
              <span className="text-[11px] text-slate-400">PDF, Word, Excel, CSV, or ZIP</span>
            )}
          </div>

          {submission ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileCheck className="h-6 w-6 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{submission.fileName}</p>
                  <p className="text-[11px] text-emerald-800">
                    {formatFileSize(submission.sizeBytes)} · Submitted{' '}
                    {new Date(submission.submittedAt).toLocaleDateString()} at{' '}
                    {new Date(submission.submittedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={submission.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  View File
                </a>
                {!isCompleted ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 border-rose-200"
                    onClick={() => removeSubmission(item.id)}
                    title="Remove and re-upload"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Remove
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div>
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 text-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/20 transition-all">
                {isUploading ? (
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Uploading your assignment work…
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-7 w-7 text-slate-400 mb-1" />
                    <p className="text-xs font-semibold text-slate-700">
                      Click to select your assignment file to upload
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports .pdf, .docx, .xlsx, .csv, .zip up to 50MB
                    </p>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.png,.jpg,.jpeg"
                      disabled={isUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleAssignmentUpload(item.id, file);
                        e.target.value = '';
                      }}
                    />
                  </>
                )}
              </label>
            </div>
          )}

          {uploadErr ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{uploadErr}</span>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
              <span>{error}</span>
            </div>
          ) : null}

          {/* Submit & Complete Lesson Button */}
          {!isCompleted ? (
            <Button
              size="sm"
              variant="success"
              disabled={actionBusyId === item.id || !submission}
              onClick={() => void handleNext(moduleIndex, lessonIndex, subIndex)}
              className="w-full mt-2 shadow-2xs font-semibold"
            >
              {actionBusyId === item.id ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-1.5 h-4 w-4" />
              )}
              {submission
                ? 'Submit Assignment & Complete Activity'
                : 'Attach File Above to Complete'}
            </Button>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Assignment Submitted & Activity Completed
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={course.title}
      subtitle={`${course.code} · ${course.category}`}
      badge={
        certificateEligible ? (
          <Badge variant="green" dot>
            Course Completed
          </Badge>
        ) : (
          <Badge variant="blue" dot>
            {Math.round(overall)}% Progress
          </Badge>
        )
      }
    >
      <div className="space-y-6 w-full pb-8">
        {/* Course Overview & Progress Banner */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Courses</span>
              <span>/</span>
              <span className="font-semibold text-indigo-600">{course.code}</span>
              <span>/</span>
              <span>Learning Environment</span>
            </nav>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{course.level.toUpperCase()}</Badge>
              {certificateEligible ? (
                <Badge variant="green" dot>
                  Course Completed
                </Badge>
              ) : (
                <Badge variant="blue" dot>
                  In Progress
                </Badge>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">{course.title}</h2>
            {course.description ? (
              <div className="mt-2 text-sm leading-relaxed text-slate-600 max-w-4xl">
                <RichContent html={course.description} />
              </div>
            ) : null}
            {course.objectives ? (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                <p className="text-xs font-bold text-indigo-900 mb-1.5 flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-indigo-600" />
                  Course Learning Objectives
                </p>
                <div className="text-xs text-indigo-950 leading-relaxed">
                  <RichContent html={course.objectives} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Progress Indicator Bar */}
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-700">Curriculum Completion Progress</span>
              <span className="text-indigo-600 font-mono">{Math.round(overall)}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={overall} />
            </div>
          </div>
        </div>

        {loading && !progress ? (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
            Loading course curriculum and learner progress…
          </div>
        ) : null}

        {/* Modules Hierarchy */}
        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => {
            const moduleProgress = findModuleProgress(module.id);
            const moduleLocked = !(moduleProgress?.unlocked ?? false);
            const moduleCompleted = moduleProgress?.moduleCompleted ?? false;
            const moduleAssessment = moduleProgress?.assessment ?? null;
            const completedCount = moduleProgress?.completedLessons ?? 0;
            const totalCount = moduleProgress?.totalLessons ?? module.lessons.length;
            const isExpanded = expandedModules[module.id] ?? false;
            const moduleContentDone = totalCount > 0 && completedCount === totalCount;
            const moduleTimeSatisfied = moduleProgress?.timeSatisfied ?? true;
            const moduleAttachments = getItemAttachments(module);

            // Active module indicator: if the currently open lesson belongs to this module
            const isModuleCurrent =
              isExpanded &&
              !moduleLocked &&
              (module.lessons.some((l) => l.id === openLesson) || openLesson === null);

            return (
              <div
                key={module.id}
                className={cn(
                  'overflow-hidden rounded-2xl border transition-all duration-200 shadow-xs',
                  moduleLocked
                    ? 'border-slate-200/70 bg-slate-50/40 opacity-75'
                    : isModuleCurrent
                      ? 'border-indigo-300 bg-white shadow-sm ring-1 ring-indigo-300/40'
                      : 'border-slate-200/90 bg-white',
                )}
              >
                {/* Module Header Row */}
                <button
                  type="button"
                  onClick={() => !moduleLocked && toggleModule(module.id)}
                  disabled={moduleLocked}
                  className={cn(
                    'w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors group',
                    moduleLocked
                      ? 'cursor-not-allowed bg-slate-100/50 border-l-4 border-l-slate-300'
                      : isModuleCurrent
                        ? 'bg-indigo-50/70 border-b border-indigo-200/80 border-l-4 border-l-indigo-600'
                        : isExpanded
                          ? 'bg-slate-50/80 border-b border-slate-200/80 border-l-4 border-l-indigo-500'
                          : 'bg-white hover:bg-slate-50/80 border-b border-slate-100 border-l-4 border-l-transparent',
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold border shadow-2xs transition-colors',
                        moduleLocked
                          ? 'bg-slate-100 text-slate-400 border-slate-200'
                          : isModuleCurrent
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : isExpanded
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 group-hover:bg-indigo-100',
                      )}
                    >
                      {moduleLocked ? (
                        <Lock className="h-3.5 w-3.5 text-slate-400" />
                      ) : isExpanded ? (
                        '−'
                      ) : (
                        '+'
                      )}
                    </span>
                    <div className="min-w-0">
                      <h3
                        className={cn(
                          'text-sm font-bold transition truncate',
                          isModuleCurrent
                            ? 'text-indigo-950 font-bold'
                            : 'text-slate-900 group-hover:text-indigo-600',
                        )}
                      >
                        Module {moduleIndex + 1}: {module.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {totalCount} learning activities · {completedCount} completed
                        {moduleAttachments.length > 0 ? (
                          <span className="text-indigo-600 font-medium ml-2">
                            · {moduleAttachments.length} reference file
                            {moduleAttachments.length > 1 ? 's' : ''}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {moduleLocked ? (
                      <Badge variant="slate">
                        <Lock className="mr-1 h-3 w-3" />
                        Locked (Complete Module {moduleIndex})
                      </Badge>
                    ) : moduleCompleted ? (
                      <Badge variant="green" dot>
                        Completed
                      </Badge>
                    ) : isModuleCurrent ? (
                      <Badge variant="blue" dot>
                        Current Module
                      </Badge>
                    ) : moduleAssessment && moduleContentDone && !moduleAssessment.passed ? (
                      <Badge variant="amber">
                        <BookOpenCheck className="mr-1 h-3 w-3" />
                        Assessment Required
                      </Badge>
                    ) : (
                      <Badge variant="blue">
                        <PlayCircle className="mr-1 h-3 w-3" />
                        Available ({completedCount}/{totalCount})
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Module Body */}
                {isExpanded && !moduleLocked ? (
                  <div className="p-5 space-y-4 bg-slate-50/40">
                    {/* Module Reference Files with dedicated Open and Download actions */}
                    {moduleAttachments.length > 0 ? (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Module Reference Materials & Documents ({moduleAttachments.length}):
                        </h4>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {moduleAttachments.map((file, i) => (
                            <AttachmentCard key={i} file={file} label="Module Reference" />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {/* Module Objectives */}
                    {module.objectives ? (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                        <p className="text-xs font-bold text-indigo-900 mb-1">
                          Module Learning Objectives:
                        </p>
                        <div className="text-xs text-indigo-950 leading-relaxed">
                          <RichContent html={module.objectives} />
                        </div>
                      </div>
                    ) : null}

                    {/* Lessons Tree Branch */}
                    <div className="space-y-3 border-l-2 border-indigo-200 ml-4 pl-4">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const lessonProgress = findLessonProgress(moduleProgress, lesson.id);
                        const lessonLocked = moduleLocked || !(lessonProgress?.unlocked ?? false);
                        const completedFlag = lessonProgress?.completed ?? false;
                        const isOpen = openLesson === lesson.id;
                        const isLessonActive = isOpen && !lessonLocked;
                        const subLessonsGroupOpen = expandedSubLessons[lesson.id] ?? false;
                        const spent = liveTime[lesson.id] ?? lessonProgress?.timeSpentSeconds ?? 0;
                        const required = lessonProgress?.requiredSeconds ?? 0;
                        const timeSatisfied = required <= 0 || spent >= required;
                        const lessonError = actionError[lesson.id];
                        const lessonAttachments = getItemAttachments(lesson);

                        return (
                          <div
                            key={lesson.id}
                            className={cn(
                              'rounded-xl border transition-all duration-200 overflow-hidden shadow-2xs',
                              lessonLocked
                                ? 'border-slate-200/70 bg-slate-50/50 opacity-70'
                                : isLessonActive
                                  ? 'border-indigo-500 bg-indigo-50/20 shadow-md ring-2 ring-indigo-500/20'
                                  : completedFlag
                                    ? 'border-emerald-200/80 bg-emerald-50/15'
                                    : 'border-slate-200/80 hover:border-indigo-300',
                            )}
                          >
                            {/* Lesson Summary Row */}
                            <div
                              className={cn(
                                'flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors',
                                isLessonActive
                                  ? 'bg-gradient-to-r from-indigo-50/80 to-indigo-100/30 border-b border-indigo-200/70'
                                  : 'bg-white',
                              )}
                            >
                              <button
                                type="button"
                                disabled={lessonLocked}
                                onClick={() => toggleLesson(module, lesson)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left group"
                              >
                                <span
                                  className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border font-mono text-xs font-bold shadow-2xs transition-colors',
                                    lessonLocked
                                      ? 'bg-slate-50 text-slate-400 border-slate-200'
                                      : isLessonActive
                                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                        : isOpen
                                          ? 'bg-indigo-600 text-white border-indigo-600'
                                          : 'bg-slate-100 text-slate-700 border-slate-200 group-hover:border-indigo-400 group-hover:text-indigo-700',
                                  )}
                                >
                                  {lessonLocked ? '•' : isOpen ? '−' : '+'}
                                </span>

                                <div
                                  className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                                    isLessonActive
                                      ? 'bg-indigo-100 border border-indigo-300/80 text-indigo-900'
                                      : 'bg-slate-100 group-hover:bg-indigo-50',
                                  )}
                                >
                                  {renderActivityIcon(lesson.contentType)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={cn(
                                      'text-sm font-bold truncate transition-colors',
                                      isLessonActive
                                        ? 'text-indigo-950 font-bold'
                                        : 'text-slate-800 group-hover:text-indigo-600',
                                    )}
                                  >
                                    Lesson {moduleIndex + 1}.{lessonIndex + 1}: {lesson.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {lesson.durationMin || 15} min ·{' '}
                                    {lesson.contentType || 'DOCUMENT'}
                                    {lessonAttachments.length > 0 ? (
                                      <span className="text-indigo-600 font-medium ml-2">
                                        · {lessonAttachments.length} file
                                        {lessonAttachments.length > 1 ? 's' : ''}
                                      </span>
                                    ) : null}
                                    {lessonProgress?.assessment ? (
                                      <span
                                        className={cn(
                                          'font-semibold ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]',
                                          lessonProgress.assessment.passed
                                            ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                            : 'text-indigo-700 bg-indigo-50 border border-indigo-200',
                                        )}
                                      >
                                        <BookOpenCheck className="h-2.5 w-2.5" />
                                        Quiz ({lessonProgress.assessment.passingScore}%)
                                      </span>
                                    ) : null}
                                  </p>
                                  {!lessonLocked && !completedFlag
                                    ? renderTimeIndicator(spent, required, timeSatisfied)
                                    : null}
                                </div>
                              </button>

                              {/* Status & Next Button */}
                              <div className="flex items-center gap-2">
                                {lessonLocked ? (
                                  <Badge variant="slate">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Locked
                                  </Badge>
                                ) : completedFlag ? (
                                  <Badge variant="green" dot>
                                    Completed
                                  </Badge>
                                ) : isLessonActive ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="blue" dot>
                                      Active Lesson
                                    </Badge>
                                    {lesson.subLessons && lesson.subLessons.length > 0
                                      ? null
                                      : renderNextButton(
                                          lesson.id,
                                          lessonProgress,
                                          () => void handleNext(moduleIndex, lessonIndex),
                                        )}
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="blue">
                                      <PlayCircle className="h-3 w-3 mr-1" />
                                      Available
                                    </Badge>
                                    {lesson.subLessons && lesson.subLessons.length > 0
                                      ? null
                                      : renderNextButton(
                                          lesson.id,
                                          lessonProgress,
                                          () => void handleNext(moduleIndex, lessonIndex),
                                        )}
                                  </div>
                                )}
                              </div>
                            </div>

                            {lessonError && !isOpen ? (
                              <div className="px-4 pb-3 -mt-1">
                                <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                                  <AlertCircle className="h-3 w-3 shrink-0" />
                                  {lessonError}
                                </p>
                              </div>
                            ) : null}

                            {/* Expanded Lesson Content Viewer */}
                            {isOpen && !lessonLocked ? (
                              <div className="border-t border-indigo-200/80 bg-white p-5 space-y-5">
                                {/* Video Embed if applicable */}
                                {lesson.contentType === 'VIDEO' && lesson.resourceUrl ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                      Video Lecture / Media:
                                    </p>
                                    {renderVideoEmbed(lesson.resourceUrl)}
                                  </div>
                                ) : null}

                                {/* Audio Player if applicable */}
                                {lesson.contentType === 'AUDIO' && lesson.resourceUrl ? (
                                  <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Headphones className="h-4 w-4 text-purple-600" />
                                      <p className="text-xs font-bold text-purple-900">
                                        Audio Lecture / Audio Track:
                                      </p>
                                    </div>
                                    <audio controls className="w-full" src={lesson.resourceUrl} />
                                  </div>
                                ) : null}

                                {/* Lesson Attached Documents with Open & Download */}
                                {lessonAttachments.length > 0 &&
                                lesson.contentType !== 'ASSIGNMENT' ? (
                                  <div className="space-y-2">
                                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                      Lesson Files & Study Guides ({lessonAttachments.length}):
                                    </h5>
                                    <div className="grid gap-2">
                                      {lessonAttachments.map((file, i) => (
                                        <AttachmentCard
                                          key={i}
                                          file={file}
                                          label="Lesson Material"
                                        />
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Assignment Section */}
                                {lesson.contentType === 'ASSIGNMENT'
                                  ? renderAssignmentSection(
                                      lesson,
                                      moduleIndex,
                                      lessonIndex,
                                      undefined,
                                    )
                                  : null}

                                {/* Generic resource link for other types */}
                                {lesson.contentType !== 'VIDEO' &&
                                lesson.contentType !== 'AUDIO' &&
                                lesson.contentType !== 'DOCUMENT' &&
                                lesson.contentType !== 'ASSIGNMENT' &&
                                lesson.resourceUrl ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                      Resource Link:
                                    </p>
                                    {renderVideoEmbed(lesson.resourceUrl)}
                                  </div>
                                ) : null}

                                {/* Lecture Notes & Study Material (High Readability) */}
                                {lesson.content ? (
                                  <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-2xs space-y-3">
                                    <div className="flex items-center gap-2 pb-2.5 border-b border-indigo-100">
                                      <BookOpen className="h-4 w-4 text-indigo-600" />
                                      <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                                        Lecture Notes & Detailed Study Material
                                      </h4>
                                    </div>
                                    <div className="text-[15px] sm:text-base leading-relaxed text-slate-800 prose prose-base max-w-none">
                                      <RichContent
                                        html={lesson.content}
                                        className="text-[15px] sm:text-base leading-relaxed text-slate-800"
                                      />
                                    </div>
                                  </div>
                                ) : null}

                                {/* Sub-lessons Tree with Auto-Expansion & Indigo Highlighting */}
                                {lesson.subLessons && lesson.subLessons.length > 0 ? (
                                  <div className="mt-5 pt-4 border-t border-slate-200/80 space-y-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubLessonGroup(lesson.id)}
                                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-950 hover:text-indigo-700 transition"
                                    >
                                      <span
                                        className={cn(
                                          'flex h-5 w-5 items-center justify-center rounded font-mono text-xs font-bold border transition',
                                          subLessonsGroupOpen
                                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                                            : 'bg-slate-200 text-slate-700 border-slate-300',
                                        )}
                                      >
                                        {subLessonsGroupOpen ? '−' : '+'}
                                      </span>
                                      <span>
                                        Sub-Lessons & Detailed Topics ({lesson.subLessons.length})
                                      </span>
                                    </button>

                                    {subLessonsGroupOpen && (
                                      <div className="space-y-3 border-l-2 border-indigo-300 ml-4 pl-4">
                                        {lesson.subLessons.map((sub, subIdx) => {
                                          const subProgress = lessonProgress?.subLessons?.find(
                                            (s) => s.lessonId === sub.id,
                                          );
                                          const subLocked =
                                            lessonLocked || !(subProgress?.unlocked ?? false);
                                          const subComplete = subProgress?.completed ?? false;
                                          const isSubOpen = openSubLesson === sub.id;
                                          const isSubActive = isSubOpen && !subLocked;
                                          const subSpent =
                                            liveTime[sub.id] ?? subProgress?.timeSpentSeconds ?? 0;
                                          const subRequired = subProgress?.requiredSeconds ?? 0;
                                          const subTimeSatisfied =
                                            subRequired <= 0 || subSpent >= subRequired;
                                          const subError = actionError[sub.id];
                                          const subAttachments = getItemAttachments(sub);

                                          return (
                                            <div
                                              key={sub.id}
                                              className={cn(
                                                'rounded-xl border shadow-2xs overflow-hidden transition-all',
                                                subLocked
                                                  ? 'opacity-60 border-slate-200 bg-slate-50/40'
                                                  : isSubActive
                                                    ? 'border-indigo-500 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-500/30'
                                                    : subComplete
                                                      ? 'border-emerald-200 bg-emerald-50/15'
                                                      : 'border-slate-200 bg-white hover:border-indigo-300',
                                              )}
                                            >
                                              <div
                                                className={cn(
                                                  'flex flex-wrap items-center justify-between gap-3 p-3.5 transition-colors',
                                                  isSubActive
                                                    ? 'bg-indigo-100/50'
                                                    : 'bg-transparent',
                                                )}
                                              >
                                                <button
                                                  type="button"
                                                  disabled={subLocked}
                                                  onClick={() =>
                                                    setOpenSubLesson(isSubOpen ? null : sub.id)
                                                  }
                                                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
                                                >
                                                  <span
                                                    className={cn(
                                                      'flex h-5 w-5 shrink-0 items-center justify-center rounded font-mono text-[10px] font-bold border transition',
                                                      subLocked
                                                        ? 'border-slate-200 bg-slate-100 text-slate-400'
                                                        : isSubActive
                                                          ? 'border-indigo-600 bg-indigo-600 text-white font-bold shadow-xs'
                                                          : 'border-slate-200 bg-slate-50 text-slate-700',
                                                    )}
                                                  >
                                                    {subLocked ? '•' : isSubOpen ? '−' : '+'}
                                                  </span>
                                                  <div className="min-w-0 flex-1">
                                                    <p
                                                      className={cn(
                                                        'text-xs font-bold truncate transition-colors',
                                                        isSubActive
                                                          ? 'text-indigo-950 font-bold'
                                                          : 'text-slate-800 group-hover:text-indigo-700',
                                                      )}
                                                    >
                                                      {sub.title}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">
                                                      {sub.durationMin || 5} min · {sub.contentType}
                                                      {subAttachments.length > 0 ? (
                                                        <span className="text-indigo-600 font-medium ml-1.5">
                                                          · {subAttachments.length} file
                                                          {subAttachments.length > 1 ? 's' : ''}
                                                        </span>
                                                      ) : null}
                                                    </p>
                                                    {!subLocked && !subComplete
                                                      ? renderTimeIndicator(
                                                          subSpent,
                                                          subRequired,
                                                          subTimeSatisfied,
                                                        )
                                                      : null}
                                                  </div>
                                                </button>
                                                <div className="flex items-center gap-2">
                                                  {subLocked ? (
                                                    <Badge variant="slate">
                                                      <Lock className="h-3 w-3 mr-1" />
                                                      Locked
                                                    </Badge>
                                                  ) : subComplete ? (
                                                    <Badge variant="green" dot>
                                                      Done
                                                    </Badge>
                                                  ) : isSubActive ? (
                                                    <div className="flex items-center gap-2">
                                                      <Badge variant="blue" dot>
                                                        Active Topic
                                                      </Badge>
                                                      {renderNextButton(
                                                        sub.id,
                                                        subProgress,
                                                        () =>
                                                          void handleNext(
                                                            moduleIndex,
                                                            lessonIndex,
                                                            subIdx,
                                                          ),
                                                        'sm',
                                                        lesson.subLessons &&
                                                          subIdx + 1 < lesson.subLessons.length
                                                          ? 'Next Topic →'
                                                          : 'Complete & Next Lesson →',
                                                      )}
                                                    </div>
                                                  ) : (
                                                    renderNextButton(
                                                      sub.id,
                                                      subProgress,
                                                      () =>
                                                        void handleNext(
                                                          moduleIndex,
                                                          lessonIndex,
                                                          subIdx,
                                                        ),
                                                      'sm',
                                                      'Next',
                                                    )
                                                  )}
                                                </div>
                                              </div>

                                              {subError && !isSubOpen ? (
                                                <div className="px-3 pb-2.5 -mt-1">
                                                  <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                                    {subError}
                                                  </p>
                                                </div>
                                              ) : null}

                                              {/* Expanded Sub-lesson content */}
                                              {isSubOpen && !subLocked && (
                                                <div className="border-t border-indigo-200 bg-indigo-50/20 p-4 space-y-4">
                                                  {sub.contentType === 'ASSIGNMENT' ? (
                                                    renderAssignmentSection(
                                                      sub,
                                                      moduleIndex,
                                                      lessonIndex,
                                                      subIdx,
                                                    )
                                                  ) : (
                                                    <>
                                                      {sub.contentType === 'VIDEO' &&
                                                      sub.resourceUrl
                                                        ? renderVideoEmbed(sub.resourceUrl)
                                                        : null}

                                                      {sub.contentType === 'AUDIO' &&
                                                      sub.resourceUrl ? (
                                                        <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50/40 p-3">
                                                          <div className="flex items-center gap-2 mb-1">
                                                            <Headphones className="h-4 w-4 text-purple-600" />
                                                            <p className="text-xs font-semibold text-purple-900">
                                                              Audio Lecture
                                                            </p>
                                                          </div>
                                                          <audio
                                                            controls
                                                            className="w-full"
                                                            src={sub.resourceUrl}
                                                          />
                                                        </div>
                                                      ) : null}

                                                      {/* Sub-lesson Attached Files */}
                                                      {subAttachments.length > 0 ? (
                                                        <div className="space-y-2">
                                                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                                            Sub-Topic Files & Notes (
                                                            {subAttachments.length}):
                                                          </h5>
                                                          <div className="grid gap-2">
                                                            {subAttachments.map((f, fi) => (
                                                              <AttachmentCard
                                                                key={fi}
                                                                file={f}
                                                                label="Sub-lesson File"
                                                              />
                                                            ))}
                                                          </div>
                                                        </div>
                                                      ) : null}

                                                      {sub.content ? (
                                                        <div className="rounded-xl border border-indigo-100 bg-white p-5 text-[15px] sm:text-base leading-relaxed text-slate-800 shadow-2xs prose prose-base max-w-none">
                                                          <RichContent
                                                            html={sub.content}
                                                            className="text-[15px] sm:text-base leading-relaxed text-slate-800"
                                                          />
                                                        </div>
                                                      ) : null}

                                                      {!subComplete ? (
                                                        <div className="flex items-center justify-between gap-3 pt-2 border-t border-indigo-200/60">
                                                          {subError ? (
                                                            <p className="flex items-center gap-1.5 text-[11px] text-amber-700">
                                                              <AlertCircle className="h-3 w-3 shrink-0" />
                                                              {subError}
                                                            </p>
                                                          ) : (
                                                            <span />
                                                          )}
                                                          {renderNextButton(
                                                            sub.id,
                                                            subProgress,
                                                            () =>
                                                              void handleNext(
                                                                moduleIndex,
                                                                lessonIndex,
                                                                subIdx,
                                                              ),
                                                            'sm',
                                                            lesson.subLessons &&
                                                              subIdx + 1 < lesson.subLessons.length
                                                              ? 'Next Topic →'
                                                              : lessonProgress?.assessment &&
                                                                  !lessonProgress.assessment.passed
                                                                ? 'Take Lesson Quiz →'
                                                                : 'Complete & Next Lesson →',
                                                          )}
                                                        </div>
                                                      ) : null}
                                                    </>
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : null}

                                {/* Dedicated Lesson Assessment Checkpoint Card (Below Sub-lessons) */}
                                {lessonProgress?.assessment
                                  ? (() => {
                                      const allSubsDone =
                                        !lesson.subLessons ||
                                        lesson.subLessons.length === 0 ||
                                        lesson.subLessons.every(
                                          (s) =>
                                            lessonProgress?.subLessons?.find(
                                              (sp) => sp.lessonId === s.id,
                                            )?.completed,
                                        );
                                      const isQuizUnlocked = allSubsDone && timeSatisfied;
                                      const isPassed = lessonProgress.assessment.passed;

                                      return (
                                        <div
                                          className={cn(
                                            'rounded-2xl border p-5 shadow-2xs transition-all mt-4',
                                            isPassed
                                              ? 'border-emerald-200 bg-emerald-50/70'
                                              : isQuizUnlocked
                                                ? 'border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/40 to-indigo-50/80'
                                                : 'border-slate-200/80 bg-slate-50/70',
                                          )}
                                        >
                                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                            <div className="flex items-start sm:items-center gap-3.5">
                                              <div
                                                className={cn(
                                                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-2xs',
                                                  isPassed
                                                    ? 'bg-emerald-600 text-white'
                                                    : isQuizUnlocked
                                                      ? 'bg-indigo-600 text-white'
                                                      : 'bg-slate-200 text-slate-500',
                                                )}
                                              >
                                                {isPassed ? (
                                                  <CheckCircle2 className="h-6 w-6" />
                                                ) : isQuizUnlocked ? (
                                                  <BookOpenCheck className="h-6 w-6" />
                                                ) : (
                                                  <Lock className="h-5 w-5" />
                                                )}
                                              </div>
                                              <div className="space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <span
                                                    className={cn(
                                                      'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                                                      isPassed
                                                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                                        : isQuizUnlocked
                                                          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                                                          : 'bg-slate-200 text-slate-600 border-slate-300',
                                                    )}
                                                  >
                                                    {isPassed
                                                      ? 'Quiz Passed'
                                                      : isQuizUnlocked
                                                        ? 'Lesson Checkpoint Ready'
                                                        : 'Checkpoint Locked'}
                                                  </span>
                                                  <span className="text-[11px] text-slate-600 font-medium">
                                                    Passing Score:{' '}
                                                    <strong className="text-slate-900">
                                                      {lessonProgress.assessment.passingScore}%
                                                    </strong>
                                                  </span>
                                                </div>
                                                <h4
                                                  className={cn(
                                                    'text-sm font-bold',
                                                    isQuizUnlocked || isPassed
                                                      ? 'text-slate-900'
                                                      : 'text-slate-600',
                                                  )}
                                                >
                                                  {lessonProgress.assessment.titleEn ||
                                                    'Lesson Assessment'}
                                                </h4>
                                                <p className="text-xs text-slate-600">
                                                  {isPassed
                                                    ? 'You have completed this lesson quiz requirement.'
                                                    : isQuizUnlocked
                                                      ? 'All topics completed! Pass this quiz to complete the lesson and unlock the next lesson.'
                                                      : !allSubsDone
                                                        ? `Complete all ${lesson.subLessons?.length ?? 0} sub-lesson topics above to unlock this quiz.`
                                                        : `Spend ${formatMMSS(Math.max(0, required - spent))} more on this lesson to unlock this quiz.`}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="shrink-0 w-full sm:w-auto">
                                              {isPassed ? (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  onClick={() => {
                                                    if (lessonProgress.assessment) {
                                                      quizPassedRef.current = false;
                                                      setActiveQuiz({
                                                        assessmentId: lessonProgress.assessment.id,
                                                        kind: 'lesson',
                                                        moduleIndex,
                                                        lessonIndex,
                                                      });
                                                    }
                                                  }}
                                                  className="w-full sm:w-auto font-semibold gap-1.5 shadow-2xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/70"
                                                >
                                                  <BookOpenCheck className="h-4 w-4" />
                                                  <span>Review / Retake Quiz</span>
                                                </Button>
                                              ) : isQuizUnlocked ? (
                                                <Button
                                                  size="sm"
                                                  variant="primary"
                                                  onClick={() => {
                                                    if (lessonProgress.assessment) {
                                                      quizPassedRef.current = false;
                                                      setActiveQuiz({
                                                        assessmentId: lessonProgress.assessment.id,
                                                        kind: 'lesson',
                                                        moduleIndex,
                                                        lessonIndex,
                                                      });
                                                    }
                                                  }}
                                                  className="w-full sm:w-auto font-semibold gap-1.5 shadow-2xs bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700/50"
                                                >
                                                  <BookOpenCheck className="h-4 w-4" />
                                                  <span>Take Lesson Quiz →</span>
                                                </Button>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  disabled
                                                  className="w-full sm:w-auto font-semibold gap-1.5 shadow-2xs opacity-60 cursor-not-allowed bg-slate-100 text-slate-500 border-slate-300"
                                                >
                                                  <Lock className="h-3.5 w-3.5" />
                                                  <span>Quiz Locked</span>
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()
                                  : null}

                                {/* Footer Actions: Next */}
                                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/60 mt-4">
                                  <div className="flex-1 min-w-0">
                                    {completedFlag ? (
                                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        Activity completed
                                      </span>
                                    ) : lessonError ? (
                                      <p className="flex items-center gap-1.5 text-xs text-amber-700">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        {lessonError}
                                      </p>
                                    ) : null}
                                  </div>

                                  {!completedFlag && lesson.contentType !== 'ASSIGNMENT'
                                    ? lesson.subLessons && lesson.subLessons.length > 0
                                      ? (() => {
                                          const allSubsDone = lesson.subLessons.every(
                                            (s) =>
                                              lessonProgress?.subLessons?.find(
                                                (sp) => sp.lessonId === s.id,
                                              )?.completed,
                                          );
                                          if (
                                            allSubsDone &&
                                            lessonProgress?.assessment &&
                                            !lessonProgress.assessment.passed
                                          ) {
                                            return (
                                              <Button
                                                size="sm"
                                                variant="primary"
                                                disabled={actionBusyId === lesson.id}
                                                onClick={() => {
                                                  if (lessonProgress.assessment) {
                                                    quizPassedRef.current = false;
                                                    setActiveQuiz({
                                                      assessmentId: lessonProgress.assessment.id,
                                                      kind: 'lesson',
                                                      moduleIndex,
                                                      lessonIndex,
                                                    });
                                                  }
                                                }}
                                                className="shadow-2xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700/50 gap-1.5"
                                              >
                                                <BookOpenCheck className="h-3.5 w-3.5 mr-1" />
                                                <span>Take Lesson Quiz</span>
                                                <span className="font-mono text-xs">→</span>
                                              </Button>
                                            );
                                          }
                                          return null;
                                        })()
                                      : renderNextButton(
                                          lesson.id,
                                          lessonProgress,
                                          () => void handleNext(moduleIndex, lessonIndex),
                                        )
                                    : null}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    {module.lessons.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-400">
                        No activities have been published in this module yet.
                      </p>
                    ) : null}

                    {/* Prominent Module Checkpoint Banner */}
                    {!moduleCompleted &&
                    moduleAssessment &&
                    !moduleAssessment.passed &&
                    moduleContentDone &&
                    moduleTimeSatisfied ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-2xs">
                            <BookOpenCheck className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                              Module Checkpoint Ready
                            </p>
                            <p className="text-xs text-indigo-700">
                              All lessons in this module are completed. Pass the module assessment
                              to unlock the next module.
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => openModuleAssessment(moduleIndex)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm whitespace-nowrap shrink-0"
                        >
                          <BookOpenCheck className="h-3.5 w-3.5 mr-1" />
                          Take Module Assessment →
                        </Button>
                      </div>
                    ) : null}

                    {/* Module Progress & Assessment Summary */}
                    {!moduleCompleted ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700">Module Requirements</p>
                          {moduleProgress?.requiredSeconds ? (
                            renderTimeIndicator(
                              moduleProgress.timeSpentSeconds,
                              moduleProgress.requiredSeconds,
                              moduleTimeSatisfied,
                            )
                          ) : (
                            <p className="text-[11px] text-slate-400">
                              No minimum time requirement.
                            </p>
                          )}
                        </div>
                        {moduleAssessment ? (
                          <Button
                            size="sm"
                            variant={moduleAssessment.passed ? 'outline' : 'primary'}
                            disabled={
                              !moduleContentDone || !moduleTimeSatisfied || moduleAssessment.passed
                            }
                            onClick={() => openModuleAssessment(moduleIndex)}
                          >
                            {moduleAssessment.passed ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Assessment Passed
                              </>
                            ) : (
                              <>
                                <BookOpenCheck className="h-3.5 w-3.5 mr-1" />
                                {moduleContentDone && moduleTimeSatisfied
                                  ? 'Take Module Assessment'
                                  : 'Complete Lessons First'}
                              </>
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Course-level Materials & Attachments */}
        {(() => {
          const courseAttachments = getItemAttachments(course);
          if (courseAttachments.length === 0) return null;

          return (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Course Resource Files & Downloads ({courseAttachments.length})
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {courseAttachments.map((att, i) => (
                  <AttachmentCard key={i} file={att} label="Course Reference" />
                ))}
              </div>
            </div>
          );
        })()}

        {/* Final Assessment Card */}
        {showQuiz && finalAssessment ? (
          <div
            className={cn(
              'rounded-2xl border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all',
              contentCompleted
                ? 'border-indigo-300 bg-gradient-to-br from-indigo-50/60 to-violet-50/60'
                : 'border-slate-200 bg-slate-50/70 opacity-80',
            )}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <BookOpenCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Comprehensive Final Assessment</h3>
                {finalAssessment.passed ? (
                  <Badge variant="green" dot>
                    Passed
                  </Badge>
                ) : contentCompleted ? (
                  <Badge variant="blue">
                    Unlocked · Passing Score: {finalAssessment.passingScore}%
                  </Badge>
                ) : (
                  <Badge variant="slate">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked (Complete all lessons first)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
                Demonstrate your comprehension of the complete course curriculum. Achieving the
                passing mark awards your accredited completion certificate.
              </p>
            </div>

            {!finalAssessment.passed ? (
              <Button
                disabled={!contentCompleted}
                onClick={openFinalAssessment}
                className={cn(
                  'shadow-md gap-1.5 font-bold',
                  !contentCompleted && 'opacity-50 cursor-not-allowed',
                  contentCompleted && 'bg-indigo-600 hover:bg-indigo-700 text-white',
                )}
              >
                {contentCompleted ? (
                  <BookOpenCheck className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {contentCompleted ? 'Take Final Assessment' : 'Locked'}
              </Button>
            ) : null}
          </div>
        ) : null}

        {/* Certificate Section */}
        {certificateEligible ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-bold">Congratulations! You completed this course.</p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  You have fulfilled all curriculum requirements. Your accredited certificate is
                  issued.
                </p>
              </div>
            </div>
            <Link href="/learner/certificates">
              <Button size="sm" variant="success" className="shadow-md font-semibold">
                <Award className="h-4 w-4 mr-1.5" />
                View & Download Certificate
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-slate-600 shadow-2xs opacity-80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500 shadow-2xs">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700">Course Certificate — Locked</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {contentCompleted && finalAssessment && !finalAssessment.passed
                    ? 'Pass the Final Assessment above to unlock your certificate.'
                    : 'Complete every module and pass the Final Assessment to unlock your official certificate.'}
                </p>
              </div>
            </div>
            <Badge variant="slate">
              <Lock className="mr-1 h-3 w-3" />
              Not yet earned
            </Badge>
          </div>
        )}
      </div>

      {activeQuiz ? (
        <QuizTakerModal
          open
          onClose={closeActiveQuiz}
          courseId={courseId}
          courseTitle={courseTitle}
          assessmentId={activeQuiz.assessmentId}
          onPassed={() => {
            quizPassedRef.current = true;
            void refresh();
          }}
        />
      ) : null}
    </WorkspaceDetailOverlay>
  );
}
