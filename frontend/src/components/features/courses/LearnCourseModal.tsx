"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  ExternalLink,
  FileText,
  Headphones,
  ListChecks,
  Loader2,
  Lock,
  PlayCircle,
  RotateCcw,
  Sparkles,
  Video,
} from "lucide-react";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { RichContent } from "@/components/ui/RichContent";
import { QuizTakerModal } from "@/components/features/quiz/QuizTakerModal";
import { useLms } from "@/lib/lms-store";
import { fetchCourseProgress, markLessonComplete } from "@/lib/api/progress";
import type { ApiCourseProgress } from "@/lib/api/types";
import { cn } from "@/lib/utils";

interface LearnCourseModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  showQuiz?: boolean;
}

export function LearnCourseModal({
  open,
  onClose,
  courseId,
  courseTitle,
  showQuiz = true,
}: LearnCourseModalProps) {
  const { courseById } = useLms();
  const course = courseById(courseId);
  const [progress, setProgress] = useState<ApiCourseProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [openLesson, setOpenLesson] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});
  const [expandedSubLessons, setExpandedSubLessons] = useState<Record<string, boolean>>({});
  const [quizOpen, setQuizOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!open || !courseId) return;
    setLoading(true);
    try {
      const res = await fetchCourseProgress(courseId);
      setProgress(res);
    } catch {
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [open, courseId]);

  useEffect(() => {
    setOpenLesson(null);
    setQuizOpen(false);
    void refresh();
  }, [refresh]);

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

  // Set of all completed lesson IDs across the course
  const completedLessonIds = useMemo(() => {
    const set = new Set<string>();
    if (!progress) return set;
    for (const m of progress.modules) {
      for (const l of m.lessons) {
        if (l.completed) set.add(l.lessonId);
      }
    }
    return set;
  }, [progress]);

  // Sequential progression rules
  const isModuleCompleted = (mod: any) => {
    if (!mod || !mod.lessons || mod.lessons.length === 0) return true;
    return mod.lessons.every((l: any) => completedLessonIds.has(l.id));
  };

  const isModuleUnlocked = (modIndex: number) => {
    if (modIndex === 0) return true;
    if (!course?.modules) return true;
    const prevMod = course.modules[modIndex - 1];
    return isModuleCompleted(prevMod);
  };

  const isLessonUnlocked = (modIndex: number, lessonIndex: number) => {
    if (!isModuleUnlocked(modIndex)) return false;
    if (lessonIndex === 0) return true;
    if (!course?.modules[modIndex]?.lessons) return true;
    const prevLesson = course.modules[modIndex].lessons[lessonIndex - 1];
    return completedLessonIds.has(prevLesson.id);
  };

  const areAllLessonsCompleted = useMemo(() => {
    if (!course || course.modules.length === 0) return true;
    return course.modules.every((m) =>
      m.lessons.every((l) => completedLessonIds.has(l.id)),
    );
  }, [course, completedLessonIds]);

  if (!course) return null;

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

  const overall = progress?.stats.overallPercent ?? 0;
  const isCourseComplete = overall >= 100;

  const toggleComplete = async (lessonId: string, completed: boolean) => {
    setTogglingId(lessonId);
    try {
      await markLessonComplete(lessonId, { completed, lastPosition: 0 });
      await refresh();
    } finally {
      setTogglingId(null);
    }
  };

  const renderActivityIcon = (type?: string) => {
    switch (type) {
      case "VIDEO":
        return <Video className="h-4 w-4 text-rose-500" />;
      case "AUDIO":
        return <Headphones className="h-4 w-4 text-purple-500" />;
      case "PRESENTATION":
        return <FileText className="h-4 w-4 text-amber-500" />;
      case "INTERACTIVE":
        return <ListChecks className="h-4 w-4 text-emerald-500" />;
      case "EXTERNAL_LINK":
        return <ExternalLink className="h-4 w-4 text-indigo-500" />;
      case "ASSIGNMENT":
        return <ClipboardList className="h-4 w-4 text-orange-500" />;
      case "DOCUMENT":
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const renderVideoEmbed = (url: string) => {
    // YouTube embed helper
    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (ytMatch) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
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

    // Vimeo embed helper
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
    if (vimeoMatch) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
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

    // Native MP4 / WebM video
    if (/\.(mp4|webm|mov)(\?.*)?$/i.test(url)) {
      return (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <video src={url} controls className="h-full w-full" />
        </div>
      );
    }

    // Generic external stream or URL
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

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={course.title}
      subtitle={`${course.code} · ${course.category}`}
      badge={
        isCourseComplete ? (
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
        {/* Breadcrumbs & Overview Banner */}
        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium text-slate-700">Courses</span>
              <span>/</span>
              <span className="font-medium text-indigo-600">{course.code}</span>
              <span>/</span>
              <span>Learning Materials</span>
            </nav>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{course.level.toUpperCase()}</Badge>
              {isCourseComplete ? (
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
              <div className="mt-1.5 text-sm leading-relaxed text-slate-600 max-w-3xl prose prose-sm max-w-none">
                <RichContent html={course.description} />
              </div>
            ) : null}
            {course.objectives ? (
              <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5">
                <p className="text-xs font-bold text-indigo-900 mb-2">Course Learning Objectives:</p>
                <div className="text-xs text-indigo-950/90 prose prose-xs max-w-none">
                  <RichContent html={course.objectives} />
                </div>
              </div>
            ) : null}
          </div>

          {/* Progress Indicator */}
          <div className="mt-5 border-t border-slate-200/60 pt-4">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-600">Your Course Progress</span>
              <span className="text-indigo-600">{Math.round(overall)}%</span>
            </div>
            <div className="mt-2">
              <ProgressBar value={overall} />
            </div>
          </div>
        </div>

        {/* Certificate Ready Alert Banner */}
        {isCourseComplete ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 shadow-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold">Congratulations! You completed this course.</p>
                <p className="text-xs text-emerald-700">
                  You have fulfilled all curriculum requirements. Your official certificate is ready.
                </p>
              </div>
            </div>
            <Link href="/learner/certificates">
              <Button size="sm" variant="success" className="shadow-md">
                <Award className="h-4 w-4" />
                View & Download Certificate
              </Button>
            </Link>
          </div>
        ) : null}

        {loading && !progress ? (
          <div className="flex items-center justify-center py-8 text-xs text-slate-400">
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-indigo-500" />
            Loading course curriculum and progress…
          </div>
        ) : null}

        {/* Modules Hierarchy with + / − Tree Navigation */}
        <div className="space-y-4">
          {course.modules.map((module, moduleIndex) => {
            const moduleProgress = progress?.modules.find((m) => m.moduleId === module.id);
            const moduleLocked = !isModuleUnlocked(moduleIndex) || module.unlocked === false;
            const completedCount = moduleProgress?.completedLessons ?? 0;
            const totalCount = moduleProgress?.totalLessons ?? module.lessons.length;
            const modulePercent = moduleProgress?.progressPercent ?? 0;
            const isExpanded = expandedModules[module.id] ?? false;

            return (
              <div
                key={module.id}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-all duration-200 shadow-sm",
                  moduleLocked
                    ? "border-slate-200/70 bg-slate-50/40 opacity-75"
                    : "border-slate-200/90 bg-white",
                )}
              >
                {/* Module Header / + / − Tree Item */}
                <button
                  type="button"
                  onClick={() => !moduleLocked && toggleModule(module.id)}
                  disabled={moduleLocked}
                  className={cn(
                    "w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors group",
                    moduleLocked
                      ? "cursor-not-allowed bg-slate-100/50"
                      : "bg-amber-50/70 hover:bg-amber-100/60 border-b border-amber-200/60",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Explicit + / − Expand/Collapse Icon */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-200/90 font-mono text-base font-bold text-amber-950 border border-amber-300 shadow-2xs">
                      {moduleLocked ? <Lock className="h-3.5 w-3.5 text-slate-500" /> : isExpanded ? "−" : "+"}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <span>Module {moduleIndex + 1}: {module.title}</span>
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {totalCount} learning activities · {completedCount} completed
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {moduleLocked ? (
                      <Badge variant="slate">
                        <Lock className="mr-1 h-3 w-3" />
                        Locked (Complete Module {moduleIndex})
                      </Badge>
                    ) : modulePercent >= 100 ? (
                      <Badge variant="green" dot>
                        Completed
                      </Badge>
                    ) : (
                      <Badge variant="blue">
                        <PlayCircle className="mr-1 h-3 w-3" />
                        Available ({completedCount}/{totalCount})
                      </Badge>
                    )}
                  </div>
                </button>

                {/* Module Body — Lessons with Tree Indentation */}
                {isExpanded && !moduleLocked ? (
                  <div className="p-4 space-y-3 bg-slate-50/30">
                    {module.objectives ? (
                      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3">
                        <p className="text-xs font-bold text-indigo-900 mb-1">Module Learning Objectives:</p>
                        <div className="text-xs text-indigo-950/90 prose prose-xs max-w-none">
                          <RichContent html={module.objectives} />
                        </div>
                      </div>
                    ) : null}

                    {/* Lesson Tree Branch */}
                    <div className="space-y-3 border-l-2 border-indigo-200 ml-4 pl-4">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const lessonProgress = moduleProgress?.lessons.find(
                          (l) => l.lessonId === lesson.id,
                        );
                        const lessonLocked =
                          moduleLocked ||
                          !isLessonUnlocked(moduleIndex, lessonIndex) ||
                          lesson.unlocked === false;
                        const completedFlag =
                          completedLessonIds.has(lesson.id) || (lessonProgress?.completed ?? false);
                        const isOpen = openLesson === lesson.id;
                        const subLessonsGroupOpen = expandedSubLessons[lesson.id] ?? false;

                        return (
                          <div
                            key={lesson.id}
                            className={cn(
                              "rounded-xl border transition-all duration-200 overflow-hidden bg-white shadow-xs",
                              lessonLocked
                                ? "border-slate-200/70 bg-slate-50/50 opacity-70"
                                : completedFlag
                                ? "border-emerald-200/80 bg-emerald-50/10"
                                : "border-slate-200/80 hover:border-indigo-300",
                            )}
                          >
                            {/* Lesson Summary Row with + / − Toggle */}
                            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                              <button
                                type="button"
                                disabled={lessonLocked}
                                onClick={() => setOpenLesson(isOpen ? null : lesson.id)}
                                className="flex min-w-0 flex-1 items-center gap-3 text-left group"
                              >
                                {/* Explicit + / − Indicator */}
                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-slate-300 bg-slate-50 font-mono text-xs font-bold text-slate-700 shadow-2xs group-hover:border-indigo-400 group-hover:text-indigo-600 transition-colors">
                                  {lessonLocked ? "•" : isOpen ? "−" : "+"}
                                </span>

                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-indigo-50 transition-colors">
                                  {renderActivityIcon(lesson.contentType)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                    Lesson {moduleIndex + 1}.{lessonIndex + 1}: {lesson.title}
                                  </p>
                                  <p className="text-[11px] text-slate-400">
                                    {lesson.durationMin || 15} min · {lesson.contentType || "DOCUMENT"}
                                  </p>
                                </div>
                              </button>

                              {/* Progression Status & Complete Button */}
                              <div className="flex items-center gap-2">
                                {lessonLocked ? (
                                  <Badge variant="slate">
                                    <Lock className="h-3 w-3 mr-1" />
                                    Locked
                                  </Badge>
                                ) : completedFlag ? (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="green" dot>
                                      Completed
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={togglingId === lesson.id}
                                      onClick={() => void toggleComplete(lesson.id, false)}
                                      title="Mark incomplete"
                                      className="h-7 px-2 text-xs"
                                    >
                                      <RotateCcw className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Badge variant="blue">
                                      <PlayCircle className="h-3 w-3 mr-1" />
                                      Available
                                    </Badge>
                                    <Button
                                      size="sm"
                                      variant="success"
                                      disabled={togglingId === lesson.id}
                                      onClick={() => void toggleComplete(lesson.id, true)}
                                      className="h-8 shadow-xs"
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                      Mark Complete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Expanded Lesson Content Viewer */}
                            {isOpen && !lessonLocked ? (
                              <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                                {/* Video Embed if applicable */}
                                {lesson.contentType === "VIDEO" && lesson.resourceUrl ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-700">
                                      Video Lecture / Interactive Media:
                                    </p>
                                    {renderVideoEmbed(lesson.resourceUrl)}
                                  </div>
                                ) : null}

                                {/* Audio Player if applicable */}
                                {lesson.contentType === "AUDIO" && lesson.resourceUrl ? (
                                  <div className="space-y-2 rounded-xl border border-purple-100 bg-purple-50/40 p-4">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Headphones className="h-4 w-4 text-purple-600" />
                                      <p className="text-xs font-semibold text-purple-900">
                                        Audio Lecture / Recording:
                                      </p>
                                    </div>
                                    <audio controls className="w-full" src={lesson.resourceUrl} />
                                  </div>
                                ) : null}

                                {/* Document Download/View if applicable */}
                                {lesson.contentType === "DOCUMENT" && lesson.resourceUrl ? (
                                  <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                                    <div className="flex items-center gap-3">
                                      <FileText className="h-6 w-6 text-blue-600" />
                                      <div>
                                        <p className="text-xs font-semibold text-slate-800">Document / Lecture Material</p>
                                        <p className="text-[11px] text-slate-500 truncate max-w-md">{lesson.title}</p>
                                      </div>
                                    </div>
                                    <a
                                      href={lesson.resourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-blue-700"
                                    >
                                      <Download className="h-3.5 w-3.5" />
                                      View Document
                                    </a>
                                  </div>
                                ) : null}

                                {/* Assignment display */}
                                {lesson.contentType === "ASSIGNMENT" ? (
                                  <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                      <ClipboardList className="h-4 w-4 text-orange-600" />
                                      <p className="text-xs font-bold text-orange-900">Assignment Requirements</p>
                                    </div>
                                    {lesson.content ? (
                                      <p className="text-xs text-slate-700 leading-relaxed">
                                        <span className="font-semibold">Instructions: </span>
                                        {lesson.content}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}

                                {/* Generic resource link for other types */}
                                {lesson.contentType !== "VIDEO" && lesson.contentType !== "AUDIO" && lesson.contentType !== "DOCUMENT" && lesson.contentType !== "ASSIGNMENT" && lesson.resourceUrl ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-700">Resource Link:</p>
                                    {renderVideoEmbed(lesson.resourceUrl)}
                                  </div>
                                ) : null}

                                {/* Reading / Document Content */}
                                {lesson.content ? (
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-slate-700">
                                      Lecture Notes & Study Material:
                                    </p>
                                    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
                                      <RichContent html={lesson.content} />
                                    </div>
                                  </div>
                                ) : null}

                                {/* Sub-lessons Tree with + / − */}
                                {lesson.subLessons && lesson.subLessons.length > 0 ? (
                                  <div className="mt-4 pt-3 border-t border-slate-200/80 space-y-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleSubLessonGroup(lesson.id)}
                                      className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-indigo-600"
                                    >
                                      <span className="flex h-4 w-4 items-center justify-center rounded bg-slate-200 font-mono text-[11px] font-bold text-slate-800">
                                        {subLessonsGroupOpen ? "−" : "+"}
                                      </span>
                                      Sub-Lessons ({lesson.subLessons.length})
                                    </button>

                                    {subLessonsGroupOpen && (
                                      <div className="space-y-2 border-l-2 border-violet-300 ml-3 pl-3">
                                        {lesson.subLessons.map((sub, subIdx) => {
                                          const subLocked =
                                            lessonLocked ||
                                            (subIdx > 0 &&
                                              !completedLessonIds.has(lesson.subLessons![subIdx - 1].id));
                                          const subComplete = completedLessonIds.has(sub.id);

                                          return (
                                            <div
                                              key={sub.id}
                                              className={cn(
                                                "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-3 shadow-2xs",
                                                subLocked ? "opacity-60 border-slate-200" : "border-violet-100",
                                              )}
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-100 text-[10px] font-bold text-violet-800">
                                                  {moduleIndex + 1}.{lessonIndex + 1}.{subIdx + 1}
                                                </span>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-semibold text-slate-800 truncate">
                                                    {sub.title}
                                                  </p>
                                                  <p className="text-[10px] text-slate-400">
                                                    {sub.durationMin || 5} min · {sub.contentType}
                                                  </p>
                                                </div>
                                              </div>
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
                                                ) : (
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={togglingId === sub.id}
                                                    onClick={() => void toggleComplete(sub.id, true)}
                                                    className="h-7 text-xs"
                                                  >
                                                    <Check className="h-3 w-3 mr-1" />
                                                    Complete
                                                  </Button>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                ) : null}

                                {/* Footer Action */}
                                <div className="flex justify-end pt-2 border-t border-slate-200/60">
                                  {!completedFlag ? (
                                    <Button
                                      size="sm"
                                      variant="success"
                                      disabled={togglingId === lesson.id}
                                      onClick={() => void toggleComplete(lesson.id, true)}
                                    >
                                      <Check className="h-3.5 w-3.5 mr-1.5" />
                                      I have completed this activity
                                    </Button>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                      Activity completed
                                    </span>
                                  )}
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
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Course-level Materials & Attachments */}
        {course.attachments && course.attachments.length > 0 ? (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Downloadable Course Materials ({course.attachments.length})
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {course.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-100/70 transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                    <span className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600">
                      {att.name}
                    </span>
                  </div>
                  <Download className="h-4 w-4 text-slate-400 shrink-0 group-hover:text-indigo-600" />
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* Final Assessment Card with Progression Gate */}
        {showQuiz ? (
          <div className={cn(
            "rounded-2xl border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all",
            areAllLessonsCompleted
              ? "border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-violet-50/50"
              : "border-slate-200 bg-slate-50/70 opacity-80"
          )}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 font-mono text-sm font-bold text-indigo-800">
                  {quizOpen ? "−" : "+"}
                </span>
                <BookOpenCheck className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Final Course Assessment</h3>
                {areAllLessonsCompleted ? (
                  <Badge variant="blue">Unlocked · Passing Score: 60%</Badge>
                ) : (
                  <Badge variant="slate">
                    <Lock className="h-3 w-3 mr-1" />
                    Locked (Complete all lessons first)
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-600 max-w-xl">
                Demonstrate your comprehension of the complete course curriculum. Passing score issues your accredited certificate.
              </p>
            </div>

            <Button
              disabled={!areAllLessonsCompleted}
              onClick={() => setQuizOpen(true)}
              className={cn("shadow-md gap-1.5", !areAllLessonsCompleted && "opacity-50 cursor-not-allowed")}
            >
              {areAllLessonsCompleted ? <BookOpenCheck className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {areAllLessonsCompleted ? "Take Assessment" : "Locked"}
            </Button>
          </div>
        ) : null}
      </div>

      {showQuiz ? (
        <QuizTakerModal
          open={quizOpen}
          onClose={() => {
            setQuizOpen(false);
            void refresh();
          }}
          courseId={courseId}
          courseTitle={courseTitle}
        />
      ) : null}
    </WorkspaceDetailOverlay>
  );
}