// Lightweight Firebase auth token helpers to avoid importing React contexts inside service layer.
// Provides cached and force-refresh token retrieval.
import { getFirebaseAuth } from './firebase';

/**
 * Get the current Firebase ID token (may return a cached token).
 * @returns ID token string or null if user not signed in.
 */
export async function getAuthToken(forceRefresh: boolean = false): Promise<string | null> {
  try {
    const auth = getFirebaseAuth();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.warn('getAuthToken failed', err);
    return null;
  }
}

/**
 * Always requests a fresh token from Firebase (bypasses local cache).
 */
export function getFreshAuthToken(): Promise<string | null> {
  return getAuthToken(true);
}

/**
 * Helper to attach Authorization header if token present.
 */
export function applyAuthHeader(headers: Record<string, any>, token: string | null) {
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
}
