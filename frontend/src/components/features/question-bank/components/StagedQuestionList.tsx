'use client';

import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StagedDuplicateIssue, StagedQuestion } from '../types';
import { stripHtml } from '../utils';
import { cardClass, iconButtonClass, sectionTitleClass } from '../styles';
import { DuplicateMatchList } from './DuplicateWarning';

interface StagedQuestionListProps {
  questions: StagedQuestion[];
  /** Duplicate problems the server reported on the last save, by staged id. */
  issues: Record<string, StagedDuplicateIssue>;
  onKeepAnyway: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

/** Questions queued in the editor, saved together with "Save to Bank". */
export function StagedQuestionList({ questions, issues, onKeepAnyway, onEdit, onRemove, onClear }: StagedQuestionListProps) {
  if (questions.length === 0) return null;

  return (
    <section className={cn(cardClass, 'space-y-3 p-5')}>
      <div className="flex items-center justify-between">
        <h3 className={sectionTitleClass}>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1.5 text-[11px] font-bold text-white">
            {questions.length}
          </span>
          Queued — ready to save
        </h3>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 whitespace-nowrap text-xs font-medium text-subtle-foreground transition hover:text-danger"
        >
          Clear all
        </button>
      </div>

      <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
        {questions.map((sq, sIdx) => {
          const issue = issues[sq.id];
          return (
            <div key={sq.id} className="space-y-2">
              <div
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition hover:border-primary/30',
                  issue?.reason === 'EXACT'
                    ? 'border-danger/30 bg-danger-soft/60'
                    : issue
                      ? 'border-warning/30 bg-warning-soft/60'
                      : 'border-border/90 bg-muted/50',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-card text-[10px] font-bold text-primary ring-1 ring-ring/20">
                    {sIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{stripHtml(sq.question)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-medium capitalize text-primary">{sq.type.toLowerCase().replace(/_/g, ' ')}</span>
                      {sq.options.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{sq.options.length} options</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => onEdit(sIdx)}
                    className={iconButtonClass}
                    title="Edit this question"
                    aria-label="Edit this question"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(sIdx)}
                    className={cn(iconButtonClass, 'hover:bg-danger-soft hover:text-danger')}
                    title="Remove question"
                    aria-label="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {issue && <StagedIssueDetails issue={issue} onKeepAnyway={() => onKeepAnyway(sIdx)} />}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Why the server refused a queued question, and the way forward. */
function StagedIssueDetails({ issue, onKeepAnyway }: { issue: StagedDuplicateIssue; onKeepAnyway: () => void }) {
  const exact = issue.reason === 'EXACT';
  return (
    <div className="ml-3 space-y-2 border-l-2 border-border pl-3">
      <p className={cn('text-[11px] font-semibold', exact ? 'text-danger' : 'text-warning')}>
        {exact ? 'Already in the bank or queued twice. Edit or remove it.' : 'Similar to questions below.'}
      </p>
      {issue.matches.length > 0 && <DuplicateMatchList matches={issue.matches} />}
      {issue.queuedMatches.map((q, i) => (
        <p key={i} className="truncate text-[11px] text-secondary-foreground">
          Queued: {stripHtml(q.question)}
        </p>
      ))}
      {!exact && (
        <button
          type="button"
          onClick={onKeepAnyway}
          className="text-[11px] font-semibold text-warning underline-offset-2 hover:underline"
        >
          Keep anyway — it is a different question
        </button>
      )}
    </div>
  );
}
