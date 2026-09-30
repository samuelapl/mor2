'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BookOpen,
  CheckSquare,
  Loader2,
  Search,
  Trash2,
  X,
  ListChecks,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { usePreparedQuizStore } from '@/lib/stores/prepared-quiz-store';
import { fetchQuestionBank, type ApiQuestionBankQuestion } from '@/lib/api/quiz';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { PreparedQuizBadge } from './PreparedQuizBadge';

interface PreparedQuizManagerProps {
  sessionId: string;
  courseId: string;
}

export function PreparedQuizManager({ sessionId, courseId }: PreparedQuizManagerProps) {
  const { questions, isLoading, isSaving, error, loadForSession, bulkAdd, removeQuestion, clearAll } =
    usePreparedQuizStore();

  // ─── Bank browsing state ───────────────────────────────────────────────────
  const [bankQuestions, setBankQuestions] = useState<ApiQuestionBankQuestion[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load prepared quiz for this session
  useEffect(() => {
    loadForSession(sessionId);
  }, [sessionId, loadForSession]);

  // Load question bank for this course
  const loadBank = useCallback(async () => {
    setBankLoading(true);
    try {
      const data = await fetchQuestionBank({ courseId, includeGlobal: true });
      setBankQuestions(Array.isArray(data) ? data : (data as any).data ?? []);
    } catch {
      toast.error('Failed to load question bank');
    } finally {
      setBankLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadBank();
  }, [loadBank]);

  // ─── Derived ───────────────────────────────────────────────────────────────
  const preparedIds = new Set(questions.map((q) => q.questionId));

  const filteredBank = bankQuestions.filter(
    (q) =>
      !preparedIds.has(q.id) &&
      (search === '' ||
        q.question.toLowerCase().includes(search.toLowerCase()) ||
        (q.category ?? '').toLowerCase().includes(search.toLowerCase())),
  );

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleBulkAdd = async () => {
    if (selectedIds.size === 0) return;
    try {
      await bulkAdd(sessionId, Array.from(selectedIds));
      setSelectedIds(new Set());
      toast.success(`${selectedIds.size} question${selectedIds.size > 1 ? 's' : ''} added`);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to add questions');
    }
  };

  const handleRemove = async (questionId: string) => {
    try {
      await removeQuestion(sessionId, questionId);
      toast.success('Question removed');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to remove question');
    }
  };

  const handleClearAll = async () => {
    if (questions.length === 0) return;
    try {
      await clearAll(sessionId);
      toast.success('Prepared quiz cleared');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to clear questions');
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full min-h-0">
      {/* ── LEFT: Question Bank Browser ─────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-slate-800">Question Bank</h3>
            {!bankLoading && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                {filteredBank.length} available
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button
                size="sm"
                onClick={handleBulkAdd}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs shadow-sm gap-1.5"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckSquare className="h-3.5 w-3.5" />}
                Add {selectedIds.size} Selected
              </Button>
            )}
            <button
              onClick={loadBank}
              className="p-1.5 text-slate-400 hover:text-indigo-500 transition"
              title="Refresh question bank"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3.5 py-2 text-xs text-slate-900 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Bank list */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-380px)]">
          {bankLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : filteredBank.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Filter className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">
                {search ? 'No questions match your search' : 'All questions are already prepared'}
              </p>
            </div>
          ) : (
            filteredBank.map((q) => {
              const selected = selectedIds.has(q.id);
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => toggleSelect(q.id)}
                  className={`w-full text-left rounded-xl border p-3 transition shadow-2xs ${
                    selected
                      ? 'border-indigo-300 bg-indigo-50 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 bg-white hover:border-indigo-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        selected
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {selected && (
                        <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 fill-white">
                          <path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {q.type === 'MULTIPLE_CHOICE' ? 'MCQ' : q.type === 'TRUE_FALSE' ? 'T/F' : 'Short'}
                        </span>
                        <span className="text-[10px] text-slate-400">· {q.points} pts</span>
                        {q.category && q.category !== 'General' && (
                          <span className="text-[10px] text-slate-400 truncate">· {q.category}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 leading-snug line-clamp-2">{q.question}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── RIGHT: Prepared Quiz List ───────────────────────────────────── */}
      <div className="lg:w-80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800">Prepared Quiz</h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                questions.length > 0
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-slate-100 text-slate-400'
              }`}
            >
              {questions.length} question{questions.length !== 1 ? 's' : ''}
            </span>
          </div>
          {questions.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={isSaving}
              className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition disabled:opacity-40"
            >
              <Trash2 className="h-3 w-3" /> Clear all
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-380px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-12 text-center">
              <ListChecks className="h-8 w-8 text-slate-200 mb-2" />
              <p className="text-xs font-medium text-slate-400">No questions prepared yet</p>
              <p className="text-[11px] text-slate-300 mt-1">Select questions from the bank and add them</p>
            </div>
          ) : (
            questions.map((item, idx) => (
              <PreparedQuizBadge
                key={item.id}
                item={item}
                index={idx}
                onRemove={handleRemove}
                isSaving={isSaving}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
