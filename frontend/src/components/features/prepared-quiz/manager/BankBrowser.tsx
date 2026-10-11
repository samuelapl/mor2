'use client';

import { useState } from 'react';
import { BookOpen, Check, Library, ListPlus, Loader2, Search, Shuffle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RichContent } from '@/components/ui/RichContent';
import type { ApiQuestionBankQuestion } from '@/lib/api/quiz';
import { ALL, COURSE_GENERAL, GLOBAL, type QuestionBankBrowser } from '../hooks/useQuestionBankBrowser';
import { QUESTION_TYPE_LABEL } from '../quiz-points';

interface BankBrowserProps {
  bank: QuestionBankBrowser;
  /** Questions already in the selected quiz group. */
  inQuiz: Set<string>;
  quizTitle: string | null;
  busy: boolean;
  onAddSelected: () => void;
}

const selectClass =
  'w-full rounded-xl border border-border bg-card px-2.5 py-2 text-xs text-secondary-foreground outline-none transition focus:border-ring focus:ring-4 focus:ring-ring/10 disabled:bg-muted disabled:text-subtle-foreground';

/** Search, filter and pick questions from the course bank to add to the selected quiz group. */
export function BankBrowser({ bank, inQuiz, quizTitle, busy, onAddSelected }: BankBrowserProps) {
  const [randomCount, setRandomCount] = useState(5);
  const { filters, setFilter } = bank;

  return (
    <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-2xs">
      <header className="space-y-3 border-b border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <Library className="h-4 w-4 text-primary" />
            Question bank
            {bank.courseCode && <span className="font-mono text-xs font-semibold text-subtle-foreground">{bank.courseCode}</span>}
          </h3>
          <span className="text-[11px] font-medium text-subtle-foreground">
            {bank.filtered.length} shown · {bank.availableCount} not in quiz
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground" />
          <input
            value={filters.search}
            onChange={(e) => setFilter('search', e.target.value)}
            placeholder="Search by question, answer choice or category…"
            className="w-full rounded-xl border border-border bg-muted/60 py-2.5 pl-9 pr-9 text-sm text-foreground outline-none transition placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:ring-4 focus:ring-ring/10"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => setFilter('search', '')}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-subtle-foreground hover:text-secondary-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <select value={filters.moduleId} onChange={(e) => setFilter('moduleId', e.target.value)} className={selectClass} aria-label="Module">
            <option value={ALL}>All modules</option>
            <option value={COURSE_GENERAL}>Course level</option>
            <option value={GLOBAL}>Reusable</option>
            {bank.modules.map((m, i) => (
              <option key={m.id} value={m.id}>
                {i + 1}. {bank.titleOf(m)}
              </option>
            ))}
          </select>
          <select
            value={filters.lessonId}
            onChange={(e) => setFilter('lessonId', e.target.value)}
            disabled={bank.lessons.length === 0}
            className={selectClass}
            aria-label="Lesson"
          >
            <option value={ALL}>{bank.lessons.length ? 'All lessons' : 'Lesson'}</option>
            {bank.lessons.map((l, i) => (
              <option key={l.id} value={l.id}>
                {i + 1}. {bank.titleOf(l)}
              </option>
            ))}
          </select>
          <select
            value={filters.subLessonId}
            onChange={(e) => setFilter('subLessonId', e.target.value)}
            disabled={bank.subLessons.length === 0}
            className={selectClass}
            aria-label="Sub-lesson"
          >
            <option value={ALL}>{bank.subLessons.length ? 'All sub-lessons' : 'Sub-lesson'}</option>
            {bank.subLessons.map((s, i) => (
              <option key={s.id} value={s.id}>
                {i + 1}. {bank.titleOf(s)}
              </option>
            ))}
          </select>
          <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className={selectClass} aria-label="Question type">
            <option value={ALL}>All types</option>
            <option value="MULTIPLE_CHOICE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="SHORT_ANSWER">Short answer</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 rounded-xl bg-muted p-1 pl-2.5 ring-1 ring-border/70">
            <Shuffle className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-secondary-foreground">Pick</span>
            <input
              type="number"
              min={1}
              value={randomCount}
              onChange={(e) => setRandomCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
              aria-label="Number of random questions"
              className="w-12 rounded-lg bg-card px-1.5 py-1 text-center text-xs font-bold text-foreground outline-none ring-1 ring-border focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => bank.pickRandom(randomCount)}
              className="rounded-lg bg-card px-2.5 py-1 text-xs font-semibold text-primary ring-1 ring-ring/20 transition hover:bg-primary-soft"
            >
              at random
            </button>
          </div>
          {bank.hasFilters && (
            <button type="button" onClick={bank.resetFilters} className="text-xs font-semibold text-primary hover:underline">
              Reset filters
            </button>
          )}
        </div>
      </header>

      <div className="max-h-[560px] min-h-[240px] flex-1 space-y-2 overflow-y-auto p-4">
        {bank.loading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : bank.filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <BookOpen className="h-8 w-8 text-subtle-foreground" />
            <p className="mt-2 text-sm font-semibold text-secondary-foreground">No questions match</p>
            <p className="text-xs text-subtle-foreground">Try another module, lesson or search term.</p>
          </div>
        ) : (
          bank.filtered.map((q) => (
            <BankQuestionCard
              key={q.id}
              question={q}
              location={bank.locationOf(q)}
              selected={bank.selectedIds.has(q.id)}
              inQuiz={inQuiz.has(q.id)}
              onToggle={() => bank.toggle(q.id)}
            />
          ))
        )}
      </div>

      {bank.selectedIds.size > 0 && (
        <footer className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-primary/30 bg-primary-soft/70 px-4 py-3">
          <span className="text-xs font-semibold text-primary">{bank.selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={bank.clearSelection} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Clear
            </button>
            <button
              type="button"
              onClick={onAddSelected}
              disabled={busy || !quizTitle}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
            >
              <ListPlus className="h-4 w-4" />
              Add to {quizTitle ?? 'quiz'}
            </button>
          </div>
        </footer>
      )}
    </section>
  );
}

interface BankQuestionCardProps {
  question: ApiQuestionBankQuestion;
  location: string;
  selected: boolean;
  inQuiz: boolean;
  onToggle: () => void;
}

function BankQuestionCard({ question: q, location, selected, inQuiz, onToggle }: BankQuestionCardProps) {
  const options = Array.isArray(q.options) ? q.options : [];
  const isCorrect = (opt: string, i: number) =>
    String(q.correctAnswer) === String(i) || String(q.correctAnswer ?? '').toLowerCase() === String(opt).toLowerCase();

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={inQuiz}
      aria-pressed={selected}
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition',
        inQuiz
          ? 'cursor-default border-success/30 bg-success-soft/40'
          : selected
            ? 'border-ring bg-primary-soft/50 ring-4 ring-ring/10'
            : 'border-border bg-card hover:border-primary/30 hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-2 transition',
          inQuiz ? 'border-success bg-emerald-500' : selected ? 'border-primary bg-primary' : 'border-input bg-card',
        )}
      >
        {(selected || inQuiz) && <Check className="h-3 w-3 stroke-[3] text-white" />}
      </span>

      <span className="min-w-0 flex-1">
        <span className="mb-1.5 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold">
          <span className="rounded-md bg-secondary px-1.5 py-0.5 uppercase tracking-wide text-secondary-foreground">
            {QUESTION_TYPE_LABEL[q.type] ?? q.type}
          </span>
          <span className="truncate text-subtle-foreground">{location}</span>
          {inQuiz && <span className="rounded-md bg-success-soft px-1.5 py-0.5 text-success">In this quiz</span>}
        </span>
        <span className="block text-sm font-semibold leading-snug text-foreground">
          <RichContent html={q.question} inline inheritText />
        </span>
        {options.length > 0 && (
          <span className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            {options.map((opt, i) => (
              <span
                key={i}
                className={cn(
                  'flex items-center gap-1.5 truncate rounded-lg px-2 py-1 text-[11px]',
                  isCorrect(opt, i) ? 'bg-success-soft/70 font-medium text-success' : 'bg-muted text-secondary-foreground',
                )}
              >
                <span className="text-[10px] font-bold">{String.fromCharCode(65 + i)}</span>
                <span className="truncate">{opt}</span>
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}
