'use client';

import { Bookmark, Check, Copy, Edit2, FileText, Folder, Globe, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { RichContent } from '@/components/ui/RichContent';
import { cn } from '@/lib/utils';
import type { BankQuestion } from '../types';
import { answerChipClass, iconButtonClass } from '../styles';

interface QuestionCardProps {
  question: BankQuestion;
  number: number;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function QuestionCard({
  question: q,
  number,
  onDuplicate,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft ring-super-soft transition-all duration-150 hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-900 dark:hover:border-slate-700">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 font-mono text-xs font-bold text-slate-400">#{number}</span>
              <Badge variant={q.type === 'MULTIPLE_CHOICE' ? 'blue' : q.type === 'TRUE_FALSE' ? 'green' : 'amber'}>
                {q.type.replace('_', ' ')}
              </Badge>
              {!q.courseId ? (
                <Badge variant="indigo" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Reusable Global
                </Badge>
              ) : q.subLesson ? (
                <Badge variant="outline" className="max-w-[260px] gap-1">
                  <Bookmark className="h-3 w-3 shrink-0" />
                  <span className="truncate">Sub-lesson: {q.subLesson.titleEn}</span>
                </Badge>
              ) : q.lesson ? (
                <Badge variant="outline" className="max-w-[260px] gap-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">Lesson: {q.lesson.titleEn}</span>
                </Badge>
              ) : q.module ? (
                <Badge variant="outline" className="max-w-[260px] gap-1">
                  <Folder className="h-3 w-3 shrink-0" />
                  <span className="truncate">Module: {q.module.titleEn}</span>
                </Badge>
              ) : (
                <Badge variant="slate">Course General</Badge>
              )}
              {q.category && <span className="text-xs text-slate-400">· {q.category}</span>}
            </div>

            <div className="flex items-center gap-0.5 opacity-100 transition sm:opacity-60 sm:group-hover:opacity-100">
              <button
                type="button"
                onClick={onDuplicate}
                title="Duplicate Question"
                aria-label="Duplicate Question"
                className={iconButtonClass}
              >
                <Copy className="h-4 w-4" />
              </button>
              <button type="button" onClick={onEdit} title="Edit Question" aria-label="Edit Question" className={iconButtonClass}>
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                title="Delete Question"
                aria-label="Delete Question"
                className={cn(iconButtonClass, 'hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          <RichContent
            html={q.question}
            placeholder="No question prompt"
            className="mt-2.5 text-sm font-semibold leading-relaxed text-slate-900 dark:text-white"
          />

          {q.type === 'MULTIPLE_CHOICE' && q.options.length > 0 && (
            <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {q.options.map((opt, optIdx) => {
                const isCorrect = q.correctAnswer === optIdx;
                return (
                  <div key={optIdx} className={answerChipClass(isCorrect)}>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                        isCorrect
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700',
                      )}
                    >
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span className="truncate">{opt}</span>
                    {isCorrect && <Check className="ml-auto h-3.5 w-3.5 shrink-0 text-emerald-600" />}
                  </div>
                );
              })}
            </div>
          )}

          {q.type === 'TRUE_FALSE' && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {['True', 'False'].map((label, optIdx) => {
                const isCorrect = q.correctAnswer === optIdx;
                return (
                  <span key={label} className={cn(answerChipClass(isCorrect), 'pr-3')}>
                    {label}
                    {isCorrect && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                  </span>
                );
              })}
            </div>
          )}

          {q.type === 'SHORT_ANSWER' && (
            <div className="mt-3 text-xs">
              {q.correctAnswer ? (
                <span className={cn(answerChipClass(true), 'inline-flex')}>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  Accepted: &quot;{q.correctAnswer}&quot;
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                  Open-ended / Manually graded (no fixed answer)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
