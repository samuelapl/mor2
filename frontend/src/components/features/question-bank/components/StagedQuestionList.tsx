'use client';

import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StagedQuestion } from '../types';
import { stripHtml } from '../utils';
import { cardClass, iconButtonClass, sectionTitleClass } from '../styles';

interface StagedQuestionListProps {
  questions: StagedQuestion[];
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
  onClear: () => void;
}

/** Questions queued in the editor, saved together with "Save to Bank". */
export function StagedQuestionList({ questions, onEdit, onRemove, onClear }: StagedQuestionListProps) {
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
        <button type="button" onClick={onClear} className="shrink-0 whitespace-nowrap text-xs font-medium text-slate-400 transition hover:text-rose-600">
          Clear all
        </button>
      </div>

      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {questions.map((sq, sIdx) => (
          <div
            key={sq.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3 text-xs transition hover:border-indigo-200 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200 dark:bg-slate-900 dark:text-indigo-400 dark:ring-indigo-800">
                {sIdx + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800 dark:text-slate-200">{stripHtml(sq.question)}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="font-medium capitalize text-indigo-600 dark:text-indigo-400">
                    {sq.type.toLowerCase().replace(/_/g, ' ')}
                  </span>
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
        ))}
      </div>
    </section>
  );
}
