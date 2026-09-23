"use client";

import { BookOpen, BookOpenCheck, CheckCircle2, Lock } from "lucide-react";
import type { Lesson, UploadedResource } from "@/types";
import type { ApiAttachedAssessment, ApiProgressLesson, ApiProgressSubLesson } from "@/lib/api/types";
import { RichContent } from "@/components/ui/RichContent";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getItemAttachments } from "@/components/features/courses/wizard-components";
import { ClassroomAttachments } from "../ClassroomAttachments";

interface DocumentStageProps {
  title: string;
  badgeLabel?: string;
  durationMin?: number;
  content?: string | null;
  lesson?: Lesson;
  lessonProgress?: ApiProgressLesson;
  subLessonProgress?: ApiProgressSubLesson;
  assessment?: ApiAttachedAssessment | null;
  onTakeQuiz?: (assessmentId: string) => void;
}

export function DocumentStage({
  title,
  badgeLabel,
  durationMin,
  content,
  lesson,
  lessonProgress,
  subLessonProgress,
  assessment,
  onTakeQuiz,
}: DocumentStageProps) {
  const attachments: UploadedResource[] = lesson ? getItemAttachments(lesson) : [];

  // Check if assessment is ready to be taken
  const hasSubLessons = Boolean(lesson?.subLessons && lesson.subLessons.length > 0);
  const subLessonsAllDone = hasSubLessons
    ? (lessonProgress?.subLessons?.every((s) => s.completed) ?? false)
    : true;
  const isTimeMet = lessonProgress?.timeSatisfied ?? true;
  const isQuizUnlocked = subLessonsAllDone && isTimeMet;
  const isQuizPassed = assessment?.passed ?? false;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Stage Header */}
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          {badgeLabel ? (
            <Badge variant="indigo" className="text-xs">
              {badgeLabel}
            </Badge>
          ) : null}
          {durationMin ? (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              ⏱ {durationMin} min study
            </span>
          ) : null}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h2>
      </div>

      {/* Main Lecture Notes / Study Content */}
      {content ? (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-8 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <BookOpen className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Lecture Notes & Detailed Study Material
            </h3>
          </div>
          <div className="text-[15px] sm:text-base leading-relaxed text-slate-800 prose prose-base max-w-none">
            <RichContent html={content} className="text-[15px] sm:text-base leading-relaxed text-slate-800" />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-sm text-slate-500">
          No written lecture notes for this topic. Check attached resources below.
        </div>
      )}

      {/* Attached Resources */}
      {attachments.length > 0 && (
        <div className="pt-2">
          <ClassroomAttachments files={attachments} />
        </div>
      )}

      {/* Lesson Assessment Checkpoint Card (if assessment is attached) */}
      {assessment && onTakeQuiz && (
        <div className="pt-4">
          <div
            className={`rounded-2xl border p-5 sm:p-6 transition-all shadow-2xs ${
              isQuizPassed
                ? "border-emerald-200 bg-emerald-50/60"
                : isQuizUnlocked
                ? "border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-violet-50/80 ring-1 ring-indigo-500/20"
                : "border-slate-200 bg-slate-50/70"
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                    isQuizPassed
                      ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                      : isQuizUnlocked
                      ? "border-indigo-300 bg-indigo-100 text-indigo-700 shadow-2xs"
                      : "border-slate-200 bg-slate-100 text-slate-400"
                  }`}
                >
                  {isQuizPassed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : isQuizUnlocked ? (
                    <BookOpenCheck className="h-5 w-5" />
                  ) : (
                    <Lock className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-900">{assessment.titleEn}</h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isQuizPassed
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : isQuizUnlocked
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200"
                          : "bg-slate-200 text-slate-600 border-slate-300"
                      }`}
                    >
                      {isQuizPassed
                        ? "Assessment Passed"
                        : isQuizUnlocked
                        ? "Assessment Ready"
                        : "Assessment Locked"}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    {isQuizPassed
                      ? `You successfully passed this checkpoint assessment (Requirement: ${assessment.passingScore}%). Great job!`
                      : isQuizUnlocked
                      ? `Passing score: ${assessment.passingScore}%. Test your understanding to unlock the next lesson.`
                      : `Complete all preceding topics and required reading time to unlock this assessment.`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 sm:self-center">
                <Button
                  type="button"
                  size="sm"
                  disabled={!isQuizUnlocked}
                  onClick={() => onTakeQuiz(assessment.id)}
                  className={
                    isQuizPassed
                      ? "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50"
                      : isQuizUnlocked
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                      : "bg-slate-200 text-slate-400"
                  }
                >
                  {isQuizPassed ? (
                    "Review / Retake Assessment"
                  ) : isQuizUnlocked ? (
                    "Take Lesson Assessment →"
                  ) : (
                    <>
                      <Lock className="h-3.5 w-3.5 mr-1" /> Assessment Locked
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
