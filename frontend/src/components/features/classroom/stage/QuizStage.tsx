'use client';

import {
  Award,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Clock,
  HelpCircle,
  Lock,
  LockOpen,
  RotateCcw,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import type { ApiAttachedAssessment } from '@/lib/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface QuizStageProps {
  assessment: ApiAttachedAssessment | null;
  quizKind?: 'LESSON_ASSESSMENT' | 'MODULE_ASSESSMENT' | 'FINAL_ASSESSMENT';
  courseTitle: string;
  unlocked: boolean;
  isInPersonLocked?: boolean;
  onStartQuiz: () => void;
  onNavigateNext?: () => void;
}

export function QuizStage({
  assessment,
  quizKind,
  courseTitle,
  unlocked,
  isInPersonLocked,
  onStartQuiz,
  onNavigateNext,
}: QuizStageProps) {
  if (!assessment) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center text-subtle-foreground">
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

  if (isInPersonLocked) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-border pb-4 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="amber" className="text-xs">
              In-Person Evaluation
            </Badge>
            <span className="text-xs font-semibold text-warning bg-warning-soft px-2 py-0.5 rounded-full border border-warning/30">
              Administered at Training Venue
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{assessment.titleEn}</h2>
          <p className="text-sm text-muted-foreground">{courseTitle}</p>
        </div>

        {/* Main Box */}
        <div className="rounded-2xl border border-warning/30 bg-gradient-to-b from-warning-soft/60 to-card p-8 space-y-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-warning/30 bg-warning-soft text-warning shadow-sm">
              <Building2 className="h-8 w-8" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-foreground">In-Person Classroom Evaluation</h3>
              <p className="text-xs text-secondary-foreground mt-1 leading-relaxed">
                This course requires in-person attendance and practical evaluation. The final
                assessment is administered directly in the classroom by your assigned trainer.
                Digital submission is disabled for physical practicum courses.
              </p>
            </div>
          </div>

          {/* 3-Stat Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                Passing Score
              </p>
              <p className="text-base font-bold text-foreground mt-1">{assessment.passingScore}%</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                Evaluation Format
              </p>
              <p className="text-base font-bold text-warning mt-1">In-Person Exam</p>
            </div>

            <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
                Status
              </p>
              <p className="text-base font-bold text-warning mt-1 flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-warning shrink-0" />
                Trainer Administered
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              type="button"
              size="md"
              disabled
              className="w-full sm:w-auto font-semibold shadow-sm bg-secondary text-subtle-foreground border border-border cursor-not-allowed"
            >
              <Building2 className="h-4 w-4 mr-2" /> Conducted In-Person by Trainer
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-border pb-4 space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={isPassed ? 'green' : isFinal ? 'blue' : 'indigo'} className="text-xs">
            {badgeText}
          </Badge>
          {isPassed ? (
            <span className="flex items-center gap-1 text-xs font-semibold text-success bg-success-soft px-2 py-0.5 rounded-full border border-success/30">
              <CheckCircle2 className="h-3 w-3" /> Passed
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              Passing requirement: {assessment.passingScore}%
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{assessment.titleEn}</h2>
        <p className="text-sm text-muted-foreground">{courseTitle}</p>
      </div>

      {/* Main Checkpoint Box */}
      <div
        className={`rounded-2xl border p-8 space-y-6 shadow-sm transition ${
          isPassed
            ? 'border-success/30 bg-success-soft/40'
            : unlocked
              ? 'border-primary/30 bg-gradient-to-b from-primary-soft/60 to-card'
              : 'border-border bg-muted opacity-75'
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
              isPassed
                ? 'border-success/30 bg-success-soft text-success shadow-sm'
                : unlocked
                  ? 'border-primary/30 bg-primary-soft text-primary shadow-sm'
                  : 'border-input bg-border text-subtle-foreground'
            }`}
          >
            {isPassed ? (
              <Award className="h-8 w-8" />
            ) : unlocked ? (
              isFinal ? (
                <GraduationCap className="h-8 w-8 text-primary" />
              ) : (
                <BookOpenCheck className="h-8 w-8 text-primary" />
              )
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg font-bold text-foreground">
              {isPassed
                ? 'Assessment Passed!'
                : unlocked
                  ? 'Ready to Begin Assessment'
                  : 'Assessment Locked'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPassed
                ? `You passed this assessment. You can review your questions or retake to practice further.`
                : unlocked
                  ? `Test your knowledge with multiple choice and scenario questions to demonstrate your mastery.`
                  : isFinal
                  ? `Complete preceding lessons, pass module assessments, and attend all scheduled live sessions to unlock this final assessment.`
                  : `Complete preceding lessons and required study time to unlock this assessment.`}
            </p>
          </div>
        </div>

        {/* 3-Stat Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
              Passing Score
            </p>
            <p className="text-base font-bold text-foreground mt-1">{assessment.passingScore}%</p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">Result</p>
            <p
              className={`text-base font-bold mt-1 flex items-center gap-1.5 ${
                isPassed ? 'text-success' : 'text-muted-foreground'
              }`}
            >
              {isPassed ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Passed
                </>
              ) : (
                'Incomplete'
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">Status</p>
            <div className="text-base font-bold text-foreground mt-1">
              {isPassed ? (
                <span className="text-success flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  Passed
                </span>
              ) : unlocked ? (
                <span className="text-primary flex items-center gap-1.5">
                  <LockOpen className="h-4 w-4 text-primary shrink-0" />
                  Unlocked
                </span>
              ) : (
                <span className="text-subtle-foreground flex items-center gap-1.5">
                  <Lock className="h-4 w-4 shrink-0" />
                  Locked
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          {isPassed && onNavigateNext && (
            <Button
              type="button"
              size="md"
              onClick={onNavigateNext}
              className="w-full sm:w-auto font-bold shadow-md bg-emerald-600 text-white hover:bg-emerald-700 px-6 gap-2"
            >
              <span>Continue to Next Topic</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          <Button
            type="button"
            size="md"
            disabled={!unlocked}
            onClick={onStartQuiz}
            className={`w-full sm:w-auto font-semibold shadow-sm ${
              isPassed
                ? 'bg-secondary text-secondary-foreground hover:bg-input/60 border border-input'
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
