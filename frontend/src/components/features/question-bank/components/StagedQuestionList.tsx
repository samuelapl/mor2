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
          className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400 transition hover:text-rose-600"
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
                  'flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition hover:border-indigo-200',
                  issue?.reason === 'EXACT'
                    ? 'border-rose-300 bg-rose-50/60 dark:border-rose-800 dark:bg-rose-900/20'
                    : issue
                      ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20'
                      : 'border-slate-200/90 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-slate-900 dark:text-indigo-400 dark:ring-indigo-800">
                    {sIdx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{stripHtml(sq.question)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-medium capitalize text-indigo-600 dark:text-indigo-400">{sq.type.toLowerCase().replace(/_/g, ' ')}</span>
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
                    className={cn(iconButtonClass, 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30')}
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
    <div className="ml-3 space-y-2 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
      <p className={cn('text-[11px] font-semibold', exact ? 'text-rose-700 dark:text-rose-400' : 'text-amber-800 dark:text-amber-300')}>
        {exact ? 'Already in the bank or queued twice. Edit or remove it.' : 'Similar to questions below.'}
      </p>
      {issue.matches.length > 0 && <DuplicateMatchList matches={issue.matches} />}
      {issue.queuedMatches.map((q, i) => (
        <p key={i} className="truncate text-[11px] text-slate-600 dark:text-slate-400">
          Queued: {stripHtml(q.question)}
        </p>
      ))}
      {!exact && (
        <button
          type="button"
          onClick={onKeepAnyway}
          className="text-[11px] font-semibold text-amber-800 underline-offset-2 hover:underline dark:text-amber-300"
        >
          Keep anyway — it is a different question
        </button>
      )}
    </div>
  );
}
