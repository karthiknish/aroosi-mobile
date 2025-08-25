import { MessagingErrorHandler } from "./messagingErrors";
import { ApiResponse, ApiError } from "../types/profile";

/**
 * Specialized retry manager for API requests with intelligent retry strategies
 */
export class ApiRetryManager {
  private static readonly DEFAULT_MAX_RETRIES = 3;
  private static readonly DEFAULT_BASE_DELAY = 1000; // 1 second
  private static readonly MAX_DELAY = 30000; // 30 seconds

  /**
   * Executes an API request with automatic retry logic
   */
  static async executeWithRetry<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string,
    options?: {
      maxRetries?: number;
      baseDelay?: number;
      shouldRetry?: (error: any) => boolean;
    }
  ): Promise<ApiResponse<T>> {
    const maxRetries = options?.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const baseDelay = options?.baseDelay ?? this.DEFAULT_BASE_DELAY;
    const shouldRetry = options?.shouldRetry ?? this.defaultShouldRetry;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result.success) {
          return result;
        }
        if (attempt === maxRetries || !shouldRetry(result)) {
          return result;
        }
        lastError = result;
      } catch (error) {
        const messagingError = MessagingErrorHandler.classifyError(error);
        if (attempt === maxRetries || !shouldRetry(error)) {
          return {
            success: false,
            error: {
              code: messagingError.type,
              message: messagingError.message,
            },
          };
        }
        lastError = error;
      }
      // Calculate delay and retry
      const delay = Math.min(
        baseDelay * Math.pow(2, attempt) + Math.random() * 1000,
        ApiRetryManager.MAX_DELAY
      );
      console.warn(
        `[ApiRetryManager] ${context} failed (attempt ${attempt + 1}/${
          maxRetries + 1
        }), retrying in ${delay}ms:`,
        lastError
      );
      await ApiRetryManager.delay(delay);
    }
    // If all retries are exhausted, return a generic failure response
    return {
      success: false,
      error: {
        code: "RETRY_EXHAUSTED",
        message: `All retry attempts failed for ${context}`,
      },
    };
  }

  /**
   * Default retry logic for API errors
   */
  private static defaultShouldRetry(error: any): boolean {
    const status = error.status || error.response?.status;
    // Don't retry on client errors (4xx) except for specific cases
    if (typeof status === "number" && status >= 400 && status < 500) {
      // Retry on rate limiting and request timeout
      return status === 429 || status === 408;
    }
    // Don't retry on authentication/authorization errors
    if (status === 401 || status === 403) {
      return false;
    }
    // Don't retry on validation errors
    if (status === 400 || status === 422) {
      return false;
    }
    // Retry on network errors and server errors (5xx)
    if (typeof status === "number" && status >= 500) {
      return true;
    }
    // Retry on network-related errors
    if (
      error.name === "NetworkError" ||
      error.code === "NETWORK_ERROR" ||
      error.message?.includes("fetch") ||
      error.message?.includes("network") ||
      error.message?.includes("timeout")
    ) {
      return true;
    }
    return false;
  }

  static async retryMessageSend<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string = "sendMessage"
  ): Promise<ApiResponse<T>> {
    return this.executeWithRetry(operation, context, {
      maxRetries: 2, // Lower retry count for message sending
      baseDelay: 2000, // Longer initial delay
      shouldRetry: (error) => {
        // More conservative retry logic for message sending
        const status = error.status || error.response?.status;
        // Only retry on server errors and network issues
        return (
          (typeof status === "number" && status >= 500) ||
          error.name === "NetworkError" ||
          error.code === "NETWORK_ERROR"
        );
      },
    });
  }

  /**
   * Specialized retry for message fetching operations
   */
  static async retryMessageFetch<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string = "getMessages"
  ): Promise<ApiResponse<T>> {
    return this.executeWithRetry(operation, context, {
      maxRetries: 3, // Higher retry count for fetching
      baseDelay: 1000,
      shouldRetry: this.defaultShouldRetry,
    });
  }

  /**
   * Specialized retry for voice message operations
   */
  static async retryVoiceOperation<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string = "voiceMessage"
  ): Promise<ApiResponse<T>> {
    return this.executeWithRetry(operation, context, {
      maxRetries: 2,
      baseDelay: 3000, // Longer delay for voice operations
      shouldRetry: (error) => {
        const status = error.status || error.response?.status;

        // Retry on server errors and network issues, but not on file size errors
        return (
          (typeof status === "number" && status >= 500) ||
          (error.name === "NetworkError" && !error.message?.includes("size"))
        );
      },
    });
  }

  /**
   * Batch retry for multiple operations
   */
  static async retryBatch<T>(
    operations: Array<() => Promise<ApiResponse<T>>>,
    context: string,
    options?: {
      maxRetries?: number;
      baseDelay?: number;
      failFast?: boolean; // Stop on first failure
    }
  ): Promise<ApiResponse<T[]>> {
    const results: T[] = [];
    const errors: string[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const result = await operations[i]();
        if (result.success) {
          results.push(result.data!);
        } else {
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error?.message || "Unknown error";
          errors.push(errorMessage);
          if (options?.failFast) {
            return {
              success: false,
              error: {
                code: "BATCH_OPERATION_FAILED",
                message: `Batch operation failed at index ${i}: ${errorMessage}`,
              },
            };
          }
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(errorMessage);
        if (options?.failFast) {
          return {
            success: false,
            error: {
              code: "BATCH_OPERATION_FAILED",
              message: `Batch operation failed at index ${i}: ${errorMessage}`,
            },
          };
        }
      }
    }
    if (errors.length > 0 && results.length === 0) {
      return {
        success: false,
        error: {
          code: "ALL_BATCH_OPERATIONS_FAILED",
          message: `All batch operations failed: ${errors.join(", ")}`,
        },
      };
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Circuit breaker pattern for frequently failing operations
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string,
    options?: {
      failureThreshold?: number;
      resetTimeout?: number;
    }
  ) {
    const failureThreshold = options?.failureThreshold ?? 5;
    const resetTimeout = options?.resetTimeout ?? 60000; // 1 minute

    let failureCount = 0;
    let lastFailureTime = 0;
    let state: "closed" | "open" | "half-open" = "closed";

    return async (): Promise<ApiResponse<T>> => {
      const now = Date.now();

      // Reset circuit breaker if enough time has passed
      if (state === "open" && now - lastFailureTime > resetTimeout) {
        state = "half-open";
        failureCount = 0;
      }

      // Fail fast if circuit is open
      if (state === "open") {
        return {
          success: false,
          error: {
            code: "CIRCUIT_BREAKER_OPEN",
            message: `Circuit breaker is open for ${context}. Try again later.`,
          },
        };
      }

      try {
        const result = await operation();
        if (result.success) {
          // Reset on success
          failureCount = 0;
          state = "closed";
          return result;
        } else {
          // Count as failure
          failureCount++;
          lastFailureTime = now;
          if (failureCount >= failureThreshold) {
            state = "open";
          }
          return result;
        }
      } catch (error) {
        failureCount++;
        lastFailureTime = now;
        if (failureCount >= failureThreshold) {
          state = "open";
        }
        const messagingError = MessagingErrorHandler.classifyError(error);
        return {
          success: false,
          error: {
            code: messagingError.type,
            message: messagingError.message,
          },
        };
      }
    };
  }

  /**
   * Utility function to create a delay
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
