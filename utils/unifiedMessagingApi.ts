import { MessagingAPI, ApiResponse } from "../types/messaging";
import { Message as UnifiedMessage } from "../types/message";
import { MessageValidator } from "./messageValidation";
import { ApiRetryManager } from "./apiRetryManager";
import { apiClient } from "./api";

// Base URL must be provided via environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL as string;
if (!API_BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Configure your API base URL in environment."
  );
}

/**
 * Unified Messaging API Client aligned with web platform (uses EXPO_PUBLIC_API_URL only)
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
    return ApiRetryManager.executeWithRetry(async () => {
      // Normalize endpoint to include /api prefix
      const normalizeEndpoint = (ep: string) => {
        if (!ep.startsWith("/")) ep = "/" + ep;
        if (ep.startsWith("/api/")) return ep;
        return "/api" + ep;
      };
      endpoint = normalizeEndpoint(endpoint);
      const url = `${this.baseUrl}${endpoint}`;
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
      });

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
  ): Promise<ApiResponse<UnifiedMessage[]>> {
    // Validate conversation ID
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: validation.error },
      } as ApiResponse<any[]>;
    }

    const params = new URLSearchParams({ conversationId });
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    if (options?.before) {
      params.append("before", options.before.toString());
    }

    try {
      const response = await this.request<UnifiedMessage[]>(
        `/match-messages?${params}`
      );

      if (response.success && response.data) {
        // Normalize messages for backward compatibility
        response.data = response.data.map(this.normalizeMessage);
      }

      return response;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "getMessages failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<UnifiedMessage[]>;
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
    // Optional reply metadata for WhatsApp-like reply
    replyTo?: {
      messageId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      fromUserId?: string;
    };
  }): Promise<ApiResponse<UnifiedMessage>> {
    // Validate message data
    const validation = MessageValidator.validateMessageSendData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: validation.error },
      } as ApiResponse<UnifiedMessage>;
    }

    try {
      const response = await this.request<UnifiedMessage>("/match-messages", {
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
          // Denormalised reply fields expected by server (see web firestore.rules)
          replyToMessageId: data.replyTo?.messageId,
          replyToText: data.replyTo?.text,
          replyToType: data.replyTo?.type,
          replyToFromUserId: data.replyTo?.fromUserId,
        }),
      });

      if (response.success && response.data) {
        // Normalize message for backward compatibility
        response.data = this.normalizeMessage(response.data);
      }

      return response;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "sendMessage failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<UnifiedMessage>;
    }
  }

  /**
   * Edit a text message
   * PATCH /api/messages/:id { text }
   */
  async editMessage(
    messageId: string,
    text: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    if (!messageId || !text) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "messageId and text required",
        },
      } as ApiResponse<{ success: boolean }>;
    }
    try {
      return await this.request<{ success: boolean }>(
        `/messages/${messageId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ text }),
        }
      );
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: error?.message || "editMessage failed",
        },
      } as ApiResponse<{ success: boolean }>;
    }
  }

  /**
   * Delete (soft-delete) a message
   * DELETE /api/messages/:id
   */
  async deleteMessage(
    messageId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    if (!messageId) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "messageId required" },
      } as ApiResponse<{ success: boolean }>;
    }
    try {
      return await this.request<{ success: boolean }>(
        `/messages/${messageId}`,
        {
          method: "DELETE",
        }
      );
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: "API_ERROR",
          message: error?.message || "deleteMessage failed",
        },
      } as ApiResponse<{ success: boolean }>;
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
        error: { code: "VALIDATION_ERROR", message: validation.error },
      } as ApiResponse<void>;
    }

    try {
      return await this.request<void>("/messages/read", {
        method: "POST",
        body: JSON.stringify({ conversationId }),
      });
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "markConversationAsRead failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<void>;
    }
  }

  /**
   * Generate upload URL for voice messages
   */
  async generateVoiceUploadUrl(): Promise<
    ApiResponse<{ uploadUrl: string; storageId: string }>
  > {
    // Web project exposes direct /api/voice-messages/upload (multipart form) not a presigned URL endpoint
    // For mobile parity we fabricate a client-side 'storageId' and direct caller to use upload endpoint
    try {
      const storageId = `voice_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      return {
        success: true,
        data: { uploadUrl: `${this.baseUrl}/voice-messages/upload`, storageId },
      };
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "generateVoiceUploadUrl failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<{ uploadUrl: string; storageId: string }>;
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
        error: { code: "VALIDATION_ERROR", message: "Storage ID is required" },
      } as ApiResponse<{ url: string }>;
    }

    try {
      return await this.request<{ url: string }>(
        `/voice-messages/${storageId}/url`
      );
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "getVoiceMessageUrl failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<{ url: string }>;
    }
  }

  /**
   * Send typing indicator
   * Uses base apiClient for consistency
   */
  async sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void> {
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    try {
      await apiClient.sendTypingIndicator(conversationId, action);
    } catch (error) {
      console.warn("Failed to send typing indicator:", error);
    }
  }

  /**
   * Send delivery receipt
   * Uses base apiClient for consistency
   */
  async sendDeliveryReceipt(messageId: string, status: string): Promise<void> {
    // Web does not expose separate delivery receipt REST; receipts handled implicitly or via realtime.
    if (!messageId || !status) return;
    // No-op for now (could emit local event / queue) – kept for interface compliance.
  }

  /**
   * Get conversations list
   */
  async getConversations(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    try {
      const search = new URLSearchParams();
      if (params?.page !== undefined)
        search.append("page", String(params.page));
      if (params?.limit !== undefined)
        search.append("limit", String(params.limit));
      const path = search.toString()
        ? `/conversations?${search.toString()}`
        : "/conversations";
      const response = await this.request<any[]>(path);

      if (response.success && response.data) {
        // Normalize conversations for backward compatibility
        response.data = response.data.map(this.normalizeConversation);
      }

      return response;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "getConversations failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<any[]>;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    participantIds: string[]
  ): Promise<ApiResponse<any>> {
    if (!participantIds || participantIds.length === 0) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Participant IDs are required",
        },
      } as ApiResponse<any>;
    }

    try {
      const response = await this.request<any>("/conversations", {
        method: "POST",
        body: JSON.stringify({ participants: participantIds }),
      });

      if (response.success && response.data) {
        // Normalize conversation for backward compatibility
        response.data = this.normalizeConversation(response.data);
      }

      return response;
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "createConversation failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<any>;
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
        error: { code: "VALIDATION_ERROR", message: validation.error },
      } as ApiResponse<void>;
    }

    try {
      return await this.request<void>(`/conversations/${conversationId}`, {
        method: "DELETE",
      });
    } catch (error: any) {
      const message =
        error?.message ||
        (typeof error === "string" ? error : "deleteConversation failed");
      return {
        success: false,
        error: { code: "API_ERROR", message },
      } as ApiResponse<void>;
    }
  }

  /**
   * Normalize message data for backward compatibility
   */
  private normalizeMessage(rawMessage: any): UnifiedMessage {
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
   * Normalize conversation data for backward compatibility
   */
  private normalizeConversation(rawConversation: any): any {
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
  const { useAuth } = require("../contexts/AuthProvider");
  const { getToken } = useAuth();

  // Initialize auth provider once
  // Use a module-level variable to track initialization
  if (!(globalThis as any)._unifiedMessagingApiAuthInitialized) {
    unifiedMessagingApi.setAuthProvider(getToken);
    (globalThis as any)._unifiedMessagingApiAuthInitialized = true;
  }

  return unifiedMessagingApi;
}
