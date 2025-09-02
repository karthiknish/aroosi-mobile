// Firebase Auth Context aligned with aroosi web API
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from "react-native";
import { Profile } from '../types/profile';
import { API_BASE_URL } from '../constants';
import { getFirebaseAuth, initFirebase } from '../services/firebase';
import { OneSignal } from "react-native-onesignal";
import { apiClient } from "@/utils/api";
import { NotificationPermissionsManager } from "@/utils/notificationPermissions";
import { NotificationHandler } from "@/utils/notificationHandler";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
  GoogleAuthProvider,
  signInWithCredential,
  // added for password reset
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: number;
  profile?: Profile | null;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId?: string;
  getToken: () => Promise<string | null>;
  authFetch: (
    input: RequestInfo | URL,
    init?: RequestInit & { autoRefreshToken?: boolean }
  ) => Promise<Response>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{
    success: boolean;
    error?: string;
    emailVerificationSent?: boolean;
    emailVerified?: boolean;
  }>;
  verifyEmailCode: () => Promise<{ success: boolean; error?: string }>; // now just reloads user to detect verification
  signInWithGoogle: (
    credential?: string,
    state?: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithApple?: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  resendEmailVerification: () => Promise<{ success: boolean; error?: string }>;
  updateProfile: (
    updates: Partial<Profile>
  ) => Promise<{ success: boolean; error?: string }>;
  // added for password reset
  sendPasswordReset: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetPasswordWithCode: (
    code: string,
    newPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  // email verification helpers (alignment with web)
  isEmailVerified?: boolean;
  needsEmailVerification?: boolean;
  sendEmailVerification?: () => Promise<{ success: boolean; error?: string }>; // alias
  startEmailVerificationPolling?: (opts?: {
    intervalMs?: number;
    maxAttempts?: number;
  }) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export const useAuthContext = useAuth; // backward compatibility alias

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Synchronous initialize (will no-op after first call)
  initFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const logoutVersionRef = React.useRef(0);
  const failedProfileNoticeShownRef = React.useRef(false);
  const emailPollIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const emailPollAttemptsRef = React.useRef(0);

  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const current = getFirebaseAuth().currentUser;
      if (!current) return null;
      const idToken = await current.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (!response.ok) return null;
      const json = await response.json();
      if (!json.user) return null;
      return {
        id: json.user.id,
        email: json.user.email,
        role: json.user.role || "user",
        emailVerified: json.user.emailVerified,
        createdAt: json.user.createdAt,
        profile: json.user.profile || null,
      };
    } catch (e) {
      if (process.env.NODE_ENV !== "production")
        console.warn("AuthProvider.fetchUser failed", e);
      return null;
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const version = logoutVersionRef.current;
    const data = await fetchUser();
    if (logoutVersionRef.current !== version) return; // ignore after logout
    setUser(data ?? null);
  }, [fetchUser]);

  useEffect(() => {
    const authInstance = getFirebaseAuth();
    const unsub = onAuthStateChanged(authInstance, async () => {
      const u = await fetchUser();
      setUser(u);
      setIsLoading(false);
    });
    return () => unsub();
  }, [fetchUser]);

  useEffect(() => {
    let currentState: AppStateStatus = AppState.currentState;
    const onChange = (next: AppStateStatus) => {
      if (currentState.match(/inactive|background/) && next === "active")
        refreshUser();
      currentState = next;
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [refreshUser]);

  useEffect(() => {
    if (!user && !failedProfileNoticeShownRef.current && !isLoading) {
      failedProfileNoticeShownRef.current = true;
      console.log("We couldn't load your account. Please try again shortly.");
    }
  }, [user, isLoading]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
        await refreshUser();
        return { success: true };
      } catch (e: any) {
        let msg = "Sign in failed";
        if (e?.code === "auth/user-not-found")
          msg = "No account for this email";
        else if (e?.code === "auth/wrong-password") msg = "Invalid password";
        else if (e?.code === "auth/too-many-requests")
          msg = "Too many attempts. Try later";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [refreshUser]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName: string) => {
      try {
        setError(null);
        await createUserWithEmailAndPassword(
          getFirebaseAuth(),
          email,
          password
        );
        const current = getFirebaseAuth().currentUser;
        if (current) {
          try {
            await firebaseUpdateProfile(current, { displayName: fullName });
          } catch {}
          try {
            await sendEmailVerification(current);
          } catch {}
        }
        await refreshUser();
        return {
          success: true,
          emailVerificationSent: true,
          emailVerified: !!current?.emailVerified,
          needsEmailVerification: !current?.emailVerified,
        } as any;
      } catch (e: any) {
        let msg = "Sign up failed";
        if (e?.code === "auth/email-already-in-use")
          msg = "Email already in use";
        else if (e?.code === "auth/weak-password") msg = "Weak password";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [refreshUser]
  );

  const verifyEmailCode = useCallback(async () => {
    try {
      const current = getFirebaseAuth().currentUser;
      await current?.reload();
      // Force ID token refresh so backend sees updated emailVerified if it relies on token claims
      if (current) {
        try {
          await current.getIdToken(true);
        } catch {}
      }
      await refreshUser();
      return { success: current?.emailVerified || false };
    } catch (e: any) {
      return { success: false, error: e?.message || "Verification failed" };
    }
  }, [refreshUser]);

  const resendEmailVerification = useCallback(async () => {
    try {
      const current = getFirebaseAuth().currentUser;
      if (current) await sendEmailVerification(current);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || "Unable to resend code" };
    }
  }, []);

  const startEmailVerificationPolling = useCallback(
    (opts?: { intervalMs?: number; maxAttempts?: number }) => {
      const intervalMs = opts?.intervalMs ?? 5000;
      const maxAttempts = opts?.maxAttempts ?? 30; // ~150s default
      if (emailPollIntervalRef.current) return; // already polling
      emailPollAttemptsRef.current = 0;
      emailPollIntervalRef.current = setInterval(async () => {
        const current = getFirebaseAuth().currentUser;
        if (!current) {
          if (emailPollIntervalRef.current) {
            clearInterval(emailPollIntervalRef.current);
            emailPollIntervalRef.current = null;
          }
          return;
        }
        try {
          await current.reload();
          if (current.emailVerified) {
            if (emailPollIntervalRef.current) {
              clearInterval(emailPollIntervalRef.current);
              emailPollIntervalRef.current = null;
            }
            // Force-refresh ID token so any backend relying on token state/claims gets latest
            try {
              await current.getIdToken(true);
            } catch {}
            await refreshUser();
            return;
          }
        } catch {}
        emailPollAttemptsRef.current += 1;
        if (emailPollAttemptsRef.current >= maxAttempts) {
          if (emailPollIntervalRef.current) {
            clearInterval(emailPollIntervalRef.current);
            emailPollIntervalRef.current = null;
          }
        }
      }, intervalMs);
    },
    [refreshUser]
  );

  // Clear polling on unmount / sign out
  useEffect(() => {
    return () => {
      if (emailPollIntervalRef.current)
        clearInterval(emailPollIntervalRef.current);
    };
  }, []);

  // password reset additions
  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
      return { success: true };
    } catch (e: any) {
      let msg = "Failed to send reset email";
      if (e?.code === "auth/invalid-email") msg = "Invalid email address";
      else if (e?.code === "auth/user-not-found")
        return { success: true }; // avoid leaking existence
      else if (e?.code === "auth/too-many-requests")
        msg = "Too many requests. Try later";
      return { success: false, error: msg };
    }
  }, []);

  const resetPasswordWithCode = useCallback(
    async (code: string, newPassword: string) => {
      try {
        if (newPassword.length < 12)
          return {
            success: false,
            error: "Password must be at least 12 characters",
          };
        const hasLower = /[a-z]/.test(newPassword);
        const hasUpper = /[A-Z]/.test(newPassword);
        const hasDigit = /\d/.test(newPassword);
        const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
        if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
          return {
            success: false,
            error: "Password must include upper, lower, number, symbol.",
          };
        }
        await verifyPasswordResetCode(getFirebaseAuth(), code.trim());
        await confirmPasswordReset(getFirebaseAuth(), code.trim(), newPassword);
        return { success: true };
      } catch (e: any) {
        let msg = "Password reset failed";
        if (e?.code === "auth/expired-action-code") msg = "Reset code expired";
        else if (e?.code === "auth/invalid-action-code")
          msg = "Invalid reset code";
        else if (e?.code === "auth/weak-password") msg = "Password too weak";
        else if (e?.code === "auth/too-many-requests")
          msg = "Too many attempts. Try later";
        return { success: false, error: msg };
      }
    },
    []
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      // Configure Google Sign-In once (idempotent). Prefer platform client IDs.
      const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
      const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

      GoogleSignin.configure({
        iosClientId: iosClientId || undefined,
        webClientId: webClientId || undefined, // required on Android to receive idToken
        offlineAccess: true,
        forceCodeForRefreshToken: false,
      });

      // Ensure Play Services (Android)
      try {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      } catch {}

      // Native Google account picker
      const signInRes = await GoogleSignin.signIn();
      if (signInRes?.type !== "success") {
        return { success: false, error: "Canceled" };
      }

      // Extract tokens from response; idToken may be null on some configs
      let idToken: string | undefined =
        (signInRes as any)?.data?.idToken ?? undefined;
      let accessToken: string | undefined = undefined;

      // Always try to get tokens to ensure we have accessToken and possibly idToken
      try {
        const tokens = await GoogleSignin.getTokens();
        if (!idToken && tokens?.idToken) idToken = tokens.idToken;
        if (tokens?.accessToken) accessToken = tokens.accessToken;
      } catch {}

      if (!idToken && !accessToken) {
        return {
          success: false,
          error: "Google sign-in failed: missing tokens",
        };
      }

      const credential = GoogleAuthProvider.credential(
        idToken || undefined,
        accessToken || undefined
      );
      await signInWithCredential(getFirebaseAuth(), credential);
      await refreshUser();
      return { success: true };
    } catch (e: any) {
      const code = e?.code || "";
      // Common cancellation codes across platforms
      if (
        code === "12501" || // sign in cancelled
        code === "12502" || // in progress
        code === "ERR_CANCELED" ||
        code === "CANCELED"
      ) {
        return { success: false, error: "Canceled" };
      }
      return { success: false, error: e?.message || "Google sign-in failed" };
    }
  }, [refreshUser]);

  const signInWithApple = useCallback(async () => {
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable)
        return { success: false, error: "Apple Sign-In not available" };

      // Generate a nonce and pass its SHA256 hash to Apple, then provide the raw nonce to Firebase
      const rawNonce =
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        return { success: false, error: "Missing Apple identity token" };
      }

      // Build Firebase credential with Apple ID token
      const {
        OAuthProvider,
        signInWithCredential: firebaseSignInWithCredential,
      } = await import("firebase/auth");
      const provider = new OAuthProvider("apple.com");
      const authCredential = provider.credential({
        idToken: credential.identityToken,
        rawNonce,
      });
      await firebaseSignInWithCredential(getFirebaseAuth(), authCredential);
      await refreshUser();
      return { success: true };
    } catch (e: any) {
      if (e?.code === "ERR_REQUEST_CANCELED")
        return { success: false, error: "Canceled" };
      return { success: false, error: e?.message || "Apple sign-in failed" };
    }
  }, [refreshUser]);

  // Auth-aware fetch with automatic token injection and single refresh retry
  const authFetch: AuthContextType["authFetch"] = useCallback(
    async (input, init = {}) => {
      const exec = async (forceRefresh: boolean) => {
        const current = getFirebaseAuth().currentUser;
        const token = current ? await current.getIdToken(forceRefresh) : null;
        const headers = new Headers(init.headers || {});
        if (token) headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      };
      let res = await exec(false);
      if (res.status === 401) {
        // Attempt single refresh if requested
        res = await exec(true);
      }
      return res;
    },
    []
  );

  const updateProfile = useCallback<AuthContextType["updateProfile"]>(
    async (updates) => {
      try {
        const res = await authFetch(`${API_BASE_URL}/api/user/me`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          return { success: false, error: `Update failed (${res.status})` };
        }
        await refreshUser();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message || "Update failed" };
      }
    },
    [authFetch, refreshUser]
  );

  const signOut = useCallback(async () => {
    // Bump logout version so any inflight refreshUser is ignored
    logoutVersionRef.current += 1;
    try {
      // 1) Best-effort: mark presence offline on server
      try {
        await apiClient.setPresence("offline");
      } catch {}

      // 2) Best-effort: unregister push with backend using current OneSignal ID
      try {
        const onesignalId = await OneSignal.User.getOnesignalId();
        if (onesignalId) {
          await apiClient.unregisterFromPushNotifications({
            playerId: onesignalId,
          });
        }
      } catch {}

      // 3) Logout from OneSignal (clears external user id)
      try {
        OneSignal.logout();
      } catch {}

      // 4) Clear notifications/badges locally
      try {
        await NotificationHandler.clearAll();
        await NotificationPermissionsManager.clearBadge();
      } catch {}

      // 5) Firebase sign out
      await firebaseSignOut(getFirebaseAuth());
    } catch (e) {
      console.error("Sign out failed", e);
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    userId: user?.id,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    signOut,
    verifyEmailCode,
    refreshUser,
    resendEmailVerification,
    authFetch,
    updateProfile,
    sendPasswordReset,
    resetPasswordWithCode,
    getToken: async () =>
      (await getFirebaseAuth().currentUser?.getIdToken()) || null,
    isEmailVerified: !!user?.emailVerified,
    needsEmailVerification: !!user && !user.emailVerified,
    sendEmailVerification: resendEmailVerification,
    startEmailVerificationPolling,
  };

  // firebase auth initialized synchronously so we can render provider immediately
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
