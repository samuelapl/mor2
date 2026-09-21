import { api } from "./client";
import { storeTokens, clearTokens, getStoredRefreshToken } from "./tokens";
import { userFromAuth } from "./transform";
import type { ApiAuthRegisterResponse, ApiAuthResponse } from "./types";
import type { User } from "@/types";

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterResult {
  message: string;
  user: { id: string; firstName: string; lastName: string; email: string };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const res = await api<ApiAuthResponse>("auth/login", {
    method: "POST",
    body: { email, password },
    skipAuthRetry: true,
  });
  storeTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken });
  return {
    user: userFromAuth(res.user, res.permissions),
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
  };
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api<{ message: string }>("auth/forgot-password", {
    method: "POST",
    body: { email },
    skipAuthRetry: true,
  });
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
): Promise<{ message: string }> {
  return api<{ message: string }>("auth/reset-password", {
    method: "POST",
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
  const res = await api<ApiAuthRegisterResponse>("auth/register", {
    method: "POST",
    body: payload,
    skipAuthRetry: true,
  });
  return { message: res.message, user: res.user };
}

export async function refresh(): Promise<AuthResult> {
  const rt = getStoredRefreshToken();
  if (!rt) throw new Error("No refresh token");
  const res = await api<ApiAuthResponse>("auth/refresh", {
    method: "POST",
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
    await api<unknown>("auth/logout", { method: "POST", skipAuthRetry: true });
  } catch {
    // best-effort; clear local tokens regardless
  }
  clearTokens();
}
