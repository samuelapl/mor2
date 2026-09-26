import type { ApprovalStatus, Locale, RoleName } from '@/core/api/types';

/** User as returned by login / refresh / GET /users/me (spec §2.1, §2.7). */
export interface ApiUserRole {
  id: string;
  userId: string;
  role: RoleName;
  grantedAt: string;
  grantedBy: string | null;
}

export interface ApiVenueSummary {
  id: string;
  name: string;
  building: string | null;
  branch: string;
}

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tin: string | null;
  avatarUrl: string | null;
  locale: Locale;
  isActive: boolean;
  registrationStatus: ApprovalStatus;
  mustChangePassword: boolean;
  primaryVenueId: string | null;
  primaryVenue?: ApiVenueSummary | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  roles: ApiUserRole[];
}

/** Session payload from login, refresh and first-login/complete. */
export interface SessionPayload {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  permissions: string[];
}

/** Returned by login for admin-created accounts (spec §2.1 Response B). */
export interface FirstLoginChallenge {
  passwordChangeRequired: true;
  challengeToken: string;
  /** Masked, display only. */
  email: string;
}

export type LoginResponse = SessionPayload | FirstLoginChallenge;

export function isFirstLoginChallenge(res: LoginResponse): res is FirstLoginChallenge {
  return 'passwordChangeRequired' in res && res.passwordChangeRequired === true;
}

export interface MessageResponse {
  message: string;
}

/* ------------------------------ Request bodies ----------------------------- */
/* Exact field sets — the backend rejects unknown fields (spec §1.6).          */

export interface LoginBody {
  email: string;
  password: string;
}

export interface RegisterBody {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  tin?: string;
  locale?: Locale;
}

export interface RegisterResponse {
  message: string;
  user: Pick<ApiUser, 'id' | 'firstName' | 'lastName' | 'email' | 'registrationStatus'>;
}

export interface ResetPasswordBody {
  email: string;
  code: string;
  newPassword: string;
}

export interface FirstLoginCompleteBody {
  challengeToken: string;
  code: string;
  newPassword: string;
  confirmPassword: string;
}
