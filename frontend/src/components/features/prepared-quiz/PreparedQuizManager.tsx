'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  HelpCircle,
  Layers,
  ListOrdered,
  ListPlus,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Sparkles,
  ToggleLeft,
  Trash2,
  X,
} from 'lucide-react';
import { usePreparedQuizStore } from '@/lib/stores/prepared-quiz-store';
import { fetchQuestionBank, type ApiQuestionBankQuestion } from '@/lib/api/quiz';
import { fetchCourseDetail, fetchCourseModules } from '@/lib/api/courses';
import type { ApiModule, ApiLesson } from '@/lib/api/types';
import { toast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';

interface PreparedQuizManagerProps {
  sessionId: string;
  courseId: string;
}

export function PreparedQuizManager({ sessionId, courseId }: PreparedQuizManagerProps) {
  const {
    quizzes,
    activeQuizId,
    isLoading,
    isSaving,
    error,
    loadForSession,
    setActiveQuizId,
    createQuiz,
    updateQuiz,
    deleteQuiz,
    bulkAddQuestions,
    removeQuestion,
  } = usePreparedQuizStore();

  // ─── Course & Modules & Question Bank State ────────────────────────────────
  const [courseInfo, setCourseInfo] = useState<{ code?: string; titleEn?: string } | null>(null);
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [bankQuestions, setBankQuestions] = useState<ApiQuestionBankQuestion[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);

  // ─── Filters matching Live Session Question Bank ───────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState<string>('ALL');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('ALL');
  const [selectedSubLessonId, setSelectedSubLessonId] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // ─── Amount of Questions & Selection ───────────────────────────────────────
  const [questionAmount, setQuestionAmount] = useState<number>(5);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<string>>(new Set());

  // ─── Load Session Quizzes on mount ─────────────────────────────────────────
  useEffect(() => {
    loadForSession(sessionId);
  }, [sessionId, loadForSession]);

  // Load course details, modules, and questions
  const loadData = useCallback(async () => {
    if (!courseId) return;
    setLoadingBank(true);
    try {
      const [courseData, modulesData, questionsData] = await Promise.all([
        fetchCourseDetail(courseId).catch(() => null),
        fetchCourseModules(courseId).catch(() => []),
        fetchQuestionBank({ courseId, includeGlobal: true }).catch(() => []),
      ]);
      if (courseData) {
        setCourseInfo({ code: courseData.code, titleEn: courseData.title || courseData.titleEn });
      }
      setModules(modulesData || []);
      setBankQuestions(Array.isArray(questionsData) ? questionsData : (questionsData as any).data || []);
    } catch {
      toast.error('Failed to load course questions');
    } finally {
      setLoadingBank(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // If no quiz exists yet after loading, create an initial default quiz group
  useEffect(() => {
    if (!isLoading && quizzes.length === 0 && sessionId) {
      createQuiz(sessionId, 'Lesson 1 Quiz', 3).catch(() => {});
    }
  }, [isLoading, quizzes.length, sessionId, createQuiz]);

  const activeQuiz = useMemo(() => {
    if (!activeQuizId) return quizzes[0] || null;
    return quizzes.find((q) => q.id === activeQuizId) || quizzes[0] || null;
  }, [quizzes, activeQuizId]);

  // ─── Curriculum Hierarchy Navigation ───────────────────────────────────────
  const activeModule = useMemo(() => {
    if (selectedModuleId === 'ALL' || selectedModuleId === 'COURSE_GENERAL' || selectedModuleId === 'GLOBAL') {
      return null;
    }
    return modules.find((m) => m.id === selectedModuleId) || null;
  }, [modules, selectedModuleId]);

  const activeModuleLessons = useMemo(() => {
    return activeModule?.lessons || [];
  }, [activeModule]);

  const activeLesson = useMemo(() => {
    if (selectedLessonId === 'ALL') return null;
    return activeModuleLessons.find((l) => l.id === selectedLessonId) || null;
  }, [activeModuleLessons, selectedLessonId]);

  const activeLessonSubLessons = useMemo(() => {
    return (activeLesson as any)?.subLessons || [];
  }, [activeLesson]);

  const curriculumBreadcrumb = useMemo(() => {
    const parts = [courseInfo?.code || 'Course'];
    if (selectedModuleId === 'COURSE_GENERAL') parts.push('Course General');
    else if (selectedModuleId === 'GLOBAL') parts.push('Global Questions');
    else if (activeModule) {
      parts.push((activeModule as any).title || activeModule.titleEn);
      if (activeLesson) {
        parts.push((activeLesson as any).title || activeLesson.titleEn);
        if (selectedSubLessonId !== 'ALL') {
          const sub = activeLessonSubLessons.find((s: any) => s.id === selectedSubLessonId);
          if (sub) parts.push(sub.title || sub.titleEn);
        }
      } else {
        parts.push('All Lessons');
      }
    } else {
      parts.push('All Modules & Lessons');
    }
    return parts.join(' > ');
  }, [courseInfo, selectedModuleId, activeModule, activeLesson, selectedSubLessonId, activeLessonSubLessons]);

  // ─── Filtered Question Bank Questions ──────────────────────────────────────
  const alreadyInActiveQuiz = useMemo(() => {
    if (!activeQuiz) return new Set<string>();
    return new Set(activeQuiz.questions.map((q) => q.questionId));
  }, [activeQuiz]);

  const filteredQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesQ = q.question.toLowerCase().includes(query);
        const matchesCategory = (q.category || '').toLowerCase().includes(query);
        const matchesOptions = Array.isArray(q.options)
          ? q.options.some((o: string) => String(o).toLowerCase().includes(query))
          : false;
        if (!matchesQ && !matchesCategory && !matchesOptions) return false;
      }

      // 2. Module Filter
      if (selectedModuleId === 'COURSE_GENERAL') {
        if (q.moduleId) return false;
      } else if (selectedModuleId === 'GLOBAL') {
        if (q.courseId) return false;
      } else if (selectedModuleId !== 'ALL') {
        if (q.moduleId !== selectedModuleId) return false;
      }

      // 3. Lesson Filter
      if (selectedLessonId !== 'ALL' && q.lessonId !== selectedLessonId) {
        return false;
      }

      // 4. Sub-Lesson Filter
      if (selectedSubLessonId !== 'ALL' && q.subLessonId !== selectedSubLessonId) {
        return false;
      }

      // 5. Question Type Filter
      if (typeFilter !== 'ALL' && q.type !== typeFilter) {
        return false;
      }

      return true;
    });
  }, [bankQuestions, searchQuery, selectedModuleId, selectedLessonId, selectedSubLessonId, typeFilter]);

  // ─── Actions & Handlers ───────────────────────────────────────────────────
  const handleToggleSelectQuestion = (id: string) => {
    setSelectedQuestionIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectRandom = () => {
    // Exclude questions already in the active quiz
    const available = filteredQuestions.filter((q) => !alreadyInActiveQuiz.has(q.id));
    if (available.length === 0) {
      toast.error('No remaining questions match the active filter');
      return;
    }
    const count = Math.min(questionAmount, available.length);
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const picked = shuffled.slice(0, count);
    setSelectedQuestionIds(new Set(picked.map((q) => q.id)));
    toast.success(`Selected ${count} random questions matching curriculum`);
  };

  const handleAddSelectedToQuiz = async () => {
    if (!activeQuiz) {
      toast.error('Please create or select a quiz group first');
      return;
    }
    if (selectedQuestionIds.size === 0) {
      toast.error('Please select at least one question to add');
      return;
    }

    try {
      await bulkAddQuestions(sessionId, activeQuiz.id, Array.from(selectedQuestionIds));
      setSelectedQuestionIds(new Set());
      toast.success(`Questions added to ${activeQuiz.title}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add questions');
    }
  };

  const handleCreateNewQuizGroup = async () => {
    const nextNum = quizzes.length + 1;
    try {
      const created = await createQuiz(sessionId, `Lesson ${nextNum} Quiz`, 3);
      toast.success(`Created "${created.title}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create quiz');
    }
  };

  const handleUpdateTitle = async (newTitle: string) => {
    if (!activeQuiz || !newTitle.trim()) return;
    try {
      await updateQuiz(sessionId, activeQuiz.id, { title: newTitle });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update title');
    }
  };

  const handleUpdateTimeLimit = async (minutes: number) => {
    if (!activeQuiz) return;
    try {
      await updateQuiz(sessionId, activeQuiz.id, { timeLimitMinutes: minutes });
      toast.success(`Timer set to ${minutes} mins for ${activeQuiz.title}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timer');
    }
  };

  const handleDeleteQuizGroup = async (quizId: string) => {
    if (quizzes.length <= 1) {
      toast.error('You must keep at least one quiz group');
      return;
    }
    try {
      await deleteQuiz(sessionId, quizId);
      toast.success('Quiz group removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quiz');
    }
  };

  const handleRemoveFromQuiz = async (questionId: string) => {
    if (!activeQuiz) return;
    try {
      await removeQuestion(sessionId, activeQuiz.id, questionId);
      toast.success('Question removed from quiz');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove question');
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── QUIZ GROUPS TABS / SELECTOR ───────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Prepared Quiz Groups for this Session ({quizzes.length})
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleCreateNewQuizGroup}
            disabled={isSaving}
            className="gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-none font-semibold"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Another Quiz Group
          </Button>
        </div>

        {/* Quiz Groups Pill Switcher */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {quizzes.map((q) => {
            const isActive = q.id === activeQuiz?.id;
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => setActiveQuizId(q.id)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition shrink-0 shadow-2xs ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{q.title}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {q.questions.length} Qs · {q.timeLimitMinutes}m
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Quiz Details & Whole-Quiz Timer Settings */}
        {activeQuiz && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                  Quiz Label:
                </label>
                <input
                  type="text"
                  defaultValue={activeQuiz.title}
                  key={activeQuiz.id + activeQuiz.title}
                  onBlur={(e) => handleUpdateTitle(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-900 outline-none focus:border-indigo-500 shadow-2xs max-w-xs"
                />
              </div>

              {/* Timer for whole quiz group */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 mr-1">
                  <Clock className="h-3.5 w-3.5 text-indigo-600" />
                  Whole-Quiz Timer:
                </span>
                {[1, 2, 3, 5, 7, 10, 15].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleUpdateTimeLimit(mins)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      activeQuiz.timeLimitMinutes === mins
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}

                <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 shadow-2xs">
                  <span className="text-[10px] text-slate-400 font-semibold">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={activeQuiz.timeLimitMinutes}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) handleUpdateTimeLimit(val);
                    }}
                    className="w-12 text-center text-xs font-bold text-slate-900 outline-none bg-white [color-scheme:light]"
                    placeholder="mins"
                  />
                  <span className="text-[10px] font-bold text-slate-500">mins</span>
                </div>

                {quizzes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteQuizGroup(activeQuiz.id)}
                    className="ml-2 p-1 text-slate-400 hover:text-red-600 transition"
                    title="Delete this quiz group"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              Active pack: <strong className="text-slate-700">{activeQuiz.title}</strong> will give learners{' '}
              <strong className="text-indigo-700">{activeQuiz.timeLimitMinutes} minutes</strong> total to submit all {activeQuiz.questions.length} questions when broadcasted during live session.
            </p>
          </div>
        )}
      </div>

      {/* ─── DUAL PANE: QUESTION BANK ON LEFT, ACTIVE QUIZ QUESTIONS ON RIGHT ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── LEFT: Question Bank (Curriculum Hierarchy + Filters) (7 cols) ─── */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search questions in ${courseInfo?.code || 'course'} by keyword or choice...`}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-8 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Curriculum Hierarchy Filter Box (Identical to live session) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                <Filter className="h-3.5 w-3.5 text-indigo-600" />
                <span>Curriculum Hierarchy Filter for {courseInfo?.code || 'Course'}</span>
              </div>

              {(selectedModuleId !== 'ALL' ||
                selectedLessonId !== 'ALL' ||
                selectedSubLessonId !== 'ALL' ||
                searchQuery ||
                typeFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModuleId('ALL');
                    setSelectedLessonId('ALL');
                    setSelectedSubLessonId('ALL');
                    setTypeFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* 4 Dedicated Dropdowns: Module, Lesson, Sub-lesson, Question Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
              {/* 1. Module Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  1. Module
                </label>
                <select
                  value={selectedModuleId}
                  onChange={(e) => {
                    setSelectedModuleId(e.target.value);
                    setSelectedLessonId('ALL');
                    setSelectedSubLessonId('ALL');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                >
                  <option value="ALL">All Modules ({modules.length})</option>
                  <option value="COURSE_GENERAL">Course General (No Module)</option>
                  <option value="GLOBAL">Reusable Global</option>
                  {modules.map((m, idx) => (
                    <option key={m.id} value={m.id}>
                      Module {idx + 1}: {(m as any).title || m.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Lesson Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  2. Lesson
                </label>
                <select
                  disabled={
                    selectedModuleId === 'ALL' ||
                    selectedModuleId === 'COURSE_GENERAL' ||
                    selectedModuleId === 'GLOBAL' ||
                    activeModuleLessons.length === 0
                  }
                  value={selectedLessonId}
                  onChange={(e) => {
                    setSelectedLessonId(e.target.value);
                    setSelectedSubLessonId('ALL');
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs disabled:opacity-40 disabled:bg-slate-50"
                >
                  <option value="ALL">
                    {selectedModuleId === 'ALL'
                      ? 'Select a module first'
                      : activeModuleLessons.length === 0
                      ? 'No lessons in module'
                      : `All Lessons (${activeModuleLessons.length})`}
                  </option>
                  {activeModuleLessons.map((l, idx) => (
                    <option key={l.id} value={l.id}>
                      Lesson {idx + 1}: {(l as any).title || l.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Sub-lesson Selector */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  3. Sub-lesson
                </label>
                <select
                  disabled={selectedLessonId === 'ALL' || activeLessonSubLessons.length === 0}
                  value={selectedSubLessonId}
                  onChange={(e) => setSelectedSubLessonId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs disabled:opacity-40 disabled:bg-slate-50"
                >
                  <option value="ALL">
                    {selectedLessonId === 'ALL'
                      ? 'Select a lesson first'
                      : activeLessonSubLessons.length === 0
                      ? 'No sub-lessons'
                      : `All Sub-lessons (${activeLessonSubLessons.length})`}
                  </option>
                  {activeLessonSubLessons.map((s: any, idx: number) => (
                    <option key={s.id} value={s.id}>
                      Sub-lesson {idx + 1}: {s.title || s.titleEn}
                    </option>
                  ))}
                </select>
              </div>

              {/* 4. Question Type */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 block">
                  4. Question Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 shadow-2xs"
                >
                  <option value="ALL">All Types</option>
                  <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                  <option value="TRUE_FALSE">True / False</option>
                </select>
              </div>
            </div>

            {/* Active Level Breadcrumb */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
              <span className="font-semibold">Active Level:</span>
              <strong className="text-indigo-900 font-mono truncate">{curriculumBreadcrumb}</strong>
              <span className="text-slate-400">({filteredQuestions.length} questions available)</span>
            </div>
          </div>

          {/* Amount of Questions & Random Selection Bar */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-700">Amount of Questions:</span>

                {/* Stepper */}
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setQuestionAmount((prev) => Math.max(1, prev - 1))}
                    className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, filteredQuestions.length)}
                    value={questionAmount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) setQuestionAmount(val);
                    }}
                    className="w-10 bg-transparent text-center text-xs font-bold text-slate-900 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setQuestionAmount((prev) => Math.min(Math.max(1, filteredQuestions.length), prev + 1))
                    }
                    className="h-6 w-6 rounded text-slate-500 hover:bg-slate-100 flex items-center justify-center font-bold text-xs"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="hidden sm:flex items-center gap-1">
                  {[1, 3, 5, 10].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuestionAmount(amt)}
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold transition ${
                        questionAmount === amt
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Select Random and Add to Quiz */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleSelectRandom}
                  className="gap-1.5 text-xs text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50 font-semibold"
                  title="Randomly select questions matching the active filter"
                >
                  <Shuffle className="h-3.5 w-3.5 text-indigo-600" />
                  Select Random ({questionAmount})
                </Button>

                {selectedQuestionIds.size > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddSelectedToQuiz}
                    disabled={isSaving || !activeQuiz}
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs"
                  >
                    <ListPlus className="h-3.5 w-3.5" />
                    Add {selectedQuestionIds.size} to {activeQuiz?.title || 'Quiz'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Questions Bank List with Checkboxes */}
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {loadingBank ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center">
                <BookOpen className="mx-auto h-8 w-8 text-slate-300 mb-1" />
                <p className="text-xs font-semibold text-slate-600">No questions found</p>
                <p className="text-[11px] text-slate-400">Try changing curriculum level or search query</p>
              </div>
            ) : (
              filteredQuestions.map((q) => {
                const isSelected = selectedQuestionIds.has(q.id);
                const isInCurrentQuiz = alreadyInActiveQuiz.has(q.id);

                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      if (!isInCurrentQuiz) handleToggleSelectQuestion(q.id);
                    }}
                    className={`rounded-xl border p-3 transition shadow-2xs cursor-pointer ${
                      isInCurrentQuiz
                        ? 'border-emerald-200 bg-emerald-50/40 opacity-70 cursor-default'
                        : isSelected
                        ? 'border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 bg-white hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                          isInCurrentQuiz
                            ? 'border-emerald-500 bg-emerald-500'
                            : isSelected
                            ? 'border-indigo-600 bg-indigo-600'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {(isSelected || isInCurrentQuiz) && (
                          <Check className="h-3 w-3 text-white stroke-[3]" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-600">
                            {q.type === 'MULTIPLE_CHOICE'
                              ? 'MCQ'
                              : q.type === 'TRUE_FALSE'
                              ? 'True/False'
                              : 'Short'}
                          </span>
                          <span className="text-[10px] text-slate-400">· {q.points || 10} pts</span>
                          {q.category && (
                            <span className="text-[10px] text-slate-400">· {q.category}</span>
                          )}
                          {isInCurrentQuiz && (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-bold text-emerald-800">
                              Already in this Quiz
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-slate-900 leading-snug">
                          {q.question}
                        </p>

                        {/* Options preview */}
                        {Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {q.options.map((opt: string, optIdx: number) => {
                              const isCorrect =
                                String(q.correctAnswer) === String(optIdx) ||
                                String(q.correctAnswer)?.toLowerCase() === String(opt).toLowerCase();
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
                                  <span className="truncate">{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ─── RIGHT: Prepared Questions in Active Quiz Group (5 cols) ───────── */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {activeQuiz?.title || 'Prepared Quiz'} Questions
                </h3>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {activeQuiz?.questions.length || 0}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Timer: {activeQuiz?.timeLimitMinutes || 3} mins total
              </p>
            </div>
          </div>

          {/* List of Questions inside the selected quiz */}
          <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
            {!activeQuiz || activeQuiz.questions.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-2">
                <HelpCircle className="mx-auto h-8 w-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No questions in this quiz yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Filter questions from the left, click checkboxes or "Select Random", and add them into this quiz.
                </p>
              </div>
            ) : (
              activeQuiz.questions.map((item, idx) => {
                const q = item.question;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs hover:border-indigo-200 transition"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600 border border-indigo-100">
                      {idx + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                          {q.type === 'MULTIPLE_CHOICE' ? 'MCQ' : q.type === 'TRUE_FALSE' ? 'T/F' : 'Short'}
                        </span>
                        <span className="text-[10px] text-slate-400">· {q.points || 10} pts</span>
                      </div>
                      <p className="text-xs font-medium text-slate-800 leading-snug line-clamp-2">
                        {q.question}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromQuiz(item.questionId)}
                      disabled={isSaving}
                      className="p-1 text-slate-300 hover:text-red-600 transition shrink-0"
                      title="Remove from this quiz"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
