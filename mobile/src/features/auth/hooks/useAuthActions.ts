import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { queryClient } from '@/core/api/query-client';
import { clearUserStorage } from '@/core/storage/kv-storage';
import { syncQueue } from '@/core/sync/sync-queue';

import { authApi } from '../api/auth-api';
import { useAuthFlowStore } from '../store/auth-flow-store';
import { isLearner, useSessionStore } from '../store/session-store';
import {
  isEmailVerificationRequired,
  isFirstLoginChallenge,
  type FirstLoginCompleteBody,
  type LoginBody,
  type SessionPayload,
} from '../types/auth.types';

/** Thrown when a non-learner account signs in to the learner app. */
export class NotLearnerError extends Error {
  constructor() {
    super('NOT_LEARNER');
    this.name = 'NotLearnerError';
  }
}

/** Stores a fresh session after rejecting non-learner accounts. */
async function acceptSession(payload: SessionPayload): Promise<void> {
  if (!isLearner(payload.user)) throw new NotLearnerError();
  await useSessionStore.getState().setSession(payload);
  useAuthFlowStore.getState().reset();
}

/** POST /auth/login with first-login and email-verification branching (spec §2.1). */
export function useLogin() {
  return useMutation({
    mutationFn: async (body: LoginBody) => {
      const email = body.email.trim();
      const res = await authApi.login({ email, password: body.password });
      if (isFirstLoginChallenge(res)) {
        useAuthFlowStore.getState().setChallenge(res.challengeToken, res.email);
        router.push('/first-login');
        return;
      }
      if (isEmailVerificationRequired(res)) {
        // Self-registered account that never verified its email: a code was emailed.
        useAuthFlowStore.getState().setVerifyEmail(email);
        router.push('/verify-email');
        return;
      }
      await acceptSession(res);
    },
  });
}

/** POST /auth/verify-email — activates a self-registered account and signs it in. */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const session = await authApi.verifyEmail(email, code);
      await acceptSession(session);
    },
  });
}

/** POST /auth/first-login/complete — logs the user in on success (spec §2.6). */
export function useCompleteFirstLogin() {
  return useMutation({
    mutationFn: async (body: FirstLoginCompleteBody) => {
      const session = await authApi.firstLoginComplete(body);
      await acceptSession(session);
    },
  });
}

/**
 * Signs out: best-effort server revoke, then wipes tokens, caches and the offline queue.
 * Works offline — the local session is always cleared.
 */
export async function signOut(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Offline or already expired — the local wipe below is what matters.
  }
  syncQueue.clear();
  await useSessionStore.getState().clearSession();
  queryClient.clear();
  clearUserStorage();
}

export function useLogout() {
  return useMutation({ mutationFn: signOut, networkMode: 'always' });
}
