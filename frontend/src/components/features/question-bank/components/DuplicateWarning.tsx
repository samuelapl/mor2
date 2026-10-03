'use client';

import { AlertTriangle, CopyX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DuplicateSeverity, SimilarQuestionMatch } from '@/lib/api/quiz';
import { describeMatchLocation, stripHtml } from '../utils';

const SEVERITY_LABEL: Record<DuplicateSeverity, string> = {
  EXACT: 'Identical',
  LIKELY: 'Likely duplicate',
  SIMILAR: 'Similar',
};

const SEVERITY_CHIP: Record<DuplicateSeverity, string> = {
  EXACT: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  LIKELY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  SIMILAR: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

/** One line per matching bank question: severity, prompt and where it lives. */
export function DuplicateMatchList({ matches }: { matches: SimilarQuestionMatch[] }) {
  return (
    <ul className="space-y-1.5">
      {matches.map((m) => (
        <li key={m.id} className="rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/60">
          <div className="flex items-start gap-2">
            <span className={cn('mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', SEVERITY_CHIP[m.severity])}>
              {SEVERITY_LABEL[m.severity]}
              {m.severity !== 'EXACT' && ` · ${Math.round(m.score * 100)}%`}
            </span>
            <p className="line-clamp-2 min-w-0 text-xs font-medium text-slate-800 dark:text-slate-200">{stripHtml(m.question)}</p>
          </div>
          <p className="mt-1 truncate text-[11px] text-slate-500 dark:text-slate-400">{describeMatchLocation(m)}</p>
        </li>
      ))}
    </ul>
  );
}

interface DuplicateWarningProps {
  matches: SimilarQuestionMatch[];
  checking: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
}

/**
 * Bank questions (any level of this course, or reusable) that match the
 * question being composed. Identical ones block saving; similar ones need the
 * author to confirm the question is different.
 */
export function DuplicateWarning({ matches, checking, acknowledged, onAcknowledgedChange }: DuplicateWarningProps) {
  if (matches.length === 0) {
    return checking ? (
      <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking the bank for similar questions…
      </p>
    ) : null;
  }

  const exact = matches.some((m) => m.severity === 'EXACT');

  return (
    <div
      role="status"
      className={cn(
        'space-y-2.5 rounded-xl border p-3.5',
        exact
          ? 'border-rose-200 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-900/20'
          : 'border-amber-200 bg-amber-50/70 dark:border-amber-800 dark:bg-amber-900/20',
      )}
    >
      <div className="flex items-start gap-2">
        {exact ? (
          <CopyX className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        )}
        <div>
          <p className={cn('text-xs font-semibold', exact ? 'text-rose-800 dark:text-rose-300' : 'text-amber-900 dark:text-amber-200')}>
            {exact ? 'This question is already in the bank' : 'Similar questions are already in the bank'}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-600 dark:text-slate-400">
            {exact
              ? 'Edit the existing question instead of adding a copy.'
              : 'Checked across the course, its modules, lessons and sub-lessons, and reusable questions.'}
          </p>
        </div>
        {checking && <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-slate-400" />}
      </div>

      <DuplicateMatchList matches={matches} />

      {!exact && (
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-amber-900 dark:text-amber-200">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
          />
          This is a different question — save anyway
        </label>
      )}
    </div>
  );
}
