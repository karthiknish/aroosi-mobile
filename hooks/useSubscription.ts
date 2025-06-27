import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../utils/api";
import { errorHandler, withErrorHandlingAsync } from "../utils/errorHandling";
import { AppError } from "../utils/errorHandling";
import {
  UserSubscription,
  FeatureUsage,
  SubscriptionInfo,
  SubscriptionTier,
  FeatureLimits,
} from "../types/subscription";
import { FEATURE_LIMITS_BY_TIER } from "../utils/inAppPurchases";
import { Platform } from "react-native";
import { SUBSCRIPTION_PLANS } from "../utils/inAppPurchases";
import { ApiResponse } from "../types";

export interface UseSubscriptionResult extends SubscriptionInfo {
  // Loading states
  loading: boolean;
  error: string | null;

  // Actions
  refreshSubscription: () => Promise<void>;
  trackFeatureUsage: (
    feature: keyof FeatureUsage,
    increment?: number
  ) => Promise<void>;
  checkFeatureAccess: (feature: keyof FeatureLimits) => boolean;
  getRemainingQuota: (feature: keyof FeatureUsage) => number;

  // Subscription management
  purchaseSubscription: (planId: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  updatePaymentMethod: () => Promise<boolean>;

  // Real-time feature usage validation
  canUseFeatureNow: (feature: string) => Promise<{
    canUse: boolean;
    reason?: string;
    limit?: number;
    used?: number;
    resetDate?: number;
  }>;
}

export function useSubscription(): UseSubscriptionResult {
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Get subscription status using React Query
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery<SubscriptionInfo | null>({
    queryKey: ["subscription", userId],
    queryFn: async (): Promise<SubscriptionInfo | null> => {
      const result =
        (await apiClient.getSubscriptionStatus()) as ApiResponse<any>;
      if (result && result.success && result.data) {
        return result.data as SubscriptionInfo;
      }
      return null;
    },
    enabled: !!userId,
  });

  // Get usage stats using React Query
  const {
    data: usageData,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery<FeatureUsage | null>({
    queryKey: ["usage", userId],
    queryFn: async (): Promise<FeatureUsage | null> => {
      const result = (await apiClient.getUsageStats()) as ApiResponse<any>;
      if (result && result.success && result.data) {
        return result.data as FeatureUsage;
      }
      return null;
    },
    enabled: !!userId,
  });

  const loading = subscriptionLoading || usageLoading;
  const error =
    subscriptionError || usageError
      ? "Failed to load subscription information"
      : null;
  const subscription =
    (subscriptionData as SubscriptionInfo | null)?.subscription || null;
  const usage = (usageData as FeatureUsage | null) || null;

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] }),
      queryClient.invalidateQueries({ queryKey: ["usage", userId] }),
    ]);
  }, [queryClient, userId]);

  // Check if subscription is active
  const hasActiveSubscription = useCallback((): boolean => {
    if (!subscription) return false;

    const now = Date.now();
    const isActive =
      subscription.status === "active" && subscription.currentPeriodEnd > now;

    return isActive;
  }, [subscription]);

  // Get current subscription tier
  const getCurrentTier = useCallback((): SubscriptionTier => {
    if (!subscription || !hasActiveSubscription()) {
      return "free";
    }
    return subscription.tier;
  }, [subscription, hasActiveSubscription]);

  // Check if trial is active
  const isTrialActive = useCallback((): boolean => {
    if (!subscription || !subscription.trialEnd) return false;

    const now = Date.now();
    return subscription.trialEnd > now;
  }, [subscription]);

  // Get days until expiry
  const daysUntilExpiry = useCallback((): number => {
    if (!subscription) return 0;

    const now = Date.now();
    const expiryDate = subscription.trialEnd || subscription.currentPeriodEnd;
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    return Math.max(0, daysLeft);
  }, [subscription]);

  // Get feature limits for current tier
  const getFeatureLimits = useCallback((): FeatureLimits => {
    const tier = getCurrentTier();
    return FEATURE_LIMITS_BY_TIER[tier] || FEATURE_LIMITS_BY_TIER.free;
  }, [getCurrentTier]);

  // Real-time feature access checking
  const liveFeatureAccessQuery = useQuery<any>({
    queryKey: ["subscriptionFeatures", userId],
    queryFn: async (): Promise<{
      features: Record<string, boolean>;
    } | null> => {
      const result = await apiClient.getSubscriptionFeatures();
      if (
        result &&
        result.success &&
        result.data &&
        typeof (result.data as any).features === "object"
      ) {
        return result.data as { features: Record<string, boolean> };
      }
      return null;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
  const liveFeatureAccess = liveFeatureAccessQuery.data;

  // Check if user can access a feature (with real-time validation)
  const canAccessFeature = useCallback(
    (feature: keyof FeatureLimits): boolean => {
      // Use live feature access data if available, otherwise fall back to local calculation
      const lfa: any = liveFeatureAccess;
      if (lfa && typeof lfa.features === "object") {
        const features = lfa.features as Record<string, boolean>;
        const featureKey = feature as keyof typeof features;
        if (features[featureKey] !== undefined) {
          return Boolean(features[featureKey]);
        }
      }
      // Fallback to local calculation
      const limits = getFeatureLimits();
      return limits[feature] === true;
    },
    [getFeatureLimits, liveFeatureAccess]
  );

  // Check feature access (public method)
  const checkFeatureAccess = useCallback(
    (feature: keyof FeatureLimits): boolean => {
      return canAccessFeature(feature);
    },
    [canAccessFeature]
  );

  // Get remaining usage for a feature
  const getRemainingUsage = useCallback(
    (feature: keyof FeatureUsage): number => {
      if (!usage) return 0;

      const limits = getFeatureLimits();
      const usageKey = feature as keyof FeatureUsage;
      const limitKey = `max${
        feature.charAt(0).toUpperCase() + feature.slice(1)
      }` as keyof FeatureLimits;

      const currentUsage = (usage[usageKey] as number) || 0;
      const maxUsage = limits[limitKey] as number;

      if (maxUsage === null) return Infinity; // Unlimited

      return Math.max(0, maxUsage - currentUsage);
    },
    [usage, getFeatureLimits]
  );

  // Get remaining quota (public method)
  const getRemainingQuota = useCallback(
    (feature: keyof FeatureUsage): number => {
      return getRemainingUsage(feature);
    },
    [getRemainingUsage]
  );

  // Get usage percentage
  const getUsagePercentage = useCallback(
    (feature: keyof FeatureUsage): number => {
      if (!usage) return 0;

      const limits = getFeatureLimits();
      const usageKey = feature as keyof FeatureUsage;
      const limitKey = `max${
        feature.charAt(0).toUpperCase() + feature.slice(1)
      }` as keyof FeatureLimits;

      const currentUsage = (usage[usageKey] as number) || 0;
      const maxUsage = limits[limitKey] as number;

      if (maxUsage === null) return 0; // Unlimited
      if (maxUsage === 0) return 100;

      return Math.min(100, (currentUsage / maxUsage) * 100);
    },
    [usage, getFeatureLimits]
  );

  // Mutations using React Query
  const trackFeatureUsageMutation = useMutation({
    mutationFn: (feature: keyof FeatureUsage) =>
      apiClient.trackFeatureUsage(feature),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usage", userId] });
    },
  });

  const purchaseSubscriptionMutation = useMutation({
    mutationFn: async ({
      platform,
      productId,
      purchaseToken,
      receiptData,
    }: {
      platform: "ios" | "android";
      productId: string;
      purchaseToken?: string;
      receiptData?: string;
    }) => {
      const response = await apiClient.purchaseSubscription({
        platform,
        productId,
        purchaseToken,
        receiptData,
      });
      return response.success === true;
    },
    onSuccess: () => {
      refreshSubscription();
    },
  });

  const restorePurchasesMutation = useMutation({
    mutationFn: () => apiClient.restorePurchases(),
    onSuccess: () => {
      refreshSubscription();
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: () => apiClient.cancelSubscription(),
    onSuccess: () => {
      refreshSubscription();
    },
  });

  // Callback functions for the mutations
  const trackFeatureUsage = useCallback(
    async (feature: keyof FeatureUsage, increment = 1): Promise<void> => {
      if (!userId) return;

      return withErrorHandlingAsync(
        async () => {
          trackFeatureUsageMutation.mutate(feature);
        },
        {
          component: "useSubscription",
          action: "trackFeatureUsage",
          userId,
          metadata: { feature, increment },
        }
      );
    },
    [userId, trackFeatureUsageMutation]
  );

  const purchaseSubscription = useCallback(
    async (planId: string): Promise<boolean> => {
      if (!userId) return false;
      // Determine platform and productId
      const platform = Platform.OS === "ios" ? "ios" : "android";
      let productId = "";
      // Find the correct productId for the plan and platform
      if (platform === "ios") {
        productId =
          SUBSCRIPTION_PLANS.find((p) => p.tier === planId)?.appleProductId ||
          "";
      } else {
        productId =
          SUBSCRIPTION_PLANS.find((p) => p.tier === planId)?.googleProductId ||
          "";
      }
      // Call the in-app purchase manager and get purchaseToken/receiptData
      const { inAppPurchaseManager } = await import("../utils/inAppPurchases");
      const purchaseResult = await inAppPurchaseManager.purchaseProduct(
        productId
      );
      if (!purchaseResult.success) {
        const appError = new AppError(
          purchaseResult.error || "Purchase failed",
          "purchase",
          {
            component: "useSubscription",
            action: "purchaseSubscription",
            userId,
          },
          true
        );
        errorHandler.showError(appError);
        return false;
      }
      const purchaseToken = purchaseResult.purchaseToken;
      const receiptData = purchaseResult.receiptData;
      return (
        withErrorHandlingAsync(
          async () => {
            return new Promise<boolean>((resolve) => {
              purchaseSubscriptionMutation.mutate(
                { platform, productId, purchaseToken, receiptData },
                {
                  onSuccess: (success) => resolve(success),
                  onError: (error) => {
                    const appError = errorHandler.handle(error, {
                      component: "useSubscription",
                      action: "purchaseSubscription",
                      userId,
                      metadata: { planId, platform, productId },
                    });
                    errorHandler.showError(appError);
                    resolve(false);
                  },
                }
              );
            });
          },
          {
            component: "useSubscription",
            action: "purchaseSubscription",
            userId,
            metadata: { planId, platform, productId },
          }
        ) ?? false
      );
    },
    [userId, purchaseSubscriptionMutation]
  );

  const restorePurchases = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;
    return new Promise((resolve) => {
      restorePurchasesMutation.mutate(undefined, {
        onSuccess: (response) => resolve(response.success || false),
        onError: () => resolve(false),
      });
    });
  }, [userId, restorePurchasesMutation]);

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    return new Promise((resolve) => {
      cancelSubscriptionMutation.mutate(undefined, {
        onSuccess: (response) => resolve(response.success || false),
        onError: () => resolve(false),
      });
    });
  }, [subscription, cancelSubscriptionMutation]);

  const updatePaymentMethod = useCallback(async (): Promise<boolean> => {
    if (!subscription) return false;
    try {
      const response = await apiClient.updateSubscriptionTier(
        subscription.tier
      );
      if (response.success) {
        await refreshSubscription();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating payment method:", error);
      return false;
    }
  }, [subscription, apiClient, refreshSubscription]);

  // Real-time feature usage validation
  const canUseFeatureNow = useCallback(
    async (
      feature: string
    ): Promise<{
      canUse: boolean;
      reason?: string;
      limit?: number;
      used?: number;
      resetDate?: number;
    }> => {
      if (!userId) {
        return { canUse: false, reason: "User not authenticated" };
      }
      try {
        const response = await apiClient.canUseFeature(feature);
        if (
          response &&
          response.success &&
          response.data &&
          typeof (response.data as any).canUse === "boolean"
        ) {
          return response.data as any;
        } else {
          return {
            canUse: false,
            reason:
              typeof response.error === "string"
                ? response.error
                : response.error && response.error.message
                ? response.error.message
                : "Feature check failed",
          };
        }
      } catch (error) {
        console.error("Error checking feature usage:", error);
        return { canUse: false, reason: "Network error" };
      }
    },
    [userId, apiClient]
  );

  // Create default usage object if none exists
  const currentUsage = usage || {
    userId: userId || "",
    tier: getCurrentTier(),
    period: new Date().toISOString().slice(0, 7), // YYYY-MM
    messagesSent: 0,
    interestsSent: 0,
    profileViews: 0,
    searchesPerformed: 0,
    profileBoosts: 0,
    limits: getFeatureLimits(),
    lastUpdated: Date.now(),
    periodStart: new Date().setDate(1),
    periodEnd: new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    ).getTime(),
  };

  return {
    // Data
    subscription,
    usage: currentUsage,
    hasActiveSubscription: hasActiveSubscription(),
    isTrialActive: isTrialActive(),
    daysUntilExpiry: daysUntilExpiry(),

    // Loading states
    loading,
    error,

    // Helper methods
    canAccessFeature,
    getRemainingUsage,
    getUsagePercentage,

    // Public methods
    refreshSubscription,
    trackFeatureUsage,
    checkFeatureAccess,
    getRemainingQuota,
    purchaseSubscription,
    restorePurchases,
    cancelSubscription,
    updatePaymentMethod,
    canUseFeatureNow,
  };
}
