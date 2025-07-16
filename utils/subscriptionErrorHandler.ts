import { Platform } from "react-native";

export enum SubscriptionErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  PURCHASE_CANCELLED = "PURCHASE_CANCELLED",
  PURCHASE_FAILED = "PURCHASE_FAILED",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED",
  FEATURE_LIMIT_REACHED = "FEATURE_LIMIT_REACHED",
  BILLING_UNAVAILABLE = "BILLING_UNAVAILABLE",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface SubscriptionError {
  type: SubscriptionErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

export class SubscriptionErrorHandler {
  static handle(error: any, context: string): SubscriptionError {
    // Platform-specific error handling
    if (Platform.OS === "ios") {
      return this.handleIOSError(error, context);
    } else {
      return this.handleAndroidError(error, context);
    }
  }

  private static handleIOSError(
    error: any,
    context: string
  ): SubscriptionError {
    const errorMessage = error?.message || error || "Unknown iOS error";

    if (
      errorMessage.includes("cancelled") ||
      errorMessage.includes("canceled")
    ) {
      return {
        type: SubscriptionErrorType.PURCHASE_CANCELLED,
        message: "Purchase was cancelled by user",
        recoverable: false,
      };
    }

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection")
    ) {
      return {
        type: SubscriptionErrorType.NETWORK_ERROR,
        message: "Network error. Please check your connection and try again.",
        recoverable: true,
      };
    }

    if (
      errorMessage.includes("store") ||
      errorMessage.includes("unavailable")
    ) {
      return {
        type: SubscriptionErrorType.BILLING_UNAVAILABLE,
        message: "App Store is currently unavailable. Please try again later.",
        recoverable: true,
      };
    }

    if (errorMessage.includes("already") || errorMessage.includes("owned")) {
      return {
        type: SubscriptionErrorType.PURCHASE_FAILED,
        message: "You already have an active subscription.",
        recoverable: false,
      };
    }

    return {
      type: SubscriptionErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      details: error,
      recoverable: true,
    };
  }

  private static handleAndroidError(
    error: any,
    context: string
  ): SubscriptionError {
    const errorMessage = error?.message || error || "Unknown Android error";

    if (
      errorMessage.includes("cancelled") ||
      errorMessage.includes("canceled")
    ) {
      return {
        type: SubscriptionErrorType.PURCHASE_CANCELLED,
        message: "Purchase was cancelled by user",
        recoverable: false,
      };
    }

    if (
      errorMessage.includes("network") ||
      errorMessage.includes("connection")
    ) {
      return {
        type: SubscriptionErrorType.NETWORK_ERROR,
        message: "Network error. Please check your connection and try again.",
        recoverable: true,
      };
    }

    if (errorMessage.includes("play") || errorMessage.includes("unavailable")) {
      return {
        type: SubscriptionErrorType.BILLING_UNAVAILABLE,
        message:
          "Google Play Store is currently unavailable. Please try again later.",
        recoverable: true,
      };
    }

    if (errorMessage.includes("already") || errorMessage.includes("owned")) {
      return {
        type: SubscriptionErrorType.PURCHASE_FAILED,
        message: "You already have an active subscription.",
        recoverable: false,
      };
    }

    return {
      type: SubscriptionErrorType.UNKNOWN_ERROR,
      message: errorMessage,
      details: error,
      recoverable: true,
    };
  }

  static getRecoveryAction(error: SubscriptionError): string {
    switch (error.type) {
      case SubscriptionErrorType.NETWORK_ERROR:
        return "Check your internet connection and try again";
      case SubscriptionErrorType.PURCHASE_CANCELLED:
        return "Purchase was cancelled by user";
      case SubscriptionErrorType.BILLING_UNAVAILABLE:
        return "In-app purchases are not available on this device";
      case SubscriptionErrorType.FEATURE_LIMIT_REACHED:
        return "Upgrade your subscription to continue using this feature";
      case SubscriptionErrorType.SUBSCRIPTION_EXPIRED:
        return "Your subscription has expired. Please renew to continue";
      default:
        return "Please try again or contact support";
    }
  }

  static getUserFriendlyMessage(error: SubscriptionError): string {
    switch (error.type) {
      case SubscriptionErrorType.NETWORK_ERROR:
        return "Connection problem. Please check your internet and try again.";
      case SubscriptionErrorType.PURCHASE_CANCELLED:
        return "Purchase cancelled.";
      case SubscriptionErrorType.PURCHASE_FAILED:
        return "Purchase failed. Please try again.";
      case SubscriptionErrorType.VALIDATION_FAILED:
        return "Unable to verify purchase. Please contact support.";
      case SubscriptionErrorType.SUBSCRIPTION_EXPIRED:
        return "Your subscription has expired.";
      case SubscriptionErrorType.FEATURE_LIMIT_REACHED:
        return "You've reached your usage limit for this feature.";
      case SubscriptionErrorType.BILLING_UNAVAILABLE:
        return `${
          Platform.OS === "ios" ? "App Store" : "Google Play Store"
        } is unavailable.`;
      default:
        return error.message || "Something went wrong. Please try again.";
    }
  }
}

export default SubscriptionErrorHandler;
