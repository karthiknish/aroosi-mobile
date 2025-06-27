import React from "react";
import { Alert } from "react-native";
import { networkManager } from "./NetworkManager";
import PlatformHaptics from "./PlatformHaptics";

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  timestamp: number;
  stackTrace?: string;
  userAgent?: string;
  appVersion?: string;
}

export type ErrorType =
  | "network"
  | "validation"
  | "authentication"
  | "authorization"
  | "server"
  | "client"
  | "subscription"
  | "purchase"
  | "feature_limit"
  | "unknown";

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;
  public readonly userMessage: string;

  constructor(
    message: string,
    type: ErrorType = "unknown",
    context: ErrorContext = {},
    recoverable = true,
    userMessage?: string
  ) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.context = context;
    this.recoverable = recoverable;
    this.userMessage = userMessage || this.getDefaultUserMessage(type);
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case "network":
        return "Please check your internet connection and try again.";
      case "validation":
        return "Please check your input and try again.";
      case "authentication":
        return "Please log in to continue.";
      case "authorization":
        return "You don't have permission to perform this action.";
      case "server":
        return "Something went wrong on our end. Please try again later.";
      case "client":
        return "Something went wrong. Please try again.";
      case "subscription":
        return "There was an issue with your subscription. Please try again or contact support.";
      case "purchase":
        return "Purchase failed. Please try again or contact support if the issue persists.";
      case "feature_limit":
        return "You have reached your usage limit. Upgrade to premium for unlimited access.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
}

class ErrorHandler {
  private errorReports: ErrorReport[] = [];
  private maxReports = 50;

  /**
   * Handle and classify errors
   */
  handle(error: Error | any, context: ErrorContext = {}): AppError {
    const appError = this.classifyError(error, context);

    // Log the error
    this.logError(appError, context);

    // Report critical errors
    if (!appError.recoverable) {
      this.reportError(appError, context);
    }

    return appError;
  }

  /**
   * Classify error type based on error properties
   */
  private classifyError(error: Error | any, context: ErrorContext): AppError {
    // If it's already an AppError, return it
    if (error instanceof AppError) {
      return error;
    }

    // Network errors
    if (this.isNetworkError(error)) {
      return new AppError(
        error.message,
        "network",
        context,
        true,
        "Connection problem. Please check your internet and try again."
      );
    }

    // Authentication errors
    if (this.isAuthError(error)) {
      return new AppError(
        error.message,
        "authentication",
        context,
        true,
        "Please log in to continue."
      );
    }

    // Authorization errors
    if (this.isAuthorizationError(error)) {
      return new AppError(
        error.message,
        "authorization",
        context,
        false,
        "You don't have permission to perform this action."
      );
    }

    // Server errors (5xx)
    if (this.isServerError(error)) {
      return new AppError(
        error.message,
        "server",
        context,
        true,
        "Something went wrong on our end. Please try again later."
      );
    }

    // Subscription errors
    if (this.isSubscriptionError(error)) {
      return new AppError(
        error.message,
        "subscription",
        context,
        true,
        this.getSubscriptionErrorMessage(error)
      );
    }

    // Purchase errors
    if (this.isPurchaseError(error)) {
      return new AppError(
        error.message,
        "purchase",
        context,
        true,
        this.getPurchaseErrorMessage(error)
      );
    }

    // Feature limit errors
    if (this.isFeatureLimitError(error)) {
      return new AppError(
        error.message,
        "feature_limit",
        context,
        false,
        "You have reached your usage limit. Upgrade to premium for unlimited access."
      );
    }

    // Validation errors (4xx except auth)
    if (this.isValidationError(error)) {
      return new AppError(
        error.message,
        "validation",
        context,
        true,
        "Please check your input and try again."
      );
    }

    // Default to client error
    return new AppError(
      error.message || "Unknown error",
      "client",
      context,
      true
    );
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: any): boolean {
    return (
      error?.name === "NetworkError" ||
      error?.message?.includes("Network request failed") ||
      error?.message?.includes("fetch") ||
      error?.code === "NETWORK_ERROR" ||
      error?.message?.includes("QUEUED_FOR_RETRY") ||
      !networkManager.isOnline()
    );
  }

  /**
   * Check if error is an authentication error
   */
  private isAuthError(error: any): boolean {
    return (
      error?.status === 401 ||
      error?.code === "UNAUTHORIZED" ||
      error?.message?.includes("authentication") ||
      error?.message?.includes("token")
    );
  }

  /**
   * Check if error is an authorization error
   */
  private isAuthorizationError(error: any): boolean {
    return (
      error?.status === 403 ||
      error?.code === "FORBIDDEN" ||
      error?.message?.includes("permission") ||
      error?.message?.includes("access denied")
    );
  }

  /**
   * Check if error is a server error
   */
  private isServerError(error: any): boolean {
    return (
      (error?.status >= 500 && error?.status < 600) ||
      error?.code === "INTERNAL_SERVER_ERROR"
    );
  }

  /**
   * Check if error is a validation error
   */
  private isValidationError(error: any): boolean {
    return (
      (error?.status >= 400 &&
        error?.status < 500 &&
        error?.status !== 401 &&
        error?.status !== 403) ||
      error?.code === "VALIDATION_ERROR" ||
      error?.message?.includes("validation")
    );
  }

  /**
   * Check if error is a subscription error
   */
  private isSubscriptionError(error: any): boolean {
    return (
      error?.code === "SUBSCRIPTION_EXPIRED" ||
      error?.code === "SUBSCRIPTION_CANCELLED" ||
      error?.code === "SUBSCRIPTION_NOT_FOUND" ||
      error?.code === "INVALID_SUBSCRIPTION_PLAN" ||
      error?.message?.includes("subscription")
    );
  }

  /**
   * Check if error is a purchase error
   */
  private isPurchaseError(error: any): boolean {
    return (
      error?.code === "PURCHASE_VALIDATION_FAILED" ||
      error?.code === "PURCHASE_ALREADY_OWNED" ||
      error?.code === "PURCHASE_CANCELLED" ||
      error?.code === "INVALID_PRODUCT_ID" ||
      error?.code === "E_USER_CANCELLED" ||
      error?.code === "E_ITEM_UNAVAILABLE" ||
      error?.code === "E_ITEM_ALREADY_OWNED" ||
      error?.message?.includes("purchase") ||
      error?.message?.includes("billing")
    );
  }

  /**
   * Check if error is a feature limit error
   */
  private isFeatureLimitError(error: any): boolean {
    return (
      error?.status === 429 ||
      error?.code === "FEATURE_LIMIT_REACHED" ||
      error?.code === "USAGE_LIMIT_EXCEEDED" ||
      error?.code === "QUOTA_EXCEEDED" ||
      error?.message?.includes("limit") ||
      error?.message?.includes("quota")
    );
  }

  /**
   * Get specific subscription error message
   */
  private getSubscriptionErrorMessage(error: any): string {
    switch (error?.code) {
      case "SUBSCRIPTION_EXPIRED":
        return "Your subscription has expired. Please renew to continue using premium features.";
      case "SUBSCRIPTION_CANCELLED":
        return "Your subscription has been cancelled. You can reactivate it anytime.";
      case "SUBSCRIPTION_NOT_FOUND":
        return "No active subscription found. Please subscribe to access premium features.";
      case "INVALID_SUBSCRIPTION_PLAN":
        return "The selected subscription plan is not available. Please try again.";
      default:
        return "There was an issue with your subscription. Please try again or contact support.";
    }
  }

  /**
   * Get specific purchase error message
   */
  private getPurchaseErrorMessage(error: any): string {
    switch (error?.code) {
      case "PURCHASE_VALIDATION_FAILED":
        return "Unable to verify your purchase. Please contact support if this persists.";
      case "PURCHASE_ALREADY_OWNED":
        return "You already have an active subscription.";
      case "PURCHASE_CANCELLED":
      case "E_USER_CANCELLED":
        return "Purchase was cancelled.";
      case "INVALID_PRODUCT_ID":
      case "E_ITEM_UNAVAILABLE":
        return "The selected subscription plan is not available. Please try again.";
      case "E_ITEM_ALREADY_OWNED":
        return "You already own this subscription.";
      default:
        return "Purchase failed. Please try again or contact support if the issue persists.";
    }
  }

  /**
   * Log error for debugging
   */
  private logError(error: AppError, context: ErrorContext) {
    const errorReport: ErrorReport = {
      error,
      context,
      timestamp: Date.now(),
      stackTrace: error.stack,
    };

    this.errorReports.push(errorReport);

    // Keep only the most recent reports
    if (this.errorReports.length > this.maxReports) {
      this.errorReports.shift();
    }

    // Console log in development
    if (__DEV__) {
      console.error("Error handled:", {
        type: error.type,
        message: error.message,
        context,
        recoverable: error.recoverable,
      });
    }
  }

  /**
   * Report critical errors to external service
   */
  private reportError(error: AppError, context: ErrorContext) {
    // In a real app, you would send this to an error tracking service
    // like Sentry, Bugsnag, or Crashlytics
    console.error("Critical error reported:", {
      error: error.message,
      type: error.type,
      context,
      timestamp: Date.now(),
    });
  }

  /**
   * Show user-friendly error message
   */
  showError(error: AppError, onRetry?: () => void) {
    PlatformHaptics.error();

    const buttons: { text: string; style: "default"; onPress?: () => void }[] =
      [{ text: "OK", style: "default" }];
    if (error.recoverable && onRetry) {
      buttons.push({ text: "Retry", style: "default", onPress: onRetry });
    }
    Alert.alert("Error", error.userMessage, buttons);
  }

  /**
   * Get error reports for debugging
   */
  getErrorReports(): ErrorReport[] {
    return [...this.errorReports];
  }

  /**
   * Clear error reports
   */
  clearReports() {
    this.errorReports = [];
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler();

/**
 * Utility function to handle async operations with error handling
 */
export async function withErrorHandlingAsync<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  onError?: (error: AppError) => void
): Promise<T | null> {
  try {
    return await operation();
  } catch (error) {
    const appError = errorHandler.handle(error, context);
    if (onError) {
      onError(appError);
    } else {
      errorHandler.showError(appError);
    }
    return null;
  }
}

/**
 * HOC for components to handle errors
 */
export function withErrorHandlingHOC<P extends object>(
  Component: React.ComponentType<P>,
  defaultContext: ErrorContext = {}
): React.ComponentType<P> {
  const ErrorHandledComponent = (props: P) => {
    const handleError = (error: Error) => {
      const appError = errorHandler.handle(error, {
        ...defaultContext,
        component: Component.displayName || Component.name,
      });
      errorHandler.showError(appError);
    };
    // For now, just return the component without ErrorBoundary
    // In a real implementation, you would import and use ErrorBoundary
    return React.createElement(Component, props);
  };
  ErrorHandledComponent.displayName = `withErrorHandling(${
    Component.displayName || Component.name
  })`;
  return ErrorHandledComponent;
}
