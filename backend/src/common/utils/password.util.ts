/**
 * Password policy — must stay in sync with the frontend helper
 * (`frontend/src/constants/auth.ts` `passwordIssues`): at least 8 characters,
 * at least one letter AND one number.
 */
export const MIN_PASSWORD_LENGTH = 8;

export function passwordIssues(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null;
}

/** Generates a policy-compliant temporary password (letters + numbers, 8 chars). */
export function generateTemporaryPassword(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  for (;;) {
    let pw = '';
    for (let i = 0; i < 8; i++) {
      pw += chars[Math.floor(Math.random() * chars.length)];
    }
    if (/[A-Za-z]/.test(pw) && /[0-9]/.test(pw)) {
      return pw;
    }
  }
}
