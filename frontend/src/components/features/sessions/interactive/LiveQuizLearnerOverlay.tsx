"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Send,
  HelpCircle,
  BarChart2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Minimize2,
  Maximize2,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitLiveSessionQuizResponse } from "@/lib/api/monitoring";
import type {
  LiveKitDataEvent,
  LiveQuizOption,
  LiveQuizPayload,
  LiveQuizRevealPayload,
} from "@/types/livekit-events";

interface LiveQuizLearnerOverlayProps {
  sessionId: string;
  userId: string;
  userName: string;
  quiz?: LiveQuizPayload | null;
  quizHistory?: Array<{
    quiz: LiveQuizPayload;
    answers?: Record<string, any>;
    revealData?: LiveQuizRevealPayload | null;
    completedAt?: number;
  }>;
  revealData?: LiveQuizRevealPayload | null;
  revealsByQuestionId?: Record<string, LiveQuizRevealPayload>;
  onBroadcast: (event: LiveKitDataEvent) => void;
  onDismiss: () => void;
}

function stripHtmlTags(str?: string | null): string {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").trim();
}

export function LiveQuizLearnerOverlay({
  sessionId,
  userId,
  userName,
  quiz,
  quizHistory = [],
  revealData,
  revealsByQuestionId = {},
  onBroadcast,
  onDismiss,
}: LiveQuizLearnerOverlayProps) {
  // If no active quiz is in session, unmount immediately so learner does not see lingering questions
  if (!quiz) return null;

  // Aggregate all questions in the current live quiz sequence
  const allQuestions = useMemo(() => {
    if (!quiz) return [];
    const list: LiveQuizPayload[] = [];
    const seenIds = new Set<string>();

    const addQuestion = (q?: LiveQuizPayload | null) => {
      if (!q || !q.id || seenIds.has(q.id)) return;
      seenIds.add(q.id);
      list.push(q);
    };

    // 1. If active quiz specifies allQuestions (e.g. from queued broadcast), include them in order
    if (quiz.allQuestions && Array.isArray(quiz.allQuestions)) {
      for (const q of quiz.allQuestions) {
        addQuestion(q);
      }
    }

    // 2. Add active quiz if not already in list
    addQuestion(quiz);

    return list;
  }, [quiz]);

  // Current question index being viewed by learner
  const [viewingIndex, setViewingIndex] = useState<number>(0);

  // Automatically follow the active question when a new question arrives or on initial broadcast
  useEffect(() => {
    if (!quiz?.id) return;
    if (
      quiz.questionIndex !== undefined &&
      quiz.questionIndex >= 0 &&
      quiz.questionIndex < allQuestions.length
    ) {
      setViewingIndex(quiz.questionIndex);
    } else {
      const idx = allQuestions.findIndex((q) => q.id === quiz.id);
      if (idx !== -1) {
        setViewingIndex(idx);
      }
    }
  }, [quiz?.id, quiz?.questionIndex, allQuestions]);

  const safeIndex = Math.min(
    Math.max(0, viewingIndex),
    Math.max(0, allQuestions.length - 1)
  );
  const currentQuestion = allQuestions[safeIndex] || quiz;
  // True while the question on screen is the one the trainer is currently running.
  const isCurrentActive = Boolean(quiz && currentQuestion && currentQuestion.id === quiz.id);

  // Track learner selections and submitted state per question
  const [answersMap, setAnswersMap] = useState<Record<string, string[]>>({});
  const [submittedMap, setSubmittedMap] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Automatically restore / expand when a new live quiz question begins
  useEffect(() => {
    if (quiz?.id) {
      setIsMinimized(false);
    }
  }, [quiz?.id]);

  // Automatically restore / expand when answers are revealed
  useEffect(() => {
    if (revealData || (revealsByQuestionId && Object.keys(revealsByQuestionId).length > 0)) {
      setIsMinimized(false);
    }
  }, [revealData, revealsByQuestionId]);

  // Reset answer states when a brand-new quiz sequence starts
  const sessionKey = quiz?.startedAt ? `${quiz.id}_${quiz.startedAt}` : quiz?.id;
  const lastSessionKeyRef = useRef<string | undefined>(sessionKey);
  useEffect(() => {
    if (sessionKey && sessionKey !== lastSessionKeyRef.current) {
      const isPartOfExisting = allQuestions.some(
        (q) => q.id === lastSessionKeyRef.current?.split("_")[0]
      );
      if (!isPartOfExisting) {
        setAnswersMap({});
        setSubmittedMap({});
      }
      lastSessionKeyRef.current = sessionKey;
    }
  }, [sessionKey, allQuestions]);

  // Countdown timer for active quiz session (remains smooth and active as learner navigates questions)
  const calcRemaining = useCallback(() => {
    if (!quiz) return 0;
    const start = quiz.startedAt || Date.now();
    const limit = quiz.timeLimitSeconds || 30;
    const elapsed = Math.floor((Date.now() - start) / 1000);
    return Math.max(0, limit - elapsed);
  }, [quiz]);

  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => calcRemaining());

  useEffect(() => {
    if (!quiz) return;
    setSecondsRemaining(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setSecondsRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [quiz, calcRemaining]);

  // Current question answers and submission status
  const currentQId = currentQuestion?.id || "";
  const selectedOptionIds = answersMap[currentQId] || [];
  const submitted = Boolean(submittedMap[currentQId]);

  // Determine reveal data for current question (strictly scoped to this question)
  const questionReveal = useMemo(() => {
    if (!currentQuestion) return null;
    if (revealsByQuestionId && revealsByQuestionId[currentQuestion.id]) {
      return revealsByQuestionId[currentQuestion.id];
    }
    if (revealData?.allReveals && revealData.allReveals[currentQuestion.id]) {
      const r = revealData.allReveals[currentQuestion.id];
      return {
        questionId: currentQuestion.id,
        correctOptionIds: r.correctOptionIds,
        explanationEn: r.explanationEn,
        explanationAm: r.explanationAm,
        distribution: r.distribution || {},
        totalResponses: r.totalResponses || 0,
      };
    }
    if (revealData && revealData.questionId === currentQuestion.id) {
      return revealData;
    }
    const fromHistory = quizHistory?.find((h) => h.quiz.id === currentQuestion.id)?.revealData;
    if (fromHistory) return fromHistory;

    return null;
  }, [revealsByQuestionId, revealData, quizHistory, currentQuestion]);

  const isRevealed = Boolean(questionReveal);
  const isTimeUp = secondsRemaining <= 0;
  const isLocked = submitted || isRevealed || isTimeUp;

  // Auto-submit when time expires only if learner had selected options for the question
  useEffect(() => {
    if (!quiz || !currentQuestion) return;
    if (secondsRemaining <= 0 && !submitted && !submitting && !isRevealed) {
      if (selectedOptionIds.length > 0) {
        void handleSubmit();
      }
    }
  }, [secondsRemaining, quiz, currentQuestion, submitted, selectedOptionIds, submitting, isRevealed]);

  // Option selection handler
  const handleSelectOption = (optId: string) => {
    if (!currentQuestion || isLocked) return;

    if (currentQuestion.type === "MULTIPLE_CHOICE") {
      const next = selectedOptionIds.includes(optId)
        ? selectedOptionIds.filter((id) => id !== optId)
        : [...selectedOptionIds, optId];
      setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: next }));
    } else {
      setAnswersMap((prev) => ({ ...prev, [currentQuestion.id]: [optId] }));
    }
  };

  // Submit response for current question
  const handleSubmit = async () => {
    if (!currentQuestion || selectedOptionIds.length === 0 || submitted || submitting) return;
    setSubmitting(true);

    const elapsed = Math.max(
      1,
      (currentQuestion.timeLimitSeconds || 30) - secondsRemaining
    );

    // 1. Instant Data Channel broadcast (< 50ms)
    onBroadcast({
      type: "QUIZ_ANSWER",
      payload: {
        questionId: currentQuestion.id,
        userId,
        userName,
        selectedOptionIds,
        submittedAt: Date.now(),
        responseDurationSeconds: elapsed,
      },
    });

    setSubmittedMap((prev) => ({ ...prev, [currentQuestion.id]: true }));
    setSubmitting(false);

    // 2. Asynchronously sync to backend for audit records
    try {
      await submitLiveSessionQuizResponse(sessionId, {
        questionId: currentQuestion.id,
        selectedOptionIds,
        responseDurationSeconds: elapsed,
      });
    } catch (err) {
      console.warn("Could not log live quiz response to backend:", err);
    }
  };

  // Resolve correct options and explanations
  const resolvedCorrectOptionIds = useMemo(() => {
    if (!isRevealed || !currentQuestion) return [];
    if (questionReveal?.correctOptionIds && questionReveal.correctOptionIds.length > 0) {
      return questionReveal.correctOptionIds;
    }
    if (currentQuestion.correctOptionIds && currentQuestion.correctOptionIds.length > 0) {
      return currentQuestion.correctOptionIds;
    }
    return [];
  }, [isRevealed, questionReveal, currentQuestion]);

  const resolvedExplanationEn = isRevealed && currentQuestion
    ? questionReveal?.explanationEn ||
      currentQuestion.explanationEn ||
      (currentQuestion as any).explanation
    : undefined;

  const resolvedExplanationAm = isRevealed && currentQuestion
    ? questionReveal?.explanationAm || currentQuestion.explanationAm
    : undefined;

  // Correctness evaluation for current question
  const isCorrect =
    isRevealed &&
    selectedOptionIds.length > 0 &&
    resolvedCorrectOptionIds.length > 0 &&
    resolvedCorrectOptionIds.every((id) => selectedOptionIds.includes(id)) &&
    selectedOptionIds.every((id) => resolvedCorrectOptionIds.includes(id));

  const timerLimit = currentQuestion?.timeLimitSeconds || 30;
  const timerPercent = Math.min(
    100,
    Math.max(0, (secondsRemaining / timerLimit) * 100)
  );

  const fallbackExplanation = useMemo(() => {
    if (!isRevealed || !currentQuestion) return "";
    const correctNames = resolvedCorrectOptionIds
      .map((id) => {
        const oIdx = currentQuestion.options.findIndex((o) => o.id === id);
        const opt = oIdx >= 0 ? currentQuestion.options[oIdx] : null;
        return opt ? `Option ${String.fromCharCode(65 + oIdx)} ("${stripHtmlTags(opt.textEn)}")` : id;
      })
      .filter(Boolean);
    if (correctNames.length > 0) {
      return `The correct answer is ${correctNames.join(", ")}. Verified according to course guidelines.`;
    }
    return "The correct answer has been verified according to course guidelines.";
  }, [isRevealed, currentQuestion, resolvedCorrectOptionIds]);

  if (!currentQuestion) return null;

  // Minimized floating dock pill
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-6 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2.5 rounded-2xl border border-indigo-500/50 bg-slate-900/95 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md hover:bg-slate-800 transition cursor-pointer"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-100">Live Quiz</span>
              {allQuestions.length > 1 && (
                <span className="text-[11px] font-mono font-bold text-indigo-300">
                  (Q{safeIndex + 1}/{allQuestions.length})
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400">
              {isRevealed
                ? "Answers Revealed • Click to view"
                : submitted
                ? "Answer Submitted • Click to view"
                : secondsRemaining > 0
                ? `${secondsRemaining}s remaining • Click to open`
                : "Time Expired • Click to view"}
            </p>
          </div>
          <Maximize2 className="h-4 w-4 text-indigo-400 ml-1" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-xs pointer-events-auto animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-xl max-h-[90vh] sm:max-h-[86vh] rounded-3xl border border-slate-200/90 bg-white text-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Countdown Header Bar */}
        <div className="h-1.5 w-full bg-slate-100 shrink-0">
          <div
            className={`h-full transition-all duration-500 ${
              isLocked
                ? "bg-slate-300"
                : secondsRemaining <= 5
                ? "bg-red-500 animate-pulse"
                : secondsRemaining <= 10
                ? "bg-amber-500"
                : "bg-indigo-600"
            }`}
            style={{
              width: !isCurrentActive || isLocked ? "100%" : `${timerPercent}%`,
            }}
          />
        </div>

        {/* Modal Header */}
        <div className="border-b border-slate-100 px-5 pt-3.5 pb-3 shrink-0 bg-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/80 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 truncate block">
                  {currentQuestion.trainerName
                    ? `${currentQuestion.trainerName} asks:`
                    : "Live Classroom Question"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Countdown / Status Badge */}
              {isCurrentActive && !isLocked && (
                <span
                  className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                    secondsRemaining <= 5
                      ? "border-red-300 bg-red-50 text-red-700 animate-pulse"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  {secondsRemaining}s
                </span>
              )}

              {isLocked && !isRevealed && (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                  <Clock className="h-3 w-3 text-indigo-500 animate-pulse" />
                  Waiting for Reveal
                </span>
              )}

              {isRevealed && (
                <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Answers Revealed
                </span>
              )}

              {/* Minimize Modal */}
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Minimize question (dock to corner)"
              >
                <Minus className="h-4 w-4" />
              </button>

              {/* Dismiss Modal */}
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                title="Dismiss question"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Multi-Question Quick Switcher Pills (allows learner to jump between questions anytime) */}
          {allQuestions.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 mt-2 border-t border-slate-100/90 no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-500 shrink-0 mr-1">Questions:</span>
              {allQuestions.map((q, qIdx) => {
                const isAnswered = Boolean(submittedMap[q.id]);
                const isSelectedTab = safeIndex === qIdx;
                const isRevealedTab = Boolean(
                  revealsByQuestionId[q.id] ||
                  (revealData?.allReveals && revealData.allReveals[q.id]) ||
                  (revealData && (revealData.questionId === q.id || !revealData.questionId))
                );

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setViewingIndex(qIdx)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shrink-0 ${
                      isSelectedTab
                        ? "bg-indigo-600 text-white shadow-xs"
                        : isRevealedTab
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
                        : isAnswered
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold"
                        : "bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>Q{qIdx + 1}</span>
                    {isAnswered && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
          {/* Question Text */}
          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words">
              {stripHtmlTags(currentQuestion.titleEn)}
            </h4>
            {currentQuestion.titleAm && (
              <p className="text-xs sm:text-sm text-slate-600 font-amharic leading-relaxed break-words pt-1">
                {stripHtmlTags(currentQuestion.titleAm)}
              </p>
            )}
          </div>

          {/* Option Cards */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = selectedOptionIds.includes(opt.id);
              const isThisCorrect =
                isRevealed && resolvedCorrectOptionIds.includes(opt.id);
              const isSelectedWrong = isRevealed && isSelected && !isThisCorrect;
              const votes = questionReveal?.distribution?.[opt.id] ?? 0;
              const totalVotes = questionReveal?.totalResponses ?? 0;
              const votePercent =
                totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;

              let borderClass =
                "border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-300 text-slate-800";
              if (!isLocked && isSelected) {
                borderClass =
                  "border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20";
              }
              if (isLocked && !isRevealed) {
                if (isSelected) {
                  borderClass =
                    "border-indigo-500 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 shadow-2xs font-semibold";
                } else {
                  borderClass = "border-slate-200/80 bg-slate-50/40 text-slate-500 opacity-60";
                }
              }
              if (isRevealed) {
                if (isThisCorrect) {
                  borderClass =
                    "border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/20 shadow-xs";
                } else if (isSelectedWrong) {
                  borderClass =
                    "border-red-400 bg-red-50 text-red-950 ring-1 ring-red-400/20";
                } else {
                  borderClass = "border-slate-200/80 bg-slate-50/40 text-slate-500 opacity-60";
                }
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSelectOption(opt.id)}
                  className={`w-full rounded-2xl border p-3.5 text-left transition relative overflow-hidden flex items-start justify-between gap-3 shadow-2xs ${borderClass}`}
                >
                  {/* Visual percentage fill background on reveal */}
                  {isRevealed && totalVotes > 0 && (
                    <div
                      className={`absolute top-0 bottom-0 left-0 transition-all duration-700 opacity-20 pointer-events-none ${
                        isThisCorrect ? "bg-emerald-400" : "bg-slate-400"
                      }`}
                      style={{ width: `${votePercent}%` }}
                    />
                  )}

                  <div className="flex items-start gap-3 relative z-10 flex-1 min-w-0">
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold mt-0.5 ${
                        isRevealed && isThisCorrect
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : isRevealed && isSelectedWrong
                          ? "bg-red-500 text-white shadow-2xs"
                          : isSelected
                          ? "bg-indigo-600 text-white shadow-2xs"
                          : "bg-white border border-slate-200 text-slate-600"
                      }`}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 break-words whitespace-normal leading-snug">
                        {stripHtmlTags(opt.textEn)}
                      </p>
                      {opt.textAm && (
                        <p className="text-[11px] sm:text-xs text-slate-500 font-amharic break-words whitespace-normal leading-relaxed mt-0.5">
                          {stripHtmlTags(opt.textAm)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Indicator */}
                  <div className="relative z-10 shrink-0 flex items-center gap-2 mt-0.5">
                    {isRevealed && totalVotes > 0 ? (
                      <span className="text-xs font-mono font-bold text-slate-600">
                        {votePercent}%
                      </span>
                    ) : null}

                    {isRevealed && isThisCorrect && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {isSelected ? "Correct!" : "Correct"}
                      </span>
                    )}
                    {isRevealed && isSelectedWrong && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800 border border-red-200">
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                        Your Answer
                      </span>
                    )}
                    {isLocked && !isRevealed && isSelected && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 border border-indigo-200">
                        <Check className="h-3 w-3 text-indigo-600" />
                        Your Choice
                      </span>
                    )}
                    {!isLocked && isSelected && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white shadow-2xs">
                        <Check className="h-2.5 w-2.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Waiting for Trainer Reveal Banner */}
          {isLocked && !isRevealed && (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-950 shadow-2xs animate-in fade-in">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                <Clock className="h-4 w-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-indigo-950 text-xs">
                  {submitted ? "Response Recorded" : "Time Expired"}
                </p>
                <p className="text-[11px] text-indigo-700 mt-0.5 leading-relaxed">
                  {submitted
                    ? "Your response has been registered. You can proceed to the next question, or wait for the trainer to reveal the correct answers."
                    : "The question timer ended. The trainer will reveal the correct answers to the room shortly."}
                </p>
              </div>
            </div>
          )}

          {/* Answer Result Banner (Shown when revealed) */}
          {isRevealed && (
            <div
              className={`rounded-2xl p-4 text-xs space-y-2 border shadow-xs animate-in fade-in duration-200 ${
                isCorrect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                  : selectedOptionIds.length > 0
                  ? "border-amber-200 bg-amber-50 text-amber-950"
                  : "border-slate-200 bg-slate-50 text-slate-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Great job! You selected the correct answer.</span>
                  </>
                ) : selectedOptionIds.length > 0 ? (
                  <>
                    <XCircle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>
                      Not quite. The correct answer is{" "}
                      <span className="font-extrabold underline">
                        {resolvedCorrectOptionIds
                          .map((id) => {
                            const oIdx = currentQuestion.options.findIndex(
                              (o) => o.id === id
                            );
                            return oIdx >= 0
                              ? `Option ${String.fromCharCode(65 + oIdx)}`
                              : id;
                          })
                          .join(", ")}
                      </span>
                      .
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>
                      Time expired before you answered. The correct answer was{" "}
                      <span className="font-extrabold underline">
                        {resolvedCorrectOptionIds
                          .map((id) => {
                            const oIdx = currentQuestion.options.findIndex(
                              (o) => o.id === id
                            );
                            return oIdx >= 0
                              ? `Option ${String.fromCharCode(65 + oIdx)}`
                              : id;
                          })
                          .join(", ")}
                      </span>
                      .
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Question Explanation Box (Always shown when revealed) */}
          {isRevealed && (
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/80 p-4 text-xs space-y-2 shadow-2xs animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs">
                <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-600 text-white shadow-2xs">
                  <BookOpen className="h-3 w-3" />
                </span>
                <span className="text-xs sm:text-sm font-bold text-indigo-950">Explanation for the Correct Answer:</span>
              </div>
              {resolvedExplanationEn ? (
                <p className="text-slate-800 leading-relaxed text-xs sm:text-sm pl-7 font-medium">
                  {stripHtmlTags(resolvedExplanationEn)}
                </p>
              ) : (
                <p className="text-slate-700 leading-relaxed text-xs sm:text-sm pl-7">
                  {fallbackExplanation}
                </p>
              )}
              {resolvedExplanationAm && (
                <p className="text-slate-600 font-amharic leading-relaxed text-xs sm:text-sm pl-7 border-t border-indigo-100/70 pt-2 mt-2">
                  {stripHtmlTags(resolvedExplanationAm)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions & Multi-Question Navigation */}
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-t border-slate-100 bg-white shrink-0 flex-wrap">
          {/* Previous / Next Navigation Controls */}
          {allQuestions.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safeIndex === 0}
                onClick={() => setViewingIndex((prev) => Math.max(0, prev - 1))}
                className="gap-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold h-8 px-2.5 shadow-2xs"
                title="Go to previous question"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>

              <span className="text-[11px] font-mono font-bold text-slate-500 px-1.5">
                {safeIndex + 1}/{allQuestions.length}
              </span>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safeIndex >= allQuestions.length - 1}
                onClick={() =>
                  setViewingIndex((prev) =>
                    Math.min(allQuestions.length - 1, prev + 1)
                  )
                }
                className="gap-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-semibold h-8 px-2.5 shadow-2xs"
                title="Go to next question"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="text-xs text-slate-500">
              {!isLocked ? (
                <span>Select an option and submit</span>
              ) : !isRevealed ? (
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  {submitted ? "Response submitted" : "Time expired"}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-600 font-semibold">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  {isCorrect ? "Correct answer!" : "Answers revealed"}
                </span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {!isLocked ? (
              <div className="flex items-center gap-1.5">
                {allQuestions.length > 1 && safeIndex < allQuestions.length - 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setViewingIndex((prev) =>
                        Math.min(allQuestions.length - 1, prev + 1)
                      )
                    }
                    className="gap-1 border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-8 px-3"
                  >
                    Next Question
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  disabled={
                    selectedOptionIds.length === 0 ||
                    secondsRemaining <= 0 ||
                    submitting
                  }
                  onClick={handleSubmit}
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs h-8 px-4"
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Submitting…" : "Submit Answer"}
                </Button>
              </div>
            ) : !isRevealed ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-lg">
                  <Check className="h-3 w-3 text-indigo-600" />
                  {submitted ? "Submitted" : "Time Expired"}
                </span>

                {allQuestions.length > 1 && safeIndex < allQuestions.length - 1 && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setViewingIndex((prev) =>
                        Math.min(allQuestions.length - 1, prev + 1)
                      )
                    }
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3.5 shadow-xs"
                    title="Advance to next question even though time is not up"
                  >
                    Next Question
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                {allQuestions.length > 1 && safeIndex < allQuestions.length - 1 && (
                  <Button
                    size="sm"
                    onClick={() =>
                      setViewingIndex((prev) =>
                        Math.min(allQuestions.length - 1, prev + 1)
                      )
                    }
                    className="gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold h-8 px-3 shadow-xs"
                  >
                    Next Question
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onDismiss}
                  className="border-slate-200 text-slate-700 hover:bg-slate-100 bg-white text-xs h-8 px-3"
                >
                  Dismiss
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
