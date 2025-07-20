import { Message, Conversation } from "../types/message";
import { ApiResponse } from "../types/messaging";

/**
 * Backward compatibility utilities for legacy API responses and data formats
 */
export class BackwardCompatibility {
  /**
   * Converts legacy message format to unified format
   */
  static convertLegacyMessage(legacyMessage: any): Message {
    // Handle various legacy formats that might exist
    return {
      _id: legacyMessage._id || legacyMessage.id || legacyMessage.messageId,
      conversationId: legacyMessage.conversationId || legacyMessage.chatId,
      fromUserId:
        legacyMessage.fromUserId ||
        legacyMessage.senderId ||
        legacyMessage.from,
      toUserId:
        legacyMessage.toUserId || legacyMessage.recipientId || legacyMessage.to,
      text:
        legacyMessage.text ||
        legacyMessage.content ||
        legacyMessage.message ||
        "",
      type: this.normalizeMessageType(
        legacyMessage.type || legacyMessage.messageType
      ),
      createdAt: this.normalizeTimestamp(
        legacyMessage.createdAt ||
          legacyMessage.timestamp ||
          legacyMessage._creationTime ||
          legacyMessage.sentAt ||
          Date.now()
      ),
      readAt: this.normalizeTimestamp(
        legacyMessage.readAt || legacyMessage.readTimestamp
      ),

      // Voice message fields
      audioStorageId: legacyMessage.audioStorageId || legacyMessage.audioId,
      duration:
        legacyMessage.duration ||
        legacyMessage.voiceDuration ||
        legacyMessage.audioDuration,

      // Image message fields
      imageStorageId: legacyMessage.imageStorageId || legacyMessage.imageId,

      // Common metadata
      fileSize: legacyMessage.fileSize || legacyMessage.size,
      mimeType: legacyMessage.mimeType || legacyMessage.contentType,

      // Client-side fields
      status: this.normalizeMessageStatus(
        legacyMessage.status || legacyMessage.state
      ),
      isOptimistic:
        legacyMessage.isOptimistic || legacyMessage.isPending || false,
      deliveryReceipts:
        legacyMessage.deliveryReceipts || legacyMessage.receipts || [],

      // Backward compatibility fields (preserve original values)
      id: legacyMessage.id,
      senderId: legacyMessage.senderId,
      content: legacyMessage.content,
      _creationTime: legacyMessage._creationTime,
      timestamp: legacyMessage.timestamp,
      isRead: legacyMessage.isRead,
      voiceUrl: legacyMessage.voiceUrl || legacyMessage.audioUrl,
      voiceDuration: legacyMessage.voiceDuration,
      voiceWaveform: legacyMessage.voiceWaveform || legacyMessage.waveform,
      fileUrl: legacyMessage.fileUrl || legacyMessage.url,
      fileName: legacyMessage.fileName || legacyMessage.name,
      thumbnailUrl: legacyMessage.thumbnailUrl || legacyMessage.thumb,
      editedAt: this.normalizeTimestamp(
        legacyMessage.editedAt || legacyMessage.modifiedAt
      ),
      replyToId: legacyMessage.replyToId || legacyMessage.replyTo,
      isSystemMessage:
        legacyMessage.isSystemMessage || legacyMessage.isSystem || false,
    };
  }

  /**
   * Converts legacy conversation format to unified format
   */
  static convertLegacyConversation(legacyConversation: any): Conversation {
    return {
      id:
        legacyConversation.id ||
        legacyConversation._id ||
        legacyConversation.conversationId,
      participants:
        legacyConversation.participants || legacyConversation.members || [],
      lastMessage: legacyConversation.lastMessage
        ? this.convertLegacyMessage(legacyConversation.lastMessage)
        : undefined,
      lastActivity: this.normalizeTimestamp(
        legacyConversation.lastActivity ||
          legacyConversation.lastMessageAt ||
          legacyConversation.updatedAt ||
          Date.now()
      ),
      unreadCount:
        legacyConversation.unreadCount || legacyConversation.unread || 0,
      isBlocked:
        legacyConversation.isBlocked || legacyConversation.blocked || false,

      // Backward compatibility fields
      _id: legacyConversation._id,
      conversationId: legacyConversation.conversationId,
      lastMessageAt: legacyConversation.lastMessageAt,
      isTyping:
        legacyConversation.isTyping || legacyConversation.typingUsers || [],
      title: legacyConversation.title || legacyConversation.name,
      description: legacyConversation.description,
      isGroup: legacyConversation.isGroup || legacyConversation.group || false,
      createdAt: this.normalizeTimestamp(legacyConversation.createdAt),
      updatedAt: this.normalizeTimestamp(legacyConversation.updatedAt),
    };
  }

  /**
   * Converts legacy API response format to unified format
   */
  static convertLegacyApiResponse<T>(
    legacyResponse: any,
    dataConverter?: (data: any) => T
  ): ApiResponse<T> {
    // Handle different legacy response formats
    if (legacyResponse.success === false || legacyResponse.error) {
      return {
        success: false,
        error:
          legacyResponse.error || legacyResponse.message || "Unknown error",
      };
    }

    // Extract data from various legacy formats
    let data = legacyResponse.data || legacyResponse.result || legacyResponse;

    // Apply data converter if provided
    if (dataConverter && data) {
      data = dataConverter(data);
    }

    return {
      success: true,
      data,
    };
  }

  /**
   * Normalizes message type from various legacy formats
   */
  private static normalizeMessageType(type: any): "text" | "voice" | "image" {
    if (!type) return "text";

    const normalizedType = type.toString().toLowerCase();

    switch (normalizedType) {
      case "voice":
      case "audio":
      case "sound":
        return "voice";
      case "image":
      case "photo":
      case "picture":
      case "img":
        return "image";
      case "text":
      case "message":
      default:
        return "text";
    }
  }

  /**
   * Normalizes message status from various legacy formats
   */
  private static normalizeMessageStatus(
    status: any
  ): "pending" | "sent" | "delivered" | "read" | "failed" | undefined {
    if (!status) return undefined;

    const normalizedStatus = status.toString().toLowerCase();

    switch (normalizedStatus) {
      case "sending":
      case "pending":
        return "pending";
      case "sent":
        return "sent";
      case "delivered":
        return "delivered";
      case "read":
      case "seen":
        return "read";
      case "failed":
      case "error":
        return "failed";
      default:
        return "sent"; // Default fallback
    }
  }

  /**
   * Normalizes timestamp from various formats
   */
  private static normalizeTimestamp(timestamp: any): number | undefined {
    if (!timestamp) return undefined;

    // If it's already a number, return it
    if (typeof timestamp === "number") {
      return timestamp;
    }

    // If it's a string, try to parse it
    if (typeof timestamp === "string") {
      const parsed = Date.parse(timestamp);
      return isNaN(parsed) ? undefined : parsed;
    }

    // If it's a Date object
    if (timestamp instanceof Date) {
      return timestamp.getTime();
    }

    // If it has a toDate method (Firestore timestamp)
    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      return timestamp.toDate().getTime();
    }

    // If it has seconds and nanoseconds (Firestore timestamp format)
    if (timestamp.seconds) {
      return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
    }

    return undefined;
  }

  /**
   * Converts array of legacy messages to unified format
   */
  static convertLegacyMessages(legacyMessages: any[]): Message[] {
    if (!Array.isArray(legacyMessages)) {
      return [];
    }

    return legacyMessages.map((message) => this.convertLegacyMessage(message));
  }

  /**
   * Converts array of legacy conversations to unified format
   */
  static convertLegacyConversations(
    legacyConversations: any[]
  ): Conversation[] {
    if (!Array.isArray(legacyConversations)) {
      return [];
    }

    return legacyConversations.map((conversation) =>
      this.convertLegacyConversation(conversation)
    );
  }

  /**
   * Creates a wrapper for legacy API methods to return unified responses
   */
  static wrapLegacyApiMethod<T>(
    legacyMethod: (...args: any[]) => Promise<any>,
    dataConverter?: (data: any) => T
  ) {
    return async (...args: any[]): Promise<ApiResponse<T>> => {
      try {
        const legacyResponse = await legacyMethod(...args);
        return this.convertLegacyApiResponse(legacyResponse, dataConverter);
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    };
  }

  /**
   * Migrates legacy stored data to new format
   */
  static migrateStoredData(key: string, migrator: (data: any) => any): void {
    try {
      // This would work with AsyncStorage in React Native
      // For now, just a placeholder implementation
      const storedData = global.localStorage?.getItem(key);
      if (storedData) {
        const parsed = JSON.parse(storedData);
        const migrated = migrator(parsed);
        global.localStorage?.setItem(key, JSON.stringify(migrated));
      }
    } catch (error) {
      console.warn(`Failed to migrate stored data for key ${key}:`, error);
    }
  }

  /**
   * Checks if data is in legacy format
   */
  static isLegacyMessageFormat(data: any): boolean {
    if (!data || typeof data !== "object") return false;

    // Check for legacy field patterns
    return (
      (data.senderId && !data.fromUserId) ||
      (data.content && !data.text) ||
      (data.timestamp && !data.createdAt) ||
      (data.messageId && !data._id)
    );
  }

  /**
   * Checks if conversation data is in legacy format
   */
  static isLegacyConversationFormat(data: any): boolean {
    if (!data || typeof data !== "object") return false;

    // Check for legacy field patterns
    return (
      (data.chatId && !data.id) ||
      (data.members && !data.participants) ||
      (data.lastMessageAt && !data.lastActivity)
    );
  }

  /**
   * Auto-detects and converts legacy data
   */
  static autoConvertMessage(data: any): Message {
    if (this.isLegacyMessageFormat(data)) {
      return this.convertLegacyMessage(data);
    }
    return data as Message;
  }

  /**
   * Auto-detects and converts legacy conversation data
   */
  static autoConvertConversation(data: any): Conversation {
    if (this.isLegacyConversationFormat(data)) {
      return this.convertLegacyConversation(data);
    }
    return data as Conversation;
  }
}
