import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

// Use environment variable for Google client ID, fallback to web client ID
const GOOGLE_CLIENT_ID =
  Constants.expoConfig?.extra?.googleClientId ||
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

interface GoogleAuthResult {
  success: boolean;
  idToken?: string;
  error?: string;
}

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  try {
    const [request, response, promptAsync] = Google.useAuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: ["profile", "email"],
    });

    if (!request) {
      return { success: false, error: "Google auth request failed" };
    }

    const result = await promptAsync();

    if (result.type === "success") {
      const { authentication } = result;
      if (authentication?.idToken) {
        return { success: true, idToken: authentication.idToken };
      }
    }

    return { success: false, error: "Google authentication cancelled" };
  } catch (error) {
    console.error("Google auth error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
