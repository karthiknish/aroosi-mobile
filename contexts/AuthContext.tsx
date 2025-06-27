import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../utils/api';
import { Profile } from '../types/profile';


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
    plan: 'free' | 'premium' | 'premiumPlus';
    isActive: boolean;
    expiresAt?: number;
  };
  
  // Helper methods
  refetchProfile: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const clerkAuth = useClerkAuth();
  const apiClient = useApiClient();
  
  // Get user profile from API
  const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useQuery({
    queryKey: ['currentProfile'],
    queryFn: async () => {
      if (!clerkAuth.userId) return null;
      const response = await apiClient.getProfile();
      return response.success ? response.data : null;
    },
    enabled: !!clerkAuth.userId && clerkAuth.isLoaded,
    retry: 1,
  });

  // Derive auth state
  const hasProfile = !!profile;
  const typedProfile = profile as Profile | null;
  const isOnboardingComplete = typedProfile?.isOnboardingComplete ?? false;
  
  // Determine subscription status
  const subscription = {
    plan: typedProfile?.subscriptionPlan ?? 'free' as const,
    isActive: typedProfile?.subscriptionPlan !== 'free' && 
             typedProfile?.subscriptionExpiresAt ? 
             typedProfile.subscriptionExpiresAt > Date.now() : false,
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
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
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