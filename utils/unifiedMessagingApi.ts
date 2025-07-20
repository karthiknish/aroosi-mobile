import { MessagingAPI, ApiResponse } from "../types/messaging";
import { Message, Conversation } from "../types/message";
import { MessageValidator } from "./messageValidation";
import { MessagingErrorHandler, RetryManager } from "./messagingErrors";

// Prefer env variable if defined; otherwise default to live API
const DEFAULT_API_BASE_URL = "https://www.aroosi.app/api";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;

/**
 * Unified Messaging API Client aligned with web platform
 * Implements the MessagingAPI interface for consistent cross-platform behavior
 */
export class UnifiedMessagingAPI implements MessagingAPI {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAuthProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await this.getToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    return RetryManager.executeWithAutoRetry(async () => {
      const url = `${this.baseUrl}${endpoint}`;
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
      });

      // Use the unified response interceptor
      const { ApiResponseInterceptor } = await import(
        "./apiResponseInterceptor"
      );
      return await ApiResponseInterceptor.interceptResponse<T>(
        response,
        `UnifiedMessagingAPI ${endpoint}`,
        endpoint
      );
    }, `API ${endpoint}`);
  }

  /**
   * Get messages for a conversation with pagination
   * Aligned with web endpoint: /api/match-messages
   */
  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: number }
  ): Promise<ApiResponse<Message[]>> {
    // Validate conversation ID
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    const params = new URLSearchParams({ conversationId });
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.before) {
      params.append("before", options.before.toString());
    }

    try {
      const response = await this.request<Message[]>(
        `/match-messages?${params}`
      );

      if (response.success && response.data) {
        // Normalize messages for backward compatibility
        response.data = response.data.map(this.normalizeMessage);
      }

      return response;
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(error, "getMessages");
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Send a message (text, voice, or image)
   * Aligned with web endpoint: /api/match-messages
   */
  async sendMessage(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }): Promise<ApiResponse<Message>> {
    // Validate message data
    const validation = MessageValidator.validateMessageSendData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    try {
      const response = await this.request<Message>("/match-messages", {
        method: "POST",
        body: JSON.stringify({
          conversationId: data.conversationId,
          fromUserId: data.fromUserId,
          toUserId: data.toUserId,
          text: data.text || "",
          type: data.type || "text",
          audioStorageId: data.audioStorageId,
          duration: data.duration,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
        }),
      });

      if (response.success && response.data) {
        // Normalize message for backward compatibility
        response.data = this.normalizeMessage(response.data);
      }

      return response;
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(error, "sendMessage");
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Mark conversation as read
   * Aligned with web endpoint: /api/messages/read
   */
  async markConversationAsRead(
    conversationId: string
  ): Promise<ApiResponse<void>> {
    // Validate conversation ID
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    try {
      return await this.request<void>("/messages/read", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      });
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(
        error,
        "markConversationAsRead"
      );
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Generate upload URL for voice messages
   */
  async generateVoiceUploadUrl(): Promise<
    ApiResponse<{ uploadUrl: string; storageId: string }>
  > {
    try {
      return await this.request<{ uploadUrl: string; storageId: string }>(
        "/voice-messages/upload-url",
        {
          method: "POST",
        }
      );
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(
        error,
        "generateVoiceUploadUrl"
      );
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Get secure URL for voice message playback
   */
  async getVoiceMessageUrl(
    storageId: string
  ): Promise<ApiResponse<{ url: string }>> {
    if (!storageId) {
      return {
        success: false,
        error: "Storage ID is required",
      };
    }

    try {
      return await this.request<{ url: string }>(
        `/voice-messages/${storageId}/url`
      );
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(
        error,
        "getVoiceMessageUrl"
      );
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void> {
    // Validate conversation ID
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      await this.request("/typing-indicators", {
        method: "POST",
        body: JSON.stringify({ conversationId, action }),
      });
    } catch (error) {
      // Don't throw for typing indicators - they're not critical
      console.warn("Failed to send typing indicator:", error);
    }
  }

  /**
   * Send delivery receipt
   */
  async sendDeliveryReceipt(messageId: string, status: string): Promise<void> {
    if (!messageId || !status) {
      return; // Silently fail for non-critical feature
    }

    try {
      await this.request("/delivery-receipts", {
        method: "POST",
        body: JSON.stringify({ messageId, status }),
      });
    } catch (error) {
      // Don't throw for delivery receipts - they're not critical
      console.warn("Failed to send delivery receipt:", error);
    }
  }

  /**
   * Get conversations list
   */
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    try {
      const response = await this.request<Conversation[]>("/conversations");

      if (response.success && response.data) {
        // Normalize conversations for backward compatibility
        response.data = response.data.map(this.normalizeConversation);
      }

      return response;
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(
        error,
        "getConversations"
      );
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    participantIds: string[]
  ): Promise<ApiResponse<Conversation>> {
    if (!participantIds || participantIds.length === 0) {
      return {
        success: false,
        error: "Participant IDs are required",
      };
    }

    try {
      const response = await this.request<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify({ participants: participantIds }),
      });

      if (response.success && response.data) {
        // Normalize conversation for backward compatibility
        response.data = this.normalizeConversation(response.data);
      }

      return response;
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(
        error,
        "createConversation"
      );
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    // Validate conversation ID
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
      };
    }

    try {
      return await this.request<void>(`/conversations/${conversationId}`, {
        method: "DELETE",
      });
    } catch (error) {
      const messagingError = MessagingErrorHandler.handle(
        error,
        "deleteConversation"
      );
      return {
        success: false,
        error: messagingError.message,
      };
    }
  }

  /**
   * Normalize message data for backward compatibility
   */
  private normalizeMessage(rawMessage: any): Message {
    return {
      _id: rawMessage._id || rawMessage.id,
      conversationId: rawMessage.conversationId,
      fromUserId: rawMessage.fromUserId || rawMessage.senderId,
      toUserId: rawMessage.toUserId || rawMessage.recipientId,
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
      senderId: rawMessage.senderId,
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
   * Normalize conversation data for backward compatibility
   */
  private normalizeConversation(rawConversation: any): Conversation {
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
      isBlocked: rawConversation.isBlocked || false,

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
   * Normalize message status for consistency
   */
  private normalizeMessageStatus(
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
}

// Create singleton instance
export const unifiedMessagingApi = new UnifiedMessagingAPI();

// Hook for React components
export function useUnifiedMessagingAPI() {
  // Import here to avoid circular dependency
  const { useAuth } = require("../contexts/AuthContext");
  const { getToken } = useAuth();

  // Initialize auth provider once
  if (!unifiedMessagingApi["authInitialized"]) {
    unifiedMessagingApi.setAuthProvider(getToken);
    unifiedMessagingApi["authInitialized"] = true;
  }

  return unifiedMessagingApi;
}
