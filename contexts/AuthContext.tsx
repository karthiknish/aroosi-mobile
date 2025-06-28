import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { enhancedApiClient } from "../utils/enhancedApiClient";
import { Profile } from "../types/profile";

interface AuthContextType {
  // Clerk auth state
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;

  // Profile state
  profile: Profile | null;
  isProfileLoading: boolean;
  hasProfile: boolean;
  isOnboardingComplete: boolean;

  // Subscription state
  subscription: {
    plan: "free" | "premium" | "premiumPlus";
    isActive: boolean;
    expiresAt?: number;
  };

  // Helper methods
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();

  // Ensure the API client always has the latest getToken implementation
  useEffect(() => {
    if (clerkAuth.isLoaded && clerkAuth.getToken) {
      const getTokenWithTemplate = () =>
        clerkAuth.getToken({ template: "convex" });

      enhancedApiClient.setAuthProvider(getTokenWithTemplate);
    }
  }, [clerkAuth.isLoaded, clerkAuth.getToken]);

  // Get user profile from API
  const {
    data: profile,
    isLoading: isProfileLoading,
    refetch: refetchProfile,
  } = useQuery({
    queryKey: ["currentProfile", clerkAuth.userId],
    queryFn: async () => {
      if (!clerkAuth.userId) return null;
      console.log("🔍 Fetching profile for user:", clerkAuth.userId);
      console.log("📡 Calling GET /profile");
      const response = await enhancedApiClient.getProfile();
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
    enabled: !!clerkAuth.userId && clerkAuth.isLoaded,
    retry: 1,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Debug: Log the full profile object whenever it changes and is non-null
  useEffect(() => {
    if (profile) {
      console.log("🛂 Full profile loaded:", profile);
    }
  }, [profile]);

  // Refetch profile whenever the authenticated user changes
  useEffect(() => {
    if (clerkAuth.userId) {
      console.log("🔄 User ID changed, refetching profile...");
      refetchProfile();
    }
  }, [clerkAuth.userId]);

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

  const contextValue: AuthContextType = {
    // Clerk auth state
    isLoaded: clerkAuth.isLoaded,
    isSignedIn: !!clerkAuth.userId,
    userId: clerkAuth.userId,
    getToken: clerkAuth.getToken,
    signOut: clerkAuth.signOut,

    // Profile state
    profile: typedProfile,
    isProfileLoading,
    hasProfile,
    isOnboardingComplete,

    // Subscription state
    subscription,

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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Export Clerk auth hook as well for direct access when needed
export { useAuth as useClerkAuth } from '@clerk/clerk-expo';