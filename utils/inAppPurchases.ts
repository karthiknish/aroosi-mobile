import * as InAppPurchases from "expo-in-app-purchases";
import { Platform } from "react-native";
import { SubscriptionPlan, PurchaseResult } from "../types/subscription";

export interface PurchaseManager {
  initialize: () => Promise<boolean>;
  getAvailableProducts: (
    productIds: string[]
  ) => Promise<InAppPurchases.IAPItemDetails[]>;
  purchaseProduct: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult[]>;
  getReceiptData: () => Promise<string | null>;
  cleanup: () => Promise<void>;
}

class InAppPurchaseManager implements PurchaseManager {
  private isInitialized = false;
  private purchaseListener?: any;

  /**
   * Initialize in-app purchases
   */
  async initialize(): Promise<boolean> {
    try {
      await InAppPurchases.connectAsync();
      this.isInitialized = true;
      this.setupPurchaseListener();
      return true;
    } catch (error) {
      console.error("Error initializing in-app purchases:", error);
      return false;
    }
  }

  /**
   * Set up purchase event listener
   */
  private setupPurchaseListener(): void {
    this.purchaseListener = InAppPurchases.setPurchaseListener(
      ({ responseCode, results, errorCode }) => {
        if (responseCode === InAppPurchases.IAPResponseCode.OK) {
          results?.forEach((purchase) => {
            console.log("Purchase completed:", purchase);
            // Handle successful purchase
            this.handlePurchaseSuccess(purchase);
          });
        } else if (
          responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED
        ) {
          console.log("Purchase cancelled by user");
        } else {
          console.error("Purchase failed:", { responseCode, errorCode });
        }
      }
    );
  }

  /**
   * Handle successful purchase
   */
  private async handlePurchaseSuccess(
    purchase: InAppPurchases.InAppPurchase
  ): Promise<void> {
    try {
      // Verify purchase with server
      // This would typically involve sending the receipt to your backend
      console.log("Processing purchase:", purchase);

      // Finish the transaction
      await InAppPurchases.finishTransactionAsync(purchase, true);
    } catch (error) {
      console.error("Error handling purchase success:", error);
    }
  }

  /**
   * Get available products from the store
   */
  async getAvailableProducts(
    productIds: string[]
  ): Promise<InAppPurchases.IAPItemDetails[]> {
    if (!this.isInitialized) {
      throw new Error("InAppPurchases not initialized");
    }

    try {
      const result = await InAppPurchases.getProductsAsync(productIds);
      return (result as any)?.results || [];
    } catch (error) {
      console.error("Error getting products:", error);
      return [];
    }
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      return { success: false, error: "In-app purchases not initialized" };
    }

    try {
      await InAppPurchases.purchaseItemAsync(productId);
      return {
        success: true,
        transactionId: `transaction_${Date.now()}`,
      };
    } catch (error) {
      console.error("Error purchasing product:", error);
      if (error instanceof Error && error.message.includes("cancelled")) {
        return {
          success: false,
          cancelled: true,
        };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Purchase failed",
      };
    }
  }

  /**
   * Restore previous purchases
   */
  async restorePurchases(): Promise<PurchaseResult[]> {
    if (!this.isInitialized) {
      return [{ success: false, error: "In-app purchases not initialized" }];
    }

    try {
      const result = await InAppPurchases.getPurchaseHistoryAsync();
      const purchases = (result as any)?.results || [];
      return purchases.map((purchase: any) => ({
        success: true,
        transactionId: purchase.orderId || purchase.transactionId || `restore_${Date.now()}`,
      }));
    } catch (error) {
      console.error("Error restoring purchases:", error);
      return [{ success: false, error: "Restore failed" }];
    }
  }

  /**
   * Get receipt data for server validation
   */
  async getReceiptData(): Promise<string | null> {
    try {
      if (Platform.OS === "ios") {
        // On iOS, get the app receipt
        const result = await InAppPurchases.getProductsAsync([]);
        return result.results?.[0]?.price || null;
      } else {
        // On Android, purchase data is handled differently
        return null;
      }
    } catch (error) {
      console.error("Error getting receipt data:", error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    try {
      if (this.purchaseListener) {
        this.purchaseListener.remove();
        this.purchaseListener = undefined;
      }

      if (this.isInitialized) {
        await InAppPurchases.disconnectAsync();
        this.isInitialized = false;
      }
    } catch (error) {
      console.error("Error cleaning up in-app purchases:", error);
    }
  }
}

// Subscription plans configuration
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    tier: "free",
    name: "Free",
    description: "Basic features to get started",
    price: 0,
    currency: "GBP",
    duration: "monthly",
    features: [
      "5 messages per month",
      "3 interests per month",
      "Basic search filters",
      "View up to 10 profiles per day",
    ],
  },
  {
    id: "premium_monthly",
    tier: "premium",
    name: "Premium",
    description: "Enhanced features for serious connections",
    price: 14.99,
    currency: "GBP",
    duration: "monthly",
    popularBadge: true,
    features: [
      "Unlimited messaging",
      "Unlimited interests",
      "Advanced search filters",
      "See who viewed your profile",
      "Profile boost (1 per month)",
      "Read receipts",
    ],
    appleProductId: "com.aroosi.premium.monthly",
    googleProductId: "premium_monthly",
    stripeProductId: "price_premium_monthly",
  },
  {
    id: "premiumPlus_monthly",
    tier: "premiumPlus",
    name: "Premium Plus",
    description: "Ultimate experience with all features",
    price: 39.99,
    currency: "GBP",
    duration: "monthly",
    features: [
      "Everything in Premium",
      "Incognito browsing",
      "Priority customer support",
      "Unlimited profile boosts",
      "See who liked you",
      "Advanced matching algorithm",
    ],
    appleProductId: "com.aroosi.premiumplus.monthly",
    googleProductId: "aroosi_premium_plus_monthly",
    stripeProductId: "price_premium_plus_monthly",
  },
];

// Feature limits by tier
export const FEATURE_LIMITS_BY_TIER: Record<string, any> = {
  free: {
    maxMessages: 5,
    maxInterests: 3,
    maxProfileViews: 10,
    maxSearches: 20,
    maxProfileBoosts: 0,
    canViewWhoLikedMe: false,
    canSeeWhoViewedProfile: false,
    canUseAdvancedFilters: false,
    canBoostProfile: false,
    canSendUnlimitedMessages: false,
    canSeeReadReceipts: false,
    canUseIncognitoMode: false,
    canAccessPrioritySupport: false,
  },
  premium: {
    maxMessages: null, // unlimited
    maxInterests: null,
    maxProfileViews: null,
    maxSearches: null,
    maxProfileBoosts: 1,
    canViewWhoLikedMe: false,
    canSeeWhoViewedProfile: true,
    canUseAdvancedFilters: true,
    canBoostProfile: true,
    canSendUnlimitedMessages: true,
    canSeeReadReceipts: true,
    canUseIncognitoMode: false,
    canAccessPrioritySupport: false,
  },
  premiumPlus: {
    maxMessages: null,
    maxInterests: null,
    maxProfileViews: null,
    maxSearches: null,
    maxProfileBoosts: null,
    canViewWhoLikedMe: true,
    canSeeWhoViewedProfile: true,
    canUseAdvancedFilters: true,
    canBoostProfile: true,
    canSendUnlimitedMessages: true,
    canSeeReadReceipts: true,
    canUseIncognitoMode: true,
    canAccessPrioritySupport: true,
  },
};

// Export singleton instance
export const inAppPurchaseManager = new InAppPurchaseManager();
