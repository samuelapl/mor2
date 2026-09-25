'use client';

import {
  Award,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import type { ApiAttachedAssessment } from '@/lib/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface QuizStageProps {
  assessment: ApiAttachedAssessment | null;
  quizKind?: 'LESSON_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'FINAL_ASSESSMENT';
  courseTitle: string;
  unlocked: boolean;
  onStartQuiz: () => void;
}

export function QuizStage({
  assessment,
  quizKind,
  courseTitle,
  unlocked,
  onStartQuiz,
}: QuizStageProps) {
  if (!assessment) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-slate-400">
        Assessment information not found.
      </div>
    );
  }

  const isPassed = assessment.passed;
  const isFinal = quizKind === 'FINAL_ASSESSMENT';
  const isModule = quizKind === 'MODULE_ASSESSMENT';

  const badgeText = isFinal
    ? 'Final Certification Exam'
    : isModule
      ? 'Module Checkpoint Assessment'
      : 'Lesson Assessment';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={isPassed ? 'green' : isFinal ? 'blue' : 'indigo'} className="text-xs">
            {badgeText}
          </Badge>
          {isPassed ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              <CheckCircle2 className="h-3 w-3" /> Passed
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              Passing requirement: {assessment.passingScore}%
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">{assessment.titleEn}</h2>
        <p className="text-sm text-slate-500">{courseTitle}</p>
      </div>

      {/* Main Checkpoint Box */}
      <div
        className={`rounded-2xl border p-8 space-y-6 shadow-sm transition ${
          isPassed
            ? 'border-emerald-200 bg-emerald-50/40'
            : unlocked
              ? 'border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white'
              : 'border-slate-200 bg-slate-50 opacity-75'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
              isPassed
                ? 'border-emerald-300 bg-emerald-100 text-emerald-700 shadow-sm'
                : unlocked
                  ? 'border-indigo-300 bg-indigo-100 text-indigo-700 shadow-sm'
                  : 'border-slate-300 bg-slate-200 text-slate-400'
            }`}
          >
            {isPassed ? (
              <Award className="h-8 w-8" />
            ) : unlocked ? (
              isFinal ? (
                <GraduationCap className="h-8 w-8 text-indigo-600" />
              ) : (
                <BookOpenCheck className="h-8 w-8" />
              )
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {isPassed
                ? 'Assessment Passed!'
                : unlocked
                  ? 'Ready to Begin Assessment'
                  : 'Assessment Locked'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isPassed
                ? `You passed this assessment. You can review your questions or retake to practice further.`
                : unlocked
                  ? `Test your knowledge with multiple choice and scenario questions to demonstrate your mastery.`
                  : `Complete preceding lessons and required study time to unlock this assessment.`}
            </p>
          </div>
        </div>

        {/* 3-Stat Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Passing Score
            </p>
            <p className="text-base font-bold text-slate-900 mt-1">{assessment.passingScore}%</p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Result</p>
            <p
              className={`text-base font-bold mt-1 ${
                isPassed ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {isPassed ? 'Passed ✅' : 'Incomplete'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Status</p>
            <p className="text-base font-bold text-slate-900 mt-1">
              {isPassed ? (
                <span className="text-emerald-600">Passed</span>
              ) : unlocked ? (
                <span className="text-indigo-600">Unlocked 🚀</span>
              ) : (
                <span className="text-slate-400">Locked 🔒</span>
              )}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="button"
            size="md"
            disabled={!unlocked}
            onClick={onStartQuiz}
            className={`w-full sm:w-auto font-semibold shadow-sm ${
              isPassed
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isPassed ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2" /> Review or Retake Assessment
              </>
            ) : unlocked ? (
              <>
                <BookOpenCheck className="h-4 w-4 mr-2" /> Start Assessment Now →
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" /> Assessment Locked
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
