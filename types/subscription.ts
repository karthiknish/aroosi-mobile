export type SubscriptionTier = "free" | "premium" | "premiumPlus";

export type SubscriptionStatus =
  | "active"
  | "expired"
  | "cancelled"
  | "pending"
  | "grace_period"
  | "on_hold";

export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  currency: string;
  duration: "monthly" | "yearly";
  features: string[];
  popularBadge?: boolean;

  // Store-specific IDs
  appleProductId?: string;
  googleProductId?: string;
  stripeProductId?: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  trialEnd?: number;

  // Payment info
  paymentMethod?: "apple" | "google" | "stripe";
  originalTransactionId?: string;
  latestReceiptData?: string;

  // Metadata
  createdAt: number;
  updatedAt: number;
}

export interface FeatureUsage {
  userId: string;
  tier: SubscriptionTier;
  period: string; // YYYY-MM format

  // Usage counters
  messagesSent: number;
  interestsSent: number;
  profileViews: number;
  searchesPerformed: number;
  profileBoosts: number;

  // Limits based on tier
  limits: FeatureLimits;

  // Timestamps
  lastUpdated: number;
  periodStart: number;
  periodEnd: number;
}

export interface FeatureLimits {
  // Aligned with API SubscriptionFeatures
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

  // Additional mobile-specific limits
  maxMessages: number | null; // null = unlimited
  maxInterests: number | null;
  maxProfileViews: number | null;
  maxSearches: number | null;

  // Add missing fields for feature gating
  maxProfileBoosts: number | null;
  canViewWhoLikedMe: boolean;
  canSeeWhoViewedProfile: boolean;
}

export interface PurchaseResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  cancelled?: boolean;
  purchaseToken?: string;
  receiptData?: string;
}

export interface SubscriptionInfo {
  subscription: UserSubscription | null;
  usage: FeatureUsage;
  hasActiveSubscription: boolean;
  isTrialActive: boolean;
  daysUntilExpiry: number;
  canAccessFeature: (feature: keyof FeatureLimits) => boolean;
  getRemainingUsage: (feature: keyof FeatureUsage) => number;
  getUsagePercentage: (feature: keyof FeatureUsage) => number;
}

// Add PlanFeature type for SubscriptionScreen
export interface PlanFeature {
  title: string;
  free: boolean;
  premium: boolean;
  premiumPlus: boolean;
}
