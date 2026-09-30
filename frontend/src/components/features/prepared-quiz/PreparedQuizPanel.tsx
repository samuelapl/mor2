'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  HelpCircle,
  Layers,
  ListPlus,
  Loader2,
  Play,
  Radio,
  RefreshCw,
  Sparkles,
  ToggleLeft,
} from 'lucide-react';
import { usePreparedQuizStore } from '@/lib/stores/prepared-quiz-store';
import type { PreparedQuestion } from '@/lib/api/prepared-quiz';
import type { ApiQuestionBankQuestion } from '@/lib/api/quiz';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export function preparedToApiQuestion(item: PreparedQuestion): ApiQuestionBankQuestion {
  const q = item.question;
  let options = q.options;
  if (typeof options === 'string') {
    try {
      options = JSON.parse(options);
    } catch {
      options = [];
    }
  }
  return {
    id: q.id,
    courseId: q.courseId,
    type: q.type,
    question: q.question,
    options: Array.isArray(options) ? options : [],
    correctAnswer:
      q.correctAnswer !== undefined && q.correctAnswer !== null
        ? String(q.correctAnswer)
        : null,
    points: q.points || 10,
    category: q.category || 'General',
    createdAt: item.addedAt,
    updatedAt: item.addedAt,
  };
}

interface PreparedQuizPanelProps {
  sessionId?: string;
  onLaunchQuestion: (
    q: ApiQuestionBankQuestion,
    queueIndex?: number,
    queue?: ApiQuestionBankQuestion[],
  ) => void;
  onStageQuestion?: (q: ApiQuestionBankQuestion) => void;
  onStageAllQuestions?: (questions: ApiQuestionBankQuestion[]) => void;
  stagedQueueIds?: string[];
  activeQuizId?: string;
  onSwitchToBank?: () => void;
}

export function PreparedQuizPanel({
  sessionId,
  onLaunchQuestion,
  onStageQuestion,
  onStageAllQuestions,
  stagedQueueIds = [],
  activeQuizId,
  onSwitchToBank,
}: PreparedQuizPanelProps) {
  const { questions, isLoading, error, loadForSession, reload } = usePreparedQuizStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      loadForSession(sessionId);
    }
  }, [sessionId, loadForSession]);

  if (!sessionId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-700">No session ID provided</p>
      </div>
    );
  }

  if (isLoading && questions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const handleLaunchSingle = (item: PreparedQuestion, index: number) => {
    const apiQ = preparedToApiQuestion(item);
    const fullQueue = questions.map(preparedToApiQuestion);
    onLaunchQuestion(apiQ, index, fullQueue);
  };

  const handleStageAll = () => {
    if (!onStageAllQuestions || questions.length === 0) return;
    const apiQuestions = questions.map(preparedToApiQuestion);
    onStageAllQuestions(apiQuestions);
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900">
                Pre-Loaded Session Quiz
              </h3>
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                {questions.length} ready
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              These questions were prepared before the session started and are cached in memory for instant broadcast.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => reload(sessionId)}
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-2xs transition"
            title="Refresh prepared quiz cache"
          >
            <RefreshCw className="h-3 w-3 text-slate-500" />
            Refresh
          </button>

          {questions.length > 0 && onStageAllQuestions && (
            <Button
              size="sm"
              onClick={handleStageAll}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-xs"
            >
              <ListPlus className="h-3.5 w-3.5" />
              Stage All in Queue ({questions.length})
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Empty State */}
      {questions.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center space-y-3">
          <BookOpen className="mx-auto h-9 w-9 text-slate-300" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              No Quiz Questions Pre-Loaded
            </h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
              You haven't added questions to this session yet. You can choose from the Question Bank live or prepare them next time before joining.
            </p>
          </div>
          {onSwitchToBank && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSwitchToBank}
              className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Select from Question Bank Now
            </Button>
          )}
        </div>
      ) : (
        /* Questions List */
        <div className="space-y-3">
          {questions.map((item, idx) => {
            const q = item.question;
            let options = q.options;
            if (typeof options === 'string') {
              try {
                options = JSON.parse(options);
              } catch {
                options = [];
              }
            }
            const isCurrentlyActive = activeQuizId === q.id;
            const isStaged = stagedQueueIds.includes(q.id);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border transition shadow-2xs ${
                  isCurrentlyActive
                    ? 'border-emerald-300 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                    : isStaged
                    ? 'border-indigo-300 bg-indigo-50/20'
                    : 'border-slate-200/90 bg-white hover:border-indigo-200'
                }`}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                        {idx + 1}
                      </span>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                            {q.type === 'MULTIPLE_CHOICE'
                              ? 'Multiple Choice'
                              : q.type === 'TRUE_FALSE'
                              ? 'True / False'
                              : 'Short Answer'}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {q.points || 10} pts
                          </span>
                          {q.category && (
                            <span className="rounded-md bg-slate-50 border border-slate-200 px-1.5 py-0.2 text-[10px] text-slate-500 truncate max-w-[120px]">
                              {q.category}
                            </span>
                          )}
                          {isCurrentlyActive && (
                            <span className="rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold animate-pulse">
                              Broadcasting Now
                            </span>
                          )}
                          {isStaged && !isCurrentlyActive && (
                            <span className="rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold">
                              In Staged Queue
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-snug">
                          {q.question}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {onStageQuestion && !isStaged && (
                        <button
                          type="button"
                          onClick={() => onStageQuestion(preparedToApiQuestion(item))}
                          className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
                          title="Add to sequential broadcast queue"
                        >
                          <ListPlus className="h-3.5 w-3.5 text-indigo-600" />
                          Stage
                        </button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleLaunchSingle(item, idx)}
                        className={`gap-1.5 text-xs font-semibold shadow-xs ${
                          isCurrentlyActive
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Play className="h-3 w-3 fill-current" />
                        {isCurrentlyActive ? 'Re-broadcast' : 'Broadcast Now'}
                      </Button>
                    </div>
                  </div>

                  {/* Toggle Preview Options */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {isExpanded ? 'Hide Options ▲' : `View ${Array.isArray(options) ? options.length : 0} Options ▼`}
                    </button>

                    {isExpanded && Array.isArray(options) && options.length > 0 && (
                      <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 border border-slate-100">
                        {options.map((optText: string, optIdx: number) => {
                          const isCorrect =
                            String(q.correctAnswer) === String(optIdx) ||
                            String(q.correctAnswer)?.toLowerCase() ===
                              optText.toLowerCase();

                          return (
                            <div
                              key={optIdx}
                              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                                isCorrect
                                  ? 'bg-emerald-100 text-emerald-900 font-bold border border-emerald-300'
                                  : 'bg-white text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span className="truncate flex-1">{optText}</span>
                              {isCorrect && (
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
