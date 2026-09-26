import { api } from '@/core/api/client';
import { endpoints } from '@/core/api/endpoints';

import type {
  FirstLoginCompleteBody,
  LoginBody,
  LoginResponse,
  MessageResponse,
  RegisterBody,
  RegisterResponse,
  ResetPasswordBody,
  SessionPayload,
} from '../types/auth.types';

/** Thin wrappers over spec §2.1–§2.6. Auth routes never trigger a token refresh. */
export const authApi = {
  login: (body: LoginBody) =>
    api.post<LoginResponse>(endpoints.auth.login, body, { skipAuth: true }),

  logout: () => api.post<MessageResponse>(endpoints.auth.logout),

  register: (body: RegisterBody) =>
    api.post<RegisterResponse>(endpoints.auth.register, body, { skipAuth: true }),

  forgotPassword: (email: string) =>
    api.post<MessageResponse>(endpoints.auth.forgotPassword, { email }, { skipAuth: true }),

  verifyResetCode: (email: string, code: string) =>
    api.post<MessageResponse>(endpoints.auth.verifyResetCode, { email, code }, { skipAuth: true }),

  resetPassword: (body: ResetPasswordBody) =>
    api.post<MessageResponse>(endpoints.auth.resetPassword, body, { skipAuth: true }),

  firstLoginResendCode: (challengeToken: string) =>
    api.post<MessageResponse & { email: string }>(
      endpoints.auth.firstLoginResendCode,
      { challengeToken },
      { skipAuth: true },
    ),

  firstLoginVerifyCode: (challengeToken: string, code: string) =>
    api.post<MessageResponse>(
      endpoints.auth.firstLoginVerifyCode,
      { challengeToken, code },
      { skipAuth: true },
    ),

  firstLoginComplete: (body: FirstLoginCompleteBody) =>
    api.post<SessionPayload>(endpoints.auth.firstLoginComplete, body, { skipAuth: true }),
};
