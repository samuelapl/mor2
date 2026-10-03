import { useEffect, useMemo, useState } from 'react';
import { usePagination } from '@/lib/usePagination';
import type { ApiModule } from '@/lib/api/types';
import { ALL_QUESTIONS_NODE } from '../types';
import type { ActiveCurriculumNode, BankQuestion, ScopeFilter } from '../types';

interface UseQuestionFiltersArgs {
  questions: BankQuestion[];
  courseModules: ApiModule[];
  selectedCourseId: string;
}

/** Curriculum tree selection/expansion, list filters, per-node counts and pagination. */
export function useQuestionFilters({ questions, courseModules, selectedCourseId }: UseQuestionFiltersArgs) {
  const [activeCurriculumNode, setActiveCurriculumNode] = useState<ActiveCurriculumNode>(ALL_QUESTIONS_NODE);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterScope, setFilterScope] = useState<ScopeFilter>('ALL');

  // Switching course goes back to "All questions".
  useEffect(() => {
    if (selectedCourseId) setActiveCurriculumNode(ALL_QUESTIONS_NODE);
  }, [selectedCourseId]);

  // Freshly loaded modules start expanded.
  useEffect(() => {
    if (courseModules.length > 0) {
      setExpandedModules(new Set(courseModules.map((m) => m.id)));
    }
  }, [courseModules]);

  const toggleModuleAccordion = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  const toggleLessonAccordion = (lessonId: string) => {
    setExpandedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) next.delete(lessonId);
      else next.add(lessonId);
      return next;
    });
  };

  // Compute question counts for each node in the curriculum
  const questionCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: questions.filter((q) => !q.courseId || q.courseId === selectedCourseId).length,
      global: questions.filter((q) => !q.courseId).length,
      courseGeneral: questions.filter((q) => q.courseId === selectedCourseId && !q.moduleId).length,
    };

    questions.forEach((q) => {
      if (q.courseId === selectedCourseId || !q.courseId) {
        if (q.moduleId) {
          counts[`module_${q.moduleId}`] = (counts[`module_${q.moduleId}`] || 0) + 1;
        }
        if (q.lessonId) {
          counts[`lesson_${q.lessonId}`] = (counts[`lesson_${q.lessonId}`] || 0) + 1;
        }
        if (q.subLessonId) {
          counts[`sublesson_${q.subLessonId}`] = (counts[`sublesson_${q.subLessonId}`] || 0) + 1;
        }
      }
    });

    return counts;
  }, [questions, selectedCourseId]);

  const courseQuestions = useMemo(() => {
    return questions.filter((q) => !q.courseId || q.courseId === selectedCourseId);
  }, [questions, selectedCourseId]);

  const filteredQuestions = useMemo(() => {
    return courseQuestions.filter((q) => {
      // 1. Curriculum Node Filter
      if (activeCurriculumNode.type === 'GLOBAL') {
        if (q.courseId) return false;
      } else if (activeCurriculumNode.type === 'COURSE_GENERAL') {
        if (q.moduleId || !q.courseId) return false;
      } else if (activeCurriculumNode.type === 'MODULE') {
        if (q.moduleId !== activeCurriculumNode.id) return false;
      } else if (activeCurriculumNode.type === 'LESSON') {
        if (q.lessonId !== activeCurriculumNode.id) return false;
      } else if (activeCurriculumNode.type === 'SUB_LESSON') {
        if (q.subLessonId !== activeCurriculumNode.id) return false;
      }

      // 2. Search, Type, and Scope filters
      const matchesSearch =
        !searchQuery ||
        q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.options.some((o) => o.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (q.category || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = filterType === 'ALL' || q.type === filterType;
      const matchesScope =
        filterScope === 'ALL' ||
        (filterScope === 'GLOBAL' && !q.courseId) ||
        (filterScope === 'COURSE' && !!q.courseId);

      return matchesSearch && matchesType && matchesScope;
    });
  }, [courseQuestions, activeCurriculumNode, searchQuery, filterType, filterScope]);

  const questionsPage = usePagination(filteredQuestions, 10);

  return {
    activeCurriculumNode,
    setActiveCurriculumNode,
    expandedModules,
    expandedLessons,
    toggleModuleAccordion,
    toggleLessonAccordion,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterScope,
    setFilterScope,
    questionCounts,
    courseQuestions,
    filteredQuestions,
    questionsPage,
  };
}

export type QuestionFiltersState = ReturnType<typeof useQuestionFilters>;
