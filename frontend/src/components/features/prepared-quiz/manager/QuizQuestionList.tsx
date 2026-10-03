'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, HelpCircle, Scale, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichContent } from '@/components/ui/RichContent';
import type { PreparedQuizGroup, PreparedQuizQuestionItem } from '@/lib/api/prepared-quiz';
import { pointsStatus, QUESTION_TYPE_LABEL, splitEvenly, totalPoints } from '../quiz-points';

interface QuizQuestionListProps {
  quiz: PreparedQuizGroup;
  busy: boolean;
  onSetPoints: (points: { questionId: string; points: number }[]) => Promise<void>;
  onRemove: (questionId: string) => void;
}

/** The questions in the selected quiz group, with per-question points and the points total. */
export function QuizQuestionList({ quiz, busy, onSetPoints, onRemove }: QuizQuestionListProps) {
  const status = pointsStatus(quiz);
  const weight = quiz.assessment?.weight ?? null;
  const total = totalPoints(quiz);

  const splitEvenlyNow = () => {
    if (weight === null) return;
    const split = splitEvenly(weight, quiz.questions.length);
    void onSetPoints(quiz.questions.map((item, i) => ({ questionId: item.questionId, points: split[i] })));
  };

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white shadow-2xs lg:sticky lg:top-4">
      <header className="space-y-3 border-b border-slate-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-slate-900">{quiz.title}</h3>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-slate-500">
              <span>
                {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {quiz.timeLimitMinutes} min
              </span>
            </p>
          </div>
          <span className="shrink-0 text-right">
            <span className="block text-lg font-extrabold leading-none text-slate-900">
              {total}
              {weight !== null && <span className="text-sm font-bold text-slate-400"> / {weight}</span>}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">points</span>
          </span>
        </div>

        {weight !== null && quiz.questions.length > 0 && (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full transition-all', status.kind === 'ready' ? 'bg-emerald-500' : 'bg-amber-400')}
                style={{ width: `${Math.min(100, (total / Math.max(1, weight)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              {status.kind === 'ready' ? (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Points match the quiz weight
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Assign {weight - total} more {weight - total === 1 ? 'point' : 'points'}
                </p>
              )}
              <button
                type="button"
                onClick={splitEvenlyNow}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:opacity-50"
              >
                <Scale className="h-3.5 w-3.5" />
                Split evenly
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="max-h-[560px] min-h-[240px] flex-1 space-y-2 overflow-y-auto p-4">
        {quiz.questions.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <HelpCircle className="h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-600">No questions yet</p>
            <p className="max-w-[240px] text-xs text-slate-400">
              Select questions in the bank, or pick some at random, then add them here.
            </p>
          </div>
        ) : (
          quiz.questions.map((item, index) => (
            <QuizQuestionRow
              key={item.id}
              item={item}
              index={index}
              busy={busy}
              maxPoints={weight === null ? 100 : weight - (total - item.points)}
              onSetPoints={(points) => onSetPoints([{ questionId: item.questionId, points }])}
              onRemove={() => onRemove(item.questionId)}
            />
          ))
        )}
      </div>
    </section>
  );
}

interface QuizQuestionRowProps {
  item: PreparedQuizQuestionItem;
  index: number;
  busy: boolean;
  /** Most points this question can have without the quiz going over its weight. */
  maxPoints: number;
  onSetPoints: (points: number) => Promise<void>;
  onRemove: () => void;
}

function QuizQuestionRow({ item, index, busy, maxPoints, onSetPoints, onRemove }: QuizQuestionRowProps) {
  const [draft, setDraft] = useState(String(item.points));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(String(item.points));
  }, [item.points]);

  const commit = async () => {
    const points = Number(draft);
    if (!Number.isInteger(points) || points < 0) {
      setError('Use a whole number of 0 or more');
      setDraft(String(item.points));
      return;
    }
    if (points > maxPoints) {
      setError(`At most ${maxPoints} here, or the quiz goes over its weight`);
      setDraft(String(item.points));
      return;
    }
    setError(null);
    if (points === item.points) return;
    try {
      await onSetPoints(points);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save points');
      setDraft(String(item.points));
    }
  };

  return (
    <div className="group rounded-xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-700 ring-1 ring-indigo-100">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {QUESTION_TYPE_LABEL[item.question.type] ?? item.question.type}
          </span>
          <div className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
            <RichContent html={item.question.question} inline inheritText />
          </div>
        </div>
        <label className="flex shrink-0 flex-col items-center">
          <input
            type="number"
            min={0}
            max={Math.max(0, maxPoints)}
            value={draft}
            disabled={busy}
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
            }}
            onBlur={() => void commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            aria-label={`Points for question ${index + 1}`}
            className={cn(
              'h-9 w-14 rounded-lg border bg-slate-50 text-center text-sm font-bold text-slate-900 outline-none [color-scheme:light] focus:bg-white focus:ring-4',
              error ? 'border-rose-300 focus:ring-rose-500/10' : 'border-slate-200 focus:border-indigo-400 focus:ring-indigo-500/10',
            )}
          />
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">pts</span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label="Remove from quiz"
          className="mt-1.5 rounded-lg p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mt-2 pl-9 text-[11px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}
