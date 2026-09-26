import * as SecureStore from 'expo-secure-store';

/**
 * Keychain / Keystore-backed secrets: the access and refresh tokens
 * (LEARNER_MOBILE_ARCHITECTURE.md §6.2). Synchronous reads keep cold start instant.
 */

const KEYS = {
  accessToken: 'eltms.accessToken',
  refreshToken: 'eltms.refreshToken',
} as const;

export const secureStorage = {
  getAccessToken(): string | null {
    return SecureStore.getItem(KEYS.accessToken);
  },
  getRefreshToken(): string | null {
    return SecureStore.getItem(KEYS.refreshToken);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(KEYS.accessToken, accessToken);
    await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken);
  },
  async clearTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(KEYS.accessToken);
    await SecureStore.deleteItemAsync(KEYS.refreshToken);
  },
};
