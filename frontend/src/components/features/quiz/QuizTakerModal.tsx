'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Clock,
  Download,
  FileText,
  Loader2,
  PartyPopper,
  RotateCcw,
  X,
} from 'lucide-react';
import type { ApiAssessment, AssessmentReviewItem } from '@/lib/api/types';
import { WorkspaceDetailOverlay } from '@/components/ui/WorkspaceDetailOverlay';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { toast } from '@/lib/toast';
import { ApiError } from '@/lib/api/client';
import type { GradedResult, SubmitAnswer } from '@/lib/api/quiz';
import {
  fetchAssessment,
  fetchCourseAssessments,
  startAttempt,
  submitAttempt,
} from '@/lib/api/quiz';
import { cn } from '@/lib/utils';

interface QuizTakerModalProps {
  open: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  /** When provided, loads this specific (module/lesson/final) assessment instead of the course's first/final one. */
  assessmentId?: string;
  /** Called once the learner passes. The parent is responsible for refreshing progress / advancing. */
  onPassed?: () => void;
  /** When true, renders directly inside the container without a portal overlay covering the sidebar */
  embedded?: boolean;
}

interface AttemptInfo {
  attemptId: string;
  attemptNumber: number;
}

export function QuizTakerModal({
  open,
  onClose,
  courseId,
  courseTitle,
  assessmentId,
  onPassed,
  embedded = false,
}: QuizTakerModalProps) {
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(true);
  const [assessment, setAssessment] = useState<ApiAssessment | null>(null);
  const [attempt, setAttempt] = useState<AttemptInfo | null>(null);
  // Keyed by question INDEX, not question.id — legacy assessments can contain
  // duplicate question ids, which previously caused selecting an option on one
  // question to also select it on another sharing the same id.
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [result, setResult] = useState<GradedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [passedNotified, setPassedNotified] = useState(false);

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
    setPassedNotified(false);

    (async () => {
      try {
        if (assessmentId) {
          const detail = await fetchAssessment(assessmentId);
          if (!cancelled) setAssessment(detail);
          return;
        }
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
          setError(err instanceof ApiError ? err.message : 'Unable to load assessment.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, courseId, assessmentId]);

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

  // Notify the parent exactly once when a passing result arrives.
  useEffect(() => {
    if (result?.passed && !passedNotified) {
      setPassedNotified(true);
      onPassed?.();
    }
  }, [result, passedNotified, onPassed]);

  const start = async () => {
    if (!assessment) return;
    setError(null);
    setAutoSubmitted(false);
    try {
      const started = await startAttempt(assessment.id);
      setAttempt({ attemptId: started.attemptId, attemptNumber: started.attemptNumber });
      setAnswers({});
      setResult(null);
      setPassedNotified(false);
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
      setError(err instanceof ApiError ? err.message : 'Unable to start the assessment.');
    }
  };

  const submit = async (isAuto = false) => {
    if (!assessment || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const payload: SubmitAnswer[] = Object.entries(answers).map(([index, selectedOption]) => ({
        questionId: assessment.questions[Number(index)].id,
        selectedOption,
      }));
      const graded = await submitAttempt(assessment.id, payload);
      setResult(graded);
      if (graded.passed) {
        toast.success(`Congratulations! You passed with ${graded.score}%.`);
      } else {
        toast.warning(`You scored ${graded.score}%. You need ${assessment.passingScore}% to pass.`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Unable to submit the assessment.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const answeredCount = Object.keys(answers).length;

  const reviewByQuestionId = new Map<string, AssessmentReviewItem>(
    (result?.review ?? []).map((r) => [r.questionId, r]),
  );

  const innerContent = (
    <div className="w-full space-y-6 pb-12">
      {loading ? (
        <div className="space-y-4 py-4">
          <CardSkeleton count={3} />
        </div>
      ) : notFound || !assessment ? (
        <div className="flex flex-col items-center py-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
            <BookOpenCheck className="h-7 w-7" />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-500">
            No assessment is set up for this course yet. Please check back later.
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
            This assessment has {assessment.questions.length} questions. You need at least{' '}
            {assessment.passingScore}% to pass.
          </p>
          {assessment.resourceUrl ? (
            <div className="mt-4 flex w-full max-w-md items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-left shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-5 w-5 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-950 truncate">
                    {assessment.fileName || 'Assessment Reference Sheet / Study Material'}
                  </p>
                  <p className="text-[11px] text-indigo-700">
                    Reference material provided for this assessment
                  </p>
                </div>
              </div>
              <a
                href={assessment.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-indigo-700 transition shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </div>
          ) : null}
          {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
          <Button
            className="mt-6 font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            onClick={start}
          >
            Start assessment
          </Button>
        </div>
      ) : result ? (
        (() => {
          // Hide correct answers (and per-question correctness) while a retry
          // is still available — otherwise a learner could read off the
          // correct answers here and simply reuse them on the next attempt.
          // Once passed, or once attempts are exhausted, the full review
          // (right/wrong + correct answers) is shown.
          const canRetry = !result.passed && result.attemptNumber < assessment.maxAttempts;
          const showCorrectAnswers = !canRetry;
          return (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-4 text-center">
                <div
                  className={cn(
                    'relative flex h-20 w-20 animate-scale-in items-center justify-center rounded-full font-display text-2xl font-bold shadow-lg',
                    result.passed
                      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-emerald-500/40'
                      : 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-red-500/40',
                  )}
                >
                  {result.passed ? (
                    <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white text-amber-500 shadow-md">
                      <PartyPopper className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                  {result.score}%
                </div>
                <Badge variant={result.passed ? 'green' : 'red'} dot className="mt-4">
                  {result.passed
                    ? `Passed! ${result.correctCount}/${result.totalQuestions} correct`
                    : `Not passed · ${result.correctCount}/${result.totalQuestions} correct`}
                </Badge>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
                  {result.passed
                    ? 'Congratulations! You passed the assessment. Review your answers below.'
                    : `You need at least ${assessment.passingScore}% to continue. Review the answers below and try again.`}
                </p>
                {error ? <p className="mt-3 text-xs text-red-500">{error}</p> : null}
                <div className="mt-6 flex gap-2">
                  {result.passed ? (
                    <Button onClick={onClose}>Continue</Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => void start()}>
                        <RotateCcw className="h-4 w-4" />
                        Retry
                      </Button>
                      <Button variant="ghost" onClick={onClose}>
                        Close
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {/* Per-question review */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Answer Review
                  </h4>
                  {!showCorrectAnswers ? (
                    <span className="text-[11px] text-slate-400">
                      Correct answers are hidden while a retry is available
                    </span>
                  ) : null}
                </div>
                {assessment.questions.map((question, index) => {
                  const review = reviewByQuestionId.get(question.id);
                  const isCorrect = review?.isCorrect ?? false;
                  const isShortAnswer = question.type === 'SHORT_ANSWER';

                  return (
                    <div
                      key={question.id}
                      className={cn(
                        'rounded-2xl border p-4 shadow-sm',
                        !showCorrectAnswers
                          ? 'border-slate-200/80 bg-white'
                          : isCorrect
                            ? 'border-emerald-200 bg-emerald-50/40'
                            : 'border-rose-200 bg-rose-50/40',
                      )}
                    >
                      <p className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                        <span
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white shadow-sm',
                            !showCorrectAnswers
                              ? 'bg-slate-400'
                              : isCorrect
                                ? 'bg-emerald-500'
                                : 'bg-rose-500',
                          )}
                        >
                          {!showCorrectAnswers ? (
                            index + 1
                          ) : isCorrect ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <X className="h-3.5 w-3.5" />
                          )}
                        </span>
                        {index + 1}. {question.question}
                      </p>

                      {isShortAnswer ? (
                        <div className="mt-3 space-y-1.5 pl-8 text-xs">
                          <p>
                            <span className="font-semibold text-slate-600">Your answer: </span>
                            <span
                              className={
                                !showCorrectAnswers
                                  ? 'text-slate-700'
                                  : isCorrect
                                    ? 'text-emerald-700'
                                    : 'text-rose-700'
                              }
                            >
                              {String(review?.selectedOption ?? '—')}
                            </span>
                          </p>
                          {showCorrectAnswers && !isCorrect ? (
                            <p>
                              <span className="font-semibold text-slate-600">Correct answer: </span>
                              <span className="text-emerald-700">
                                {String(review?.correctAnswer ?? '—')}
                              </span>
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-1.5 pl-8">
                          {question.options.map((option, optionIndex) => {
                            const isSelected = review?.selectedOption === optionIndex;
                            const isCorrectOption =
                              showCorrectAnswers && review?.correctAnswer === optionIndex;
                            return (
                              <div
                                key={optionIndex}
                                className={cn(
                                  'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs',
                                  isCorrectOption
                                    ? 'border-emerald-300 bg-emerald-100/70 text-emerald-900 font-medium'
                                    : isSelected
                                      ? showCorrectAnswers
                                        ? 'border-rose-300 bg-rose-100/70 text-rose-900'
                                        : 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                      : 'border-slate-200 bg-white text-slate-600',
                                )}
                              >
                                {isCorrectOption ? (
                                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                ) : isSelected && showCorrectAnswers ? (
                                  <X className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                                ) : (
                                  <span className="h-3.5 w-3.5 shrink-0" />
                                )}
                                {option}
                                {isSelected ? (
                                  <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide opacity-70">
                                    Your pick
                                  </span>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
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
                  'flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-colors',
                  remainingSec <= 60
                    ? 'animate-pulse bg-red-100 text-red-700 ring-1 ring-red-300'
                    : remainingSec <= 300
                      ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-300'
                      : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/70',
                )}
              >
                <Clock className="h-4 w-4" />
                <span>Time Remaining: {formatTimer(remainingSec)}</span>
              </div>
            ) : null}
          </div>

          {/* Reference Material if attached */}
          {assessment.resourceUrl ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-900 truncate">
                    {assessment.fileName || 'Exam Reference Document / Study Formula Sheet'}
                  </p>
                  <p className="text-[10px] text-indigo-700">
                    Official reference material permitted during assessment
                  </p>
                </div>
              </div>
              <a
                href={assessment.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-white px-2.5 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-50 shadow-2xs transition shrink-0"
              >
                <Download className="h-3 w-3" />
                View Reference
              </a>
            </div>
          ) : null}

          {autoSubmitted ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
              <span>Time has expired! Submitting your answers automatically...</span>
            </div>
          ) : null}

          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          {assessment.questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <p className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 text-[11px] font-bold text-white shadow-sm">
                  {index + 1}
                </span>
                {question.question}
              </p>

              {question.imageUrl ? (
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={question.imageUrl}
                    alt={`Question ${index + 1} Diagram`}
                    className="max-h-72 w-full object-contain rounded-lg bg-white"
                  />
                </div>
              ) : null}

              {question.type === 'SHORT_ANSWER' ? (
                <input
                  value={typeof answers[index] === 'string' ? (answers[index] as string) : ''}
                  onChange={(event) =>
                    setAnswers((prev) => ({ ...prev, [index]: event.target.value }))
                  }
                  placeholder="Type your answer…"
                  className="mt-3 w-full rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10"
                />
              ) : (
                <div className="mt-3 space-y-2">
                  {question.options.map((option, optionIndex) => {
                    const selected = answers[index] === optionIndex;
                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, [index]: optionIndex }))}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all duration-150',
                          selected
                            ? 'border-indigo-500 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25'
                            : 'border-slate-200/80 bg-white text-slate-700 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/40',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-colors',
                            selected
                              ? 'border-white text-white'
                              : 'border-slate-300 text-slate-400',
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
            <Button
              onClick={() => void submit(false)}
              disabled={answeredCount === 0}
              isLoading={submitting}
              loadingText="Submitting…"
            >
              {answeredCount < assessment.questions.length ? 'Submit Early' : 'Submit Assessment'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) {
    if (!open) return null;
    return (
      <div className="w-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden min-h-[520px]">
        {/* Top Header Bar */}
        <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition shadow-2xs"
              title="Back to Course"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {assessment?.titleEn ?? 'Assessment'}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {assessment
                  ? `${courseTitle} · Passing score: ${assessment.passingScore}% · ${assessment.maxAttempts} max attempts`
                  : courseTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Assessment Body */}
        <div className="p-4 sm:p-8 flex-1">
          <div className="max-w-3xl mx-auto">{innerContent}</div>
        </div>
      </div>
    );
  }

  return (
    <WorkspaceDetailOverlay
      open={open}
      onClose={onClose}
      title={assessment?.titleEn ?? 'Assessment'}
      subtitle={
        assessment
          ? `${courseTitle} · Passing score: ${assessment.passingScore}% · ${assessment.maxAttempts} max attempts`
          : courseTitle
      }
    >
      {innerContent}
    </WorkspaceDetailOverlay>
  );
}
