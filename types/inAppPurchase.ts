/**
 * In-App Purchase Types for Aroosi Mobile App
 * Handles subscription purchases for iOS and Android
 */

// Platform-specific purchase types
export type Platform = 'ios' | 'android';

// Subscription plans matching the web app
export type SubscriptionPlan = 'free' | 'premium' | 'premiumPlus';

// Product identifiers for app stores
export interface ProductIdentifiers {
  ios: {
    premium: string;
    premiumPlus: string;
  };
  android: {
    premium: string;
    premiumPlus: string;
  };
}

// Product information
export interface Product {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  localizedPrice: string;
  countryCode: string;
  subscriptionPeriod?: string;
  introductoryPrice?: string;
  introductoryPricePeriod?: string;
  freeTrialPeriod?: string;
}

// Purchase transaction
export interface PurchaseTransaction {
  transactionId: string;
  productId: string;
  purchaseToken: string;
  purchaseTime: number;
  packageName: string;
  platform: Platform;
  originalTransactionId?: string; // iOS
  receiptData?: string; // iOS
  purchaseState?: number; // Android
  acknowledged?: boolean; // Android
  autoRenewing?: boolean;
  isTrialPeriod?: boolean;
}

// Purchase validation request
export interface PurchaseValidationRequest {
  platform: Platform;
  productId: string;
  purchaseToken: string;
  transactionId: string;
  receiptData?: string; // iOS
  packageName?: string; // Android
  subscriptionPlan: SubscriptionPlan;
}

// Purchase validation response
export interface PurchaseValidationResponse {
  success: boolean;
  valid: boolean;
  message?: string;
  subscription?: {
    plan: SubscriptionPlan;
    expiresAt: number;
    autoRenewing: boolean;
    isTrialPeriod: boolean;
    originalPurchaseDate: number;
  };
  error?: string;
}

// Purchase error types
export type PurchaseErrorType = 
  | 'UserCancel'
  | 'PaymentNotAllowed'
  | 'PaymentInvalid'
  | 'ProductNotAvailable'
  | 'NetworkError'
  | 'SecurityError'
  | 'UnknownError'
  | 'ValidationFailed'
  | 'AlreadyOwned'
  | 'NotOwned';

// Purchase error
export interface PurchaseError {
  type: PurchaseErrorType;
  message: string;
  code?: string;
  debugMessage?: string;
}

// Purchase result
export interface PurchaseResult {
  success: boolean;
  transaction?: PurchaseTransaction;
  error?: PurchaseError;
}

// Restore purchases result
export interface RestorePurchasesResult {
  success: boolean;
  transactions: PurchaseTransaction[];
  restoredCount: number;
  errors: PurchaseError[];
}

// Subscription status
export interface SubscriptionStatus {
  isActive: boolean;
  plan: SubscriptionPlan;
  expiresAt?: number;
  autoRenewing?: boolean;
  isTrialPeriod?: boolean;
  gracePeriodExpiresAt?: number;
  willRenew?: boolean;
  productId?: string;
  originalPurchaseDate?: number;
  lastRenewalDate?: number;
  nextRenewalDate?: number;
}

// Purchase state
export interface PurchaseState {
  isInitialized: boolean;
  isAvailable: boolean;
  products: Product[];
  currentSubscription?: SubscriptionStatus;
  isLoading: boolean;
  error?: PurchaseError;
}

// Product configuration
export interface ProductConfig {
  productId: string;
  plan: SubscriptionPlan;
  title: string;
  description: string;
  features: string[];
  price: {
    monthly: string;
    yearly?: string;
  };
  popular?: boolean;
  badge?: string;
}

// Default product configurations
export const AROOSI_PRODUCTS: Record<SubscriptionPlan, ProductConfig> = {
  free: {
    productId: '',
    plan: 'free',
    title: 'Free Plan',
    description: 'Basic features to get started',
    features: [
      'Browse profiles',
      'Send up to 3 interests per day',
      'Basic search filters',
      'Chat with matches'
    ],
    price: {
      monthly: '£0'
    }
  },
  premium: {
    productId: 'com.aroosi.premium.monthly',
    plan: 'premium',
    title: 'Premium',
    description: 'Enhanced features for serious users',
    features: [
      'Unlimited interests',
      'Advanced search filters',
      'See who liked your profile',
      'Boost your profile visibility',
      'Priority customer support'
    ],
    price: {
      monthly: '£14.99',
      yearly: '£149.99'
    },
    popular: true
  },
  premiumPlus: {
    productId: 'com.aroosi.premiumplus.monthly',
    plan: 'premiumPlus',
    title: 'Premium Plus',
    description: 'All features for the ultimate experience',
    features: [
      'All Premium features',
      'See who viewed your profile',
      'Advanced matching algorithm',
      'Exclusive events access',
      'Personal matchmaking consultation',
      'Priority profile approval'
    ],
    price: {
      monthly: '£39.99',
      yearly: '£399.99'
    },
    badge: 'Best Value'
  }
};

// Environment-specific product IDs
export const PRODUCT_IDS: ProductIdentifiers = {
  ios: {
    premium: 'com.aroosi.premium.monthly',
    premiumPlus: 'com.aroosi.premiumplus.monthly'
  },
  android: {
    premium: 'aroosi_premium_monthly',
    premiumPlus: 'aroosi_premiumplus_monthly'
  }
};

// Purchase event types for analytics
export type PurchaseEvent = 
  | 'purchase_initiated'
  | 'purchase_completed'
  | 'purchase_failed'
  | 'purchase_cancelled'
  | 'restore_initiated'
  | 'restore_completed'
  | 'restore_failed'
  | 'subscription_expired'
  | 'subscription_renewed'
  | 'refund_requested';

// Purchase analytics data
export interface PurchaseAnalytics {
  event: PurchaseEvent;
  productId: string;
  price?: string;
  currency?: string;
  platform: Platform;
  timestamp: number;
  userId: string;
  transactionId?: string;
  errorType?: PurchaseErrorType;
  errorMessage?: string;
}

// Subscription management actions
export type SubscriptionAction = 
  | 'subscribe'
  | 'upgrade'
  | 'downgrade'
  | 'cancel'
  | 'restore'
  | 'renew';

// Subscription change request
export interface SubscriptionChangeRequest {
  action: SubscriptionAction;
  fromPlan: SubscriptionPlan;
  toPlan: SubscriptionPlan;
  productId: string;
  prorationMode?: 'immediate' | 'deferred';
}

// Purchase hooks return type
export interface UsePurchaseReturn {
  // State
  state: PurchaseState;
  
  // Actions
  initializePurchases: () => Promise<boolean>;
  loadProducts: () => Promise<Product[]>;
  purchaseProduct: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<RestorePurchasesResult>;
  
  // Subscription management
  getSubscriptionStatus: () => Promise<SubscriptionStatus>;
  cancelSubscription: () => Promise<boolean>;
  
  // Utilities
  isProductOwned: (productId: string) => boolean;
  getPriceString: (productId: string) => string;
  validatePurchase: (transaction: PurchaseTransaction) => Promise<PurchaseValidationResponse>;
}