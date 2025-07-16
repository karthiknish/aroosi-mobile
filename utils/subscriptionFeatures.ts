import { SubscriptionTier, SubscriptionFeatures } from "../types/subscription";

/**
 * Feature access rules aligned with main project
 * These rules define what features are available for each subscription tier
 */
export const FEATURE_ACCESS_RULES: Record<
  SubscriptionTier,
  SubscriptionFeatures
> = {
  free: {
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
  },
  premium: {
    canViewMatches: true,
    canChatWithMatches: true,
    canInitiateChat: true,
    canSendUnlimitedLikes: true,
    canViewFullProfiles: true,
    canHideFromFreeUsers: true,
    canBoostProfile: true,
    canViewProfileViewers: true,
    canUseAdvancedFilters: true,
    hasSpotlightBadge: false,
    canUseIncognitoMode: false,
    canAccessPrioritySupport: true,
    canSeeReadReceipts: true,
    maxLikesPerDay: -1, // unlimited
    boostsPerMonth: 1,
  },
  premiumPlus: {
    canViewMatches: true,
    canChatWithMatches: true,
    canInitiateChat: true,
    canSendUnlimitedLikes: true,
    canViewFullProfiles: true,
    canHideFromFreeUsers: true,
    canBoostProfile: true,
    canViewProfileViewers: true,
    canUseAdvancedFilters: true,
    hasSpotlightBadge: true,
    canUseIncognitoMode: true,
    canAccessPrioritySupport: true,
    canSeeReadReceipts: true,
    maxLikesPerDay: -1, // unlimited
    boostsPerMonth: -1, // unlimited
  },
};

/**
 * Usage limits by subscription tier - aligned with main project
 */
export const USAGE_LIMITS: Record<SubscriptionTier, Record<string, number>> = {
  free: {
    message_sent: 5,
    profile_view: 10,
    search_performed: 20,
    interest_sent: 3,
    profile_boost_used: 0,
    voice_message_sent: 0,
  },
  premium: {
    message_sent: -1, // unlimited
    profile_view: 50,
    search_performed: -1,
    interest_sent: -1,
    profile_boost_used: 1,
    voice_message_sent: 10,
  },
  premiumPlus: {
    message_sent: -1,
    profile_view: -1,
    search_performed: -1,
    interest_sent: -1,
    profile_boost_used: -1,
    voice_message_sent: -1,
  },
};

/**
 * Get features for a specific subscription tier
 */
export function getFeaturesForTier(
  tier: SubscriptionTier
): SubscriptionFeatures {
  return FEATURE_ACCESS_RULES[tier];
}

/**
 * Check if a user can access a specific feature
 */
export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof SubscriptionFeatures
): boolean {
  const features = getFeaturesForTier(tier);
  return Boolean(features[feature]);
}

/**
 * Get usage limit for a specific feature and tier
 */
export function getUsageLimit(tier: SubscriptionTier, feature: string): number {
  return USAGE_LIMITS[tier][feature] || 0;
}

/**
 * Check if a feature has unlimited usage for a tier
 */
export function hasUnlimitedUsage(
  tier: SubscriptionTier,
  feature: string
): boolean {
  return getUsageLimit(tier, feature) === -1;
}

/**
 * Get all tracked features
 */
export function getTrackedFeatures(): string[] {
  return [
    "message_sent",
    "profile_view",
    "search_performed",
    "interest_sent",
    "profile_boost_used",
    "voice_message_sent",
  ];
}

/**
 * Get feature comparison data for UI display
 */
export function getFeatureComparison() {
  return [
    {
      feature: "Send Messages",
      free: "5 per month",
      premium: "Unlimited",
      premiumPlus: "Unlimited",
    },
    {
      feature: "Send Interests",
      free: "3 per month",
      premium: "Unlimited",
      premiumPlus: "Unlimited",
    },
    {
      feature: "Advanced Search Filters",
      free: false,
      premium: true,
      premiumPlus: true,
    },
    {
      feature: "See Who Viewed Your Profile",
      free: false,
      premium: true,
      premiumPlus: true,
    },
    {
      feature: "Profile Boost",
      free: false,
      premium: "1 per month",
      premiumPlus: "Unlimited",
    },
    {
      feature: "Read Receipts",
      free: false,
      premium: true,
      premiumPlus: true,
    },
    {
      feature: "See Who Liked You",
      free: false,
      premium: false,
      premiumPlus: true,
    },
    {
      feature: "Incognito Browsing",
      free: false,
      premium: false,
      premiumPlus: true,
    },
    {
      feature: "Priority Support",
      free: false,
      premium: true,
      premiumPlus: true,
    },
    {
      feature: "Spotlight Badge",
      free: false,
      premium: false,
      premiumPlus: true,
    },
  ];
}
