import { useCallback } from "react";
import { useAuth } from "@contexts/AuthProvider";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@utils/api";
import {
  errorHandler,
  withErrorHandlingAsync,
  AppError,
} from "@utils/errorHandling";
import { SubscriptionErrorHandler } from "@utils/subscriptionErrorHandler";
import {
  CACHE_TTL,
  OfflineSubscriptionManager,
} from "@utils/subscriptionCache";
import {
  UserSubscription,
  FeatureUsage,
  SubscriptionInfo,
  SubscriptionPlan,
  SubscriptionFeatures,
  FeatureAvailabilityResult,
} from "../../types/subscription";

import { Platform } from "react-native";
import { SUBSCRIPTION_PLANS } from "@utils/inAppPurchases";

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
  const { userId } = useAuth() as any;
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Get subscription status using React Query with caching - aligned with main project
  const {
    data: subscriptionData,
    isLoading: subscriptionLoading,
    error: subscriptionError,
  } = useQuery<UserSubscription | null>({
    queryKey: ["subscription", userId],
    queryFn: async (): Promise<UserSubscription | null> => {
      if (!userId) return null;

      // Use offline subscription manager for caching and offline support
      return await OfflineSubscriptionManager.getSubscriptionStatus(
        userId,
        async () => {
          const result = await apiClient.getSubscriptionStatus();
          if (result && result.success && result.data) {
            return { success: true, data: result.data };
          }
          throw new Error(
            result?.error?.message || "Failed to fetch subscription status"
          );
        }
      );
    },
    enabled: !!userId,
    staleTime: CACHE_TTL.SUBSCRIPTION_STATUS,
    gcTime: CACHE_TTL.SUBSCRIPTION_STATUS * 2,
  });

  // Get usage stats using React Query with caching
  const {
    data: usageData,
    isLoading: usageLoading,
    error: usageError,
  } = useQuery<FeatureUsage | null>({
    queryKey: ["usage", userId],
    queryFn: async (): Promise<FeatureUsage | null> => {
      if (!userId) return null;

      return await OfflineSubscriptionManager.getUsageStats(
        userId,
        async () => {
          const result = await apiClient.getUsageStats();
          if (result && result.success && result.data) {
            return { success: true, data: result.data };
          }
          throw new Error(
            result?.error?.message || "Failed to fetch usage stats"
          );
        }
      );
    },
    enabled: !!userId,
    staleTime: CACHE_TTL.USAGE_STATS,
    gcTime: CACHE_TTL.USAGE_STATS * 2,
  });

  // Get subscription features using React Query with caching
  const { data: featuresData, isLoading: featuresLoading } = useQuery({
    queryKey: ["subscriptionFeatures", userId],
    queryFn: async (): Promise<{
      plan: SubscriptionPlan;
      features: SubscriptionFeatures;
      isActive: boolean;
    } | null> => {
      if (!userId) return null;

      return await OfflineSubscriptionManager.getFeatureAccess(
        userId,
        async () => {
          const result = await apiClient.getSubscriptionFeatures();
          if (result && result.success && result.data) {
            return { success: true, data: result.data };
          }
          throw new Error(
            result?.error?.message || "Failed to fetch subscription features"
          );
        }
      );
    },
    enabled: !!userId,
    staleTime: CACHE_TTL.FEATURE_ACCESS,
    gcTime: CACHE_TTL.FEATURE_ACCESS * 2,
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

      const featureUsage = usage.features.find((f) => f.name === feature);
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

      const featureUsage = usage.features.find((f) => f.name === feature);
      if (!featureUsage) return 0;

      return featureUsage.percentageUsed;
    },
    [usage]
  );

  // Mutations using React Query - aligned with main project
  const trackFeatureUsageMutation = useMutation({
    mutationFn: (feature: string) => apiClient.trackFeatureUsage(feature),
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
    async (feature: string, increment = 1): Promise<void> => {
      if (!userId) return;

      await withErrorHandlingAsync(
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

      try {
        // Determine platform and productId
        const platform = Platform.OS === "ios" ? "ios" : "android";
        let productId = "";

        // Find the correct productId for the plan and platform
        const plan = SUBSCRIPTION_PLANS.find((p) => p.tier === planId);
        if (!plan) {
          console.error("Plan not found:", planId);
          return false;
        }

        if (platform === "ios") {
          productId = plan.appleProductId || "";
        } else {
          productId = plan.googleProductId || "";
        }

        if (!productId) {
          console.error("Product ID not found for platform:", platform, planId);
          return false;
        }

        console.log("Purchasing subscription:", {
          planId,
          platform,
          productId,
        });

        // Initialize in-app purchase manager if needed
        const { inAppPurchaseManager } = await import("@utils/inAppPurchases");
        const isInitialized = await inAppPurchaseManager.initialize();

        if (!isInitialized) {
          console.error("Failed to initialize in-app purchases");
          return false;
        }

        // Attempt the purchase
        const purchaseResult = await inAppPurchaseManager.purchaseProduct(
          productId
        );

        if (!purchaseResult.success) {
          if (purchaseResult.cancelled) {
            console.log("Purchase was cancelled by user");
            return false;
          }

          // Use subscription-specific error handling
          const subscriptionError = SubscriptionErrorHandler.handle(
            purchaseResult.error || "Purchase failed",
            "purchase"
          );

          const userMessage =
            SubscriptionErrorHandler.getUserFriendlyMessage(subscriptionError);
          const appError = new AppError(
            userMessage,
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

        // Extract purchase data
        const purchaseToken = purchaseResult.purchaseToken || "";
        const receiptData = purchaseResult.receiptData;

        console.log("Purchase successful, validating with server...");

        // Validate with server
        return new Promise<boolean>((resolve) => {
          purchaseSubscriptionMutation.mutate(
            { platform, productId, purchaseToken, receiptData },
            {
              onSuccess: (success) => {
                console.log("Server validation result:", success);
                resolve(success);
              },
              onError: (error) => {
                console.error("Server validation failed:", error);
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
      } catch (error) {
        console.error("Error in purchaseSubscription:", error);
        const appError = errorHandler.handle(error, {
          component: "useSubscription",
          action: "purchaseSubscription",
          userId,
          metadata: { planId },
        });
        errorHandler.showError(appError);
        return false;
      }
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
      const response = await apiClient.updateSubscriptionTier();
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
            reason:
              typeof response.error === "string"
                ? response.error
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
