// Core types - aligned with main project (aroosi/src/types/profile.ts)
export type SubscriptionTier = "free" | "premium" | "premiumPlus";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "pending"
  | "grace_period"
  | "on_hold";

// Subscription plan object - what mobile components expect
export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: string;
  features: string[];
  popularBadge?: boolean;

  // Store-specific IDs for mobile
  appleProductId?: string;
  googleProductId?: string;
  stripeProductId?: string;
}

// Main project compatible plan details - aligned with aroosi/src/types/profile.ts
export interface SubscriptionPlanDetails {
  id: SubscriptionTier;
  name: string;
  price: number;
  displayPrice: string;
  duration: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}

// User subscription status - aligned with main project API response (aroosi/src/lib/api/subscription.ts)
export interface UserSubscription {
  plan: SubscriptionTier;
  tier: SubscriptionTier; // Components expect this field
  isActive: boolean;
  expiresAt?: number;
  currentPeriodEnd?: number; // Components expect this field
  daysRemaining: number;
  boostsRemaining: number;
  hasSpotlightBadge: boolean;
  spotlightBadgeExpiresAt?: number | null;

  // Mobile-specific fields
  status?: SubscriptionStatus;
  paymentMethod?: "apple" | "google" | "stripe";
  originalTransactionId?: string;
  latestReceiptData?: string;
  createdAt?: number;
  updatedAt?: number;
}

// Feature usage tracking - aligned with main project API response
export interface FeatureUsage {
  plan: SubscriptionTier;
  currentMonth: string;
  resetDate: number;
  features: FeatureUsageItem[];
  
  // Period tracking
  periodStart: number;
  periodEnd: number;
  
  // Usage tracking - what components expect
  messagesSent: number;
  interestsSent: number;
  searchesPerformed: number;
  profileBoosts: number;
  
  // Limits object - what components expect
  limits: FeatureLimits;

  // Legacy format for backward compatibility
  messaging: {
    sent: number;
    limit: number;
  };
  profileViews: {
    count: number;
    limit: number;
  };
  searches: {
    count: number;
    limit: number;
  };
  boosts: {
    used: number;
    monthlyLimit: number;
  };
}

// Feature limits interface
export interface FeatureLimits {
  messagesSent: number;
  interestsSent: number;
  searchesPerformed: number;
  profileBoosts: number;
  profileViews: number;
  dailyLikes: number;
  // Legacy names for backward compatibility
  maxMessages: number;
  maxInterests: number;
  maxProfileViews: number;
  maxSearches: number;
  maxProfileBoosts: number;
  // Feature access limits (boolean features don't have numeric limits, but components may check)
  canBoostProfile?: number;
  canUseAdvancedFilters?: number;
  canSeeWhoViewedProfile?: number;
  canSeeReadReceipts?: number;
  canViewWhoLikedMe?: number;
  canUseIncognitoMode?: number;
  canAccessPrioritySupport?: number;
}

export interface FeatureUsageItem {
  name: string;
  used: number;
  limit: number;
  unlimited: boolean;
  remaining: number;
  percentageUsed: number;
}

// Subscription features - exactly matching main project (aroosi/src/lib/utils/subscriptionUtils.ts)
export interface SubscriptionFeatures {
  canViewMatches: boolean;
  canChatWithMatches: boolean;
  canInitiateChat: boolean;
  canSendUnlimitedLikes: boolean;
  canViewFullProfiles: boolean;
  canHideFromFreeUsers: boolean;
  canBoostProfile: boolean;
  canViewProfileViewers: boolean;
  canUseAdvancedFilters: boolean;
  hasSpotlightBadge: boolean;
  canUseIncognitoMode: boolean;
  canAccessPrioritySupport: boolean;
  canSeeReadReceipts: boolean;
  maxLikesPerDay: number; // -1 = unlimited
  boostsPerMonth: number;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
  purchaseToken?: string;
  receiptData?: string;
}

// Combined subscription info for mobile hooks
export interface SubscriptionInfo {
  subscription: UserSubscription | null;
  usage: FeatureUsage | null;
  features: SubscriptionFeatures;
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  daysUntilExpiry: number;
  canAccessFeature: (feature: keyof SubscriptionFeatures) => boolean;
  getRemainingUsage: (feature: string) => number;
  getUsagePercentage: (feature: string) => number;
}

// Feature availability check result - aligned with main project
export interface FeatureAvailabilityResult {
  canUse: boolean;
  reason?: string;
  requiredPlan?: SubscriptionTier;
  message?: string;
}

// Add PlanFeature type for SubscriptionScreen
export interface PlanFeature {
  title: string;
  free: boolean;
  premium: boolean;
  premiumPlus: boolean;
}
