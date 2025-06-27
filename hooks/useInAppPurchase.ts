/**
 * In-App Purchase Hook for Aroosi Mobile App
 * Handles subscription purchases, validation, and management
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Platform, Alert } from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import {
  initConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  validateReceiptIos,
  validateReceiptAndroid,
  endConnection,
  PurchaseError as RNIAPPurchaseError,
  Product as RNIAPProduct,
  Purchase as RNIAPPurchase,
  SubscriptionPurchase,
} from "react-native-iap";
import { useApiClient } from "../utils/api";
import {
  Platform as AppPlatform,
  Product,
  PurchaseTransaction,
  PurchaseResult,
  PurchaseState,
  PurchaseError,
  PurchaseErrorType,
  RestorePurchasesResult,
  SubscriptionStatus,
  SubscriptionPlan,
  UsePurchaseReturn,
  PRODUCT_IDS,
  AROOSI_PRODUCTS,
  PurchaseValidationRequest,
  PurchaseValidationResponse,
} from "../types/inAppPurchase";

const PLATFORM: AppPlatform = Platform.OS === "ios" ? "ios" : "android";

export const useInAppPurchase = (): UsePurchaseReturn => {
  const { userId, getToken } = useAuth();
  const apiClient = useApiClient();

  // State
  const [state, setState] = useState<PurchaseState>({
    isInitialized: false,
    isAvailable: false,
    products: [],
    isLoading: false,
  });

  // Refs for cleanup
  const purchaseUpdateSubscription = useRef<any>(null);
  const purchaseErrorSubscription = useRef<any>(null);

  // Initialize in-app purchases
  const initializePurchases = useCallback(async (): Promise<boolean> => {
    try {
      setState((prev) => ({ ...prev, isLoading: true }));

      const result = await initConnection();

      if (result) {
        // Set up purchase listeners
        purchaseUpdateSubscription.current = purchaseUpdatedListener(
          async (purchase: RNIAPPurchase | SubscriptionPurchase) => {
            console.log("Purchase updated:", purchase);
            await handlePurchaseUpdate(purchase);
          }
        );

        purchaseErrorSubscription.current = purchaseErrorListener(
          (error: RNIAPPurchaseError) => {
            console.log("Purchase error:", error);
            handlePurchaseError(error);
          }
        );

        setState((prev) => ({
          ...prev,
          isInitialized: true,
          isAvailable: true,
          isLoading: false,
        }));

        // Load products after initialization
        await loadProducts();

        return true;
      } else {
        setState((prev) => ({
          ...prev,
          isInitialized: false,
          isAvailable: false,
          isLoading: false,
          error: {
            type: "NetworkError",
            message: "Failed to initialize purchase connection",
          },
        }));
        return false;
      }
    } catch (error) {
      console.error("Error initializing purchases:", error);
      setState((prev) => ({
        ...prev,
        isInitialized: false,
        isAvailable: false,
        isLoading: false,
        error: {
          type: "UnknownError",
          message:
            error instanceof Error ? error.message : "Initialization failed",
        },
      }));
      return false;
    }
  }, []);

  // Load available products
  const loadProducts = useCallback(async (): Promise<Product[]> => {
    try {
      const productIds = [
        PRODUCT_IDS[PLATFORM].premium,
        PRODUCT_IDS[PLATFORM].premiumPlus,
      ];

      const products = await getProducts({ skus: productIds });

      const mappedProducts: Product[] = products.map(
        (product: RNIAPProduct) => ({
          productId: product.productId,
          title: product.title,
          description: product.description,
          price: product.price,
          currency: product.currency,
          localizedPrice: product.localizedPrice,
          countryCode: product.countryCode,
          subscriptionPeriod: (product as any).subscriptionPeriod ?? undefined,
          introductoryPrice: (product as any).introductoryPrice ?? undefined,
          introductoryPricePeriod:
            (product as any).introductoryPricePeriod ?? undefined,
          freeTrialPeriod: (product as any).freeTrialPeriod ?? undefined,
        })
      );

      setState((prev) => ({
        ...prev,
        products: mappedProducts,
      }));

      return mappedProducts;
    } catch (error) {
      console.error("Error loading products:", error);
      setState((prev) => ({
        ...prev,
        error: {
          type: "ProductNotAvailable",
          message: "Failed to load subscription products",
        },
      }));
      return [];
    }
  }, []);

  // Purchase a product
  const purchaseProduct = useCallback(
    async (productId: string): Promise<PurchaseResult> => {
      try {
        if (!state.isAvailable || !state.isInitialized) {
          return {
            success: false,
            error: {
              type: "PaymentNotAllowed",
              message: "Purchase system not available",
            },
          };
        }

        setState((prev) => ({ ...prev, isLoading: true }));

        const purchase = await requestPurchase({
          sku: productId,
          andDangerouslyFinishTransactionAutomaticallyIOS: false,
        });

        if (
          purchase &&
          typeof purchase === "object" &&
          !Array.isArray(purchase)
        ) {
          return {
            success: true,
            transaction: mapPurchaseToTransaction(purchase),
          };
        } else {
          return {
            success: false,
            error: {
              type: "UnknownError",
              message: "No purchase was made",
            },
          };
        }
      } catch (error) {
        console.error("Error purchasing product:", error);

        const purchaseError = mapErrorToPurchaseError(error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: purchaseError,
        }));

        return {
          success: false,
          error: purchaseError,
        };
      }
    },
    [state.isAvailable, state.isInitialized]
  );

  // Handle purchase updates
  const handlePurchaseUpdate = useCallback(
    async (purchase: RNIAPPurchase | SubscriptionPurchase) => {
      try {
        // Validate purchase with backend
        const transaction = mapPurchaseToTransaction(purchase);
        const validationResult = await validatePurchase(transaction);

        if (validationResult.success && validationResult.valid) {
          // Purchase is valid, finish the transaction
          if (purchase && !Array.isArray(purchase)) {
            await finishTransaction({ purchase, isConsumable: false });
          }

          // Update subscription status
          if (validationResult.subscription) {
            setState((prev) => ({
              ...prev,
              currentSubscription: {
                isActive: true,
                plan: validationResult.subscription!.plan,
                expiresAt: validationResult.subscription!.expiresAt,
                autoRenewing: validationResult.subscription!.autoRenewing,
                isTrialPeriod: validationResult.subscription!.isTrialPeriod,
                originalPurchaseDate:
                  validationResult.subscription!.originalPurchaseDate,
              },
              isLoading: false,
              error: undefined,
            }));
          }

          Alert.alert(
            "Purchase Successful",
            "Your subscription has been activated successfully!",
            [{ text: "OK" }]
          );
        } else {
          // Purchase validation failed
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: {
              type: "ValidationFailed",
              message: validationResult.message || "Purchase validation failed",
            },
          }));

          Alert.alert(
            "Purchase Failed",
            "There was an issue validating your purchase. Please contact support.",
            [{ text: "OK" }]
          );
        }
      } catch (error) {
        console.error("Error handling purchase update:", error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: {
            type: "ValidationFailed",
            message: "Failed to process purchase",
          },
        }));
      }
    },
    []
  );

  // Handle purchase errors
  const handlePurchaseError = useCallback((error: RNIAPPurchaseError) => {
    const purchaseError = mapErrorToPurchaseError(error);

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error: purchaseError,
    }));

    // Show user-friendly error message
    if (purchaseError.type !== "UserCancel") {
      Alert.alert("Purchase Error", purchaseError.message, [{ text: "OK" }]);
    }
  }, []);

  // Restore purchases
  const restorePurchases =
    useCallback(async (): Promise<RestorePurchasesResult> => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        const purchases = await getAvailablePurchases();
        const transactions: PurchaseTransaction[] = [];
        const errors: PurchaseError[] = [];

        for (const purchase of purchases) {
          try {
            const transaction = mapPurchaseToTransaction(purchase);
            const validationResult = await validatePurchase(transaction);

            if (validationResult.success && validationResult.valid) {
              transactions.push(transaction);

              // Update subscription status for active subscriptions
              if (validationResult.subscription) {
                setState((prev) => ({
                  ...prev,
                  currentSubscription: {
                    isActive: true,
                    plan: validationResult.subscription!.plan,
                    expiresAt: validationResult.subscription!.expiresAt,
                    autoRenewing: validationResult.subscription!.autoRenewing,
                    isTrialPeriod: validationResult.subscription!.isTrialPeriod,
                    originalPurchaseDate:
                      validationResult.subscription!.originalPurchaseDate,
                  },
                }));
              }
            }
          } catch (error) {
            errors.push({
              type: "ValidationFailed",
              message:
                error instanceof Error ? error.message : "Validation failed",
            });
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: undefined,
        }));

        return {
          success: true,
          transactions,
          restoredCount: transactions.length,
          errors,
        };
      } catch (error) {
        console.error("Error restoring purchases:", error);

        const purchaseError = mapErrorToPurchaseError(error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: purchaseError,
        }));

        return {
          success: false,
          transactions: [],
          restoredCount: 0,
          errors: [purchaseError],
        };
      }
    }, []);

  // Validate purchase with backend
  const validatePurchase = useCallback(
    async (
      transaction: PurchaseTransaction
    ): Promise<PurchaseValidationResponse> => {
      try {
        if (!userId) {
          return {
            success: false,
            valid: false,
            error: "User not authenticated",
          };
        }

        const token = await getToken();
        if (!token) {
          return {
            success: false,
            valid: false,
            error: "Authentication token not available",
          };
        }

        const validationRequest: PurchaseValidationRequest = {
          platform: PLATFORM,
          productId: transaction.productId,
          purchaseToken: transaction.purchaseToken,
          transactionId: transaction.transactionId,
          receiptData: transaction.receiptData,
          subscriptionPlan: (() => {
            if (
              transaction.productId.includes("premium") &&
              !transaction.productId.includes("plus")
            ) {
              return "premium";
            } else if (
              transaction.productId.includes("premiumplus") ||
              transaction.productId.includes("plus")
            ) {
              return "premiumPlus";
            } else {
              return "free";
            }
          })(),
        };

        const response = await apiClient.validatePurchase(
          validationRequest,
          token
        );

        const data = response.data as unknown;
        if (
          response.success &&
          data &&
          typeof (data as PurchaseValidationResponse).success === "boolean" &&
          typeof (data as PurchaseValidationResponse).valid === "boolean"
        ) {
          return data as PurchaseValidationResponse;
        }
        return {
          success: false,
          valid: false,
          error:
            typeof response.error === "string"
              ? response.error
              : "Validation failed",
        };
      } catch (error) {
        console.error("Error validating purchase:", error);
        return {
          success: false,
          valid: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    [userId, getToken, apiClient]
  );

  // Get current subscription status
  const getSubscriptionStatus =
    useCallback(async (): Promise<SubscriptionStatus> => {
      try {
        if (!userId) {
          return { isActive: false, plan: "free" };
        }

        const token = await getToken();
        if (!token) {
          return { isActive: false, plan: "free" };
        }

        const response = await apiClient.getSubscriptionStatus();
        const data = response.data as unknown;
        if (
          response.success &&
          data &&
          typeof (data as SubscriptionStatus).isActive === "boolean" &&
          typeof (data as SubscriptionStatus).plan === "string"
        ) {
          return data as SubscriptionStatus;
        }
        return { isActive: false, plan: "free" };
      } catch (error) {
        console.error("Error getting subscription status:", error);
        return { isActive: false, plan: "free" };
      }
    }, [userId, getToken, apiClient]);

  // Cancel subscription
  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    try {
      if (!userId) return false;

      const token = await getToken();
      if (!token) return false;

      const response = await apiClient.cancelSubscription();

      if (response.success) {
        setState((prev) => ({
          ...prev,
          currentSubscription: prev.currentSubscription
            ? {
                ...prev.currentSubscription,
                autoRenewing: false,
                willRenew: false,
              }
            : undefined,
        }));
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error canceling subscription:", error);
      return false;
    }
  }, [userId, getToken, apiClient]);

  // Utility functions
  const isProductOwned = useCallback(
    (productId: string): boolean => {
      return (
        (state.currentSubscription?.isActive &&
          state.currentSubscription.productId === productId) ||
        false
      );
    },
    [state.currentSubscription]
  );

  const getPriceString = useCallback(
    (productId: string): string => {
      const product = state.products.find((p) => p.productId === productId);
      return product?.localizedPrice || "Price unavailable";
    },
    [state.products]
  );

  // Helper functions
  const mapPurchaseToTransaction = (
    purchase: RNIAPPurchase | SubscriptionPurchase
  ): PurchaseTransaction => {
    return {
      transactionId: purchase.transactionId,
      productId: purchase.productId,
      purchaseToken: purchase.purchaseToken,
      purchaseTime: Number(purchase.transactionDate),
      packageName:
        typeof (purchase as any).packageName === "string"
          ? (purchase as any).packageName
          : "",
      platform: PLATFORM,
      originalTransactionId:
        "originalTransactionIdentifierIOS" in purchase
          ? purchase.originalTransactionIdentifierIOS
          : undefined,
      receiptData:
        "transactionReceipt" in purchase
          ? purchase.transactionReceipt
          : undefined,
      purchaseState:
        "purchaseStateAndroid" in purchase
          ? purchase.purchaseStateAndroid
          : undefined,
      acknowledged:
        "isAcknowledgedAndroid" in purchase
          ? purchase.isAcknowledgedAndroid
          : undefined,
      autoRenewing:
        "autoRenewingAndroid" in purchase
          ? purchase.autoRenewingAndroid
          : undefined,
    };
  };

  const mapErrorToPurchaseError = (error: any): PurchaseError => {
    if (error.code === "E_USER_CANCELLED") {
      return { type: "UserCancel", message: "Purchase was cancelled by user" };
    }
    if (error.code === "E_ITEM_UNAVAILABLE") {
      return {
        type: "ProductNotAvailable",
        message: "Product is not available",
      };
    }
    if (error.code === "E_NETWORK_ERROR") {
      return { type: "NetworkError", message: "Network error occurred" };
    }
    if (error.code === "E_USER_ERROR") {
      return { type: "PaymentInvalid", message: "Payment method is invalid" };
    }
    if (error.code === "E_ITEM_ALREADY_OWNED") {
      return {
        type: "AlreadyOwned",
        message: "You already own this subscription",
      };
    }

    return {
      type: "UnknownError",
      message: error.message || "An unknown error occurred",
      code: error.code,
      debugMessage: error.debugMessage,
    };
  };

  // Initialize on mount
  useEffect(() => {
    initializePurchases();

    // Cleanup on unmount
    return () => {
      if (purchaseUpdateSubscription.current) {
        purchaseUpdateSubscription.current.remove();
      }
      if (purchaseErrorSubscription.current) {
        purchaseErrorSubscription.current.remove();
      }
      endConnection();
    };
  }, [initializePurchases]);

  // Load subscription status on auth change
  useEffect(() => {
    if (userId && state.isInitialized) {
      getSubscriptionStatus().then((status) => {
        setState((prev) => ({
          ...prev,
          currentSubscription: status,
        }));
      });
    }
  }, [userId, state.isInitialized, getSubscriptionStatus]);

  return {
    state,
    initializePurchases,
    loadProducts,
    purchaseProduct,
    restorePurchases,
    getSubscriptionStatus,
    cancelSubscription,
    isProductOwned,
    getPriceString,
    validatePurchase,
  };
};
