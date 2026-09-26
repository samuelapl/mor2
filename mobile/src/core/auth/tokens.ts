import { jwtDecode } from 'jwt-decode';

import { secureStorage } from '../storage/secure';

/**
 * Token persistence (LEARNER_MOBILE_ARCHITECTURE.md §6.2): both tokens live in SecureStore
 * (Keychain / Keystore) and are mirrored in memory for synchronous access by the API client.
 */

let accessToken: string | null = secureStorage.getAccessToken();
let refreshToken: string | null = secureStorage.getRefreshToken();

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,
  hasSession: () => Boolean(refreshToken),

  /**
   * Persists a new token pair. Refresh tokens rotate on every refresh (API spec §1.7),
   * so the new refresh token must be written before any other refresh may start.
   */
  async setTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    accessToken = tokens.accessToken;
    refreshToken = tokens.refreshToken;
    await secureStorage.setTokens(tokens.accessToken, tokens.refreshToken);
  },

  async clear(): Promise<void> {
    accessToken = null;
    refreshToken = null;
    await secureStorage.clearTokens();
  },
};

/** Seconds until the access token expires; `-Infinity` when missing or unreadable. */
export function accessTokenSecondsLeft(): number {
  if (!accessToken) return -Infinity;
  try {
    const { exp } = jwtDecode<{ exp?: number }>(accessToken);
    return exp ? exp - Date.now() / 1000 : Infinity;
  } catch {
    return -Infinity;
  }
}
