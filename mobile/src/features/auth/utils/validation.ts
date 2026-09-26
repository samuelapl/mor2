/**
 * Client-side mirrors of backend validation so users see errors before a round trip.
 * Password policy: backend/src/common/utils/password.util.ts (≥ 8 chars, a letter and a number).
 */

export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Returns an i18n key describing the problem, or null when the password is acceptable. */
export function passwordIssueKey(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return 'auth.errors.passwordLength';
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) return 'auth.errors.passwordMix';
  return null;
}

export const isSixDigitCode = (code: string) => /^\d{6}$/.test(code);

export const normalizeEmail = (email: string) => email.trim().toLowerCase();
