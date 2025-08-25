import { ApiResponse, ApiError } from "../types/profile";
import { Message, Conversation } from "../types/message";
import { MessagingErrorHandler } from "./messagingErrors";

/**
 * Unified API response handler for consistent error handling and data normalization
 */
export class ApiResponseHandler {
  /**
   * Handles API responses with consistent error formatting
   */
  static handleResponse<T>(response: any, context: string): ApiResponse<T> {
    try {
      if (response.success === false) {
  const messagingError = MessagingErrorHandler.classifyError({
    message: response.error,
    status: response.status,
  });
        return {
          success: false,
          error: {
            code: messagingError.type,
            message: messagingError.message,
            // details removed
          },
        };
      }

      return {
        success: true,
        data: response.data || response,
      };
    } catch (error) {
      const messagingError = MessagingErrorHandler.classifyError(error);
      return {
        success: false,
        error: {
          code: messagingError.type,
          message: messagingError.message,
        },
      };
    }
  }

  /**
   * Normalizes message data for backward compatibility
   */
  static normalizeMessage(rawMessage: any): Message {
    return {
      _id: rawMessage._id || rawMessage.id,
      conversationId: rawMessage.conversationId,
      fromUserId: rawMessage.fromUserId,
      toUserId: rawMessage.toUserId,
      text: rawMessage.text || rawMessage.content || "",
      type: rawMessage.type || "text",
      createdAt: rawMessage.createdAt || rawMessage.timestamp || Date.now(),
      readAt: rawMessage.readAt,

      // Voice message fields
      audioStorageId: rawMessage.audioStorageId,
      duration: rawMessage.duration || rawMessage.voiceDuration,

      // Image message fields
      imageStorageId: rawMessage.imageStorageId,

      // Common metadata
      fileSize: rawMessage.fileSize,
      mimeType: rawMessage.mimeType,

      // Client-side fields
      status: this.normalizeMessageStatus(rawMessage.status),
      isOptimistic: rawMessage.isOptimistic || false,
      deliveryReceipts: rawMessage.deliveryReceipts || [],

      // Backward compatibility fields
      id: rawMessage.id,
      content: rawMessage.content,
      _creationTime: rawMessage._creationTime,
      timestamp: rawMessage.timestamp,
      isRead: rawMessage.isRead,
      voiceUrl: rawMessage.voiceUrl,
      voiceDuration: rawMessage.voiceDuration,
      voiceWaveform: rawMessage.voiceWaveform,
      fileUrl: rawMessage.fileUrl,
      fileName: rawMessage.fileName,
      thumbnailUrl: rawMessage.thumbnailUrl,
      editedAt: rawMessage.editedAt,
      replyToId: rawMessage.replyToId,
      isSystemMessage: rawMessage.isSystemMessage,
    };
  }

  /**
   * Normalizes conversation data for backward compatibility
   */
  static normalizeConversation(rawConversation: any): Conversation {
    return {
      id: rawConversation.id || rawConversation._id,
      participants: rawConversation.participants || [],
      lastMessage: rawConversation.lastMessage
        ? this.normalizeMessage(rawConversation.lastMessage)
        : undefined,
      lastActivity:
        rawConversation.lastActivity ||
        rawConversation.lastMessageAt ||
        Date.now(),
      unreadCount: rawConversation.unreadCount || 0,

      // Backward compatibility fields
      _id: rawConversation._id,
      conversationId: rawConversation.conversationId,
      lastMessageAt: rawConversation.lastMessageAt,
      isTyping: rawConversation.isTyping || [],
      title: rawConversation.title,
      description: rawConversation.description,
      isGroup: rawConversation.isGroup || false,
      createdAt: rawConversation.createdAt,
      updatedAt: rawConversation.updatedAt,
    };
  }

  /**
   * Normalizes message status for consistency
   */
  private static normalizeMessageStatus(
    status: any
  ): "pending" | "sent" | "delivered" | "read" | "failed" | undefined {
    if (!status) return undefined;

    // Map legacy statuses to new ones
    switch (status) {
      case "sending":
        return "pending";
      case "sent":
      case "delivered":
      case "read":
      case "failed":
        return status;
      default:
        return "sent"; // Default fallback
    }
  }

  /**
   * Normalizes array of messages
   */
  static normalizeMessages(rawMessages: any[]): Message[] {
    if (!Array.isArray(rawMessages)) {
      return [];
    }

    return rawMessages.map((message) => this.normalizeMessage(message));
  }

  /**
   * Normalizes array of conversations
   */
  static normalizeConversations(rawConversations: any[]): Conversation[] {
    if (!Array.isArray(rawConversations)) {
      return [];
    }

    return rawConversations.map((conversation) =>
      this.normalizeConversation(conversation)
    );
  }

  /**
   * Validates and normalizes pagination options
   */
  static normalizePaginationOptions(options?: {
    limit?: number;
    before?: number;
  }): {
    limit: number;
    before?: number;
  } {
    const defaultLimit = 50;
    const maxLimit = 100;

    return {
      limit: Math.min(options?.limit || defaultLimit, maxLimit),
      before: options?.before,
    };
  }

  /**
   * Creates a standardized error response
   */
  static createErrorResponse<T>(
    error: string | Error,
    context: string
  ): ApiResponse<T> {
    const errorMessage = typeof error === "string" ? error : error.message;
  const messagingError = MessagingErrorHandler.classifyError({
    message: errorMessage,
  });

    return {
      success: false,
      error: {
        code: messagingError.type,
        message: messagingError.message,
        // details removed
      },
    };
  }

  /**
   * Creates a standardized success response
   */
  static createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
    };
  }

  /**
   * Wraps async operations with consistent error handling
   */
  static async wrapAsyncOperation<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<ApiResponse<T>> {
    try {
      const result = await operation();
      return this.createSuccessResponse(result);
    } catch (error) {
      return this.createErrorResponse(error as Error, context);
    }
  }

  /**
   * Validates required fields in request data
   */
  static validateRequiredFields(
    data: Record<string, any>,
    requiredFields: string[]
  ): { valid: boolean; missingFields: string[] } {
    const missingFields = requiredFields.filter(
      (field) =>
        data[field] === undefined || data[field] === null || data[field] === ""
    );

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Sanitizes request data by removing undefined/null values
   */
  static sanitizeRequestData(data: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    Object.keys(data).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null) {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Formats query parameters for API requests
   */
  static formatQueryParams(params: Record<string, any>): URLSearchParams {
    const searchParams = new URLSearchParams();

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => searchParams.append(key, item.toString()));
        } else {
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams;
  }
}
