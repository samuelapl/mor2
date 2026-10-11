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
  EXACT: 'bg-danger-soft text-danger',
  LIKELY: 'bg-warning-soft text-warning',
  SIMILAR: 'bg-secondary text-secondary-foreground',
};

/** One line per matching bank question: severity, prompt and where it lives. */
export function DuplicateMatchList({ matches }: { matches: SimilarQuestionMatch[] }) {
  return (
    <ul className="space-y-1.5">
      {matches.map((m) => (
        <li key={m.id} className="rounded-lg border border-border/80 bg-card/70 px-3 py-2">
          <div className="flex items-start gap-2">
            <span className={cn('mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', SEVERITY_CHIP[m.severity])}>
              {SEVERITY_LABEL[m.severity]}
              {m.severity !== 'EXACT' && ` · ${Math.round(m.score * 100)}%`}
            </span>
            <p className="line-clamp-2 min-w-0 text-xs font-medium text-foreground">{stripHtml(m.question)}</p>
          </div>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">{describeMatchLocation(m)}</p>
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
      <p className="flex items-center gap-1.5 text-[11px] text-subtle-foreground">
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
          ? 'border-danger/30 bg-danger-soft/70'
          : 'border-warning/30 bg-warning-soft/70',
      )}
    >
      <div className="flex items-start gap-2">
        {exact ? (
          <CopyX className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        ) : (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        )}
        <div>
          <p className={cn('text-xs font-semibold', exact ? 'text-danger' : 'text-warning')}>
            {exact ? 'This question is already in the bank' : 'Similar questions are already in the bank'}
          </p>
          <p className="mt-0.5 text-[11px] text-secondary-foreground">
            {exact
              ? 'Edit the existing question instead of adding a copy.'
              : 'Checked across the course, its modules, lessons and sub-lessons, and reusable questions.'}
          </p>
        </div>
        {checking && <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-subtle-foreground" />}
      </div>

      <DuplicateMatchList matches={matches} />

      {!exact && (
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-warning">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => onAcknowledgedChange(e.target.checked)}
            className="h-4 w-4 rounded border-warning/30 text-warning focus:ring-warning"
          />
          This is a different question — save anyway
        </label>
      )}
    </div>
  );
}
