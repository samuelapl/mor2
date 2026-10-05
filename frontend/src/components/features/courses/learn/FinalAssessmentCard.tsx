'use client';

import { Award, BookOpenCheck, Lock } from 'lucide-react';
import type { ApiAttachedAssessment } from '@/lib/api/types';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface FinalAssessmentCardProps {
  finalAssessment: ApiAttachedAssessment;
  contentCompleted: boolean;
  certificateEligible: boolean;
  onOpenAssessment: () => void;
  onLockedClick: () => void;
}

export function FinalAssessmentCard({
  finalAssessment,
  contentCompleted,
  certificateEligible,
  onOpenAssessment,
  onLockedClick,
}: FinalAssessmentCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-6 shadow-sm flex flex-wrap items-center justify-between gap-4 transition-all',
        contentCompleted ? 'border-indigo-300 bg-gradient-to-br from-indigo-50/60 to-violet-50/60' : 'border-slate-200 bg-slate-50/70 opacity-80',
      )}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <BookOpenCheck className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">Comprehensive Final Assessment</h3>
          {finalAssessment.passed ? (
            <Badge variant="green" dot>
              Passed
            </Badge>
          ) : contentCompleted ? (
            <Badge variant="blue">Unlocked · Passing Score: {finalAssessment.passingScore}%</Badge>
          ) : (
            <Badge variant="slate">
              <Lock className="h-3 w-3 mr-1" />
              Locked (Complete all lessons first)
            </Badge>
          )}
        </div>
        <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
          {finalAssessment.passed
            ? 'Congratulations! You have passed the final assessment and unlocked your certification.'
            : contentCompleted
              ? `You have completed all curriculum content. Score at least ${finalAssessment.passingScore}% to earn your official certificate of completion.`
              : 'Complete every lesson, topic, and module requirement across the entire course to qualify for this final evaluation.'}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {finalAssessment.passed ? (
          <Button size="sm" variant="outline" onClick={onOpenAssessment}>
            <Award className="h-4 w-4 mr-1 text-emerald-600" />
            Review / Retake
          </Button>
        ) : contentCompleted ? (
          <Button size="sm" variant="primary" onClick={onOpenAssessment} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-sm">
            <BookOpenCheck className="h-4 w-4 mr-1" />
            Start Final Assessment →
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={onLockedClick}
            className="border-slate-300 text-slate-500 hover:border-amber-300 hover:text-amber-800 hover:bg-amber-50"
            title="Click to check completion requirements"
          >
            <Lock className="h-3.5 w-3.5 mr-1" />
            Final Assessment Locked
          </Button>
        )}
      </div>
    </div>
  );
}
