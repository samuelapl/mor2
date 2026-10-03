'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  HelpCircle,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { usePreparedQuizStore } from '@/lib/stores/prepared-quiz-store';
import type { PreparedQuizGroup } from '@/lib/api/prepared-quiz';
import { Button } from '@/components/ui/Button';
import { RichContent } from '@/components/ui/RichContent';
import { broadcastBlocker } from './quiz-points';
import { toast } from '@/lib/toast';

interface PreparedQuizPanelProps {
  sessionId?: string;
  onBroadcastQuizGroup: (quizGroup: PreparedQuizGroup) => void;
  activeQuizId?: string;
  activeQuizTitle?: string;
  broadcastedQuizTitles?: Set<string>;
  broadcastedQuestionIds?: Set<string>;
  onSwitchToBank?: () => void;
}

export function PreparedQuizPanel({
  sessionId,
  onBroadcastQuizGroup,
  activeQuizId,
  activeQuizTitle,
  broadcastedQuizTitles,
  broadcastedQuestionIds,
  onSwitchToBank,
}: PreparedQuizPanelProps) {
  const {
    quizzes,
    isLoading,
    isSaving,
    error,
    loadForSession,
    reload,
    updateQuiz,
    removeQuestion,
  } = usePreparedQuizStore();

  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

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

  if (isLoading && quizzes.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedQuizId((prev) => (prev === id ? null : id));
  };

  const handleUpdateMinutes = async (quizId: string, minutes: number) => {
    if (minutes < 1 || minutes > 180) return;
    try {
      await updateQuiz(sessionId, quizId, { timeLimitMinutes: minutes });
      toast.success(`Timer set to ${minutes} mins`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timer');
    }
  };

  const handleRemoveQuestionFromQuiz = async (quizId: string, questionId: string) => {
    try {
      await removeQuestion(sessionId, quizId, questionId);
      toast.success('Question deleted from prepared quiz');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete question');
    }
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
                Pre-Loaded Session Quizzes
              </h3>
              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-2xs">
                {quizzes.length} {quizzes.length === 1 ? 'quiz pack' : 'quiz packs'} available
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Review and customize your quiz packs, adjust your desired minutes timer, remove questions, and broadcast to the classroom when ready.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => reload(sessionId)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 shadow-2xs transition"
          title="Refresh prepared quizzes from cache"
        >
          <RefreshCw className="h-3 w-3 text-slate-500" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {/* Empty State */}
      {quizzes.length === 0 || quizzes.every((q) => q.questions.length === 0) ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center space-y-3">
          <BookOpen className="mx-auto h-9 w-9 text-slate-300" />
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              No Prepared Quizzes Found
            </h4>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto mt-1">
              You haven't prepared any quiz packs for this session yet. You can broadcast questions live from the Question Bank tab.
            </p>
          </div>
          {onSwitchToBank && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSwitchToBank}
              className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-semibold"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Switch to Question Bank Tab
            </Button>
          )}
        </div>
      ) : (
        /* Quiz Packs List */
        <div className="space-y-4">
          {quizzes.map((quiz, idx) => {
            const isExpanded = expandedQuizId === quiz.id;
            const hasQuestions = quiz.questions.length > 0;
            const isThisQuizActive = Boolean(
              (activeQuizTitle && activeQuizTitle === quiz.title) ||
              (activeQuizId && (
                activeQuizId === quiz.id ||
                quiz.questions.some((q) => q.questionId === activeQuizId || q.question?.id === activeQuizId)
              ))
            );
            const isOtherQuizActive = Boolean((activeQuizId || activeQuizTitle) && !isThisQuizActive);
            // A graded quiz's points must total its course weight before it can be run.
            const blocker = broadcastBlocker(quiz);
            const isBroadcasted = Boolean(
              (broadcastedQuizTitles && broadcastedQuizTitles.has(quiz.title)) ||
              (broadcastedQuestionIds &&
                quiz.questions.length > 0 &&
                quiz.questions.every((q) => broadcastedQuestionIds.has(q.questionId || q.question?.id)))
            );

            return (
              <div
                key={quiz.id}
                className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden transition hover:border-indigo-200"
              >
                {/* Pack Header */}
                <div className="p-4 space-y-3 bg-white">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-700 border border-indigo-100">
                        {idx + 1}
                      </span>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900 truncate">
                            {quiz.title}
                          </h4>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            {quiz.questions.length} {quiz.questions.length === 1 ? 'Question' : 'Questions'}
                          </span>
                          {isThisQuizActive && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 animate-pulse">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                              Broadcasting Active
                            </span>
                          )}
                          {isBroadcasted && !isThisQuizActive && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-800">
                              <CheckCircle2 className="h-3 w-3 text-purple-600" />
                              Broadcasted
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] ${blocker && hasQuestions ? 'font-semibold text-amber-700' : 'text-slate-400'}`}>
                          {blocker && hasQuestions ? blocker : 'Ready for classroom whole-quiz broadcast'}
                        </p>
                      </div>
                    </div>

                    {/* Preview Toggle & Broadcast Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(quiz.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition"
                      >
                        {isExpanded ? 'Hide Review ▲' : `Review (${quiz.questions.length} Qs) ▼`}
                      </button>

                      <Button
                        size="sm"
                        disabled={Boolean(blocker) || isBroadcasted || isThisQuizActive || isOtherQuizActive}
                        title={blocker ?? undefined}
                        onClick={() => onBroadcastQuizGroup(quiz)}
                        className={`gap-1.5 font-semibold text-xs shadow-md transition ${
                          isThisQuizActive
                            ? 'bg-emerald-600 text-white opacity-90 cursor-not-allowed'
                            : isBroadcasted
                            ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed'
                            : isOtherQuizActive
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        {isThisQuizActive
                          ? 'Broadcasting Active...'
                          : isBroadcasted
                          ? 'Already Broadcasted'
                          : isOtherQuizActive
                          ? 'Broadcast Locked (Quiz Running)'
                          : `Broadcast ${quiz.title} (${quiz.timeLimitMinutes}m)`}
                      </Button>
                    </div>
                  </div>

                  {/* Timer Controls Right in Live Session (Hidden during active broadcasting or if already broadcasted) */}
                  {!isThisQuizActive && !isOtherQuizActive && !isBroadcasted && (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 bg-slate-50/50 p-2.5 rounded-xl">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          <Clock className="h-3.5 w-3.5 text-indigo-600" />
                          Live Timer:
                        </span>

                        {/* Quick Presets */}
                        {[1, 2, 3, 5, 7, 10, 15].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => handleUpdateMinutes(quiz.id, m)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${
                              quiz.timeLimitMinutes === m
                                ? 'bg-indigo-600 text-white shadow-2xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}

                        {/* Custom Desired Minute Input */}
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => handleUpdateMinutes(quiz.id, Math.max(1, quiz.timeLimitMinutes - 1))}
                            className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-xs bg-white"
                            title="Decrease minute"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min={1}
                            max={180}
                            value={quiz.timeLimitMinutes}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val >= 1) {
                                handleUpdateMinutes(quiz.id, val);
                              }
                            }}
                            className="w-10 bg-white text-center text-xs font-bold text-slate-900 outline-none [color-scheme:light]"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateMinutes(quiz.id, Math.min(180, quiz.timeLimitMinutes + 1))}
                            className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-xs bg-white"
                            title="Increase minute"
                          >
                            +
                          </button>
                          <span className="text-[11px] font-semibold text-slate-500 pr-2">mins</span>
                        </div>
                      </div>

                      <span className="text-[11px] text-slate-500 font-medium">
                        Learners get <strong className="text-indigo-700">{quiz.timeLimitMinutes} mins</strong> total
                      </span>
                    </div>
                  )}
                </div>

                {/* Expandable Questions List Preview & Deletion */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-4 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 text-xs text-slate-500 font-medium">
                      <span>Questions in this pack (click trash icon to remove before broadcast):</span>
                      <span>Total: {quiz.questions.length}</span>
                    </div>

                    {quiz.questions.map((item, qIdx) => {
                      const q = item.question;
                      let options = q.options;
                      if (typeof options === 'string') {
                        try {
                          options = JSON.parse(options);
                        } catch {
                          options = [];
                        }
                      }

                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600">
                                {qIdx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                                    {q.type === 'MULTIPLE_CHOICE'
                                      ? 'MCQ'
                                      : q.type === 'TRUE_FALSE'
                                      ? 'True/False'
                                      : 'Short'}
                                  </span>
                                  <span className="text-[10px] text-slate-400">· {item.points} pts</span>
                                  {q.category && (
                                    <span className="text-[10px] text-slate-400">· {q.category}</span>
                                  )}
                                  {broadcastedQuestionIds && (broadcastedQuestionIds.has(item.questionId) || broadcastedQuestionIds.has(q.id)) && (
                                    <span className="inline-flex items-center gap-1 rounded bg-purple-100 text-purple-800 border border-purple-200 px-1.5 py-0.2 text-[9px] font-bold shrink-0">
                                      <CheckCircle2 className="h-2.5 w-2.5 text-purple-600" />
                                      Previously Broadcasted
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-semibold text-slate-800 leading-snug">
                                  <RichContent html={q.question} inline inheritText />
                                </div>
                              </div>
                            </div>

                            {/* Delete question button in live session */}
                            <button
                              type="button"
                              onClick={() => handleRemoveQuestionFromQuiz(quiz.id, item.questionId)}
                              disabled={isSaving}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition shrink-0"
                              title="Delete this question from this quiz pack"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Options grid */}
                          {Array.isArray(options) && options.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-7">
                              {options.map((optText: string, optIdx: number) => {
                                const isCorrect =
                                  String(q.correctAnswer) === String(optIdx) ||
                                  String(q.correctAnswer)?.toLowerCase() === String(optText).toLowerCase();

                                return (
                                  <div
                                    key={optIdx}
                                    className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${
                                      isCorrect
                                        ? 'bg-emerald-100/70 text-emerald-900 font-medium'
                                        : 'bg-slate-50 text-slate-600'
                                    }`}
                                  >
                                    <span className="font-bold text-[9px]">
                                      {String.fromCharCode(65 + optIdx)}.
                                    </span>
                                    <span className="truncate">{optText}</span>
                                    {isCorrect && (
                                      <Check className="h-3 w-3 text-emerald-600 shrink-0 ml-auto" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
