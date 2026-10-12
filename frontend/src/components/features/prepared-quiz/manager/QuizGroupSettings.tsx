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

/** Name, whole-quiz timer and delete for the selected quiz group, plus how a course quiz is scored. */
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
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-2xs">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* Name */}
        <label className="group relative min-w-[220px] flex-1">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">Quiz name</span>
          <input
            key={quiz.id + quiz.title}
            defaultValue={quiz.title}
            onBlur={(e) => commitTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className="w-full rounded-xl border border-transparent bg-muted py-2 pl-3 pr-9 text-base font-bold text-foreground outline-none transition hover:border-border focus:border-ring focus:bg-card focus:ring-4 focus:ring-ring/10"
          />
          <Pencil className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 text-subtle-foreground group-focus-within:text-indigo-500" />
        </label>

        {/* Timer */}
        <div>
          <span className="mb-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-subtle-foreground">
            <Clock className="h-3 w-3" />
            Time for the whole quiz
          </span>
          <div className="flex items-center gap-1 rounded-xl bg-secondary p-1">
            {TIMER_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={busy}
                onClick={() => onTimerChange(minutes)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-xs font-semibold transition',
                  quiz.timeLimitMinutes === minutes ? 'bg-card text-primary shadow-xs' : 'text-secondary-foreground hover:text-foreground',
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
                'w-16 rounded-lg px-2 py-1.5 text-center text-xs font-semibold outline-none placeholder:text-subtle-foreground focus:bg-card focus:ring-2 focus:ring-ring/20',
                isPreset ? 'bg-transparent text-secondary-foreground' : 'bg-card text-primary shadow-xs placeholder:text-primary/80',
              )}
            />
          </div>
        </div>

        {!graded && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="mt-5 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-subtle-foreground transition hover:bg-danger-soft hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        )}
      </div>

      {graded && (
        <div className="flex gap-3 rounded-xl border border-info/25 bg-info-soft/60 p-3.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="text-xs leading-relaxed text-info">
            <p className="font-bold">Course session quiz · formative · {totalPoints(quiz)} points</p>
            <p className="mt-0.5 text-info/90">
              Learners see their score (points earned out of the total). It has no pass mark and doesn&apos;t count towards
              the course grade or the certificate; only attending the session does. This quiz was planned with the course, so
              it can&apos;t be deleted here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
