import {
  FeatureLimits,
  FeatureUsage,
  SubscriptionTier,
} from "../types/subscription";

export type FeatureAction =
  | "send_message"
  | "send_interest"
  | "view_profile"
  | "perform_search"
  | "boost_profile"
  | "view_who_liked_me"
  | "see_who_viewed_profile"
  | "use_advanced_filters"
  | "see_read_receipts"
  | "use_incognito_mode"
  | "access_priority_support";

export interface FeatureGateResult {
  allowed: boolean;
  reason?: string;
  remainingQuota?: number;
  upgradeRequired?: boolean;
  showUpgradePrompt?: boolean;
}
 
export interface FeatureGateOptions {
  // Deprecated: UI should handle toasts/modals at call sites
  showAlert?: boolean;
  customMessage?: string;
  onUpgradePrompt?: () => void;
  // New: allow callers to receive a UI message to toast
  onDisallowedMessage?: (title: string, message: string, upgrade: boolean) => void;
}

class FeatureGateManager {
  /**
   * Check if a feature action is allowed
   */
  checkFeatureAccess(
    action: FeatureAction,
    currentTier: SubscriptionTier,
    usage: FeatureUsage,
    limits: FeatureLimits,
    options: FeatureGateOptions = {}
  ): FeatureGateResult {
    const result = this.evaluateFeatureAccess(
      action,
      currentTier,
      usage,
      limits
    );
 
    // No direct UI side-effects in utils; pass message via callback if provided
    if (!result.allowed && options.onDisallowedMessage) {
      const { title, message } = this.composeDisallowedMessage(
        action,
        result,
        options.customMessage
      );
      options.onDisallowedMessage(title, message, !!result.upgradeRequired);
    }
 
    return result;
  }

  /**
   * Evaluate feature access based on action, tier, usage, and limits
   */
  private evaluateFeatureAccess(
    action: FeatureAction,
    currentTier: SubscriptionTier,
    usage: FeatureUsage,
    limits: FeatureLimits
  ): FeatureGateResult {
    switch (action) {
      case "send_message":
        return this.checkUsageLimit(
          typeof usage.profileViews === 'number' ? usage.profileViews : usage.profileViews.count,
          limits.maxProfileViews,
          "You've reached your daily profile view limit",
          currentTier === "free"
        );

      case "send_interest":
        return this.checkUsageLimit(
          usage.interestsSent,
          limits.maxInterests,
          "You've reached your monthly interest limit",
          currentTier === "free"
        );

      case "view_profile":
        return this.checkUsageLimit(
          typeof usage.profileViews === 'number' ? usage.profileViews : usage.profileViews.count,
          limits.maxProfileViews,
          "You've reached your daily profile view limit",
          currentTier === "free"
        );

      case "perform_search":
        return this.checkUsageLimit(
          usage.searchesPerformed,
          limits.maxSearches,
          "You've reached your daily search limit",
          currentTier === "free"
        );

      case "boost_profile":
        if (!limits.canBoostProfile) {
          return {
            allowed: false,
            reason: "Profile boost is not available in your current plan",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return this.checkUsageLimit(
          usage.profileBoosts,
          limits.maxProfileBoosts,
          "You've used all your profile boosts for this month",
          currentTier !== "premiumPlus"
        );

      case "view_who_liked_me":
        if (!limits.canViewWhoLikedMe) {
          return {
            allowed: false,
            reason: "See who liked you is only available in Premium Plus",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return { allowed: true };

      case "see_who_viewed_profile":
        if (!limits.canSeeWhoViewedProfile) {
          return {
            allowed: false,
            reason:
              "See who viewed your profile is only available in Premium plans",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return { allowed: true };

      case "use_advanced_filters":
        if (!limits.canUseAdvancedFilters) {
          return {
            allowed: false,
            reason: "Advanced filters are only available in Premium plans",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return { allowed: true };

      case "see_read_receipts":
        if (!limits.canSeeReadReceipts) {
          return {
            allowed: false,
            reason: "Read receipts are only available in Premium plans",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return { allowed: true };

      case "use_incognito_mode":
        if (!limits.canUseIncognitoMode) {
          return {
            allowed: false,
            reason: "Incognito mode is only available in Premium Plus",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return { allowed: true };

      case "access_priority_support":
        if (!limits.canAccessPrioritySupport) {
          return {
            allowed: false,
            reason: "Priority support is only available in Premium Plus",
            upgradeRequired: true,
            showUpgradePrompt: true,
          };
        }
        return { allowed: true };

      default:
        return { allowed: true };
    }
  }

  /**
   * Check usage limit for countable features
   */
  private checkUsageLimit(
    currentUsage: number,
    maxUsage: number | null,
    limitMessage: string,
    upgradeAvailable: boolean
  ): FeatureGateResult {
    // Unlimited usage
    if (maxUsage === null) {
      return { allowed: true };
    }

    // Check if limit exceeded
    if (currentUsage >= maxUsage) {
      return {
        allowed: false,
        reason: limitMessage,
        remainingQuota: 0,
        upgradeRequired: upgradeAvailable,
        showUpgradePrompt: upgradeAvailable,
      };
    }

    // Usage allowed
    return {
      allowed: true,
      remainingQuota: maxUsage - currentUsage,
    };
  }

  /**
   * Compose UI message details for disallowed access
   */
  private composeDisallowedMessage(
    action: FeatureAction,
    result: FeatureGateResult,
    customMessage?: string
  ): { title: string; message: string } {
    const message =
      customMessage || result.reason || "This feature is not available";
    const title = this.getFeatureTitle(action);
    return { title, message };
  }

  /**
   * Get user-friendly title for feature
   */
  private getFeatureTitle(action: FeatureAction): string {
    switch (action) {
      case "send_message":
        return "Message Limit Reached";
      case "send_interest":
        return "Interest Limit Reached";
      case "view_profile":
        return "Profile View Limit Reached";
      case "perform_search":
        return "Search Limit Reached";
      case "boost_profile":
        return "Profile Boost Unavailable";
      case "view_who_liked_me":
        return "Premium Feature";
      case "see_who_viewed_profile":
        return "Premium Feature";
      case "use_advanced_filters":
        return "Premium Feature";
      case "see_read_receipts":
        return "Premium Feature";
      case "use_incognito_mode":
        return "Premium Plus Feature";
      case "access_priority_support":
        return "Premium Plus Feature";
      default:
        return "Feature Unavailable";
    }
  }

  /**
   * Get upgrade suggestions based on current tier and desired feature
   */
  getUpgradeSuggestion(
    action: FeatureAction,
    currentTier: SubscriptionTier
  ): { targetTier: SubscriptionTier; benefits: string[] } {
    const premiumFeatures = [
      "send_message",
      "send_interest",
      "use_advanced_filters",
      "see_who_viewed_profile",
      "see_read_receipts",
      "boost_profile",
    ];

    const premiumPlusFeatures = [
      "view_who_liked_me",
      "use_incognito_mode",
      "access_priority_support",
    ];

    if (premiumPlusFeatures.includes(action)) {
      return {
        targetTier: "premiumPlus",
        benefits: [
          "See who liked you",
          "Incognito browsing",
          "Priority support",
          "Unlimited profile boosts",
          "All Premium features",
        ],
      };
    }

    if (premiumFeatures.includes(action) || currentTier === "free") {
      return {
        targetTier: "premium",
        benefits: [
          "Unlimited messaging",
          "Unlimited interests",
          "Advanced filters",
          "See who viewed your profile",
          "Read receipts",
          "Monthly profile boost",
        ],
      };
    }

    return {
      targetTier: "premiumPlus",
      benefits: ["All premium features"],
    };
  }

  /**
   * Check if user is approaching limits (80% threshold)
   */
  checkApproachingLimits(
    usage: FeatureUsage,
    limits: FeatureLimits
  ): { feature: keyof FeatureUsage; percentage: number }[] {
    const approaching: { feature: keyof FeatureUsage; percentage: number }[] =
      [];
    const threshold = 0.8; // 80%

    const usageFields: (keyof FeatureUsage)[] = [
      "messagesSent",
      "interestsSent",
      "profileViews",
      "searchesPerformed",
      "profileBoosts",
    ];

    usageFields.forEach((field) => {
      const limitField = `max${
        field.charAt(0).toUpperCase() + field.slice(1)
      }` as keyof FeatureLimits;
      const currentUsage = usage[field] as number;
      const maxUsage = limits[limitField] as number | null;

      if (maxUsage !== null && maxUsage > 0) {
        const percentage = currentUsage / maxUsage;
        if (percentage >= threshold) {
          approaching.push({ feature: field, percentage: percentage * 100 });
        }
      }
    });

    return approaching.sort((a, b) => b.percentage - a.percentage);
  }
}

// Export singleton instance
export const featureGateManager = new FeatureGateManager();
