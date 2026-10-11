'use client';

import { create } from 'zustand';

import { isValidEmail, passwordIssues } from '@/constants/auth';
import { setAccessToken, setRefreshHandler, setUnauthorizedHandler } from '@/lib/api/client';
import {
  clearFirstLoginChallenge,
  completeFirstLogin as apiCompleteFirstLogin,
  login as apiLogin,
  logout as apiLogout,
  readFirstLoginChallenge,
  saveFirstLoginChallenge,
  type AuthResult,
  refresh as apiRefresh,
  register as apiRegister,
  verifyEmail as apiVerifyEmail,
} from '@/lib/api/auth';
import { getStoredAccessToken, getStoredRefreshToken, clearTokens } from '@/lib/api/tokens';
import { changeMyPassword, updateMyProfile } from '@/lib/api/users';
import type { ActionResult, Lang, LoginResult, User } from '@/types';

import { getStoredLocale, persistLocale, useLocaleStore } from './locale-store';
import { reloadAll, resetAll, seedUserName } from './session-data';
import { errorMessage } from './store-utils';

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  department?: string;
  tin?: string;
}

export type RegisterResult = { ok: true; email: string; devCode?: string } | { ok: false; message: string };

let authInitialized = false;

interface AuthState {
  ready: boolean;
  currentUser: User | null;
}

interface AuthActions {
  /** Restores the session from the stored refresh token. Runs once per page load. */
  initAuth: () => void;
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Finishes the forced password change of an admin-created account and signs it in. */
  completeFirstLogin: (input: { code: string; newPassword: string; confirmPassword: string }) => Promise<LoginResult>;
  /** Verifies a self-registered account with its emailed code and signs it in. */
  verifyEmail: (email: string, code: string) => Promise<LoginResult>;
  logout: () => void;
  /** Clears the in-memory session (token, user and all user-scoped data). */
  clearSession: () => void;
  /** Creates the account; the user then verifies their email before signing in. */
  register: (input: RegisterInput) => Promise<RegisterResult>;
  updateProfile: (input: { firstName?: string; lastName?: string; phone?: string; tin?: string; avatarUrl?: string }) => Promise<ActionResult>;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<ActionResult>;
  /** Saves the chosen language on the signed-in user's profile (no-op when signed out).
   * The UI language itself lives in the locale store. */
  syncLocale: (locale: Lang) => Promise<ActionResult>;
  /** Re-fetches the signed-in user's own permissions/roles (e.g. after editing a role's
   * permission matrix) so the sidebar and permission-gated pages react without a re-login. */
  refreshPermissions: () => Promise<void>;
}

export type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()((set, get) => {
  const enterSession = async (res: AuthResult): Promise<LoginResult> => {
    setAccessToken(res.accessToken);
    set({ currentUser: res.user });
    const storedLocale = getStoredLocale();
    if (storedLocale) {
      useLocaleStore.setState({ lang: storedLocale });
      if (res.user.locale && res.user.locale !== storedLocale) {
        void updateMyProfile({ locale: storedLocale }).catch(() => {});
      }
    } else if (res.user.locale === 'am' || res.user.locale === 'en') {
      useLocaleStore.setState({ lang: res.user.locale });
      persistLocale(res.user.locale);
    }
    seedUserName(res.user);
    await reloadAll(res.user);
    return { ok: true, role: res.user.role, user: res.user };
  };

  return {
    ready: false,
    currentUser: null,

    initAuth: () => {
      if (authInitialized) return;
      authInitialized = true;

      setAccessToken(getStoredAccessToken());
      setRefreshHandler(async () => {
        try {
          const res = await apiRefresh();
          setAccessToken(res.accessToken);
          set({ currentUser: res.user });
          return res.accessToken;
        } catch {
          return null;
        }
      });
      setUnauthorizedHandler(() => {
        clearTokens();
        get().clearSession();
      });

      void (async () => {
        const refreshToken = getStoredRefreshToken();
        if (refreshToken) {
          try {
            const res = await apiRefresh();
            setAccessToken(res.accessToken);
            set({ currentUser: res.user });
            await reloadAll(res.user);
          } catch {
            clearTokens();
            get().clearSession();
          }
        }
        set({ ready: true });
      })();
    },

    login: async (email, password) => {
      try {
        const res = await apiLogin(email.trim(), password);
        if ('passwordChangeRequired' in res) {
          saveFirstLoginChallenge({
            challengeToken: res.challengeToken,
            email: res.email,
            devCode: res.devCode,
          });
          return {
            ok: false,
            passwordChangeRequired: true,
            message: 'You need to set a new password before continuing.',
            devCode: res.devCode,
          };
        }
        if ('emailVerificationRequired' in res) {
          return {
            ok: false,
            emailVerificationRequired: true,
            message: 'Please verify your email. We sent a code to your inbox.',
            devCode: res.devCode,
          };
        }
        return await enterSession(res);
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Unable to sign in. Please try again.'),
        };
      }
    },

    verifyEmail: async (email, code) => {
      try {
        return await enterSession(await apiVerifyEmail(email, code));
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Could not verify your email. Please try again.'),
        };
      }
    },

    completeFirstLogin: async ({ code, newPassword, confirmPassword }) => {
      const challenge = readFirstLoginChallenge();
      if (!challenge) {
        return {
          ok: false,
          message: 'Your password-change session has expired. Please sign in again.',
        };
      }
      try {
        const res = await apiCompleteFirstLogin({
          challengeToken: challenge.challengeToken,
          code,
          newPassword,
          confirmPassword,
        });
        clearFirstLoginChallenge();
        return await enterSession(res);
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Could not change your password. Please try again.'),
        };
      }
    },

    clearSession: () => {
      setAccessToken(null);
      set({ currentUser: null });
      resetAll();
    },

    logout: () => {
      void apiLogout();
      get().clearSession();
    },

    register: async (input) => {
      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      const email = input.email.trim().toLowerCase();
      const phone = input.phone.trim();
      const tin = input.tin?.trim();

      if (!firstName || !lastName || !email || !phone || !input.password) {
        return { ok: false, message: 'Please fill in all required fields.' };
      }
      if (!isValidEmail(email)) {
        return { ok: false, message: 'Please enter a valid email address.' };
      }
      const pwdError = passwordIssues(input.password);
      if (pwdError) return { ok: false, message: pwdError };
      if (input.password !== input.confirmPassword) {
        return { ok: false, message: 'Confirm password must match.' };
      }

      try {
        const res = await apiRegister({
          firstName,
          lastName,
          email,
          phone,
          password: input.password,
          tin: tin || undefined,
        });
        // No session yet: the account is activated by verifying the emailed code.
        return { ok: true, email, devCode: res.devCode };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Registration failed. Please try again.'),
        };
      }
    },

    updateProfile: async (input) => {
      const current = get().currentUser;
      if (!current) return { ok: false, message: 'You must be signed in.' };
      try {
        const updated = await updateMyProfile(input);
        const merged: User = {
          ...current,
          firstName: updated.firstName,
          lastName: updated.lastName,
          name: `${updated.firstName} ${updated.lastName}`,
          phone: updated.phone ?? '',
          tin: updated.tin ?? null,
          avatarUrl: updated.avatarUrl ?? current.avatarUrl ?? null,
          locale: updated.locale === 'am' ? 'am' : 'en',
        };
        set({ currentUser: merged });
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to update profile.'),
        };
      }
    },

    changePassword: async (input) => {
      try {
        await changeMyPassword(input);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          message: errorMessage(err, 'Failed to change password.'),
        };
      }
    },

    syncLocale: async (locale) => {
      // If user is signed in, sync preference to profile in background
      const current = get().currentUser;
      if (current) {
        const merged = { ...current, locale };
        set({ currentUser: merged });

        try {
          await updateMyProfile({ locale });
        } catch (err) {
          console.warn('Could not sync language preference to remote profile:', err);
        }
      }

      return { ok: true };
    },

    refreshPermissions: async () => {
      try {
        const res = await apiRefresh();
        setAccessToken(res.accessToken);
        set({ currentUser: res.user });
      } catch {
        // best-effort — keep the existing session if the refresh call fails
      }
    },
  };
});
