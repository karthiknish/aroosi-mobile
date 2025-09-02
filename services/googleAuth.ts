// DEPRECATED: This legacy AuthSession-based Google auth has been replaced by native
// @react-native-google-signin/google-signin integrated in AuthProvider.signInWithGoogle.
// Keeping this stub to avoid confusion if imported inadvertently.

export type GoogleAuthResult =
  | { success: true; idToken: string }
  | { success: false; error: string };

export async function signInWithGoogle(): Promise<GoogleAuthResult> {
  return {
    success: false,
    error:
      "Deprecated module: Use useAuth().signInWithGoogle() from contexts/AuthProvider instead.",
  };
}
