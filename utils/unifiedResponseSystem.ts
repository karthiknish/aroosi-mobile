import { ApiResponse, ApiError } from "../types/profile";
import { Message, Conversation } from "../types/message";
import { ApiResponseHandler } from "./apiResponseHandler";
import { ApiRetryManager } from "./apiRetryManager";
import { MessagingErrorHandler } from "./messagingErrors";
import { MessageValidator } from "./messageValidation";

/**
 * Unified Response System for consistent API handling across all messaging operations
 * This system provides a single entry point for all API operations with built-in
 * error handling, retry logic, validation, and response normalization
 */
export class UnifiedResponseSystem {
  /**
   * Executes a messaging API operation with full error handling and retry logic
   */
  static async executeMessagingOperation<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string,
    options?: {
      retryStrategy?:
        | "default"
        | "message-send"
        | "message-fetch"
        | "voice"
        | "none";
      validateResponse?: (data: T) => boolean;
      normalizeResponse?: (data: T) => T;
      skipErrorHandling?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const {
      retryStrategy = "default",
      validateResponse,
      normalizeResponse,
      skipErrorHandling = false,
    } = options || {};

    try {
      // Choose appropriate retry strategy
      let result: ApiResponse<T>;

      switch (retryStrategy) {
        case "message-send":
          result = await ApiRetryManager.retryMessageSend(operation, context);
          break;
        case "message-fetch":
          result = await ApiRetryManager.retryMessageFetch(operation, context);
          break;
        case "voice":
          result = await ApiRetryManager.retryVoiceOperation(
            operation,
            context
          );
          break;
        case "none":
          result = await operation();
          break;
        default:
          result = await ApiRetryManager.executeWithRetry(operation, context);
          break;
      }

      // Handle unsuccessful responses
      if (!result.success) {
        if (!skipErrorHandling) {
          this.logError(result.error, context);
        }
        return result;
      }

      // Validate response if validator provided
      if (validateResponse && result.data && !validateResponse(result.data)) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Response validation failed",
            details: { context, data: result.data },
          },
        };
      }

      // Normalize response if normalizer provided
      if (normalizeResponse && result.data) {
        result.data = normalizeResponse(result.data);
      }

      return result;
    } catch (error) {
      if (!skipErrorHandling) {
        const messagingError = MessagingErrorHandler.handle(error, context);
        this.logError(messagingError, context);

        return {
          success: false,
          error: {
            code: messagingError.type,
            message: messagingError.message,
            details: messagingError.details,
          },
        };
      }

      throw error;
    }
  }

  /**
   * Specialized method for message operations with built-in validation and normalization
   */
  static async executeMessageOperation<T extends Message | Message[]>(
    operation: () => Promise<ApiResponse<T>>,
    context: string,
    options?: {
      retryStrategy?: "send" | "fetch";
      skipValidation?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    const { retryStrategy = "fetch", skipValidation = false } = options || {};

    return this.executeMessagingOperation(operation, context, {
      retryStrategy:
        retryStrategy === "send" ? "message-send" : "message-fetch",
      validateResponse: skipValidation
        ? undefined
        : (data: T) => {
            if (Array.isArray(data)) {
              return data.every((msg) => this.isValidMessage(msg));
            }
            return this.isValidMessage(data as Message);
          },
      normalizeResponse: (data: T) => {
        if (Array.isArray(data)) {
          return ApiResponseHandler.normalizeMessages(data as any[]) as T;
        }
        return ApiResponseHandler.normalizeMessage(data) as T;
      },
    });
  }

  /**
   * Specialized method for conversation operations
   */
  static async executeConversationOperation<
    T extends Conversation | Conversation[]
  >(
    operation: () => Promise<ApiResponse<T>>,
    context: string
  ): Promise<ApiResponse<T>> {
    return this.executeMessagingOperation(operation, context, {
      retryStrategy: "default",
      validateResponse: (data: T) => {
        if (Array.isArray(data)) {
          return data.every((conv) => this.isValidConversation(conv));
        }
        return this.isValidConversation(data as Conversation);
      },
      normalizeResponse: (data: T) => {
        if (Array.isArray(data)) {
          return ApiResponseHandler.normalizeConversations(data as any[]) as T;
        }
        return ApiResponseHandler.normalizeConversation(data) as T;
      },
    });
  }

  /**
   * Specialized method for voice message operations
   */
  static async executeVoiceOperation<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string,
    options?: {
      validateAudio?: boolean;
      maxDuration?: number;
      maxFileSize?: number;
    }
  ): Promise<ApiResponse<T>> {
    const {
      validateAudio = true,
      maxDuration = 300,
      maxFileSize = 10 * 1024 * 1024,
    } = options || {};

    return this.executeMessagingOperation(operation, context, {
      retryStrategy: "voice",
      validateResponse: validateAudio
        ? (data: any) => {
            // Basic voice message validation
            if (data.duration && data.duration > maxDuration) {
              return false;
            }
            if (data.fileSize && data.fileSize > maxFileSize) {
              return false;
            }
            return true;
          }
        : undefined,
    });
  }

  /**
   * Batch operation executor with intelligent error handling
   */
  static async executeBatchOperation<T>(
    operations: Array<() => Promise<ApiResponse<T>>>,
    context: string,
    options?: {
      failFast?: boolean;
      maxConcurrency?: number;
      retryStrategy?: "default" | "message-send" | "message-fetch" | "voice";
    }
  ): Promise<ApiResponse<T[]>> {
    const {
      failFast = false,
      maxConcurrency = 5,
      retryStrategy = "default",
    } = options || {};

    // If no concurrency limit or operations are few, use simple batch
    if (maxConcurrency >= operations.length) {
      return ApiRetryManager.retryBatch(operations, context, {
        failFast,
      });
    }

    // Handle concurrency-limited batch operations
    const results: T[] = [];
    const errors: string[] = [];

    for (let i = 0; i < operations.length; i += maxConcurrency) {
      const batch = operations.slice(i, i + maxConcurrency);
      const batchResults = await Promise.allSettled(
        batch.map(async (op, index) => {
          const actualIndex = i + index;
          return this.executeMessagingOperation(
            op,
            `${context}[${actualIndex}]`,
            { retryStrategy }
          );
        })
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const actualIndex = i + j;

        if (result.status === "fulfilled") {
          if (result.value.success) {
            results.push(result.value.data!);
          } else {
            const errorMessage =
              typeof result.value.error === "string"
                ? result.value.error
                : result.value.error?.message || "Unknown error";
            errors.push(`[${actualIndex}]: ${errorMessage}`);

            if (failFast) {
              return {
                success: false,
                error: {
                  code: "BATCH_OPERATION_FAILED",
                  message: `Batch operation failed at index ${actualIndex}: ${errorMessage}`,
                  details: { index: actualIndex, error: result.value.error },
                },
              };
            }
          }
        } else {
          const errorMessage = result.reason?.message || "Unknown error";
          errors.push(`[${actualIndex}]: ${errorMessage}`);

          if (failFast) {
            return {
              success: false,
              error: {
                code: "BATCH_OPERATION_FAILED",
                message: `Batch operation failed at index ${actualIndex}: ${errorMessage}`,
                details: { index: actualIndex, error: result.reason },
              },
            };
          }
        }
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return {
        success: false,
        error: {
          code: "ALL_BATCH_OPERATIONS_FAILED",
          message: `All batch operations failed: ${errors.join(", ")}`,
          details: { errors, totalOperations: operations.length },
        },
      };
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * Creates a circuit breaker for frequently failing operations
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<ApiResponse<T>>,
    context: string,
    options?: {
      failureThreshold?: number;
      resetTimeout?: number;
      retryStrategy?: "default" | "message-send" | "message-fetch" | "voice";
    }
  ) {
    const { retryStrategy = "default", ...circuitOptions } = options || {};

    const wrappedOperation = () =>
      this.executeMessagingOperation(operation, context, { retryStrategy });

    return ApiRetryManager.createCircuitBreaker(
      wrappedOperation,
      context,
      circuitOptions
    );
  }

  /**
   * Validates if data represents a valid message
   */
  private static isValidMessage(data: any): data is Message {
    return (
      data &&
      typeof data === "object" &&
      typeof data._id === "string" &&
      typeof data.conversationId === "string" &&
      typeof data.fromUserId === "string" &&
      typeof data.toUserId === "string" &&
      typeof data.text === "string" &&
      typeof data.createdAt === "number"
    );
  }

  /**
   * Validates if data represents a valid conversation
   */
  private static isValidConversation(data: any): data is Conversation {
    return (
      data &&
      typeof data === "object" &&
      typeof data.id === "string" &&
      Array.isArray(data.participants) &&
      typeof data.lastActivity === "number" &&
      typeof data.unreadCount === "number"
    );
  }

  /**
   * Logs errors for debugging and monitoring
   */
  private static logError(error: any, context: string): void {
    const errorMessage =
      typeof error === "string" ? error : error?.message || "Unknown error";

    console.error(`[UnifiedResponseSystem] ${context}:`, {
      error: errorMessage,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Creates a standardized success response
   */
  static createSuccessResponse<T>(data: T): ApiResponse<T> {
    return ApiResponseHandler.createSuccessResponse(data);
  }

  /**
   * Creates a standardized error response
   */
  static createErrorResponse<T>(
    error: string | Error,
    context: string
  ): ApiResponse<T> {
    return ApiResponseHandler.createErrorResponse(error, context);
  }

  /**
   * Wraps any async operation with the unified response system
   */
  static async wrapOperation<T>(
    operation: () => Promise<T>,
    context: string,
    options?: {
      retryStrategy?:
        | "default"
        | "message-send"
        | "message-fetch"
        | "voice"
        | "none";
      skipErrorHandling?: boolean;
    }
  ): Promise<ApiResponse<T>> {
    return this.executeMessagingOperation(
      async () => {
        const result = await operation();
        return this.createSuccessResponse(result);
      },
      context,
      options
    );
  }
}

/**
 * Convenience functions for common operations
 */
export const unifiedResponse = {
  /**
   * Execute message send operation
   */
  sendMessage: <T extends Message>(operation: () => Promise<ApiResponse<T>>) =>
    UnifiedResponseSystem.executeMessageOperation(operation, "sendMessage", {
      retryStrategy: "send",
    }),

  /**
   * Execute message fetch operation
   */
  fetchMessages: <T extends Message[]>(
    operation: () => Promise<ApiResponse<T>>
  ) =>
    UnifiedResponseSystem.executeMessageOperation(operation, "fetchMessages", {
      retryStrategy: "fetch",
    }),

  /**
   * Execute conversation operation
   */
  conversation: <T extends Conversation | Conversation[]>(
    operation: () => Promise<ApiResponse<T>>
  ) =>
    UnifiedResponseSystem.executeConversationOperation(
      operation,
      "conversation"
    ),

  /**
   * Execute voice message operation
   */
  voiceMessage: <T>(operation: () => Promise<ApiResponse<T>>) =>
    UnifiedResponseSystem.executeVoiceOperation(operation, "voiceMessage"),

  /**
   * Execute any operation with basic retry
   */
  execute: <T>(operation: () => Promise<ApiResponse<T>>, context: string) =>
    UnifiedResponseSystem.executeMessagingOperation(operation, context),

  /**
   * Wrap any async operation
   */
  wrap: <T>(operation: () => Promise<T>, context: string) =>
    UnifiedResponseSystem.wrapOperation(operation, context),
};
