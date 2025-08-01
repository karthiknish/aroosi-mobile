import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Complete auth sessions on native
WebBrowser.maybeCompleteAuthSession();

type GoogleAuthResult =
  | { success: true; idToken: string }
  | { success: false; error: string };

function getEnv(name: string): string | undefined {
  // Expo exposes EXPO_PUBLIC_* in process.env at runtime
  // @ts-ignore
  return typeof process !== 'undefined' ? process.env?.[name] : undefined;
}

/**
 * Sign in with Google using Expo AuthSession and return an OpenID id_token.
 * Backend should verify this token and set a cookie-session.
 *
 * Env variables expected (placeholders allowed):
 *  - EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 *  - EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
 *  - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (optional for web)
 */
export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const iosClientId = getEnv('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID');
    const androidClientId = getEnv('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID');
    const webClientId = getEnv('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID');

    if (!iosClientId && !androidClientId && !webClientId) {
      return {
        success: false,
        error:
          'Google client IDs are not configured. Set EXPO_PUBLIC_GOOGLE_* client IDs in your .env',
      };
    }

    // Google OAuth endpoints
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Create redirect URI (Expo-managed supports auto scheme)
    const redirectUri = AuthSession.makeRedirectUri();

    // Choose the platform-specific client ID
    const clientId =
      // @ts-ignore - AuthSession.Platform is available
      AuthSession.Platform.OS === 'ios'
        ? iosClientId
        // @ts-ignore
        : AuthSession.Platform.OS === 'android'
        ? androidClientId
        : webClientId;

    if (!clientId) {
      return {
        success: false,
        error:
          'No suitable Google client ID configured for this platform. Check EXPO_PUBLIC_GOOGLE_* in .env',
      };
    }

    // Build auth URL requesting OpenID id_token
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token', // request OpenID id_token
      scope: 'openid email profile',
      nonce: String(Date.now()), // simple nonce; can be replaced with secure random
      prompt: 'select_account',
    });

    const authUrl = `${discovery.authorizationEndpoint}?${params.toString()}`;

    // Use the WebBrowser to perform the auth request and capture the redirect
    const result = (await WebBrowser.openAuthSessionAsync(authUrl, redirectUri)) as
      | { type: 'success'; url: string }
      | { type: 'dismiss' | 'cancel' | 'locked' };


    if (result.type !== 'success') {
      const msg =
        result.type === 'cancel'
          ? 'Google sign-in was cancelled'
          : 'Google sign-in was not completed';
      return { success: false, error: msg };
    }

    // Parse id_token from the redirect URL fragment (id_token is returned in hash)
    // e.g., redirectUri#id_token=...&state=...
    const url = result.url || '';
    const hashIndex = url.indexOf('#');
    let idToken: string | undefined;
    if (hashIndex !== -1) {
      const hash = url.substring(hashIndex + 1);
      const params = new URLSearchParams(hash);
      idToken = params.get('id_token') || undefined;
    }
    if (!idToken) {
      return { success: false, error: 'No id_token returned by Google' };
    }

    return { success: true, idToken };
  } catch (e: any) {
    const message =
      typeof e?.message === 'string' ? e.message : 'Unexpected error during Google sign-in';
    return { success: false, error: message };
  }
}
