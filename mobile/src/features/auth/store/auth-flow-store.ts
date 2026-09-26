import { create } from 'zustand';

/**
 * Ephemeral state shared across multi-screen auth flows, kept out of route params so
 * challenge tokens and codes never appear in navigation state or deep links.
 */
interface AuthFlowState {
  /** Forgot-password flow (spec §2.5). */
  resetEmail: string;
  resetCode: string;
  /** First-login flow (spec §2.6). */
  challengeToken: string | null;
  maskedEmail: string;
  setResetEmail: (email: string) => void;
  setResetCode: (code: string) => void;
  setChallenge: (challengeToken: string, maskedEmail: string) => void;
  reset: () => void;
}

const initial = { resetEmail: '', resetCode: '', challengeToken: null, maskedEmail: '' };

export const useAuthFlowStore = create<AuthFlowState>((set) => ({
  ...initial,
  setResetEmail: (resetEmail) => set({ resetEmail }),
  setResetCode: (resetCode) => set({ resetCode }),
  setChallenge: (challengeToken, maskedEmail) => set({ challengeToken, maskedEmail }),
  reset: () => set(initial),
}));
