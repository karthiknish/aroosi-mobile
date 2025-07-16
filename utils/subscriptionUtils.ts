import { Platform, Alert } from "react-native";
import { inAppPurchaseManager } from "./inAppPurchases";
import { useApiClient } from "./api";

/**
 * Subscription utility functions for cross-platform support
 */

export interface SubscriptionInitResult {
  success: boolean;
  error?: string;
  billingSupported: boolean;
}

/**
 * Initialize subscription system on app startup
 */
export async function initializeSubscriptions(): Promise<SubscriptionInitResult> {
  try {
    console.log("Initializing subscription system...");

    // Check if billing is supported on this device
    const billingSupported = await inAppPurchaseManager.isBillingSupported();

    if (!billingSupported) {
      console.warn("In-app billing not supported on this device");
      return {
        success: false,
        error: "In-app purchases not supported on this device",
        billingSupported: false,
      };
    }

    // Initialize the purchase manager
    const initialized = await inAppPurchaseManager.initialize();

    if (!initialized) {
      console.error("Failed to initialize in-app purchase manager");
      return {
        success: false,
        error: "Failed to initialize subscription system",
        billingSupported: true,
      };
    }

    console.log("Subscription system initialized successfully");
    return {
      success: true,
      billingSupported: true,
    };
  } catch (error) {
    console.error("Error initializing subscriptions:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      billingSupported: false,
    };
  }
}

/**
 * Clean up subscription system on app shutdown
 */
export async function cleanupSubscriptions(): Promise<void> {
  try {
    console.log("Cleaning up subscription system...");
    await inAppPurchaseManager.cleanup();
    console.log("Subscription system cleanup completed");
  } catch (error) {
    console.error("Error cleaning up subscriptions:", error);
  }
}

/**
 * Check if subscriptions are available on current platform
 */
export function areSubscriptionsAvailable(): boolean {
  // Subscriptions are available on both iOS and Android
  return Platform.OS === "ios" || Platform.OS === "android";
}

/**
 * Get platform-specific subscription store name
 */
export function getSubscriptionStoreName(): string {
  switch (Platform.OS) {
    case "ios":
      return "App Store";
    case "android":
      return "Google Play Store";
    default:
      return "App Store";
  }
}

/**
 * Show platform-specific subscription management instructions
 */
export function showSubscriptionManagementInstructions(): void {
  const storeName = getSubscriptionStoreName();
  const instructions =
    Platform.OS === "ios"
      ? `To manage your subscription:\n\n1. Open Settings on your device\n2. Tap your name at the top\n3. Tap "Subscriptions"\n4. Find "Aroosi" and tap it\n5. Make changes as needed`
      : `To manage your subscription:\n\n1. Open Google Play Store\n2. Tap Menu → Subscriptions\n3. Find "Aroosi" and tap it\n4. Make changes as needed`;

  Alert.alert(`Manage Subscription - ${storeName}`, instructions, [
    { text: "OK" },
  ]);
}

/**
 * Validate subscription purchase with backend
 */
export async function validateSubscriptionPurchase(
  platform: "ios" | "android",
  productId: string,
  purchaseToken: string,
  receiptData?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const apiClient = useApiClient();

    const response = await apiClient.purchaseSubscription({
      platform,
      productId,
      purchaseToken,
      receiptData,
    });

    if (response.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error:
          typeof response.error === "string"
            ? response.error
            : "Validation failed",
      };
    }
  } catch (error) {
    console.error("Error validating purchase:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Handle subscription purchase errors with user-friendly messages
 */
export function handleSubscriptionError(error: any): string {
  if (typeof error === "string") {
    return error;
  }

  if (error?.message) {
    const message = error.message.toLowerCase();

    // User cancelled
    if (message.includes("cancel") || message.includes("user")) {
      return "Purchase was cancelled";
    }

    // Network issues
    if (message.includes("network") || message.includes("connection")) {
      return "Network error. Please check your connection and try again.";
    }

    // Payment issues
    if (message.includes("payment") || message.includes("billing")) {
      return "Payment failed. Please check your payment method and try again.";
    }

    // Store issues
    if (message.includes("store") || message.includes("unavailable")) {
      return `${getSubscriptionStoreName()} is currently unavailable. Please try again later.`;
    }

    // Already purchased
    if (message.includes("already") || message.includes("owned")) {
      return "You already have an active subscription.";
    }

    return error.message;
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Check if user can make purchases (parental controls, etc.)
 */
export async function canMakePurchases(): Promise<boolean> {
  try {
    // This would typically check device restrictions
    // For now, we assume purchases are allowed if billing is supported
    return await inAppPurchaseManager.isBillingSupported();
  } catch (error) {
    console.error("Error checking purchase capability:", error);
    return false;
  }
}

/**
 * Get subscription renewal date string
 */
export function getSubscriptionRenewalDateString(expiresAt: number): string {
  const date = new Date(expiresAt);
  const now = new Date();

  if (date < now) {
    return "Expired";
  }

  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) {
    return "Renews tomorrow";
  } else if (diffDays <= 7) {
    return `Renews in ${diffDays} days`;
  } else {
    return `Renews on ${date.toLocaleDateString()}`;
  }
}

/**
 * Format subscription price for display
 */
export function formatSubscriptionPrice(
  price: number,
  currency: string = "GBP"
): string {
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
    }).format(price);
  } catch (error) {
    // Fallback formatting
    return `£${price.toFixed(2)}`;
  }
}

/**
 * Get subscription feature comparison data
 */
export function getSubscriptionFeatureComparison() {
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
      premium: false,
      premiumPlus: true,
    },
  ];
}

/**
 * Log subscription events for analytics
 */
export function logSubscriptionEvent(
  event:
    | "purchase_started"
    | "purchase_completed"
    | "purchase_failed"
    | "subscription_cancelled"
    | "restore_completed",
  data?: any
): void {
  try {
    // This would integrate with your analytics service
    console.log("Subscription Event:", event, data);

    // Example: Send to analytics service
    // Analytics.track('subscription_event', {
    //   event,
    //   platform: Platform.OS,
    //   timestamp: Date.now(),
    //   ...data,
    // });
  } catch (error) {
    console.error("Error logging subscription event:", error);
  }
}

/**
 * Check subscription status and sync with backend
 */
export async function syncSubscriptionStatus(): Promise<void> {
  try {
    console.log("Syncing subscription status...");

    // Get local purchases
    const purchases = await inAppPurchaseManager.restorePurchases();

    if (purchases.length > 0 && purchases[0].success) {
      // Validate with backend
      const platform = Platform.OS === "ios" ? "ios" : "android";

      for (const purchase of purchases) {
        if (purchase.success && purchase.purchaseToken) {
          await validateSubscriptionPurchase(
            platform,
            "", // Product ID would be extracted from purchase
            purchase.purchaseToken,
            purchase.receiptData
          );
        }
      }
    }

    console.log("Subscription status sync completed");
  } catch (error) {
    console.error("Error syncing subscription status:", error);
  }
}

export default {
  initializeSubscriptions,
  cleanupSubscriptions,
  areSubscriptionsAvailable,
  getSubscriptionStoreName,
  showSubscriptionManagementInstructions,
  validateSubscriptionPurchase,
  handleSubscriptionError,
  canMakePurchases,
  getSubscriptionRenewalDateString,
  formatSubscriptionPrice,
  getSubscriptionFeatureComparison,
  logSubscriptionEvent,
  syncSubscriptionStatus,
};
