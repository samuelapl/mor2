export interface AuthTokens {
  accessToken: string;
  refreshToken?: string | null;
}

const ACCESS_KEY = 'eltms_access_token';
const REFRESH_KEY = 'eltms_refresh_token';

/**
 * Reads tokens from sessionStorage (isolated per browser tab) with fallback to localStorage.
 */
export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(ACCESS_KEY) ?? window.localStorage.getItem(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(REFRESH_KEY) ?? window.localStorage.getItem(REFRESH_KEY);
}

/**
 * Stores tokens in sessionStorage so each browser tab operates in its own isolated session.
 * This allows simultaneous login as Learner, Trainer, and Admin across different tabs without cross-tab redirection.
 */
export function storeTokens(tokens: AuthTokens): void {
  if (typeof window === 'undefined') return;
  if (tokens.accessToken) {
    window.sessionStorage.setItem(ACCESS_KEY, tokens.accessToken);
    window.localStorage.removeItem(ACCESS_KEY);
  }
  if (tokens.refreshToken) {
    window.sessionStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    window.localStorage.removeItem(REFRESH_KEY);
  }
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(ACCESS_KEY);
  window.sessionStorage.removeItem(REFRESH_KEY);
  window.localStorage.removeItem(ACCESS_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}
