import { create } from 'zustand';

import type { RoleName } from '@/core/api/types';
import { tokenStore } from '@/core/auth/tokens';
import { useLocaleStore } from '@/core/i18n';
import { readJson, sessionStorage, writeJson } from '@/core/storage/kv-storage';

import type { ApiUser, SessionPayload } from '../types/auth.types';

/**
 * Authenticated session (LEARNER_MOBILE_ARCHITECTURE.md §6.2).
 * Tokens live in tokenStore; the user + permissions are cached in expo-sqlite (kv-storage.ts) so the
 * app opens straight to the tabs after a restart, even offline.
 */

const USER_KEY = 'user';
const PERMISSIONS_KEY = 'permissions';

interface SessionState {
  isSignedIn: boolean;
  user: ApiUser | null;
  permissions: string[];
  /** Persists a new session (login, first-login completion, refresh). */
  setSession: (payload: SessionPayload) => Promise<void>;
  /** Replaces the cached user after profile updates. */
  setUser: (user: ApiUser) => void;
  /** Clears local state only — callers handle the server logout and cache reset. */
  clearSession: () => Promise<void>;
}

const cachedUser = readJson<ApiUser>(sessionStorage, USER_KEY);

export const useSessionStore = create<SessionState>((set) => ({
  isSignedIn: tokenStore.hasSession() && cachedUser !== null,
  user: cachedUser,
  permissions: readJson<string[]>(sessionStorage, PERMISSIONS_KEY) ?? [],

  setSession: async (payload) => {
    await tokenStore.setTokens(payload);
    writeJson(sessionStorage, USER_KEY, payload.user);
    writeJson(sessionStorage, PERMISSIONS_KEY, payload.permissions);
    if (payload.user.locale === 'en' || payload.user.locale === 'am') {
      useLocaleStore.getState().setLocale(payload.user.locale);
    }
    set({ isSignedIn: true, user: payload.user, permissions: payload.permissions });
  },

  setUser: (user) => {
    writeJson(sessionStorage, USER_KEY, user);
    set({ user });
  },

  clearSession: async () => {
    await tokenStore.clear();
    sessionStorage.remove(USER_KEY);
    sessionStorage.remove(PERMISSIONS_KEY);
    set({ isSignedIn: false, user: null, permissions: [] });
  },
}));

export const roleNamesOf = (user: ApiUser | null): RoleName[] =>
  user?.roles?.map((r) => r.role) ?? [];

/** This app is for learners only (architecture §6.2). */
export const isLearner = (user: ApiUser | null): boolean => roleNamesOf(user).includes('LEARNER');

export const selectIsAuthenticated = (s: SessionState) => s.isSignedIn;
