'use client';

import { useState } from 'react';
import { Clock, GraduationCap, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';
import { totalPoints } from '../quiz-points';

const TIMER_PRESETS = [1, 2, 3, 5, 10, 15];

interface QuizGroupSettingsProps {
  quiz: PreparedQuizGroup;
  busy: boolean;
  onRename: (title: string) => void;
  onTimerChange: (minutes: number) => void;
  onDelete: () => void;
}

/** Name, whole-quiz timer and delete for the selected quiz group, plus the grading rules if it is graded. */
export function QuizGroupSettings({ quiz, busy, onRename, onTimerChange, onDelete }: QuizGroupSettingsProps) {
  const graded = quiz.assessment;
  const [customTimer, setCustomTimer] = useState('');
  const isPreset = TIMER_PRESETS.includes(quiz.timeLimitMinutes);

  const commitTitle = (value: string) => {
    const title = value.trim();
    if (title && title !== quiz.title) onRename(title);
  };

  const commitCustomTimer = () => {
    const minutes = parseInt(customTimer, 10);
    if (!isNaN(minutes) && minutes >= 1 && minutes <= 180 && minutes !== quiz.timeLimitMinutes) onTimerChange(minutes);
    setCustomTimer('');
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* Name */}
        <label className="group relative min-w-[220px] flex-1">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Quiz name</span>
          <input
            key={quiz.id + quiz.title}
            defaultValue={quiz.title}
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-full rounded-xl border border-transparent bg-slate-50 py-2 pl-3 pr-9 text-base font-bold text-slate-900 outline-none transition hover:border-slate-200 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
          <Pencil className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-slate-300 group-focus-within:text-indigo-500" />
        </label>

        {/* Timer */}
        <div>
          <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <Clock className="h-3 w-3" />
            Time for the whole quiz
          </span>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            {TIMER_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={busy}
                onClick={() => onTimerChange(minutes)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  quiz.timeLimitMinutes === minutes ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {minutes}m
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={180}
              value={customTimer}
              placeholder={isPreset ? 'Other' : `${quiz.timeLimitMinutes}m`}
              onChange={(e) => setCustomTimer(e.target.value)}
              onBlur={commitCustomTimer}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              aria-label="Custom minutes"
              className={cn(
                'w-16 rounded-lg px-2 py-1.5 text-center text-xs font-semibold outline-none [color-scheme:light] placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20',
                isPreset ? 'bg-transparent text-slate-700' : 'bg-white text-indigo-700 shadow-xs placeholder:text-indigo-700',
              )}
            />
          </div>
        </div>

        {!graded && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>

      {graded && <PointsAllocation allocated={graded.weight} assigned={totalPoints(quiz)} />}

      {graded && (
        <div className="flex gap-3 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/40 p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="text-xs leading-relaxed text-amber-900">
            <p className="font-bold">
              Graded course quiz · {graded.weight}% of the course grade · pass mark {graded.passingScore}%
            </p>
            <p className="mt-0.5 text-amber-800/90">
              Question points must add up to <strong>{graded.weight}</strong>, one point per percent of the course grade. When
              the session is marked completed, each learner&apos;s answers become their result; learners who didn&apos;t answer
              score 0. This quiz was planned with the course, so it can&apos;t be deleted here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Allocated (the quiz's course weight), assigned and remaining points of a graded quiz. */
function PointsAllocation({ allocated, assigned }: { allocated: number; assigned: number }) {
  const remaining = allocated - assigned;
  const done = remaining === 0;
  const cells = [
    { label: 'Allocated', value: allocated, hint: 'Points this quiz must total', tone: 'text-slate-900' },
    { label: 'Assigned', value: assigned, hint: 'Points set on its questions', tone: 'text-indigo-700' },
    {
      label: 'Remaining',
      value: remaining,
      hint: done ? 'Ready to broadcast' : 'Assign before going live',
      tone: done ? 'text-emerald-700' : 'text-amber-700',
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-3">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={cn(
            'rounded-xl border p-3',
            cell.label === 'Remaining'
              ? done
                ? 'border-emerald-200 bg-emerald-50/60'
                : 'border-amber-200 bg-amber-50/60'
              : 'border-slate-200 bg-slate-50/60',
          )}
        >
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{cell.label}</p>
          <p className={cn('mt-0.5 text-2xl font-extrabold leading-tight', cell.tone)}>
            {cell.value}
            <span className="ml-1 text-xs font-semibold text-slate-400">pts</span>
          </p>
          <p className="text-[11px] text-slate-500">{cell.hint}</p>
        </div>
      ))}
    </div>
  );
}
