import { create } from 'zustand';
import {
  fetchPreparedQuizzes,
  createPreparedQuiz,
  updatePreparedQuiz,
  deletePreparedQuiz,
  bulkAddPreparedQuestions,
  removePreparedQuestion,
  reorderPreparedQuestions,
  type PreparedQuizGroup,
} from '@/lib/api/prepared-quiz';

interface PreparedQuizState {
  sessionId: string | null;
  quizzes: PreparedQuizGroup[];
  activeQuizId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface PreparedQuizActions {
  loadForSession: (sessionId: string) => Promise<void>;
  reload: (sessionId: string) => Promise<void>;
  setActiveQuizId: (quizId: string | null) => void;
  createQuiz: (sessionId: string, title?: string, timeLimitMinutes?: number) => Promise<PreparedQuizGroup>;
  updateQuiz: (sessionId: string, quizId: string, updates: { title?: string; timeLimitMinutes?: number }) => Promise<void>;
  deleteQuiz: (sessionId: string, quizId: string) => Promise<void>;
  bulkAddQuestions: (sessionId: string, quizId: string, questionIds: string[]) => Promise<void>;
  removeQuestion: (sessionId: string, quizId: string, questionId: string) => Promise<void>;
  reorderQuestions: (sessionId: string, quizId: string, orderedIds: string[]) => Promise<void>;
  reset: () => void;
}

type PreparedQuizStore = PreparedQuizState & PreparedQuizActions;

const INITIAL: PreparedQuizState = {
  sessionId: null,
  quizzes: [],
  activeQuizId: null,
  isLoading: false,
  isSaving: false,
  error: null,
};

export const usePreparedQuizStore = create<PreparedQuizStore>((set, get) => ({
  ...INITIAL,

  setActiveQuizId: (quizId) => set({ activeQuizId: quizId }),

  loadForSession: async (sessionId) => {
    if (get().sessionId === sessionId && get().quizzes.length > 0) return;
    await get().reload(sessionId);
  },

  reload: async (sessionId) => {
    set({ isLoading: true, error: null, sessionId });
    try {
      const quizzes = await fetchPreparedQuizzes(sessionId);
      const currentActive = get().activeQuizId;
      const validActive = quizzes.some((q) => q.id === currentActive)
        ? currentActive
        : quizzes.length > 0
        ? quizzes[0].id
        : null;

      set({
        quizzes,
        activeQuizId: validActive,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err.message || 'Failed to load prepared quizzes' });
    }
  },

  createQuiz: async (sessionId, title, timeLimitMinutes = 3) => {
    set({ isSaving: true, error: null });
    try {
      const created = await createPreparedQuiz(sessionId, { title, timeLimitMinutes });
      set((s) => ({
        quizzes: [...s.quizzes, created].sort((a, b) => a.order - b.order),
        activeQuizId: created.id,
        isSaving: false,
      }));
      return created;
    } catch (err: any) {
      set({ isSaving: false, error: err.message || 'Failed to create quiz' });
      throw err;
    }
  },

  updateQuiz: async (sessionId, quizId, updates) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await updatePreparedQuiz(sessionId, quizId, updates);
      set((s) => ({
        quizzes: s.quizzes.map((q) => (q.id === quizId ? updated : q)),
        isSaving: false,
      }));
    } catch (err: any) {
      set({ isSaving: false, error: err.message || 'Failed to update quiz' });
      throw err;
    }
  },

  deleteQuiz: async (sessionId, quizId) => {
    const previous = get().quizzes;
    set((s) => {
      const nextQuizzes = s.quizzes.filter((q) => q.id !== quizId);
      return {
        quizzes: nextQuizzes,
        activeQuizId: s.activeQuizId === quizId ? (nextQuizzes[0]?.id ?? null) : s.activeQuizId,
        isSaving: true,
      };
    });

    try {
      await deletePreparedQuiz(sessionId, quizId);
      set({ isSaving: false });
    } catch (err: any) {
      set({ quizzes: previous, isSaving: false, error: err.message || 'Failed to delete quiz' });
      throw err;
    }
  },

  bulkAddQuestions: async (sessionId, quizId, questionIds) => {
    set({ isSaving: true, error: null });
    try {
      const updatedQuiz = await bulkAddPreparedQuestions(sessionId, quizId, questionIds);
      set((s) => ({
        quizzes: s.quizzes.map((q) => (q.id === quizId ? updatedQuiz : q)),
        isSaving: false,
      }));
    } catch (err: any) {
      set({ isSaving: false, error: err.message || 'Failed to add questions' });
      throw err;
    }
  },

  removeQuestion: async (sessionId, quizId, questionId) => {
    // Optimistic remove
    const previous = get().quizzes;
    set((s) => ({
      quizzes: s.quizzes.map((quiz) => {
        if (quiz.id !== quizId) return quiz;
        return {
          ...quiz,
          questions: quiz.questions.filter((q) => q.questionId !== questionId),
        };
      }),
      isSaving: true,
    }));

    try {
      await removePreparedQuestion(sessionId, quizId, questionId);
      set({ isSaving: false });
    } catch (err: any) {
      set({ quizzes: previous, isSaving: false, error: err.message || 'Failed to remove question' });
      throw err;
    }
  },

  reorderQuestions: async (sessionId, quizId, orderedIds) => {
    const previous = get().quizzes;
    set({ isSaving: true, error: null });
    try {
      const updatedQuiz = await reorderPreparedQuestions(sessionId, quizId, orderedIds);
      set((s) => ({
        quizzes: s.quizzes.map((q) => (q.id === quizId ? updatedQuiz : q)),
        isSaving: false,
      }));
    } catch (err: any) {
      set({ quizzes: previous, isSaving: false, error: err.message || 'Failed to reorder questions' });
      throw err;
    }
  },

  reset: () => set(INITIAL),
}));
