'use client';

import { CheckCircle2, Clock, GraduationCap, ListChecks, Plus, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';
import { pointsStatus } from '../quiz-points';

interface QuizGroupBarProps {
  quizzes: PreparedQuizGroup[];
  activeQuizId: string | null;
  busy: boolean;
  onSelect: (quizId: string) => void;
  onCreate: () => void;
}

/** One card per quiz group of the session, plus a "new quiz group" card. */
export function QuizGroupBar({ quizzes, activeQuizId, busy, onSelect, onCreate }: QuizGroupBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {quizzes.map((quiz) => (
        <QuizGroupCard key={quiz.id} quiz={quiz} active={quiz.id === activeQuizId} onSelect={() => onSelect(quiz.id)} />
      ))}
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className="flex min-w-[200px] shrink-0 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-border bg-muted/60 px-4 py-4 text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary-soft/50 hover:text-primary disabled:opacity-50"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-card shadow-xs ring-1 ring-border">
          <Plus className="h-4 w-4" />
        </span>
        New quiz group
      </button>
    </div>
  );
}

function QuizGroupCard({ quiz, active, onSelect }: { quiz: PreparedQuizGroup; active: boolean; onSelect: () => void }) {
  const status = pointsStatus(quiz);
  const graded = Boolean(quiz.assessment);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'group relative min-w-[230px] shrink-0 rounded-2xl border bg-card p-4 text-left transition',
        active
          ? 'border-ring shadow-md ring-4 ring-ring/10'
          : 'border-border shadow-2xs hover:border-primary/30 hover:shadow-xs',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            graded ? 'bg-info-soft text-info' : 'bg-secondary text-secondary-foreground',
          )}
        >
          {graded ? <GraduationCap className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
          {graded ? 'Course quiz' : 'Practice'}
        </span>
        {status.kind === 'ready' && <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Ready" />}
      </div>

      <p className={cn('mt-2.5 truncate text-sm font-bold', active ? 'text-primary' : 'text-foreground')}>{quiz.title}</p>

      <div className="mt-2 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="h-3.5 w-3.5" />
          {quiz.questions.length} {quiz.questions.length === 1 ? 'question' : 'questions'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {quiz.timeLimitMinutes} min
        </span>
      </div>

      {status.kind === 'empty' && (
        <p className="mt-3 text-[10px] font-semibold text-warning">Add questions before the session</p>
      )}
      {status.kind === 'incomplete' && (
        <p className="mt-3 text-[10px] font-semibold text-warning">
          Points: {status.current} / {status.planned} (must match)
        </p>
      )}
    </button>
  );
}

/** Shown when the session has no quiz groups yet. */
export function NoQuizGroups({ busy, onCreate }: { busy: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-gradient-to-b from-card to-muted/80 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary ring-8 ring-indigo-50/50">
        <Sparkles className="h-6 w-6" />
      </span>
      <h3 className="mt-5 text-base font-bold text-foreground">No quiz groups yet</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
        Create a quiz group, pick questions from the course question bank and set a timer. You can broadcast it to learners from
        the live room.
      </p>
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        Create quiz group
      </button>
    </div>
  );
}
