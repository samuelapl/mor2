"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  Lock,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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
  const [quizOpen, setQuizOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!open || !courseId) return;
    setLoading(true);
    try {
      setProgress(await fetchCourseProgress(courseId));
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

  if (!course) return null;

  const overall = progress?.stats.overallPercent ?? 0;

  const toggleComplete = async (lessonId: string, completed: boolean) => {
    setTogglingId(lessonId);
    try {
      await markLessonComplete(lessonId, { completed, lastPosition: 0 });
      await refresh();
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="screen"
      title={course.title}
      subtitle={`${course.code} · ${course.category}`}
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Overall progress</span>
            <span className="font-semibold text-slate-700">{Math.round(overall)}%</span>
          </div>
          <ProgressBar value={overall} />
        </div>

        {loading && !progress ? (
          <p className="text-xs text-slate-400">Loading your course…</p>
        ) : null}

        <div className="space-y-3">
          {course.modules.map((module, moduleIndex) => {
            const moduleProgress = progress?.modules.find(
              (m) => m.moduleId === module.id,
            );
            const moduleLocked =
              module.unlocked === false ||
              (moduleProgress ? moduleProgress.unlocked === false : false);
            const completed = moduleProgress?.completedLessons ?? 0;
            const total = moduleProgress?.totalLessons ?? module.lessons.length;
            const modulePercent = moduleProgress?.progressPercent ?? 0;

            return (
              <div
                key={module.id}
                className={cn(
                  "overflow-hidden rounded-xl border bg-white shadow-sm",
                  moduleLocked
                    ? "border-slate-200/60 bg-slate-50/40"
                    : "border-slate-200/80",
                )}
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      moduleLocked ? "text-slate-500" : "text-slate-800",
                    )}
                  >
                    {moduleLocked ? (
                      <Lock className="mr-1.5 inline h-3.5 w-3.5" />
                    ) : null}
                    {moduleIndex + 1}. {module.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    {moduleLocked ? (
                      <Badge variant="slate">Locked</Badge>
                    ) : modulePercent >= 100 ? (
                      <Badge variant="green" dot>
                        Complete
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        {completed}/{total} lessons
                      </Badge>
                    )}
                  </div>
                </div>
                <ul className="divide-y divide-slate-100">
                  {module.lessons.map((lesson, lessonIndex) => {
                    const lessonProgress = moduleProgress?.lessons.find(
                      (l) => l.lessonId === lesson.id,
                    );
                    const locked =
                      lesson.unlocked === false ||
                      (lessonProgress ? lessonProgress.unlocked === false : false);
                    const completedFlag = lessonProgress?.completed ?? false;
                    const selected = openLesson === lesson.id;
                    return (
                      <li key={lesson.id}>
                        <div
                          className={cn(
                            "flex items-center justify-between gap-3 px-4 py-2.5 text-sm",
                            locked ? "text-slate-400" : "text-slate-600",
                          )}
                        >
                          <button
                            type="button"
                            disabled={locked || !lesson.content}
                            onClick={() => setOpenLesson(selected ? null : lesson.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left transition-colors hover:text-slate-900 disabled:cursor-not-allowed disabled:hover:text-slate-400"
                          >
                            <span>
                              {moduleIndex + 1}.{lessonIndex + 1} · {lesson.title}
                            </span>
                            {lesson.content ? (
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform",
                                  selected ? "rotate-180" : "",
                                )}
                              />
                            ) : null}
                          </button>
                          <div className="flex shrink-0 items-center gap-2">
                            {locked ? (
                              <Badge variant="slate">
                                <Lock className="h-3 w-3" />
                                Locked
                              </Badge>
                            ) : completedFlag ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={togglingId === lesson.id}
                                onClick={() => void toggleComplete(lesson.id, false)}
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Undo complete
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="success"
                                disabled={togglingId === lesson.id}
                                onClick={() => void toggleComplete(lesson.id, true)}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Mark complete
                              </Button>
                            )}
                          </div>
                        </div>
                        {selected && !locked ? (
                          <div className="space-y-3 border-t border-slate-100 bg-slate-50/40 px-4 py-3">
                            <RichContent html={lesson.content} />
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

        {course.modules.length === 0 ? (
          <p className="text-xs text-slate-400">This course has no content yet.</p>
        ) : null}

        {showQuiz ? (
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Completed all lessons? Take the final assessment to earn a certificate.
            </p>
            <Button size="sm" onClick={() => setQuizOpen(true)}>
              <BookOpenCheck className="h-3.5 w-3.5" />
              Take quiz
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating progress…
          </p>
        ) : null}
      </div>

      {showQuiz ? (
        <QuizTakerModal
          open={quizOpen}
          onClose={() => setQuizOpen(false)}
          courseId={courseId}
          courseTitle={courseTitle}
        />
      ) : null}
    </Modal>
  );
}