import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppState, AppStateStatus } from "react-native";
import { Profile } from "../types/profile";

// API Base URL for cookie-session auth
import { API_BASE_URL } from "../constants";

interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: number;
  profile?: {
    id: string;
    fullName?: string;
    isProfileComplete?: boolean;
    isOnboardingComplete?: boolean;
    [key: string]: unknown;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  // Alias used by some screens (RootNavigator): !isLoading
  isLoaded: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Derived
  isOnboardingComplete: boolean;
  isAdmin: boolean;
  userId: string;

  // Profile state
  profile: Profile | null;
  isProfileLoading: boolean;
  hasProfile: boolean;

  // Subscription state
  subscription: {
    plan: "free" | "premium" | "premiumPlus";
    isActive: boolean;
    expiresAt?: number;
  };

  // Auth methods (cookie-session)
  signIn: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    idToken: string
  ) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (
    email: string
  ) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (
    token: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Helper
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No token storage for cookie-session auth

  // Fetch current user using cookie session (Convex-auth compatible)
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      // expect { user: {...} } or direct
      const envelope: any = data;
      const user =
        envelope && typeof envelope === "object" && "user" in envelope
          ? envelope.user
          : envelope;
      return user ?? null;
    } catch (error) {
      console.error("Error fetching session:", error);
      return null;
    }
  }, []);

  // No API auth header; we rely on cookie sessions with credentials: 'include'

  // Get user profile from API (Convex-auth protected)
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["currentProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Use REST endpoint aligned to web: GET /api/profile
      const res = await fetch(`${API_BASE_URL}/api/profile`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) return null;
      const data = await res.json();
      // support both { profile } and direct object
      const envelope: any = data;
      const extracted: any =
        envelope && typeof envelope === "object" && "profile" in envelope
          ? envelope.profile
          : envelope;
      return extracted as Profile;
    },
    enabled: !!user?.id && !isLoading,
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const u = await fetchUser();
    setUser(u);
  }, [fetchUser]);

  // Legacy compatibility method
  const refreshProfile = useCallback(async () => {
    await refreshUser();
    refetchProfile();
  }, [refreshUser, refetchProfile]);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      // Cookie session bootstrap
      const u = await fetchUser();
      setUser(u);
      setIsLoading(false);
    };
    initAuth();

    // Session-aware app resume revalidation
    let currentState: AppStateStatus = AppState.currentState;
    const onChange = (nextState: AppStateStatus) => {
      // When app comes to foreground, revalidate session and critical queries
      if (currentState.match(/inactive|background/) && nextState === "active") {
        refreshUser(); // refresh session user
        // Revalidate critical data tied to session
        queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
      }
      currentState = nextState;
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, [fetchUser, queryClient, refreshUser]);

  // Sign in with email/password (Convex-auth compatible; server sets cookies)
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = data?.error || data?.message || "Sign in failed";
          setError(msg);
          return { success: false, error: msg };
        }
        // After login, fetch session user
        const u = await fetchUser();
        setUser(u);
        return { success: true };
      } catch (e) {
        console.error("Sign in error:", e);
        const msg = "Network error";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [fetchUser]
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ) => {
      try {
        setError(null);
        const fullName = `${firstName} ${lastName}`.trim();
        // Provide minimal required profile fields per server schema
        const profilePayload = {
          fullName,
          dateOfBirth: "1990-01-01",
          gender: "other",
          city: "Not specified",
          aboutMe: "Hello!",
          occupation: "Not specified",
          education: "Not specified",
          height: "170 cm",
          maritalStatus: "single",
          phoneNumber: "+10000000000",
          preferredGender: "any",
          email,
          isProfileComplete: true,
        } as const;

        const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
            fullName,
            profile: profilePayload,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = data?.error || data?.message || "Sign up failed";
          setError(msg);
          return { success: false, error: msg };
        }
        // Ensure password is set on account via reset-password endpoint (server-side helper)
        try {
          await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password }),
          }).catch(() => undefined);
        } catch {
          // best-effort; ignore
        }
        // Do not assume session is active; caller can navigate to Login
        return { success: true };
      } catch (e) {
        console.error("Sign up error:", e);
        const msg = "Network error";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [fetchUser]
  );

  // Verify OTP
  // Removed OTP verification (not used in web flow)

  // Sign in with Google (ID token exchange -> cookie-session)
  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      try {
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ idToken }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = data?.error || data?.message || "Google sign-in failed";
          setError(msg);
          return { success: false, error: msg };
        }
        const u = await fetchUser();
        setUser(u);
        // Invalidate queries that depend on session
        queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
        queryClient.invalidateQueries({ queryKey: ["matches"] });
        queryClient.invalidateQueries({ queryKey: ["conversations"] });
        queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
        return { success: true };
      } catch (e) {
        console.error("Google sign-in error:", e);
        const msg = "Network error";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [fetchUser]
  );

  // Forgot password: request reset
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg =
          data?.error || data?.message || "Failed to request password reset";
        setError(msg);
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e) {
      console.error("Forgot password error:", e);
      const msg = "Network error";
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  // Reset password with email (Convex-auth compatible endpoint)
  const resetPassword = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || "Failed to reset password";
        setError(msg);
        return { success: false, error: msg };
      }
      // Optional: fetchUser() if server signs the user in after reset
      return { success: true };
    } catch (e) {
      console.error("Reset password error:", e);
      const msg = "Network error";
      setError(msg);
      return { success: false, error: msg };
    }
  }, []);

  // Sign out (server clears cookies)
  const signOut = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (e) {
      // ignore network errors on logout
    } finally {
      setUser(null);
      setError(null);
      // Clear session-tied caches on logout
      queryClient.removeQueries({ queryKey: ["currentProfile"], exact: false });
      queryClient.removeQueries({ queryKey: ["matches"], exact: false });
      queryClient.removeQueries({ queryKey: ["conversations"], exact: false });
      queryClient.removeQueries({ queryKey: ["unreadCounts"], exact: false });
    }
  }, [queryClient]);

  // Debug: Log the full profile object whenever it changes and is non-null
  useEffect(() => {
    if (profile) {
      console.log("🛂 Full profile loaded:", profile);
    }
  }, [profile]);

  // Refetch profile whenever the authenticated user changes
  useEffect(() => {
    if (user?.id) {
      console.log("🔄 User ID changed, refetching profile...");
      refetchProfile();
    }
  }, [user?.id, refetchProfile]);

  // Derive auth state
  const hasProfile = !!profile;
  const typedProfile = profile as Profile | null;
  const isOnboardingComplete = typedProfile?.isOnboardingComplete ?? false;

  // Determine subscription status
  const subscription = {
    plan: typedProfile?.subscriptionPlan ?? ("free" as const),
    isActive:
      typedProfile?.subscriptionPlan !== "free" &&
      typedProfile?.subscriptionExpiresAt
        ? typedProfile.subscriptionExpiresAt > Date.now()
        : false,
    expiresAt: typedProfile?.subscriptionExpiresAt,
  };

  // Computed values
  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";
  const userId = user?.id || "";

  const contextValue: AuthContextType = {
    user,
    isLoading,
    isLoaded: !isLoading,
    isAuthenticated,
    error,

    isOnboardingComplete,
    isAdmin,
    userId,

    profile: typedProfile,
    isProfileLoading,
    hasProfile,

    subscription,

    signIn,
    signUp,
    signInWithGoogle,
    requestPasswordReset,
    resetPassword,
    signOut,
    refreshUser,
    refreshProfile,

    refetchProfile: () => refetchProfile(),
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export function useClerkAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Alias for backward compatibility
export const useAuthContext = useAuth;
