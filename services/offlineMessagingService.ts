import { EventEmitter } from "events";
import { Message } from "../types/message";
import {
  MessagingAPI,
  MessagingError,
  MessagingErrorType,
} from "../types/messaging";
import {
  OfflineMessageQueue,
  QueuedMessage,
} from "../utils/offlineMessageQueue";
import { messageCache } from "../utils/MessageCache";
import { MessageSyncManager } from "../utils/messagingSync";

export interface OfflineMessagingOptions {
  enableOfflineQueue?: boolean;
  enableAutoSync?: boolean;
  maxRetries?: number;
  syncInterval?: number;
  cacheMessages?: boolean;
}

export interface SendMessageOptions {
  priority?: "high" | "normal" | "low";
  optimistic?: boolean;
  forceQueue?: boolean;
}

export interface SendMessageResult {
  success: boolean;
  message?: Message;
  messageId?: string;
  queued: boolean;
  optimisticId?: string;
  error?: MessagingError;
}

/**
 * Enhanced messaging service with offline support and automatic sync
 */
export class OfflineMessagingService extends EventEmitter {
  private apiClient: MessagingAPI;
  private offlineQueue: OfflineMessageQueue | null = null;
  private syncManager: MessageSyncManager | null = null;
  private isInitialized = false;
  private isOnline = false;
  private userId: string | null = null;

  private readonly options: Required<OfflineMessagingOptions>;

  // Optimistic message tracking
  private optimisticMessages = new Map<string, Message>();
  private optimisticToActual = new Map<string, string>();

  constructor(apiClient: MessagingAPI, options: OfflineMessagingOptions = {}) {
    super();
    this.apiClient = apiClient;
    this.options = {
      enableOfflineQueue: options.enableOfflineQueue !== false,
      enableAutoSync: options.enableAutoSync !== false,
      maxRetries: options.maxRetries || 3,
      syncInterval: options.syncInterval || 30000,
      cacheMessages: options.cacheMessages !== false,
    };
  }

  /**
   * Initialize the service
   */
  async initialize(userId: string): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.userId = userId;

    try {
      // Initialize offline queue if enabled
      if (this.options.enableOfflineQueue) {
        await this.initializeOfflineQueue();
      }

      // Initialize sync manager if enabled
      if (this.options.enableAutoSync) {
        await this.initializeSyncManager();
      }

      this.isInitialized = true;
      this.emit("initialized");
    } catch (error) {
      console.error("Failed to initialize OfflineMessagingService:", error);
      this.emit("initialization_error", error);
      throw error;
    }
  }

  /**
   * Initialize offline message queue
   */
  private async initializeOfflineQueue(): Promise<void> {
    this.offlineQueue = new OfflineMessageQueue(this.apiClient, {
      maxRetries: this.options.maxRetries,
    });

    // Setup queue event handlers
    this.offlineQueue.on("message_sent", ({ id, message, attempts }) => {
      this.handleQueuedMessageSent(id, message, attempts);
    });

    this.offlineQueue.on(
      "message_failed",
      ({ id, message, error, attempts }) => {
        this.handleQueuedMessageFailed(id, message, error, attempts);
      }
    );

    this.offlineQueue.on("connection_status_changed", ({ online }) => {
      this.setOnlineStatus(online);
    });

    await this.offlineQueue.initialize();
  }

  /**
   * Initialize sync manager
   */
  private async initializeSyncManager(): Promise<void> {
    if (!this.userId) {
      throw new Error("User ID required for sync manager");
    }

    this.syncManager = new MessageSyncManager(this.apiClient, {
      conflictResolution: "server",
      enableRealtime: true,
    });

    // Setup sync event handlers
    this.syncManager.on("message_received", (message) => {
      this.handleSyncedMessage(message);
    });

    this.syncManager.on("sync_completed", () => {
      this.emit("sync_completed");
    });

    this.syncManager.on("sync_error", (error) => {
      this.emit("sync_error", error);
    });

    await this.syncManager.initialize(this.userId);
  }

  /**
   * Send a message with offline support
   */
  async sendMessage(
    messageData: Omit<Message, "_id">,
    options: SendMessageOptions = {}
  ): Promise<SendMessageResult> {
    const {
      priority = "normal",
      optimistic = true,
      forceQueue = false,
    } = options;

    if (!this.isInitialized) {
      return {
        success: false,
        queued: false,
        error: {
          type: MessagingErrorType.UNKNOWN_ERROR,
          message: "Service not initialized",
          recoverable: false,
        },
      };
    }

    try {
      let optimisticId: string | undefined;

      // Add optimistic message if enabled
      if (optimistic) {
        optimisticId = this.addOptimisticMessage(messageData);
      }

      // Try to send immediately if online and not forced to queue
      if (this.isOnline && !forceQueue && !this.offlineQueue) {
        try {
          const response = await this.apiClient.sendMessage({
            conversationId: messageData.conversationId,
            fromUserId: messageData.fromUserId,
            toUserId: messageData.toUserId,
            text: messageData.text,
            type: messageData.type,
            audioStorageId: messageData.audioStorageId,
            duration: messageData.duration,
            fileSize: messageData.fileSize,
            mimeType: messageData.mimeType,
          });

          if (response.success) {
            // Success - update optimistic message
            if (optimisticId && response.data) {
              this.confirmOptimisticMessage(optimisticId, response.data);
            }

            // Cache the message
            if (this.options.cacheMessages) {
              messageCache.addMessages(messageData.conversationId, [
                response.data!,
              ]);
            }

            this.emit("message_sent", response.data);

            return {
              success: true,
              message: response.data,
              queued: false,
              optimisticId,
            };
          } else {
            // API error - fall through to queuing if available
            if (!this.offlineQueue) {
              if (optimisticId) {
                this.rejectOptimisticMessage(optimisticId, {
                  type: MessagingErrorType.UNKNOWN_ERROR,
                  message: response.error?.message || "Send failed",
                  recoverable: false,
                });
              }

              return {
                success: false,
                queued: false,
                optimisticId,
                error: {
                  type: MessagingErrorType.UNKNOWN_ERROR,
                  message: response.error?.message || "Send failed",
                  recoverable: false,
                },
              };
            }
          }
        } catch (error) {
          // Network error - fall through to queuing if available
          if (!this.offlineQueue) {
            if (optimisticId) {
              this.rejectOptimisticMessage(optimisticId, {
                type: MessagingErrorType.NETWORK_ERROR,
                message:
                  error instanceof Error ? error.message : "Network error",
                recoverable: true,
              });
            }

            return {
              success: false,
              queued: false,
              optimisticId,
              error: {
                type: MessagingErrorType.NETWORK_ERROR,
                message:
                  error instanceof Error ? error.message : "Network error",
                recoverable: true,
              },
            };
          }
        }
      }

      // Queue the message if offline queue is available
      if (this.offlineQueue) {
        const messageId = await this.offlineQueue.enqueue(
          messageData,
          priority
        );

        // Store optimistic message mapping
        if (optimisticId) {
          this.optimisticToActual.set(optimisticId, messageId);
        }

        this.emit("message_queued", {
          messageId,
          optimisticId,
          priority,
        });

        return {
          success: true,
          messageId,
          queued: true,
          optimisticId,
        };
      }

      // No queue available and immediate send failed
      if (optimisticId) {
        this.rejectOptimisticMessage(optimisticId, {
          type: MessagingErrorType.NETWORK_ERROR,
          message: "Unable to send message - offline and no queue available",
          recoverable: true,
        });
      }

      return {
        success: false,
        queued: false,
        optimisticId,
        error: {
          type: MessagingErrorType.NETWORK_ERROR,
          message: "Unable to send message - offline and no queue available",
          recoverable: true,
        },
      };
    } catch (error) {
      console.error("Error in sendMessage:", error);

      return {
        success: false,
        queued: false,
        error: {
          type: MessagingErrorType.UNKNOWN_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
          recoverable: false,
        },
      };
    }
  }

  /**
   * Get messages for a conversation with caching
   */
  async getMessages(
    conversationId: string,
    options: { limit?: number; before?: number } = {}
  ): Promise<Message[]> {
    // Try cache first if enabled
    if (this.options.cacheMessages) {
      const cached = messageCache.get(conversationId);
      if (cached && cached.length > 0) {
        // Apply filters if specified
        let filtered = cached;

        if (options.before) {
          filtered = filtered.filter(
            (m) => (m.createdAt || 0) < options.before!
          );
        }

        if (options.limit) {
          filtered = filtered.slice(-options.limit);
        }

        // If we have enough cached messages, return them
        if (!options.limit || filtered.length >= options.limit) {
          return filtered;
        }
      }
    }

    // Fetch from API
    try {
      const response = await this.apiClient.getMessages(
        conversationId,
        options
      );

      if (response.success && response.data) {
        // Cache the messages
        if (this.options.cacheMessages) {
          messageCache.addMessages(conversationId, response.data, true);
        }

        return response.data;
      }

      return [];
    } catch (error) {
      console.error("Error fetching messages:", error);

      // Return cached messages if available
      if (this.options.cacheMessages) {
        const cached = messageCache.get(conversationId);
        return cached || [];
      }

      return [];
    }
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    if (this.offlineQueue) {
      this.offlineQueue.setOnlineStatus(online);
    }

    this.emit("connection_status_changed", {
      online,
      previousStatus: wasOnline,
    });

    // Trigger sync when coming online
    if (online && !wasOnline && this.syncManager) {
      this.syncManager.syncAllConversations();
    }
  }

  /**
   * Add optimistic message
   */
  private addOptimisticMessage(messageData: Omit<Message, "_id">): string {
    const optimisticId = `optimistic_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    const optimisticMessage: Message = {
      ...messageData,
      _id: optimisticId,
      status: "pending",
      createdAt: messageData.createdAt || Date.now(),
    };

    this.optimisticMessages.set(optimisticId, optimisticMessage);

    // Add to cache if enabled
    if (this.options.cacheMessages) {
      messageCache.addMessages(messageData.conversationId, [optimisticMessage]);
    }

    this.emit("optimistic_message_added", optimisticMessage);

    return optimisticId;
  }

  /**
   * Confirm optimistic message with actual message
   */
  private confirmOptimisticMessage(
    optimisticId: string,
    actualMessage: Message
  ): void {
    const optimisticMessage = this.optimisticMessages.get(optimisticId);

    if (optimisticMessage) {
      this.optimisticMessages.delete(optimisticId);

      // Update cache
      if (this.options.cacheMessages) {
        // Remove optimistic message and add actual message
        messageCache.removeMessage(
          optimisticMessage.conversationId,
          optimisticId
        );
        messageCache.addMessages(optimisticMessage.conversationId, [
          actualMessage,
        ]);
      }

      this.emit("optimistic_message_confirmed", {
        optimisticId,
        optimisticMessage,
        actualMessage,
      });
    }
  }

  /**
   * Reject optimistic message
   */
  private rejectOptimisticMessage(
    optimisticId: string,
    error: MessagingError
  ): void {
    const optimisticMessage = this.optimisticMessages.get(optimisticId);

    if (optimisticMessage) {
      this.optimisticMessages.delete(optimisticId);

      // Update message status in cache
      if (this.options.cacheMessages) {
        messageCache.updateMessage(
          optimisticMessage.conversationId,
          optimisticId,
          { status: "failed" }
        );
      }

      this.emit("optimistic_message_rejected", {
        optimisticId,
        optimisticMessage,
        error,
      });
    }
  }

  /**
   * Handle queued message sent successfully
   */
  private handleQueuedMessageSent(
    queueId: string,
    message: Message,
    attempts: number
  ): void {
    // Find and confirm optimistic message
    const optimisticId = Array.from(this.optimisticToActual.entries()).find(
      ([, actualId]) => actualId === queueId
    )?.[0];

    if (optimisticId) {
      this.confirmOptimisticMessage(optimisticId, message);
      this.optimisticToActual.delete(optimisticId);
    }

    this.emit("queued_message_sent", {
      queueId,
      message,
      attempts,
      optimisticId,
    });
  }

  /**
   * Handle queued message failed
   */
  private handleQueuedMessageFailed(
    queueId: string,
    queuedMessage: QueuedMessage,
    error: MessagingError,
    attempts: number
  ): void {
    // Find and reject optimistic message
    const optimisticId = Array.from(this.optimisticToActual.entries()).find(
      ([, actualId]) => actualId === queueId
    )?.[0];

    if (optimisticId) {
      this.rejectOptimisticMessage(optimisticId, error);
      this.optimisticToActual.delete(optimisticId);
    }

    this.emit("queued_message_failed", {
      queueId,
      queuedMessage,
      error,
      attempts,
      optimisticId,
    });
  }

  /**
   * Handle synced message from other platforms
   */
  private handleSyncedMessage(message: Message): void {
    // Add to cache
    if (this.options.cacheMessages) {
      messageCache.addMessages(message.conversationId, [message]);
    }

    this.emit("message_synced", message);
  }

  /**
   * Get queue statistics
   */
  getQueueStats() {
    return this.offlineQueue?.getStats() || null;
  }

  /**
   * Get failed messages
   */
  getFailedMessages(): QueuedMessage[] {
    return this.offlineQueue?.getFailedMessages() || [];
  }

  /**
   * Retry a failed message
   */
  async retryMessage(messageId: string): Promise<boolean> {
    if (!this.offlineQueue) {
      return false;
    }

    return await this.offlineQueue.retryMessage(messageId);
  }

  /**
   * Clear failed messages
   */
  async clearFailedMessages(): Promise<number> {
    if (!this.offlineQueue) {
      return 0;
    }

    return await this.offlineQueue.clearFailedMessages();
  }

  /**
   * Force sync all conversations
   */
  async syncAllConversations(): Promise<void> {
    if (this.syncManager) {
      await this.syncManager.syncAllConversations();
    }
  }

  /**
   * Sync specific conversation
   */
  async syncConversation(conversationId: string): Promise<void> {
    if (this.syncManager) {
      await this.syncManager.syncConversation(conversationId);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isOnline: this.isOnline,
      hasOfflineQueue: !!this.offlineQueue,
      hasSyncManager: !!this.syncManager,
      queueStats: this.getQueueStats(),
      optimisticMessages: this.optimisticMessages.size,
    };
  }

  /**
   * Destroy the service and cleanup resources
   */
  destroy(): void {
    if (this.offlineQueue) {
      this.offlineQueue.destroy();
      this.offlineQueue = null;
    }

    if (this.syncManager) {
      this.syncManager.destroy();
      this.syncManager = null;
    }

    this.optimisticMessages.clear();
    this.optimisticToActual.clear();
    this.removeAllListeners();

    this.isInitialized = false;
  }
}
