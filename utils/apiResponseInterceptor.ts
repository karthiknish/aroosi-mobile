import { ApiResponse } from "../types/messaging";
import { ApiResponseHandler } from "./apiResponseHandler";
import { MessagingErrorHandler } from "./messagingErrors";
import { ApiRetryManager } from "./apiRetryManager";

/**
 * Response interceptor for unified API response handling across all clients
 */
export class ApiResponseInterceptor {
  private static transformers: Map<string, (data: any) => any> = new Map();
  private static globalErrorHandlers: Array<
    (error: any, context: string) => void
  > = [];
  private static responseMiddleware: Array<
    (response: any, context: string) => any
  > = [];

  /**
   * Registers a data transformer for specific endpoints
   */
  static registerTransformer(
    endpoint: string,
    transformer: (data: any) => any
  ): void {
    this.transformers.set(endpoint, transformer);
  }

  /**
   * Registers a global error handler
   */
  static registerGlobalErrorHandler(
    handler: (error: any, context: string) => void
  ): void {
    this.globalErrorHandlers.push(handler);
  }

  /**
   * Registers response middleware
   */
  static registerResponseMiddleware(
    middleware: (response: any, context: string) => any
  ): void {
    this.responseMiddleware.push(middleware);
  }

  /**
   * Intercepts and processes API responses
   */
  static async interceptResponse<T>(
    response: Response,
    context: string,
    endpoint: string
  ): Promise<ApiResponse<T>> {
    try {
      // Check if response is ok
      if (!response.ok) {
        return await this.handleErrorResponse(response, context);
      }

      // Parse response data
      let data: any;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Apply response middleware
      for (const middleware of this.responseMiddleware) {
        data = middleware(data, context);
      }

      // Apply endpoint-specific transformers
      const transformer = this.transformers.get(endpoint);
      if (transformer) {
        data = transformer(data);
      }

      // Apply default transformations based on endpoint
      data = this.applyDefaultTransformations(data, endpoint);

      return ApiResponseHandler.createSuccessResponse(data);
    } catch (error) {
      return this.handleException(error, context);
    }
  }

  /**
   * Handles error responses
   */
  private static async handleErrorResponse<T>(
    response: Response,
    context: string
  ): Promise<ApiResponse<T>> {
    let errorData: any = {};

    try {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await response.json();
      } else {
        errorData = { message: await response.text() };
      }
    } catch {
      errorData = { message: `HTTP ${response.status}` };
    }

    const error = {
      status: response.status,
      message:
        errorData.error || errorData.message || `HTTP ${response.status}`,
      response: { data: errorData },
    };

    // Notify global error handlers
    this.globalErrorHandlers.forEach((handler) => {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.warn("Error in global error handler:", handlerError);
      }
    });

  const messagingError = MessagingErrorHandler.classifyError(error);
  return {
    success: false,
    error: {
      code: messagingError.type || "UNKNOWN_ERROR",
      message: messagingError.message,
    },
  };
  }

  /**
   * Handles exceptions during response processing
   */
  private static handleException<T>(
    error: any,
    context: string
  ): ApiResponse<T> {
    // Notify global error handlers
    this.globalErrorHandlers.forEach((handler) => {
      try {
        handler(error, context);
      } catch (handlerError) {
        console.warn("Error in global error handler:", handlerError);
      }
    });

    return ApiResponseHandler.createErrorResponse(error, context);
  }

  /**
   * Applies default transformations based on endpoint patterns
   */
  private static applyDefaultTransformations(data: any, endpoint: string): any {
    // Transform message-related endpoints
    if (endpoint.includes("/match-messages")) {
      if (Array.isArray(data)) {
        return ApiResponseHandler.normalizeMessages(data);
      } else if (data && typeof data === "object") {
        return ApiResponseHandler.normalizeMessage(data);
      }
    }

    // Transform conversation-related endpoints
    if (endpoint.includes("/conversations")) {
      if (Array.isArray(data)) {
        return ApiResponseHandler.normalizeConversations(data);
      } else if (data && typeof data === "object") {
        return ApiResponseHandler.normalizeConversation(data);
      }
    }

    return data;
  }

  /**
   * Creates a fetch wrapper with response interception
   */
  static createInterceptedFetch() {
    return async (
      url: string,
      options: RequestInit = {},
      context: string = "api"
    ): Promise<ApiResponse<any>> => {
      try {
        const response = await fetch(url, options);
        const endpoint = this.extractEndpoint(url);
        return await this.interceptResponse(response, context, endpoint);
      } catch (error) {
        return this.handleException(error, context);
      }
    };
  }

  /**
   * Creates a fetch wrapper with retry and interception
   */
  static createInterceptedFetchWithRetry() {
    const interceptedFetch = this.createInterceptedFetch();

    return async (
      url: string,
      options: RequestInit = {},
      context: string = "api"
    ): Promise<ApiResponse<any>> => {
      return ApiRetryManager.executeWithRetry(
        () => interceptedFetch(url, options, context),
        context
      );
    };
  }

  /**
   * Extracts endpoint path from full URL
   */
  private static extractEndpoint(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }

  /**
   * Registers default transformers for messaging endpoints
   */
  static registerDefaultTransformers(): void {
    // Message list transformer
    this.registerTransformer("/match-messages", (data) => {
      if (Array.isArray(data)) {
        return ApiResponseHandler.normalizeMessages(data);
      }
      return data;
    });

    // Single message transformer
    this.registerTransformer("/match-messages/send", (data) => {
      return ApiResponseHandler.normalizeMessage(data);
    });

    // Conversation list transformer
    this.registerTransformer("/conversations", (data) => {
      if (Array.isArray(data)) {
        return ApiResponseHandler.normalizeConversations(data);
      }
      return data;
    });

    // Voice message URL transformer
    this.registerTransformer("/voice-messages", (data) => {
      // Ensure URL is properly formatted
      if (data && data.url && !data.url.startsWith("http")) {
        data.url = `https://${data.url}`;
      }
      return data;
    });
  }

  /**
   * Registers default error handlers
   */
  static registerDefaultErrorHandlers(): void {
    // Authentication error handler
    this.registerGlobalErrorHandler((error, context) => {
      if (error.status === 401) {
        // Could trigger auth refresh or logout
        console.warn(`Authentication error in ${context}:`, error);
      }
    });

    // Rate limiting handler
    this.registerGlobalErrorHandler((error, context) => {
      if (error.status === 429) {
        console.warn(`Rate limit exceeded in ${context}:`, error);
        // Could implement backoff strategy
      }
    });

    // Server error handler
    this.registerGlobalErrorHandler((error, context) => {
      if (error.status >= 500) {
        console.error(`Server error in ${context}:`, error);
        // Could trigger error reporting
      }
    });
  }

  /**
   * Registers default response middleware
   */
  static registerDefaultMiddleware(): void {
    // Response timing middleware
    this.registerResponseMiddleware((response, context) => {
      if (response && typeof response === "object") {
        response._responseTime = Date.now();
        response._context = context;
      }
      return response;
    });

    // Data validation middleware
    this.registerResponseMiddleware((response, context) => {
      // Add basic validation for critical fields
      if (context.includes("message") && response) {
        if (Array.isArray(response)) {
          response.forEach((item, index) => {
            if (!item._id && !item.id) {
              console.warn(
                `Message at index ${index} missing ID in ${context}`
              );
            }
          });
        } else if (!response._id && !response.id) {
          console.warn(`Message missing ID in ${context}`);
        }
      }
      return response;
    });
  }

  /**
   * Initializes default interceptors
   */
  static initialize(): void {
    this.registerDefaultTransformers();
    this.registerDefaultErrorHandlers();
    this.registerDefaultMiddleware();
  }

  /**
   * Clears all registered interceptors (useful for testing)
   */
  static clear(): void {
    this.transformers.clear();
    this.globalErrorHandlers.length = 0;
    this.responseMiddleware.length = 0;
  }
}

// Initialize default interceptors
ApiResponseInterceptor.initialize();
