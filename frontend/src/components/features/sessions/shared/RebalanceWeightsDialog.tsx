'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Scale } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { fetchSessionPlans } from '@/lib/api/session-plans';
import type { ApiSessionPlan } from '@/lib/api/types';
import { cn } from '@/lib/utils';

interface RebalanceWeightsDialogProps {
  open: boolean;
  courseId: string;
  /** The planned session being removed; its quiz weight must go to the other session quizzes. */
  sessionPlanId: string;
  sessionTitle: string;
  busy: boolean;
  onClose: () => void;
  onConfirm: (rebalance: Array<{ assessmentId: string; weight: number }>) => void;
}

/**
 * Removing a session after approval would leave the course grade below 100%, so its quiz
 * weight is handed to the remaining session quizzes first. Lesson, module and final weights
 * stay as approved.
 */
export function RebalanceWeightsDialog({ open, courseId, sessionPlanId, sessionTitle, busy, onClose, onConfirm }: RebalanceWeightsDialogProps) {
  const [plans, setPlans] = useState<ApiSessionPlan[] | null>(null);
  const [weights, setWeights] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!open) return;
    setPlans(null);
    fetchSessionPlans(courseId)
      .then((list) => {
        setPlans(list);
        setWeights(Object.fromEntries(list.flatMap((p) => p.quizzes.map((q) => [q.id, q.weight]))));
      })
      .catch(() => setPlans([]));
  }, [open, courseId]);

  const removed = plans?.find((p) => p.id === sessionPlanId);
  const others = useMemo(() => (plans ?? []).filter((p) => p.id !== sessionPlanId && p.quizzes.length > 0), [plans, sessionPlanId]);
  const released = removed?.quizzes.reduce((sum, q) => sum + q.weight, 0) ?? 0;
  const before = others.reduce((sum, p) => sum + p.quizzes.reduce((s, q) => s + q.weight, 0), 0);
  const after = others.reduce((sum, p) => sum + p.quizzes.reduce((s, q) => s + (weights[q.id] ?? 0), 0), 0);
  const unassigned = before + released - after;

  return (
    <Modal
      open={open}
      onClose={() => !busy && onClose()}
      title="Rebalance quiz weight"
      subtitle={`Removing "${sessionTitle}"`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy || !plans || unassigned !== 0 || others.length === 0}
            onClick={() => onConfirm(others.flatMap((p) => p.quizzes.map((q) => ({ assessmentId: q.id, weight: weights[q.id] ?? 0 }))))}
          >
            {busy ? 'Removing…' : 'Remove session'}
          </Button>
        </>
      }
    >
      {!plans ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading session quizzes…
        </div>
      ) : others.length === 0 ? (
        <p className="text-sm text-slate-600">
          This session&apos;s quizzes carry {released}% of the course grade and there is no other session quiz to take it over. Add a quiz to another
          session first, then remove this one.
        </p>
      ) : (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-slate-700">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
            Its quizzes carry <strong>{released}%</strong> of the course grade. Give that weight to the remaining session quizzes so the course still
            totals 100%.
          </p>
          <ul className="space-y-2">
            {others.flatMap((p) =>
              p.quizzes.map((q) => (
                <li key={q.id} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate text-sm">
                    <span className="text-slate-400">{p.titleEn} · </span>
                    {q.titleEn}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={weights[q.id] ?? 0}
                    onChange={(e) => setWeights((w) => ({ ...w, [q.id]: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) }))}
                    className="w-20 rounded-lg border border-slate-200 px-2 py-1 text-right text-sm"
                  />
                  <span className="text-xs text-slate-400">%</span>
                </li>
              )),
            )}
          </ul>
          <p className={cn('text-xs font-semibold', unassigned === 0 ? 'text-emerald-700' : 'text-amber-700')}>
            {unassigned === 0
              ? 'All weight assigned — the course still totals 100%.'
              : unassigned > 0
                ? `${unassigned}% still to assign.`
                : `${-unassigned}% too much — lower a quiz.`}
          </p>
        </div>
      )}
    </Modal>
  );
}
