'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchSessionPlans } from '@/lib/api/session-plans';
import { fetchCourseAssessments } from '@/lib/api/quiz';
import type { ApiAssessmentListing } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface RebalanceWeightsDialogProps {
  open: boolean;
  courseId: string;
  /** The planned session being removed; its quiz weight moves to the course's other assessments. */
  sessionPlanId: string;
  sessionTitle: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (rebalance: Array<{ assessmentId: string; weight: number }>) => void;
}

const TYPE_LABEL: Record<string, string> = {
  FINAL_ASSESSMENT: 'Final',
  MODULE_ASSESSMENT: 'Module',
  LESSON_ASSESSMENT: 'Lesson',
  SUB_LESSON_ASSESSMENT: 'Sub-lesson',
  SESSION_ASSESSMENT: 'Session quiz',
};

/**
 * Removing a planned session after approval would leave the course grade below 100%, so its
 * quiz weight moves to the course's other assessments. It starts out on the final assessment
 * (the heaviest one if there is no final); the trainer can split it differently.
 */
export function RebalanceWeightsDialog({ open, courseId, sessionPlanId, sessionTitle, busy, onClose, onConfirm }: RebalanceWeightsDialogProps) {
  const [remaining, setRemaining] = useState<ApiAssessmentListing[] | null>(null);
  const [released, setReleased] = useState(0);
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setRemaining(null);
    Promise.all([fetchSessionPlans(courseId), fetchCourseAssessments(courseId)])
      .then(([plans, assessments]) => {
        const removed = plans.find((p) => p.id === sessionPlanId);
        const removedIds = new Set(removed?.quizzes.map((q) => q.id) ?? []);
        const freed = removed?.quizzes.reduce((sum, q) => sum + q.weight, 0) ?? 0;
        const others = assessments.filter((a) => !removedIds.has(a.id));
        const target =
          others.find((a) => a.type === 'FINAL_ASSESSMENT') ??
          [...others].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
        setReleased(freed);
        setRemaining(others);
        setWeights(Object.fromEntries(others.map((a) => [a.id, (a.weight ?? 0) + (a.id === target?.id ? freed : 0)])));
      })
      .catch(() => setRemaining([]));
  }, [open, courseId, sessionPlanId]);

  const before = useMemo(() => (remaining ?? []).reduce((sum, a) => sum + (a.weight ?? 0), 0), [remaining]);
  const after = useMemo(() => (remaining ?? []).reduce((sum, a) => sum + (weights[a.id] ?? 0), 0), [remaining, weights]);
  const unassigned = before + released - after;
  const noTarget = released > 0 && remaining !== null && remaining.length === 0;

  const confirm = () =>
    onConfirm(
      (remaining ?? [])
        .filter((a) => (weights[a.id] ?? 0) !== (a.weight ?? 0))
        .map((a) => ({ assessmentId: a.id, weight: weights[a.id] ?? 0 })),
    );

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Remove session"
      subtitle={`Removing "${sessionTitle}"`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy || !remaining || unassigned !== 0 || noTarget} onClick={confirm}>
            {busy ? 'Removing…' : 'Remove session'}
          </Button>
        </>
      }
    >
      {!remaining ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading course assessments…
        </div>
      ) : released === 0 ? (
        <p className="text-sm text-slate-600">
          The planned session and its scheduled time are removed. It has no graded quiz, so the course grade is unchanged.
        </p>
      ) : noTarget ? (
        <p className="text-sm text-slate-600">
          This session&apos;s quizzes carry {released}% of the course grade and the course has no other assessment to take it over.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            <span>
              Its graded quiz carries <strong>{released}%</strong> of the course grade. That weight has been added to the final
              assessment so the course still totals 100%. Change the split below if you prefer.
            </span>
          </p>
          <ul className="space-y-2">
            {remaining.map((a) => {
              const changed = (weights[a.id] ?? 0) !== (a.weight ?? 0);
              return (
                <li
                  key={a.id}
                  className={cn('flex items-center gap-3 rounded-lg border px-3 py-2', changed ? 'border-indigo-200 bg-indigo-50/40' : 'border-slate-200')}
                >
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-slate-400">{TYPE_LABEL[a.type ?? ''] ?? 'Assessment'} · </span>
                    {a.titleEn}
                  </span>
                  <span className="text-xs text-slate-400">{a.weight ?? 0}% →</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[a.id] ?? 0}
                    onChange={(e) => setWeights((w) => ({ ...w, [a.id]: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                    aria-label={`New weight for ${a.titleEn}`}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </li>
              );
            })}
          </ul>
          <p className={cn('text-xs font-semibold', unassigned === 0 ? 'text-emerald-700' : 'text-amber-700')}>
            {unassigned === 0
              ? 'All weight assigned. The course still totals 100%.'
              : unassigned > 0
                ? `${unassigned}% still to assign.`
                : `${-unassigned}% too much. Lower an assessment.`}
          </p>
        </div>
      )}
    </Modal>
  );
}
