/**
 * KK Shop Content Studio - In-Memory Token Store
 * Decouples auth token access from API client to prevent circular imports
 */

let cachedAccessToken: string | null = null;

export const tokenStore = {
  getToken(): string | null {
    return cachedAccessToken;
  },
  setToken(token: string | null): void {
    cachedAccessToken = token;
  },
  clearToken(): void {
    cachedAccessToken = null;
  },
};
