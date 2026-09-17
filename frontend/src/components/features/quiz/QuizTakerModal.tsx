"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Clock, Loader2, PartyPopper, RotateCcw } from "lucide-react";
import type { ApiAssessment } from "@/lib/api/types";
import { WorkspaceDetailOverlay } from "@/components/ui/WorkspaceDetailOverlay";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ApiError } from "@/lib/api/client";
import type { GradedResult, SubmitAnswer } from "@/lib/api/quiz";
import {
  fetchAssessment,
  fetchCourseAssessments,
  startAttempt,
  submitAttempt,
} from "@/lib/api/quiz";
import { cn } from "@/lib/utils";

interface QuizTakerModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
}

interface AttemptInfo {
  attemptId: string;
  attemptNumber: number;
}

export function QuizTakerModal({ open, onClose, courseId, courseTitle }: QuizTakerModalProps) {
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(true);
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [result, setResult] = useState<GradedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setAssessment(null);
    setAttempt(null);
    setAnswers({});
    setResult(null);
    setError(null);

    (async () => {
      try {
        const list = await fetchCourseAssessments(courseId);
        if (cancelled) return;
        if (!list || list.length === 0) {
          setNotFound(true);
          return;
        }
        const detail = await fetchAssessment(list[0].id);
        if (!cancelled) setAssessment(detail);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "Unable to load quiz.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, courseId]);

  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Synchronized countdown timer
  useEffect(() => {
    if (!attempt || remainingSec === null || result !== null) return;

    if (remainingSec <= 0) {
      // Auto-submit when time expires
      setAutoSubmitted(true);
      void submit(true);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSec((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt, remainingSec, result]);

  const start = async () => {
    if (!assessment) return;
    setError(null);
    setAutoSubmitted(false);
    try {
      const started = await startAttempt(assessment.id);
      setAttempt({ attemptId: started.attemptId, attemptNumber: started.attemptNumber });
      setAnswers({});
      setResult(null);
      setLoading(false);

      // Initialize remaining seconds if time limit is set
      if (started.remainingSeconds !== undefined && started.remainingSeconds !== null) {
        setRemainingSec(started.remainingSeconds);
      } else if (assessment.timeLimitMinutes && assessment.timeLimitMinutes > 0) {
        setRemainingSec(assessment.timeLimitMinutes * 60);
      } else {
        setRemainingSec(null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to start the quiz.");
    }
  };

  const submit = async (isAuto = false) => {
    if (!assessment || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: SubmitAnswer[] = Object.entries(answers).map(
        ([questionId, selectedOption]) => ({ questionId, selectedOption }),
      );
      const graded = await submitAttempt(assessment.id, payload);
      setResult(graded);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to submit the quiz.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const answeredCount = Object.keys(answers).length;
  const ready = (assessment?.questions ?? []).length > 0 &&
    answeredCount === assessment!.questions.length;

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={assessment?.titleEn ?? "Assessment / Quiz"}
      subtitle={assessment ? `${courseTitle} · Passing score: ${assessment.passingScore}% · ${assessment.maxAttempts} max attempts` : courseTitle}
    >
      <div className="w-full space-y-6 pb-12">
      {loading ? (
        <div className="flex flex-col items-center py-10 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-3 text-sm text-slate-500">Loading quiz…</p>
        </div>
      ) : notFound || !assessment ? (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
            No quiz is set up for this course yet. Please check back later.
          </p>
          <Button className="mt-6" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : !attempt && !result ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
            This quiz has {assessment.questions.length} questions.
            You need at least {assessment.passingScore}% to pass.
          </p>
          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          <Button className="mt-6" onClick={start}>
            Start quiz
          </Button>
        </div>
      ) : result ? (
        <div className="flex flex-col items-center py-8 text-center">
          <div
            className={cn(
              "relative flex h-20 w-20 animate-scale-in items-center justify-center rounded-full font-display text-2xl font-bold shadow-lg",
              result.passed
                ? "bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/40"
                : "bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-red-500/40",
            )}
          >
            {result.passed ? (
              <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-500 shadow-md">
                <PartyPopper className="h-3.5 w-3.5" />
              </span>
            ) : null}
            {result.score}%
          </div>
          <Badge variant={result.passed ? "green" : "red"} dot className="mt-4">
            {result.passed
              ? `Passed! ${result.correctCount}/${result.totalQuestions} correct`
              : `Not passed · ${result.correctCount}/${result.totalQuestions} correct`}
          </Badge>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
            {result.passed
              ? "Congratulations! You passed the quiz."
              : "Review the material and try again."}
          </p>
          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          <div className="mt-6 flex gap-2">
            <Button variant="outline" onClick={start}>
              <RotateCcw className="h-4 w-4" />
              Retake
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active Attempt Timer & Status Banner */}
          <div className="sticky top-0 z-20 -mt-2 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <BookOpenCheck className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Attempt {attempt?.attemptNumber ?? 1} of {assessment.maxAttempts}
                </p>
                <p className="text-[11px] text-slate-500">
                  Passing score: {assessment.passingScore}%
                </p>
              </div>
            </div>

            {remainingSec !== null ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors",
                  remainingSec <= 60
                    ? "animate-pulse bg-red-100 text-red-700 ring-1 ring-red-300"
                    : remainingSec <= 300
                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300"
                    : "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70",
                )}
              >
                <Clock className="h-4 w-4" />
                <span>Time Remaining: {formatTimer(remainingSec)}</span>
              </div>
            ) : null}
          </div>

          {autoSubmitted ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              <span>Time has expired! Submitting your answers automatically...</span>
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          {assessment.questions.map((question, index) => (
            <div key={question.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-bold text-white shadow-sm">
                  {index + 1}
                </span>
                {question.question}
              </p>
              {question.type === "SHORT_ANSWER" ? (
                <input
                  value={typeof answers[question.id] === "string" ? (answers[question.id] as string) : ""}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [question.id]: event.target.value }))
                  }
                  placeholder="Type your answer…"
                  className="mt-3 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                />
              ) : (
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[question.id] === optionIndex;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [question.id]: optionIndex }))
                        }
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-150",
                          selected
                            ? "border-indigo-500 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25"
                            : "border-slate-200/80 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors",
                            selected ? "border-white text-white" : "border-slate-300 text-slate-400",
                          )}
                        >
                          {optionIndex + 1}
                        </span>
                        {option}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div className="sticky bottom-0 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md">
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {answeredCount}/{assessment.questions.length} answered
              </p>
              {answeredCount < assessment.questions.length ? (
                <p className="text-[10px] text-slate-400">Early submission permitted</p>
              ) : null}
            </div>
            <Button onClick={() => void submit(false)} disabled={submitting || answeredCount === 0}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : answeredCount < assessment.questions.length ? (
                "Submit Early"
              ) : (
                "Submit Assessment"
              )}
            </Button>
          </div>
        </div>
      )}
      </div>
    </WorkspaceDetailOverlay>
  );
}