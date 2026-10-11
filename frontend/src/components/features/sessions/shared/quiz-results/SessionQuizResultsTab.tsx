'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ClipboardList, GraduationCap, Loader2, RefreshCw, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchSessionQuizResults, type ApiSessionQuizResults } from '@/lib/api/monitoring';
import { QuizAnswerList, QuizScoreBadge } from './QuizAnswerList';

const ALL = 'ALL';

/** Attendance view tab: every learner's live quiz answers and scores for one session, searchable. */
export function SessionQuizResultsTab({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<ApiSessionQuizResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [quizFilter, setQuizFilter] = useState(ALL);
  const [answeredFilter, setAnsweredFilter] = useState<'ALL' | 'ANSWERED' | 'MISSED'>('ALL');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchSessionQuizResults(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load quiz results');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const quizzes = useMemo(() => (data?.quizzes ?? []).filter((q) => quizFilter === ALL || q.id === quizFilter), [data, quizFilter]);

  const learners = useMemo(() => {
    const query = search.trim().toLowerCase();
    const ids = new Set(quizzes.map((q) => q.id));
    return (data?.learners ?? []).filter((l) => {
      if (query && !l.name.toLowerCase().includes(query) && !l.email.toLowerCase().includes(query)) return false;
      const answered = l.quizzes.some((r) => ids.has(r.quizId) && r.answered > 0);
      if (answeredFilter === 'ANSWERED' && !answered) return false;
      if (answeredFilter === 'MISSED' && answered) return false;
      return true;
    });
  }, [data, quizzes, search, answeredFilter]);

  const stats = useMemo(() => {
    const ids = new Set(quizzes.map((q) => q.id));
    const all = data?.learners ?? [];
    const results = all.flatMap((l) => l.quizzes.filter((r) => ids.has(r.quizId) && r.answered > 0));
    const answeredLearners = all.filter((l) => l.quizzes.some((r) => ids.has(r.quizId) && r.answered > 0)).length;
    const average = results.length ? Math.round(results.reduce((s, r) => s + r.scorePercent, 0) / results.length) : 0;
    return { total: all.length, answeredLearners, average };
  }, [data, quizzes]);

  if (loading && !data) {
    return (
      <div className="flex h-56 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (error) {
    return <div className="rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">{error}</div>;
  }
  if (!data || data.quizzes.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-12 text-center">
        <ClipboardList className="h-8 w-8 text-subtle-foreground" />
        <p className="mt-2 text-sm font-semibold text-secondary-foreground">No quiz results for this session</p>
        <p className="mt-1 text-xs text-muted-foreground">Results appear here once questions are broadcast and learners answer them.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-4 w-4 text-subtle-foreground" />}
          label="Answered"
          value={`${stats.answeredLearners} / ${stats.total}`}
          hint="Learners who answered at least one question"
        />
        <StatCard
          icon={<GraduationCap className="h-4 w-4 text-indigo-500" />}
          label="Average score"
          value={`${stats.average}%`}
          hint="Across learners who answered"
        />
        <StatCard
          icon={<ClipboardList className="h-4 w-4 text-amber-500" />}
          label="Quizzes"
          value={String(quizzes.length)}
          hint={data.completed ? 'Session completed: graded results are recorded' : 'Session not completed yet'}
        />
      </div>

      <div className="space-y-4 rounded-2xl border border-border/90 bg-card p-5 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-subtle-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search learner name or email…"
              className="w-full rounded-xl border border-border bg-muted/50 py-2 pl-8 pr-3 text-xs text-foreground placeholder:text-subtle-foreground focus:border-ring focus:bg-card focus:outline-none"
            />
          </div>
          <select
            value={quizFilter}
            onChange={(e) => setQuizFilter(e.target.value)}
            aria-label="Quiz"
            className="rounded-xl border border-border bg-card px-3 py-2 text-xs text-secondary-foreground focus:border-ring focus:outline-none"
          >
            <option value={ALL}>All quizzes</option>
            {data.quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
                {q.graded ? ` (graded ${q.weight}%)` : ''}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5 text-[11px]">
            {(['ALL', 'ANSWERED', 'MISSED'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAnsweredFilter(f)}
                className={cn(
                  'rounded-md px-2.5 py-1 font-medium transition',
                  answeredFilter === f ? 'bg-card font-semibold text-foreground shadow-xs' : 'text-secondary-foreground hover:text-foreground',
                )}
              >
                {f === 'ALL' ? 'All' : f === 'ANSWERED' ? 'Answered' : "Didn't answer"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-secondary-foreground hover:bg-secondary"
          >
            <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {learners.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/50 px-4 py-8 text-center text-xs text-subtle-foreground">
            No learners match the search or filter.
          </div>
        ) : (
          <ul className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/80">
            {learners.map((learner) => {
              const open = expanded === learner.userId;
              const shown = learner.quizzes.filter((r) => quizzes.some((q) => q.id === r.quizId));
              return (
                <li key={learner.userId} className="bg-card">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : learner.userId)}
                    aria-expanded={open}
                    className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/70"
                  >
                    <div className="min-w-[180px] flex-1">
                      <p className="text-sm font-semibold text-foreground">{learner.name}</p>
                      <p className="text-[11px] text-muted-foreground">{learner.email}</p>
                    </div>
                    {learner.attendance && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase text-secondary-foreground">
                        {learner.attendance.toLowerCase()}
                      </span>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {shown.map((r) => {
                        const quiz = data.quizzes.find((q) => q.id === r.quizId)!;
                        return (
                          <span key={r.quizId} className="flex items-center gap-1" title={quiz.title}>
                            {quizzes.length > 1 && <span className="max-w-[120px] truncate text-[10px] text-subtle-foreground">{quiz.title}</span>}
                            <QuizScoreBadge quiz={quiz} result={r} />
                          </span>
                        );
                      })}
                    </div>
                    <ChevronDown className={cn('h-4 w-4 shrink-0 text-subtle-foreground transition', open && 'rotate-180')} />
                  </button>
                  {open && (
                    <div className="space-y-4 border-t border-border/60 bg-muted/40 px-4 py-4">
                      {shown.map((r) => {
                        const quiz = data.quizzes.find((q) => q.id === r.quizId)!;
                        return (
                          <div key={r.quizId} className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-xs font-bold uppercase tracking-wide text-secondary-foreground">{quiz.title}</h4>
                              {quiz.graded && (
                                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-warning">
                                  Graded · {quiz.weight}% · pass {quiz.passingScore}%
                                </span>
                              )}
                              <span className="text-[11px] text-muted-foreground">
                                {r.correct}/{quiz.questions.length} correct
                                {r.recorded ? ` · recorded grade ${r.recorded.score}%` : ''}
                              </span>
                            </div>
                            <QuizAnswerList quiz={quiz} result={r} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-border/90 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-0.5 text-[11px] text-subtle-foreground">{hint}</p>
    </div>
  );
}
