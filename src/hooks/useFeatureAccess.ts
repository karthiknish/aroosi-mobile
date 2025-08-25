import { useCallback } from "react";
import { Alert } from "react-native";
import { useSubscription } from "./useSubscription";
import { errorHandler } from "@utils/errorHandling";
import { FeatureUsage, SubscriptionFeatures } from "../../types/subscription";

export interface FeatureAccessResult {
  allowed: boolean;
  reason?: string;
  showUpgradePrompt?: boolean;
  upgradeRequired?: boolean;
  remainingUsage?: number;
}

export interface UseFeatureAccessReturn {
  checkFeatureAccess: (
    feature: keyof SubscriptionFeatures
  ) => Promise<FeatureAccessResult>;
  validateAndExecute: <T>(
    feature: keyof SubscriptionFeatures,
    action: () => Promise<T>,
    options?: {
      showErrorAlert?: boolean;
      customErrorMessage?: string;
      onUpgradeRequired?: () => void;
    }
  ) => Promise<T | null>;
  canAccessFeature: (feature: keyof SubscriptionFeatures) => boolean;
  getFeatureUsageStatus: (feature: string) => Promise<{
    canUse: boolean;
    reason?: string;
    limit?: number;
    used?: number;
    resetDate?: number;
  }>;
}

export function useFeatureAccess(): UseFeatureAccessReturn {
  const subscriptionResult = useSubscription();
  const {
    checkFeatureAccess: canAccessFeature,
    canUseFeatureNow,
    trackFeatureUsage,
  } = subscriptionResult;

  // Access properties from the subscription result
  const hasActiveSubscription = subscriptionResult.hasActiveSubscription;

  const checkFeatureAccess = useCallback(
    async (
      feature: keyof SubscriptionFeatures
    ): Promise<FeatureAccessResult> => {
      try {
        // First check if the feature is available for the current tier
        const hasFeatureAccess = canAccessFeature(feature);

        if (!hasFeatureAccess) {
          return {
            allowed: false,
            reason: getFeatureUpgradeMessage(feature),
            showUpgradePrompt: true,
            upgradeRequired: true,
          };
        }

        // For usage-based features, check real-time limits
        const usageFeatures = [
          "maxMessages",
          "maxInterests",
          "maxProfileViews",
          "maxSearches",
          "maxProfileBoosts",
        ];

        if (
          usageFeatures.some((uf) =>
            feature.toString().includes(uf.replace("max", "").toLowerCase())
          )
        ) {
          const featureName = mapFeatureToUsageName(feature);
          if (featureName) {
            const usageStatus = await canUseFeatureNow(String(featureName));

            if (!usageStatus.canUse) {
              return {
                allowed: false,
                reason: usageStatus.reason || "Usage limit reached",
                showUpgradePrompt: !hasActiveSubscription,
                upgradeRequired: !hasActiveSubscription,
                remainingUsage: 0,
              };
            }
          }
        }

        return { allowed: true };
      } catch (error) {
        console.error("Error checking feature access:", error);
        return {
          allowed: false,
          reason: "Unable to verify feature access. Please try again.",
        };
      }
    },
    [canAccessFeature, canUseFeatureNow, hasActiveSubscription]
  );

  const validateAndExecute = useCallback(
    async <T>(
      feature: keyof SubscriptionFeatures,
      action: () => Promise<T>,
      options: {
        showErrorAlert?: boolean;
        customErrorMessage?: string;
        onUpgradeRequired?: () => void;
      } = {}
    ): Promise<T | null> => {
      const {
        showErrorAlert = true,
        customErrorMessage,
        onUpgradeRequired,
      } = options;

      try {
        const accessResult = await checkFeatureAccess(feature);

        if (!accessResult.allowed) {
          const message =
            customErrorMessage ||
            accessResult.reason ||
            "Feature not available";

          if (showErrorAlert) {
            if (accessResult.upgradeRequired && onUpgradeRequired) {
              Alert.alert("Upgrade Required", message, [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Upgrade",
                  onPress: onUpgradeRequired,
                  style: "default",
                },
              ]);
            } else {
              Alert.alert("Feature Unavailable", message, [{ text: "OK" }]);
            }
          }

          return null;
        }

        // Execute the action and track usage
        const result = await action();

        // Track feature usage for analytics
        const featureName = mapFeatureToUsageName(feature);
        if (featureName) {
          try {
            await trackFeatureUsage(String(featureName));
          } catch (trackingError) {
            console.warn("Failed to track feature usage:", trackingError);
            // Don't fail the main action due to tracking errors
          }
        }

        return result;
      } catch (error) {
        const appError = errorHandler.handle(error, {
          component: "useFeatureAccess",
          action: "validateAndExecute",
          metadata: { feature },
        });

        if (showErrorAlert) {
          errorHandler.showError(appError);
        }

        return null;
      }
    },
    [checkFeatureAccess, trackFeatureUsage]
  );

  const getFeatureUsageStatus = useCallback(
    async (feature: string) => {
      return canUseFeatureNow(feature);
    },
    [canUseFeatureNow]
  );

  return {
    checkFeatureAccess,
    validateAndExecute,
    canAccessFeature: (feature: keyof SubscriptionFeatures) =>
      canAccessFeature(feature),
    getFeatureUsageStatus,
  };
}

// Helper functions
function getFeatureUpgradeMessage(feature: keyof SubscriptionFeatures): string {
  const messages: Record<string, string> = {
    canInitiateChat:
      "Upgrade to Premium to start conversations with your matches",
    canSendUnlimitedLikes: "Upgrade to Premium for unlimited likes",
    canViewFullProfiles: "Upgrade to Premium to view complete profiles",
    // Boosting available on Premium (limited) and unlimited on Premium Plus
    canBoostProfile:
      "Upgrade to Premium for monthly boosts or Premium Plus for unlimited boosts",
    // Align with web: profile viewers available starting at Premium
    canViewProfileViewers: "Upgrade to Premium to see who viewed your profile",
    canUseAdvancedFilters:
      "Upgrade to Premium Plus for advanced search filters",
    canUseIncognitoMode: "Upgrade to Premium Plus for incognito browsing",
    canAccessPrioritySupport:
      "Upgrade to Premium for priority customer support",
    canSeeReadReceipts: "Upgrade to Premium to see read receipts",
    hasSpotlightBadge: "Upgrade to Premium Plus for a spotlight badge",
  };

  return (
    messages[feature as string] ||
    "Upgrade your subscription to access this feature"
  );
}

function mapFeatureToUsageName(
  feature: keyof SubscriptionFeatures
): keyof FeatureUsage | null {
  const mapping: Record<string, keyof FeatureUsage> = {
    maxMessages: "messagesSent",
    maxInterests: "interestsSent",
    maxProfileViews: "profileViews",
    maxSearches: "searchesPerformed",
    maxProfileBoosts: "profileBoosts",
  };

  // Handle both direct feature names and derived names
  for (const [featureKey, usageName] of Object.entries(mapping)) {
    if (
      feature.toString().includes(featureKey.replace("max", "").toLowerCase())
    ) {
      return usageName;
    }
  }

  return null;
}
