import { api } from './client';
import { storeTokens, clearTokens, getStoredRefreshToken } from './tokens';
import { userFromAuth } from './transform';
import type { ApiAuthRegisterResponse, ApiAuthResponse, ApiFirstLoginChallenge } from './types';
import type { User } from '@/types';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  message: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export interface FirstLoginChallenge {
  passwordChangeRequired: true;
  challengeToken: string;
  email: string;
}

function startSession(res: ApiAuthResponse): AuthResult {
  storeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  return {
    user: userFromAuth(res.user, res.permissions),
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  };
}

/** Resolves to a session, or to a first-login challenge when the password must be changed. */
export async function login(
  email: string,
  password: string,
): Promise<AuthResult | FirstLoginChallenge> {
  const res = await api<ApiAuthResponse | ApiFirstLoginChallenge>('auth/login', {
    method: 'POST',
    body: { email, password },
    skipAuthRetry: true,
  });
  if ('passwordChangeRequired' in res) return res;
  return startSession(res);
}

export async function resendFirstLoginCode(
  challengeToken: string,
): Promise<{ message: string; email: string }> {
  return api<{ message: string; email: string }>('auth/first-login/resend-code', {
    method: 'POST',
    body: { challengeToken },
    skipAuthRetry: true,
  });
}

/** Checks the first-login code without using it up; rejects when it is wrong or expired. */
export async function verifyFirstLoginCode(
  challengeToken: string,
  code: string,
): Promise<{ message: string }> {
  return api<{ message: string }>('auth/first-login/verify-code', {
    method: 'POST',
    body: { challengeToken, code },
    skipAuthRetry: true,
  });
}

export async function completeFirstLogin(body: {
  challengeToken: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthResult> {
  const res = await api<ApiAuthResponse>('auth/first-login/complete', {
    method: 'POST',
    body,
    skipAuthRetry: true,
  });
  return startSession(res);
}

/*
 * The first-login challenge lives in sessionStorage (never the URL) between the login page
 * and /first-login. It is short-lived server-side, so losing it just means signing in again.
 */
const FIRST_LOGIN_KEY = 'lms.firstLoginChallenge';

export function saveFirstLoginChallenge(challenge: { challengeToken: string; email: string }) {
  try {
    sessionStorage.setItem(FIRST_LOGIN_KEY, JSON.stringify(challenge));
  } catch {
    // storage unavailable — /first-login will ask the user to sign in again
  }
}

export function readFirstLoginChallenge(): { challengeToken: string; email: string } | null {
  try {
    const raw = sessionStorage.getItem(FIRST_LOGIN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearFirstLoginChallenge() {
  try {
    sessionStorage.removeItem(FIRST_LOGIN_KEY);
  } catch {
    // ignore
  }
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api<{ message: string }>('auth/forgot-password', {
    method: 'POST',
    body: { email },
    skipAuthRetry: true,
  });
}

/** Checks a reset code without using it up; rejects when it is wrong or expired. */
export async function verifyResetCode(email: string, code: string): Promise<{ message: string }> {
  return api<{ message: string }>('auth/verify-reset-code', {
    method: 'POST',
    body: { email, code },
    skipAuthRetry: true,
  });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  return api<{ message: string }>('auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
    skipAuthRetry: true,
  });
}

export async function register(payload: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  tin?: string;
}): Promise<RegisterResult> {
  const res = await api<ApiAuthRegisterResponse>('auth/register', {
    method: 'POST',
    body: payload,
    skipAuthRetry: true,
  });
  return { message: res.message, user: res.user };
}

export async function refresh(): Promise<AuthResult> {
  const rt = getStoredRefreshToken();
  if (!rt) throw new Error('No refresh token');
  const res = await api<ApiAuthResponse>('auth/refresh', {
    method: 'POST',
    body: { refreshToken: rt },
    skipAuthRetry: true,
  });
  storeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  return {
    user: userFromAuth(res.user, res.permissions),
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  };
}

export async function logout(): Promise<void> {
  try {
    await api<unknown>('auth/logout', { method: 'POST', skipAuthRetry: true });
  } catch {
    // best-effort; clear local tokens regardless
  }
  clearTokens();
}
