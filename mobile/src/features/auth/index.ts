/**
 * Auth feature — login, first-login challenge, registration, password reset, session.
 * Spec §2.1–§2.6 · Architecture §6.2.
 */
export { authApi } from './api/auth-api';
export { AuthHeader } from './components/AuthHeader';
export { FormMessage } from './components/FormMessage';
export { useFormError } from './hooks/useFormError';
export {
  NotLearnerError,
  signOut,
  useCompleteFirstLogin,
  useLogin,
  useLogout,
} from './hooks/useAuthActions';
export { useAuthFlowStore } from './store/auth-flow-store';
export {
  isLearner,
  roleNamesOf,
  selectIsAuthenticated,
  useSessionStore,
} from './store/session-store';
export {
  isFirstLoginChallenge,
  type ApiUser,
  type ApiUserRole,
  type ApiVenueSummary,
  type FirstLoginChallenge,
  type FirstLoginCompleteBody,
  type LoginBody,
  type LoginResponse,
  type MessageResponse,
  type RegisterBody,
  type RegisterResponse,
  type ResetPasswordBody,
  type SessionPayload,
} from './types/auth.types';
export * from './utils/validation';
