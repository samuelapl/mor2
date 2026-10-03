import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchQuestionBank, type ApiQuestionBankQuestion } from '@/lib/api/quiz';
import { fetchCourseDetail, fetchCourseModules } from '@/lib/api/courses';
import type { ApiLesson, ApiModule } from '@/lib/api/types';
import { toast } from '@/lib/toast';

/** Module filter values besides a module id. */
export const ALL = 'ALL';
export const COURSE_GENERAL = 'COURSE_GENERAL';
export const GLOBAL = 'GLOBAL';

const titleOf = (item: { title?: string; titleEn?: string }) => item.title || item.titleEn || '';

export interface BankFilters {
  search: string;
  moduleId: string;
  lessonId: string;
  subLessonId: string;
  type: string;
}

const NO_FILTERS: BankFilters = { search: '', moduleId: ALL, lessonId: ALL, subLessonId: ALL, type: ALL };

/**
 * The course's question bank (plus reusable questions) with curriculum filters, search,
 * multi-select and random picking. `excludeIds` are questions already in the active quiz.
 */
export function useQuestionBankBrowser(courseId: string, excludeIds: Set<string>) {
  const [courseCode, setCourseCode] = useState<string>('');
  const [modules, setModules] = useState<ApiModule[]>([]);
  const [questions, setQuestions] = useState<ApiQuestionBankQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<BankFilters>(NO_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    try {
      const [course, mods, bank] = await Promise.all([
        fetchCourseDetail(courseId).catch(() => null),
        fetchCourseModules(courseId).catch(() => [] as ApiModule[]),
        fetchQuestionBank({ courseId, includeGlobal: true }).catch(() => [] as ApiQuestionBankQuestion[]),
      ]);
      setCourseCode(course?.code ?? '');
      setModules(mods ?? []);
      setQuestions(Array.isArray(bank) ? bank : []);
    } catch {
      toast.error('Failed to load course questions');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeModule = useMemo(
    () => modules.find((m) => m.id === filters.moduleId) ?? null,
    [modules, filters.moduleId],
  );
  const lessons: ApiLesson[] = activeModule?.lessons ?? [];
  const activeLesson = lessons.find((l) => l.id === filters.lessonId) ?? null;
  const subLessons: ApiLesson[] = activeLesson?.subLessons ?? [];

  /** Changing a level clears the narrower ones. */
  const setFilter = <K extends keyof BankFilters>(key: K, value: BankFilters[K]) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'moduleId') {
        next.lessonId = ALL;
        next.subLessonId = ALL;
      }
      if (key === 'lessonId') next.subLessonId = ALL;
      return next;
    });
  };
  const resetFilters = () => setFilters(NO_FILTERS);
  const hasFilters =
    filters.search !== '' ||
    filters.moduleId !== ALL ||
    filters.lessonId !== ALL ||
    filters.subLessonId !== ALL ||
    filters.type !== ALL;

  const filtered = useMemo(() => {
    const query = filters.search.trim().toLowerCase();
    return questions.filter((q) => {
      if (query) {
        const inText = q.question.toLowerCase().includes(query);
        const inCategory = (q.category || '').toLowerCase().includes(query);
        const inOptions = Array.isArray(q.options) && q.options.some((o) => String(o).toLowerCase().includes(query));
        if (!inText && !inCategory && !inOptions) return false;
      }
      if (filters.moduleId === COURSE_GENERAL) {
        if (q.moduleId || !q.courseId) return false;
      } else if (filters.moduleId === GLOBAL) {
        if (q.courseId) return false;
      } else if (filters.moduleId !== ALL && q.moduleId !== filters.moduleId) {
        return false;
      }
      if (filters.lessonId !== ALL && q.lessonId !== filters.lessonId) return false;
      if (filters.subLessonId !== ALL && q.subLessonId !== filters.subLessonId) return false;
      if (filters.type !== ALL && q.type !== filters.type) return false;
      return true;
    });
  }, [questions, filters]);

  /** Where a bank question lives, e.g. "Module 1 › Lesson 2". */
  const locationOf = useCallback(
    (q: ApiQuestionBankQuestion): string => {
      if (!q.courseId) return 'Reusable';
      const mod = modules.find((m) => m.id === q.moduleId);
      if (!mod) return 'Course level';
      const lesson = (mod.lessons ?? []).find((l) => l.id === q.lessonId);
      const sub = lesson?.subLessons?.find((s) => s.id === q.subLessonId);
      return [mod, lesson, sub].filter(Boolean).map((x) => titleOf(x!)).join(' › ');
    },
    [modules],
  );

  const available = useMemo(() => filtered.filter((q) => !excludeIds.has(q.id)), [filtered, excludeIds]);

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const clearSelection = () => setSelectedIds(new Set());
  const selectedQuestions = useMemo(() => questions.filter((q) => selectedIds.has(q.id)), [questions, selectedIds]);

  /** Selects `count` random questions from the current filter that aren't in the quiz yet. */
  const pickRandom = (count: number) => {
    if (available.length === 0) {
      toast.error('No questions left that match the filter');
      return;
    }
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, Math.min(count, available.length));
    setSelectedIds(new Set(picked.map((q) => q.id)));
  };

  return {
    courseCode,
    modules,
    lessons,
    subLessons,
    loading,
    filters,
    setFilter,
    resetFilters,
    hasFilters,
    filtered,
    availableCount: available.length,
    locationOf,
    titleOf,
    selectedIds,
    selectedQuestions,
    toggle,
    clearSelection,
    pickRandom,
  };
}

export type QuestionBankBrowser = ReturnType<typeof useQuestionBankBrowser>;
