import { create } from 'zustand';

import { readJson, sessionStorage, writeJson } from '@/core/storage/kv-storage';

import type { AnswerValue, GradedResult } from '../types/assessment.types';

/**
 * Quiz runner state (architecture §6.7). Answers are mirrored to local storage per attempt so
 * an app kill mid-quiz resumes with the same answers (the server resumes the same attemptId).
 */
interface QuizRunnerState {
  assessmentId: string | null;
  attemptId: string | null;
  /** Epoch ms; null for untimed quizzes. */
  deadline: number | null;
  questionOrder: string[];
  answers: Record<string, AnswerValue>;
  index: number;
  lastResult: GradedResult | null;
  begin: (init: {
    assessmentId: string;
    attemptId: string;
    deadline: number | null;
    questionOrder: string[];
  }) => void;
  setAnswer: (questionId: string, value: AnswerValue | undefined) => void;
  goTo: (index: number) => void;
  finish: (result: GradedResult) => void;
  reset: () => void;
}

const answersKey = (attemptId: string) => `quiz-answers:${attemptId}`;

export const useQuizRunnerStore = create<QuizRunnerState>((set, get) => ({
  assessmentId: null,
  attemptId: null,
  deadline: null,
  questionOrder: [],
  answers: {},
  index: 0,
  lastResult: null,

  begin: ({ assessmentId, attemptId, deadline, questionOrder }) =>
    set({
      assessmentId,
      attemptId,
      deadline,
      questionOrder,
      answers: readJson<Record<string, AnswerValue>>(sessionStorage, answersKey(attemptId)) ?? {},
      index: 0,
      lastResult: null,
    }),

  setAnswer: (questionId, value) => {
    const { attemptId, answers } = get();
    const next = { ...answers };
    if (value === undefined || value === '') delete next[questionId];
    else next[questionId] = value;
    if (attemptId) writeJson(sessionStorage, answersKey(attemptId), next);
    set({ answers: next });
  },

  goTo: (index) => set({ index }),

  finish: (result) => {
    const { attemptId } = get();
    if (attemptId) sessionStorage.remove(answersKey(attemptId));
    set({ lastResult: result, attemptId: null, deadline: null });
  },

  reset: () =>
    set({
      assessmentId: null,
      attemptId: null,
      deadline: null,
      questionOrder: [],
      answers: {},
      index: 0,
    }),
}));
