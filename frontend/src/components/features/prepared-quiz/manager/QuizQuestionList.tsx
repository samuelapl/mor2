'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, HelpCircle, Scale, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichContent } from '@/components/ui/RichContent';
import type { PreparedQuizGroup, PreparedQuizQuestionItem } from '@/lib/api/prepared-quiz';
import { QUESTION_TYPE_LABEL, splitEvenly, totalPoints } from '../quiz-points';

interface QuizQuestionListProps {
  quiz: PreparedQuizGroup;
  busy: boolean;
  onSetPoints: (points: { questionId: string; points: number }[]) => Promise<void>;
  onRemove: (questionId: string) => void;
}

/** The questions in the selected quiz group, with per-question points and the points total. */
export function QuizQuestionList({ quiz, busy, onSetPoints, onRemove }: QuizQuestionListProps) {
  const total = totalPoints(quiz);
  const plannedTotal = quiz.assessment ? (quiz.assessment.totalPoints || 10) : null;
  const isMatch = plannedTotal === null || total === plannedTotal;

  const handleSplitEvenly = async () => {
    if (plannedTotal === null || quiz.questions.length === 0) return;
    const split = splitEvenly(plannedTotal, quiz.questions.length);
    await onSetPoints(quiz.questions.map((q, i) => ({ questionId: q.questionId, points: split[i] })));
  };

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-2xs lg:sticky lg:top-4">
      <header className="space-y-3 border-b border-border/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">{quiz.title}</h3>
            <p className="mt-0.5 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
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
            <span className="block text-lg font-extrabold leading-none text-foreground">
              {plannedTotal !== null ? `${total} / ${plannedTotal}` : total}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
              {plannedTotal !== null ? 'points total' : 'points'}
            </span>
          </span>
        </div>

        {plannedTotal !== null && quiz.questions.length > 0 && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-xs">
            {isMatch ? (
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Matches planned total ({plannedTotal} pts)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-warning">
                <AlertCircle className="h-3.5 w-3.5" />
                Must equal {plannedTotal} pts (currently {total})
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSplitEvenly()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              <Scale className="h-3 w-3" />
              Split evenly
            </button>
          </div>
        )}
      </header>

      <div className="max-h-[560px] min-h-[240px] flex-1 space-y-2 overflow-y-auto p-4">
        {quiz.questions.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <HelpCircle className="h-8 w-8 text-subtle-foreground" />
            <p className="mt-2 text-sm font-semibold text-secondary-foreground">No questions yet</p>
            <p className="max-w-[240px] text-xs text-subtle-foreground">
              Select questions in the bank, or pick some at random, then add them here.
            </p>
          </div>
        ) : (
          quiz.questions.map((item, index) => {
            const maxPoints = plannedTotal !== null ? Math.max(0, plannedTotal - (total - item.points)) : 100;
            return (
              <QuizQuestionRow
                key={item.id}
                item={item}
                index={index}
                busy={busy}
                maxPoints={maxPoints}
                onSetPoints={(points) => onSetPoints([{ questionId: item.questionId, points }])}
                onRemove={() => onRemove(item.questionId)}
              />
            );
          })
        )}
      </div>
    </section>
  );
}

interface QuizQuestionRowProps {
  item: PreparedQuizQuestionItem;
  index: number;
  busy: boolean;
  /** Most points one question can have. */
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
    <div className="group rounded-xl border border-border bg-card p-3 transition hover:border-primary/30">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary ring-1 ring-ring/20">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
            {QUESTION_TYPE_LABEL[item.question.type] ?? item.question.type}
          </span>
          <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
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
              'h-9 w-14 rounded-lg border bg-muted text-center text-sm font-bold text-foreground outline-none focus:bg-card focus:ring-4',
              error ? 'border-danger/30 focus:ring-danger/10' : 'border-border focus:border-ring focus:ring-ring/10',
            )}
          />
          <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-subtle-foreground">pts</span>
        </label>
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label="Remove from quiz"
          className="mt-1.5 rounded-lg p-1.5 text-subtle-foreground transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mt-2 pl-9 text-[11px] font-medium text-danger">{error}</p>}
    </div>
  );
}
