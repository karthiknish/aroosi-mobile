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

  const hasActiveSubscription = subscriptionResult.hasActiveSubscription;
  const currentPlan = subscriptionResult.subscription?.plan;

  // Explicit mapping from boolean gate features to server-side usage counters
  // Avoid brittle substring checks; keep parity with server feature keys
  const usageFeatureByGate: Partial<
    Record<keyof SubscriptionFeatures, keyof FeatureUsage | string>
  > = {
    canBoostProfile: "profileBoosts",
    // Messaging usage is tracked per send action elsewhere (messagesSent),
    // we don't couple it to canInitiateChat here to avoid false positives.
    // Example mappings you can enable when integrating in the respective flows:
    // canChatWithMatches: "messagesSent",
    // canInitiateChat: "messagesSent",
    // Advanced filters are not usage-counted; no mapping here.
  };

  const checkFeatureAccess = useCallback(
    async (
      feature: keyof SubscriptionFeatures
    ): Promise<FeatureAccessResult> => {
      try {
        const hasFeature = canAccessFeature(feature);
        if (!hasFeature) {
          return {
            allowed: false,
            reason: getFeatureUpgradeMessage(feature),
            showUpgradePrompt: true,
            upgradeRequired: true,
          };
        }

        const mappedUsageFeature = usageFeatureByGate[feature];
        if (mappedUsageFeature) {
          const usageStatus = await canUseFeatureNow(
            String(mappedUsageFeature)
          );
          if (!usageStatus.canUse) {
            const requiresPlanUpgrade = Boolean(
              usageStatus.requiredPlan &&
                usageStatus.requiredPlan !== currentPlan
            );
            return {
              allowed: false,
              reason: usageStatus.reason || "Usage limit reached",
              showUpgradePrompt: requiresPlanUpgrade || !hasActiveSubscription,
              upgradeRequired: requiresPlanUpgrade || !hasActiveSubscription,
              remainingUsage: 0,
            };
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
    [canAccessFeature, canUseFeatureNow, hasActiveSubscription, currentPlan]
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

        const result = await action();

        const mappedUsageFeature = usageFeatureByGate[feature];
        if (mappedUsageFeature) {
          try {
            await trackFeatureUsage(String(mappedUsageFeature));
          } catch (trackingError) {
            console.warn("Failed to track feature usage:", trackingError);
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
    canBoostProfile:
      "Upgrade to Premium for monthly boosts or Premium Plus for unlimited boosts",
    canViewProfileViewers: "Upgrade to Premium to see who viewed your profile",
    canUseAdvancedFilters: "Upgrade to Premium for advanced search filters",
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

