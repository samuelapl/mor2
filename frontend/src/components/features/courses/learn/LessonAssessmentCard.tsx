'use client';

import { BookOpenCheck, Lock } from 'lucide-react';
import type { ApiAttachedAssessment } from '@/lib/api/types';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { formatMMSS } from './LessonTimeIndicator';

interface LessonAssessmentCardProps {
  assessment: ApiAttachedAssessment;
  isPassed: boolean;
  isQuizUnlocked: boolean;
  allSubsDone: boolean;
  subLessonsCount: number;
  timeSatisfied: boolean;
  required: number;
  spent: number;
  onTakeQuiz: () => void;
}

export function LessonAssessmentCard({
  assessment,
  isPassed,
  isQuizUnlocked,
  allSubsDone,
  subLessonsCount,
  timeSatisfied,
  required,
  spent,
  onTakeQuiz,
}: LessonAssessmentCardProps) {
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
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs',
              isPassed
                ? 'border-emerald-300 bg-emerald-600 text-white'
                : isQuizUnlocked
                  ? 'border-indigo-300 bg-indigo-600 text-white'
                  : 'border-slate-300 bg-slate-200 text-slate-500',
            )}
          >
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  isPassed
                    ? 'text-emerald-800'
                    : isQuizUnlocked
                      ? 'text-indigo-800'
                      : 'text-slate-500',
                )}
              >
                {isPassed
                  ? 'Quiz Passed'
                  : isQuizUnlocked
                    ? 'Lesson Checkpoint Ready'
                    : 'Checkpoint Locked'}
              </span>
              <span className="text-[11px] text-slate-600 font-medium">
                Passing Score: <strong className="text-slate-900">{assessment.passingScore}%</strong>
              </span>
            </div>
            <h4
              className={cn(
                'text-sm font-bold',
                isQuizUnlocked || isPassed ? 'text-slate-900' : 'text-slate-600',
              )}
            >
              {assessment.titleEn || 'Lesson Assessment'}
            </h4>
            <p className="text-xs text-slate-600">
              {isPassed
                ? 'You have completed this lesson quiz requirement.'
                : isQuizUnlocked
                  ? 'All topics completed! Pass this quiz to complete the lesson and unlock the next lesson.'
                  : !allSubsDone
                    ? `Complete all ${subLessonsCount} sub-lesson topics above to unlock this quiz.`
                    : `Spend ${formatMMSS(Math.max(0, required - spent))} more on this lesson to unlock this quiz.`}
            </p>
          </div>
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          {isPassed ? (
            <Button
              size="sm"
              variant="outline"
              onClick={onTakeQuiz}
              className="w-full sm:w-auto font-semibold gap-1.5 shadow-2xs border-emerald-300 text-emerald-800 hover:bg-emerald-100/70"
            >
              <BookOpenCheck className="h-4 w-4" />
              <span>Review / Retake Quiz</span>
            </Button>
          ) : isQuizUnlocked ? (
            <Button
              size="sm"
              variant="primary"
              onClick={onTakeQuiz}
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
}

