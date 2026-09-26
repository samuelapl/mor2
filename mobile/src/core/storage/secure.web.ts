/**
 * Web build of secure.ts. Browsers have no Keychain; tokens go to localStorage.
 * Fine for testing in a browser — the phone builds use SecureStore.
 */
const KEYS = { accessToken: 'eltms.accessToken', refreshToken: 'eltms.refreshToken' } as const;

const storage = () => (typeof window !== 'undefined' ? window.localStorage : null);

export const secureStorage = {
  getAccessToken(): string | null {
    return storage()?.getItem(KEYS.accessToken) ?? null;
  },
  getRefreshToken(): string | null {
    return storage()?.getItem(KEYS.refreshToken) ?? null;
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    storage()?.setItem(KEYS.accessToken, accessToken);
    storage()?.setItem(KEYS.refreshToken, refreshToken);
  },
  async clearTokens(): Promise<void> {
    storage()?.removeItem(KEYS.accessToken);
    storage()?.removeItem(KEYS.refreshToken);
  },
};
