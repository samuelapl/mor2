import { create } from 'zustand';
import {
  fetchPreparedQuiz,
  addPreparedQuestion,
  bulkAddPreparedQuestions,
  removePreparedQuestion,
  clearPreparedQuiz,
  reorderPreparedQuiz,
  type PreparedQuestion,
} from '@/lib/api/prepared-quiz';

// ─── State shape ──────────────────────────────────────────────────────────────

interface PreparedQuizState {
  /** The session whose prepared quiz is currently loaded. */
  sessionId: string | null;
  /** The loaded prepared questions, sorted by order asc. */
  questions: PreparedQuestion[];
  /** True while the initial list is being fetched. */
  isLoading: boolean;
  /** True while an add / remove / reorder operation is in flight. */
  isSaving: boolean;
  /** Last error message, if any. Cleared on next successful operation. */
  error: string | null;
}

// ─── Actions shape ────────────────────────────────────────────────────────────

interface PreparedQuizActions {
  /** Load prepared questions for a session (no-op if already loaded for the same session). */
  loadForSession: (sessionId: string) => Promise<void>;
  /** Force-reload even if the same session is already loaded (e.g. after a server push). */
  reload: (sessionId: string) => Promise<void>;
  /** Add a single question. Returns the created row or throws. */
  addQuestion: (sessionId: string, questionId: string, order?: number) => Promise<void>;
  /** Bulk-add an array of question IDs. Silently skips duplicates. */
  bulkAdd: (sessionId: string, questionIds: string[]) => Promise<void>;
  /** Optimistically remove a question, rolls back on error. */
  removeQuestion: (sessionId: string, questionId: string) => Promise<void>;
  /** Clear all prepared questions for a session. */
  clearAll: (sessionId: string) => Promise<void>;
  /** Optimistically reorder by providing a new ordered list of question IDs. */
  reorder: (sessionId: string, orderedIds: string[]) => Promise<void>;
  /** Reset the store to its initial state (call on unmount / session change). */
  reset: () => void;
}

type PreparedQuizStore = PreparedQuizState & PreparedQuizActions;

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL: PreparedQuizState = {
  sessionId: null,
  questions: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const usePreparedQuizStore = create<PreparedQuizStore>((set, get) => ({
  ...INITIAL,

  loadForSession: async (sessionId) => {
    // No-op if already loaded for this session
    if (get().sessionId === sessionId && get().questions.length > 0) return;
    await get().reload(sessionId);
  },

  reload: async (sessionId) => {
    set({ isLoading: true, error: null, sessionId });
    try {
      const questions = await fetchPreparedQuiz(sessionId);
      set({ questions, isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: (err as Error).message });
    }
  },

  addQuestion: async (sessionId, questionId, order) => {
    set({ isSaving: true, error: null });
    try {
      const added = await addPreparedQuestion(sessionId, questionId, order);
      set((s) => ({
        questions: [...s.questions, added].sort((a, b) => a.order - b.order),
        isSaving: false,
      }));
    } catch (err) {
      set({ isSaving: false, error: (err as Error).message });
      throw err; // re-throw so the UI can show a toast
    }
  },

  bulkAdd: async (sessionId, questionIds) => {
    set({ isSaving: true, error: null });
    try {
      const added = await bulkAddPreparedQuestions(sessionId, questionIds);
      set((s) => {
        const existingIds = new Set(s.questions.map((q) => q.questionId));
        const newOnes = added.filter((a) => !existingIds.has(a.questionId));
        return {
          questions: [...s.questions, ...newOnes].sort((a, b) => a.order - b.order),
          isSaving: false,
        };
      });
    } catch (err) {
      set({ isSaving: false, error: (err as Error).message });
      throw err;
    }
  },

  removeQuestion: async (sessionId, questionId) => {
    // Optimistic update — remove immediately, restore on error
    const previous = get().questions;
    set((s) => ({
      questions: s.questions.filter((q) => q.questionId !== questionId),
      isSaving: true,
      error: null,
    }));
    try {
      await removePreparedQuestion(sessionId, questionId);
      set({ isSaving: false });
    } catch (err) {
      set({ questions: previous, isSaving: false, error: (err as Error).message });
      throw err;
    }
  },

  clearAll: async (sessionId) => {
    const previous = get().questions;
    set({ questions: [], isSaving: true, error: null });
    try {
      await clearPreparedQuiz(sessionId);
      set({ isSaving: false });
    } catch (err) {
      set({ questions: previous, isSaving: false, error: (err as Error).message });
      throw err;
    }
  },

  reorder: async (sessionId, orderedIds) => {
    // Optimistic reorder
    const previous = get().questions;
    set((s) => ({
      questions: orderedIds
        .map((id) => s.questions.find((q) => q.questionId === id))
        .filter((q): q is PreparedQuestion => q !== undefined),
      isSaving: true,
      error: null,
    }));
    try {
      const updated = await reorderPreparedQuiz(sessionId, orderedIds);
      set({ questions: updated, isSaving: false });
    } catch (err) {
      set({ questions: previous, isSaving: false, error: (err as Error).message });
      throw err;
    }
  },

  reset: () => set(INITIAL),
}));
