"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { submitLiveSessionQuizResponse } from "@/lib/api/monitoring";
import type {
  LiveKitDataEvent,
  LiveQuizOption,
} from "@/types/livekit-events";

interface LiveQuizLearnerOverlayProps {
  sessionId: string;
  userId: string;
  userName: string;
  quiz: {
    id: string;
    titleEn: string;
    titleAm?: string;
    type: "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";
    options: LiveQuizOption[];
    timeLimitSeconds: number;
    startedAt: number;
    trainerName?: string;
  };
  revealData: {
    correctOptionIds: string[];
    explanationEn?: string;
    explanationAm?: string;
    distribution: Record<string, number>;
    totalResponses: number;
  } | null;
  onBroadcast: (event: LiveKitDataEvent) => void;
  onDismiss: () => void;
}

export function LiveQuizLearnerOverlay({
  sessionId,
  userId,
  userName,
  quiz,
  revealData,
  onBroadcast,
  onDismiss,
}: LiveQuizLearnerOverlayProps) {
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(quiz.timeLimitSeconds);

  // Countdown timer calculation
  useEffect(() => {
    if (revealData) return; // Freeze countdown once results are revealed

    const interval = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - quiz.startedAt) / 1000);
      const remaining = Math.max(0, quiz.timeLimitSeconds - elapsedSeconds);
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [quiz.startedAt, quiz.timeLimitSeconds, revealData]);

  // Option selection handler
  const handleSelectOption = (optId: string) => {
    if (submitted || secondsRemaining <= 0 || revealData) return;

    if (quiz.type === "MULTIPLE_CHOICE") {
      if (selectedOptionIds.includes(optId)) {
        setSelectedOptionIds(selectedOptionIds.filter((id) => id !== optId));
      } else {
        setSelectedOptionIds([...selectedOptionIds, optId]);
      }
    } else {
      setSelectedOptionIds([optId]);
    }
  };

  // Submit response
  const handleSubmit = async () => {
    if (selectedOptionIds.length === 0 || submitted) return;
    setSubmitting(true);

    const elapsed = Math.max(1, quiz.timeLimitSeconds - secondsRemaining);

    // 1. Instant Data Channel broadcast (< 50ms)
    onBroadcast({
      type: "QUIZ_ANSWER",
      payload: {
        questionId: quiz.id,
        userId,
        userName,
        selectedOptionIds,
        submittedAt: Date.now(),
        responseDurationSeconds: elapsed,
      },
    });

    setSubmitted(true);
    setSubmitting(false);

    // 2. Asynchronously sync to backend for institutional records
    try {
      await submitLiveSessionQuizResponse(sessionId, {
        questionId: quiz.id,
        selectedOptionIds,
        responseDurationSeconds: elapsed,
      });
    } catch (err) {
      console.warn("Could not log live quiz response to backend:", err);
    }
  };

  const timerPercent = Math.min(
    100,
    Math.max(0, (secondsRemaining / quiz.timeLimitSeconds) * 100),
  );

  const isTimeUp = secondsRemaining <= 0 && !submitted && !revealData;

  // Evaluation on reveal
  const isCorrect =
    revealData &&
    selectedOptionIds.length > 0 &&
    revealData.correctOptionIds.every((id) => selectedOptionIds.includes(id)) &&
    selectedOptionIds.every((id) => revealData.correctOptionIds.includes(id));

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-40 pointer-events-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="rounded-3xl border border-slate-700/90 bg-slate-900/95 backdrop-blur-xl p-5 md:p-6 text-slate-100 shadow-2xl relative overflow-hidden">
        {/* Countdown Header Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className={`h-full transition-all duration-500 ${
              secondsRemaining <= 5
                ? "bg-red-500 animate-pulse"
                : secondsRemaining <= 10
                ? "bg-amber-400"
                : "bg-indigo-500"
            }`}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3 pt-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-300">
              {quiz.trainerName ? `${quiz.trainerName} asks:` : "Live In-Session Question"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!revealData && (
              <span
                className={`flex items-center gap-1 text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                  secondsRemaining <= 5
                    ? "border-red-500/40 bg-red-500/20 text-red-300 animate-pulse"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                <Clock className="h-3 w-3" />
                {secondsRemaining}s
              </span>
            )}
            {revealData && (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg p-1 text-slate-400 hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-4">
          <h4 className="text-sm md:text-base font-bold text-white leading-snug">
            {quiz.titleEn}
          </h4>
          {quiz.titleAm && (
            <p className="mt-1 text-xs md:text-sm text-slate-300 font-amharic leading-relaxed">
              {quiz.titleAm}
            </p>
          )}
        </div>

        {/* Option Cards */}
        <div className="space-y-2 mb-4">
          {quiz.options.map((opt, idx) => {
            const isSelected = selectedOptionIds.includes(opt.id);
            const isRevealedOption = Boolean(revealData);
            const isThisCorrect = revealData?.correctOptionIds.includes(opt.id);
            const votes = revealData?.distribution[opt.id] ?? 0;
            const votePercent =
              revealData?.totalResponses && revealData.totalResponses > 0
                ? Math.round((votes / revealData.totalResponses) * 100)
                : 0;

            let borderClass = "border-slate-800 bg-slate-800/60 hover:border-slate-700";
            if (isSelected) {
              borderClass = "border-indigo-500 bg-indigo-950/40";
            }
            if (isRevealedOption) {
              if (isThisCorrect) {
                borderClass = "border-emerald-500 bg-emerald-950/40";
              } else if (isSelected && !isThisCorrect) {
                borderClass = "border-red-500/70 bg-red-950/30";
              }
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={submitted || secondsRemaining <= 0 || Boolean(revealData)}
                onClick={() => handleSelectOption(opt.id)}
                className={`w-full rounded-2xl border p-3 text-left transition relative overflow-hidden flex items-center justify-between gap-3 ${borderClass}`}
              >
                {/* Visual percentage fill background on reveal */}
                {isRevealedOption && (
                  <div
                    className={`absolute top-0 bottom-0 left-0 transition-all duration-700 opacity-20 pointer-events-none ${
                      isThisCorrect ? "bg-emerald-500" : "bg-slate-500"
                    }`}
                    style={{ width: `${votePercent}%` }}
                  />
                )}

                <div className="flex items-center gap-3 relative z-10 flex-1 min-w-0">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                      isSelected
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-semibold text-slate-100 truncate">
                      {opt.textEn}
                    </p>
                    {opt.textAm && (
                      <p className="text-[11px] text-slate-400 font-amharic truncate">
                        {opt.textAm}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Indicator */}
                <div className="relative z-10 shrink-0 flex items-center gap-2">
                  {isRevealedOption ? (
                    <span className="text-xs font-mono font-bold text-slate-300">
                      {votePercent}%
                    </span>
                  ) : null}

                  {isRevealedOption && isThisCorrect && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  {isRevealedOption && isSelected && !isThisCorrect && (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  {!isRevealedOption && isSelected && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-white">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Reveal Explanation Banner */}
        {revealData && (
          <div
            className={`rounded-2xl p-3.5 mb-4 text-xs space-y-1.5 border ${
              isCorrect
                ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                : "border-red-500/40 bg-red-950/30 text-red-200"
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {isCorrect ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Correct Answer! Great job.</span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-400" />
                  <span>
                    {selectedOptionIds.length === 0
                      ? "Time ran out before you answered."
                      : "Not quite. See the explanation below:"}
                  </span>
                </>
              )}
            </div>
            {revealData.explanationEn && (
              <p className="text-[11px] text-slate-300 leading-relaxed pl-6">
                {revealData.explanationEn}
              </p>
            )}
            {revealData.explanationAm && (
              <p className="text-[11px] text-slate-400 font-amharic leading-relaxed pl-6">
                {revealData.explanationAm}
              </p>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs text-slate-400">
            {submitted && !revealData ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Check className="h-3.5 w-3.5" />
                Response locked. Waiting for trainer to reveal…
              </span>
            ) : isTimeUp ? (
              <span className="text-amber-400 font-semibold">Time is up!</span>
            ) : !revealData ? (
              <span>Select an option and click Submit</span>
            ) : (
              <span className="text-slate-400 flex items-center gap-1">
                <BarChart2 className="h-3.5 w-3.5" />
                {revealData.totalResponses} total answers from audience
              </span>
            )}
          </div>

          <div>
            {!submitted && !revealData ? (
              <Button
                size="sm"
                disabled={selectedOptionIds.length === 0 || secondsRemaining <= 0 || submitting}
                onClick={handleSubmit}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {submitting ? "Submitting…" : "Submit Answer"}
              </Button>
            ) : revealData ? (
              <Button
                size="sm"
                variant="outline"
                onClick={onDismiss}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Dismiss
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

