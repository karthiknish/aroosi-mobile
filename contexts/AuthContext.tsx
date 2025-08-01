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

// API Base URL must be provided via environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL as string;
if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Configure your API base URL in environment.");
}

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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
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

  // Fetch current user using cookie session
  const fetchUser = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/session`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) return null;
      const data = await response.json();
      // expect { user: {...} } or null
      return data?.user ?? null;
    } catch (error) {
      console.error("Error fetching session:", error);
      return null;
    }
  }, []);

  // No API auth header; we rely on cookie sessions with credentials: 'include'

  // Get user profile from API
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["currentProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      // Use REST endpoint aligned to web: GET /profiles/me
      const res = await fetch(`${API_BASE_URL}/profiles/me`, {
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

  // Sign in with email/password
  const signIn = useCallback(async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
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
  }, [fetchUser]);

  // Sign up with email/password
  const signUp = useCallback(async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || "Sign up failed";
        setError(msg);
        return { success: false, error: msg };
      }
      // After signup, session may be active; fetch user
      const u = await fetchUser();
      setUser(u);
      // Invalidate queries that depend on session
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["unreadCounts"] });
      return { success: true };
    } catch (e) {
      console.error("Sign up error:", e);
      const msg = "Network error";
      setError(msg);
      return { success: false, error: msg };
    }
  }, [fetchUser]);

  // Verify OTP
  // Removed OTP verification (not used in web flow)
  
  // Sign in with Google (ID token exchange -> cookie-session)
  const signInWithGoogle = useCallback(async (idToken: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/google`, {
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
  }, [fetchUser]);

  // Forgot password: request reset
  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const msg = data?.error || data?.message || "Failed to request password reset";
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

  // Reset password with token
  const resetPassword = useCallback(async (token: string, password: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token, password }),
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
  
  // Sign out
  const signOut = useCallback(async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Alias for backward compatibility
export const useAuthContext = useAuth;
