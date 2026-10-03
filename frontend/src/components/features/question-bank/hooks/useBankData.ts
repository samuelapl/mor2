import { useEffect, useState } from 'react';
import { fetchQuestionBank } from '@/lib/api/quiz';
import { fetchCourseModules } from '@/lib/api/courses';
import type { ApiModule } from '@/lib/api/types';
import type { BankQuestion } from '../types';
import { toBankQuestion } from '../utils';

/** Questions and curriculum modules for the selected course. */
export function useBankData(selectedCourseId: string) {
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  const [courseModules, setCourseModules] = useState<ApiModule[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);

  const loadQuestions = async (cId: string) => {
    setLoadingQuestions(true);
    try {
      const items = await fetchQuestionBank({
        courseId: cId || undefined,
        includeGlobal: true,
      });
      setQuestions(items.map(toBankQuestion));
    } catch (err) {
      console.error('Failed to load question bank:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadModules = async (cId: string) => {
    if (!cId) return;
    setLoadingModules(true);
    try {
      const mods = await fetchCourseModules(cId);
      setCourseModules(mods || []);
    } catch (err) {
      console.error('Failed to load course modules:', err);
      setCourseModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    if (selectedCourseId) {
      loadQuestions(selectedCourseId);
      loadModules(selectedCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  return {
    questions,
    setQuestions,
    loadingQuestions,
    loadQuestions,
    courseModules,
    loadingModules,
  };
}
