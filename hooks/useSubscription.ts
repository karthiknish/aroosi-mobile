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
  SubscriptionPlan,
  SubscriptionFeatures,
  FeatureAvailabilityResult,
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
  trackFeatureUsage: (feature: string) => Promise<void>;
  checkFeatureAccess: (feature: keyof SubscriptionFeatures) => boolean;
  getRemainingQuota: (feature: string) => number;

  // Subscription management
  purchaseSubscription: (planId: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  updatePaymentMethod: () => Promise<boolean>;

  // Real-time feature usage validation - aligned with main project
  canUseFeatureNow: (feature: string) => Promise<FeatureAvailabilityResult>;
}

export function useSubscription(): UseSubscriptionResult {
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Get subscription status using React Query - aligned with main project
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery<UserSubscription | null>({
    queryKey: ["subscription", userId],
    queryFn: async (): Promise<UserSubscription | null> => {
      const result = await apiClient.getSubscriptionStatus();
      if (result && result.success && result.data) {
        return result.data as UserSubscription;
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

  // Get subscription features using React Query
  const {
    data: featuresData,
    isLoading: featuresLoading,
  } = useQuery({
    queryKey: ["subscriptionFeatures", userId],
    queryFn: async (): Promise<{ plan: SubscriptionPlan; features: SubscriptionFeatures; isActive: boolean } | null> => {
      const result = await apiClient.getSubscriptionFeatures();
      if (result && result.success && result.data) {
        return result.data as { plan: SubscriptionPlan; features: SubscriptionFeatures; isActive: boolean };
      }
      return null;
    },
    enabled: !!userId,
  });

  const loading = subscriptionLoading || usageLoading || featuresLoading;
  const error =
    subscriptionError || usageError
      ? "Failed to load subscription information"
      : null;
  const subscription = subscriptionData || null;
  const usage = usageData || null;
  const features = featuresData?.features || null;

  // Refresh subscription data
  const refreshSubscription = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["subscription", userId] }),
      queryClient.invalidateQueries({ queryKey: ["usage", userId] }),
    ]);
  }, [queryClient, userId]);

  // Check if subscription is active - aligned with main project
  const hasActiveSubscription = useCallback((): boolean => {
    return subscription?.isActive || false;
  }, [subscription]);

  // Get current subscription plan
  const getCurrentPlan = useCallback(() => {
    return subscription?.plan || "free";
  }, [subscription]);

  // Check if trial is active (not used in main project, but kept for compatibility)
  const isTrialActive = useCallback((): boolean => {
    return false; // Main project doesn't use trials
  }, []);

  // Get days until expiry - aligned with main project
  const daysUntilExpiry = useCallback((): number => {
    return subscription?.daysRemaining || 0;
  }, [subscription]);

  // Get subscription features - aligned with main project
  const getSubscriptionFeatures = useCallback((): SubscriptionFeatures => {
    if (features) {
      return features;
    }
    // Fallback to default free features
    return {
      canViewMatches: true,
      canChatWithMatches: true,
      canInitiateChat: false,
      canSendUnlimitedLikes: false,
      canViewFullProfiles: false,
      canHideFromFreeUsers: false,
      canBoostProfile: false,
      canViewProfileViewers: false,
      canUseAdvancedFilters: false,
      hasSpotlightBadge: false,
      canUseIncognitoMode: false,
      canAccessPrioritySupport: false,
      canSeeReadReceipts: false,
      maxLikesPerDay: 5,
      boostsPerMonth: 0,
    };
  }, [features]);

  // Remove old live feature access query - now handled by featuresData

  // Check if user can access a feature - aligned with main project
  const canAccessFeature = useCallback(
    (feature: keyof SubscriptionFeatures): boolean => {
      const subscriptionFeatures = getSubscriptionFeatures();
      return Boolean(subscriptionFeatures[feature]);
    },
    [getSubscriptionFeatures]
  );

  // Check feature access (public method)
  const checkFeatureAccess = useCallback(
    (feature: keyof SubscriptionFeatures): boolean => {
      return canAccessFeature(feature);
    },
    [canAccessFeature]
  );

  // Get remaining usage for a feature - aligned with main project
  const getRemainingUsage = useCallback(
    (feature: string): number => {
      if (!usage || !usage.features) return 0;

      const featureUsage = usage.features.find(f => f.name === feature);
      if (!featureUsage) return 0;

      return featureUsage.remaining;
    },
    [usage]
  );

  // Get remaining quota (public method)
  const getRemainingQuota = useCallback(
    (feature: string): number => {
      return getRemainingUsage(feature);
    },
    [getRemainingUsage]
  );

  // Get usage percentage - aligned with main project
  const getUsagePercentage = useCallback(
    (feature: string): number => {
      if (!usage || !usage.features) return 0;

      const featureUsage = usage.features.find(f => f.name === feature);
      if (!featureUsage) return 0;

      return featureUsage.percentageUsed;
    },
    [usage]
  );

  // Mutations using React Query - aligned with main project
  const trackFeatureUsageMutation = useMutation({
    mutationFn: (feature: string) =>
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
      purchaseToken: string;
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
      } else {
        // Handle case where endpoint is not available
        console.warn("Subscription upgrade endpoint not available");
        return false;
      }
    } catch (error) {
      console.error("Error updating payment method:", error);
      return false;
    }
  }, [subscription, apiClient, refreshSubscription]);

  // Real-time feature usage validation - aligned with main project
  const canUseFeatureNow = useCallback(
    async (feature: string): Promise<FeatureAvailabilityResult> => {
      if (!userId) {
        return { canUse: false, reason: "User not authenticated" };
      }
      try {
        const response = await apiClient.canUseFeature(feature);
        if (response && response.success && response.data) {
          return response.data as FeatureAvailabilityResult;
        } else {
          return {
            canUse: false,
            reason: typeof response.error === 'string' ? response.error : "Feature check failed",
          };
        }
      } catch (error) {
        console.error("Error checking feature usage:", error);
        return { canUse: false, reason: "Network error" };
      }
    },
    [userId, apiClient]
  );

  // Track feature usage method is defined earlier in the file

  return {
    // Data - aligned with main project
    subscription,
    usage,
    features: getSubscriptionFeatures(),
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
