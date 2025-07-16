import {
  Product,
  Purchase,
  PurchaseError,
  SubscriptionPurchase,
  Subscription,
  initConnection,
  endConnection,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  finishTransaction,
  purchaseErrorListener,
  purchaseUpdatedListener,
  getAvailablePurchases,
  validateReceiptIos,
  validateReceiptAndroid,
  clearTransactionIOS,
  clearProductsIOS,
  flushFailedPurchasesCachedAsPendingAndroid,
} from "react-native-iap";
import { Platform } from "react-native";
import { SubscriptionPlan, PurchaseResult } from "../types/subscription";

export interface PurchaseManager {
  initialize: () => Promise<boolean>;
  getAvailableProducts: (productIds: string[]) => Promise<Product[]>;
  purchaseProduct: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult[]>;
  getReceiptData: () => Promise<string | null>;
  cleanup: () => Promise<void>;
}

class InAppPurchaseManager implements PurchaseManager {
  private isInitialized = false;
  private purchaseUpdateSubscription?: any;
  private purchaseErrorSubscription?: any;
  private pendingPurchases: Map<string, (result: PurchaseResult) => void> =
    new Map();

  /**
   * Initialize in-app purchases with platform-specific setup
   */
  async initialize(): Promise<boolean> {
    try {
      console.log("Initializing in-app purchases...");

      // Initialize connection
      const result = await initConnection();
      console.log("IAP connection result:", result);

      this.isInitialized = true;

      // Clear any pending transactions on iOS
      if (Platform.OS === "ios") {
        try {
          await clearTransactionIOS();
          await clearProductsIOS();
        } catch (error) {
          console.log("No pending iOS transactions to clear");
        }
      }

      // Clear failed purchases on Android
      if (Platform.OS === "android") {
        try {
          await flushFailedPurchasesCachedAsPendingAndroid();
        } catch (error) {
          console.log("No failed Android purchases to clear");
        }
      }

      this.setupPurchaseListeners();
      console.log("In-app purchases initialized successfully");
      return true;
    } catch (error) {
      console.error("Error initializing in-app purchases:", error);
      return false;
    }
  }

  /**
   * Set up purchase event listeners with proper error handling
   */
  private setupPurchaseListeners(): void {
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase | SubscriptionPurchase) => {
        console.log("Purchase update received:", purchase);
        await this.handlePurchaseSuccess(purchase);
      }
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error("Purchase error:", error);
        this.handlePurchaseError(error);
      }
    );
  }

  /**
   * Handle successful purchase with server validation
   */
  private async handlePurchaseSuccess(
    purchase: Purchase | SubscriptionPurchase
  ): Promise<void> {
    try {
      console.log("Processing successful purchase:", purchase.productId);

      // Extract purchase data based on platform
      const purchaseData = this.extractPurchaseData(purchase);

      // Resolve pending purchase promise
      const pendingCallback = this.pendingPurchases.get(purchase.productId);
      if (pendingCallback) {
        pendingCallback({
          success: true,
          transactionId: purchase.transactionId,
          purchaseToken: purchaseData.purchaseToken,
          receiptData: purchaseData.receiptData,
        });
        this.pendingPurchases.delete(purchase.productId);
      }

      // Finish the transaction
      await finishTransaction({ purchase, isConsumable: false });
      console.log("Transaction finished successfully");
    } catch (error) {
      console.error("Error handling purchase success:", error);

      // Resolve with error
      const pendingCallback = this.pendingPurchases.get(purchase.productId);
      if (pendingCallback) {
        pendingCallback({
          success: false,
          error: "Failed to process purchase",
        });
        this.pendingPurchases.delete(purchase.productId);
      }
    }
  }

  /**
   * Handle purchase errors with platform-specific messages
   */
  private handlePurchaseError(error: PurchaseError): void {
    console.error("Purchase error details:", error);

    // Platform-specific error handling
    let errorMessage = error.message;
    let cancelled = error.code === "E_USER_CANCELLED";

    // Enhanced error messages based on error codes
    switch (error.code) {
      case "E_USER_CANCELLED":
        errorMessage = "Purchase was cancelled by user";
        cancelled = true;
        break;
      case "E_NETWORK_ERROR":
        errorMessage =
          "Network error. Please check your connection and try again.";
        break;
      case "E_SERVICE_ERROR":
        errorMessage =
          Platform.OS === "ios"
            ? "App Store is currently unavailable. Please try again later."
            : "Google Play Store is currently unavailable. Please try again later.";
        break;
      case "E_ALREADY_OWNED":
        errorMessage = "You already own this subscription.";
        break;
      case "E_ITEM_UNAVAILABLE":
        errorMessage = "This subscription is currently unavailable.";
        break;
      default:
        errorMessage =
          error.message || "An unexpected error occurred during purchase.";
    }

    // Find and resolve pending purchases with error
    for (const [productId, callback] of this.pendingPurchases.entries()) {
      callback({
        success: false,
        error: errorMessage,
        cancelled,
      });
    }
    this.pendingPurchases.clear();
  }

  /**
   * Extract platform-specific purchase data
   */
  private extractPurchaseData(purchase: Purchase | SubscriptionPurchase): {
    purchaseToken: string;
    receiptData?: string;
  } {
    if (Platform.OS === "ios") {
      return {
        purchaseToken: purchase.transactionReceipt || "",
        receiptData: purchase.transactionReceipt,
      };
    } else {
      // Android
      return {
        purchaseToken:
          (purchase as any).purchaseToken || purchase.transactionReceipt || "",
      };
    }
  }

  /**
   * Get available products and subscriptions
   */
  async getAvailableProducts(productIds: string[]): Promise<Product[]> {
    if (!this.isInitialized) {
      throw new Error("InAppPurchases not initialized");
    }

    try {
      console.log("Fetching products:", productIds);

      // Separate subscription and product IDs
      const subscriptionIds = productIds.filter(
        (id) =>
          id.includes("monthly") ||
          id.includes("yearly") ||
          id.includes("premium")
      );
      const productOnlyIds = productIds.filter(
        (id) => !subscriptionIds.includes(id)
      );

      let allProducts: Product[] = [];

      // Get subscriptions and convert to Product format
      if (subscriptionIds.length > 0) {
        try {
          const subscriptions = await getSubscriptions({
            skus: subscriptionIds,
          });
          // Convert subscriptions to Product format for compatibility
          const convertedSubscriptions: Product[] = subscriptions.map(
            (sub: Subscription) => ({
              ...sub,
              type: "subs" as any,
              price: (sub as any).price || "0",
              currency: (sub as any).currency || "GBP",
              localizedPrice:
                (sub as any).localizedPrice || (sub as any).price || "0",
            })
          );
          allProducts = [...allProducts, ...convertedSubscriptions];
          console.log("Fetched subscriptions:", subscriptions.length);
        } catch (error) {
          console.error("Error fetching subscriptions:", error);
        }
      }

      // Get regular products
      if (productOnlyIds.length > 0) {
        try {
          const products = await getProducts({ skus: productOnlyIds });
          allProducts = [...allProducts, ...products];
          console.log("Fetched products:", products.length);
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      }

      console.log("Total products fetched:", allProducts.length);
      return allProducts;
    } catch (error) {
      console.error("Error getting available products:", error);
      return [];
    }
  }

  /**
   * Purchase a product with proper platform handling
   */
  async purchaseProduct(productId: string): Promise<PurchaseResult> {
    if (!this.isInitialized) {
      return { success: false, error: "In-app purchases not initialized" };
    }

    try {
      console.log("Attempting to purchase:", productId);

      // Create promise for purchase completion
      const purchasePromise = new Promise<PurchaseResult>((resolve) => {
        this.pendingPurchases.set(productId, resolve);

        // Set timeout to prevent hanging
        setTimeout(() => {
          if (this.pendingPurchases.has(productId)) {
            this.pendingPurchases.delete(productId);
            resolve({
              success: false,
              error: "Purchase timeout",
            });
          }
        }, 60000); // 60 second timeout
      });

      // Determine if it's a subscription
      const isSubscription =
        productId.includes("monthly") ||
        productId.includes("yearly") ||
        productId.includes("premium");

      if (isSubscription) {
        console.log("Requesting subscription:", productId);
        await requestSubscription({ sku: productId });
      } else {
        console.log("Requesting product purchase:", productId);
        await requestPurchase({ sku: productId });
      }

      // Wait for purchase completion
      const result = await purchasePromise;
      console.log("Purchase result:", result);
      return result;
    } catch (error) {
      console.error("Error purchasing product:", error);

      // Clean up pending purchase
      this.pendingPurchases.delete(productId);

      if (error instanceof Error) {
        if (
          error.message.includes("cancelled") ||
          error.message.includes("canceled")
        ) {
          return {
            success: false,
            cancelled: true,
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: "Purchase failed",
      };
    }
  }

  /**
   * Restore previous purchases with platform-specific handling
   */
  async restorePurchases(): Promise<PurchaseResult[]> {
    if (!this.isInitialized) {
      return [{ success: false, error: "In-app purchases not initialized" }];
    }

    try {
      console.log("Restoring purchases...");
      const purchases = await getAvailablePurchases();
      console.log("Found purchases to restore:", purchases.length);

      if (purchases.length === 0) {
        return [{ success: false, error: "No purchases to restore" }];
      }

      return purchases.map((purchase) => {
        const purchaseData = this.extractPurchaseData(purchase);
        return {
          success: true,
          transactionId: purchase.transactionId,
          purchaseToken: purchaseData.purchaseToken,
          receiptData: purchaseData.receiptData,
        };
      });
    } catch (error) {
      console.error("Error restoring purchases:", error);
      return [
        {
          success: false,
          error: error instanceof Error ? error.message : "Restore failed",
        },
      ];
    }
  }

  /**
   * Get receipt data for server validation
   */
  async getReceiptData(): Promise<string | null> {
    try {
      const purchases = await getAvailablePurchases();
      if (purchases.length > 0) {
        const latestPurchase = purchases[purchases.length - 1];
        const purchaseData = this.extractPurchaseData(latestPurchase);
        return purchaseData.receiptData || purchaseData.purchaseToken;
      }
      return null;
    } catch (error) {
      console.error("Error getting receipt data:", error);
      return null;
    }
  }

  /**
   * Validate receipt with platform stores
   */
  async validateReceipt(
    receiptData: string,
    isProduction: boolean = true
  ): Promise<boolean> {
    try {
      if (Platform.OS === "ios") {
        const result = await validateReceiptIos({
          receiptBody: {
            "receipt-data": receiptData,
            password: "", // Add your iOS shared secret here
          },
          isTest: !isProduction,
        });
        return result.status === 0;
      } else {
        const result = await validateReceiptAndroid({
          packageName: "com.aroosi.mobile",
          productId: "temp_product_id", // Will be set dynamically
          productToken: receiptData,
          accessToken: "", // Add your Google Play access token here
        });
        return result.purchaseState === 1; // Purchased
      }
    } catch (error) {
      console.error("Error validating receipt:", error);
      return false;
    }
  }

  /**
   * Check if billing is supported
   */
  async isBillingSupported(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      return this.isInitialized;
    } catch (error) {
      console.error("Error checking billing support:", error);
      return false;
    }
  }

  /**
   * Clean up resources properly
   */
  async cleanup(): Promise<void> {
    try {
      console.log("Cleaning up in-app purchases...");

      // Clear pending purchases
      this.pendingPurchases.clear();

      // Remove listeners
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = undefined;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = undefined;
      }

      // End connection
      if (this.isInitialized) {
        await endConnection();
        this.isInitialized = false;
      }

      console.log("In-app purchases cleanup completed");
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

// Feature limits are now managed in utils/subscriptionFeatures.ts
// This maintains backward compatibility while centralizing feature management

// Export singleton instance
export const inAppPurchaseManager = new InAppPurchaseManager();
