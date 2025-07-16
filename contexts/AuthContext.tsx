import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useQuery } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "../utils/api";
import { Profile } from "../types/profile";

// API Base URL - same as in api.ts
const DEFAULT_API_BASE_URL = "https://www.aroosi.app/api";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;

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
  // Core auth state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  error: string | null;

  // Legacy compatibility properties
  isSignedIn: boolean;
  isLoaded: boolean;
  isProfileComplete: boolean;
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

  // Auth methods
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
  verifyOTP: (
    email: string,
    otp: string
  ) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (
    credential: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getToken: (forceRefresh?: boolean) => Promise<string | null>;
  refreshProfile: () => Promise<void>;

  // Helper methods
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Secure token storage keys
const TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Secure token management
  const getStoredToken = useCallback(async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.error("Error getting stored token:", error);
      return null;
    }
  }, []);

  const storeToken = useCallback(async (newToken: string): Promise<void> => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      setToken(newToken);
    } catch (error) {
      console.error("Error storing token:", error);
    }
  }, []);

  const removeToken = useCallback(async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      setToken(null);
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }, []);

  // Fetch current user data
  const fetchUser = useCallback(
    async (authToken: string): Promise<User | null> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch user");
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    []
  );

  // Initialize API client with auth provider
  useEffect(() => {
    const getTokenForApi = async () => {
      return token || (await getStoredToken());
    };

    apiClient.setAuthProvider(getTokenForApi);
  }, [token, getStoredToken]);

  // Get user profile from API
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["currentProfile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      console.log("🔍 Fetching profile for user:", user.id);
      console.log("📡 Calling GET /profile");
      const response = await apiClient.getProfile();
      console.log("📦 Raw response data:", response);
      console.log("📋 Profile response:", {
        success: response.success,
        hasData: !!response.data,
      });
      if (response.success && response.data) {
        // Some endpoints wrap the actual profile in a `profile` field
        const envelope: any = response.data;
        const extractedProfile: any =
          envelope && typeof envelope === "object" && "profile" in envelope
            ? envelope.profile
            : envelope;

        console.log("✅ Profile found:", {
          hasProfile: true,
          isOnboardingComplete:
            extractedProfile?.isProfileComplete ??
            extractedProfile?.isOnboardingComplete,
          profileId: extractedProfile?.id,
        });

        return extractedProfile as Profile;
      }

      console.log("❌ No profile found or error:", response.error);
      return null;
    },
    enabled: !!user?.id && !isLoading,
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Refresh user data
  const refreshUser = useCallback(async () => {
    const currentToken = token || (await getStoredToken());
    if (!currentToken) {
      setUser(null);
      return;
    }

    const userData = await fetchUser(currentToken);
    setUser(userData);
  }, [token, getStoredToken, fetchUser]);

  // Legacy compatibility method
  const refreshProfile = useCallback(async () => {
    await refreshUser();
    refetchProfile();
  }, [refreshUser, refetchProfile]);

  // Get token method
  const getToken = useCallback(
    async (forceRefresh?: boolean): Promise<string | null> => {
      if (forceRefresh) {
        await refreshUser();
      }
      return token || (await getStoredToken());
    },
    [token, getStoredToken, refreshUser]
  );

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = await getStoredToken();
      if (storedToken) {
        setToken(storedToken);
        const userData = await fetchUser(storedToken);
        if (userData) {
          setUser(userData);
        } else {
          // Invalid token, remove it
          await removeToken();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [getStoredToken, fetchUser, removeToken]);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setError(null);
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Sign in failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        await storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Sign in error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken]
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
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password, firstName, lastName }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Sign up failed";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        return { success: true };
      } catch (error) {
        console.error("Sign up error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // Verify OTP
  const verifyOTP = useCallback(
    async (email: string, otp: string) => {
      try {
        setError(null);
        const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, otp }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "OTP verification failed";
          setError(errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        await storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("OTP verification error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken]
  );

  // Sign in with Google
  const signInWithGoogle = useCallback(
    async (credential: string) => {
      try {
        setError(null);
        const response = await fetch(`${API_BASE_URL}/auth/google`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ credential }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || "Google sign in failed";
          setError(errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        await storeToken(data.token);
        setUser(data.user);
        return { success: true };
      } catch (error) {
        console.error("Google sign in error:", error);
        const errorMessage = "Network error";
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
    },
    [storeToken]
  );

  // Sign out
  const signOut = useCallback(async () => {
    await removeToken();
    setUser(null);
    setError(null);
  }, [removeToken]);

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

  // Computed values for legacy compatibility
  const isAuthenticated = !!user && !!token;
  const isSignedIn = isAuthenticated;
  const isLoaded = !isLoading;
  const isProfileComplete = user?.profile?.isProfileComplete || false;
  const isAdmin = user?.role === "admin";
  const userId = user?.id || "";

  const contextValue: AuthContextType = {
    // Core auth state
    user,
    isLoading,
    isAuthenticated,
    token,
    error,

    // Legacy compatibility
    isSignedIn,
    isLoaded,
    isProfileComplete,
    isOnboardingComplete,
    isAdmin,
    userId,

    // Profile state
    profile: typedProfile,
    isProfileLoading,
    hasProfile,

    // Subscription state
    subscription,

    // Auth methods
    signIn,
    signUp,
    verifyOTP,
    signInWithGoogle,
    signOut,
    refreshUser,
    getToken,
    refreshProfile,

    // Helper methods
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
