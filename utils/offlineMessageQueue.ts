import AsyncStorage from "@react-native-async-storage/async-storage";
import EventEmitter from "eventemitter3";
import { Message } from "../types/message";
import {
  MessagingAPI,
  MessagingError,
  MessagingErrorType,
} from "../types/messaging";

export interface QueuedMessage {
  id: string;
  message: Omit<Message, "_id">;
  attempts: number;
  maxAttempts: number;
  lastAttempt: number;
  nextRetry: number;
  error?: MessagingError;
  priority: "high" | "normal" | "low";
  createdAt: number;
}

export interface QueueOptions {
  maxRetries?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  storageKey?: string;
  batchSize?: number;
}

export interface QueueStats {
  totalQueued: number;
  pending: number;
  failed: number;
  processing: number;
  lastProcessed: number;
  successRate: number;
}

/**
 * Offline message queue with automatic retry and persistence
 */
export class OfflineMessageQueue extends EventEmitter {
  private queue: Map<string, QueuedMessage> = new Map();
  private processing = new Set<string>();
  private isOnline = false;
  private isProcessing = false;
  private processingTimer: NodeJS.Timeout | null = null;

  private readonly options: Required<QueueOptions>;
  private readonly apiClient: MessagingAPI;

  // Statistics
  private stats = {
    totalProcessed: 0,
    totalSuccessful: 0,
    totalFailed: 0,
    lastProcessedAt: 0,
  };

  constructor(apiClient: MessagingAPI, options: QueueOptions = {}) {
    super();
    this.apiClient = apiClient;
    this.options = {
      maxRetries: options.maxRetries || 3,
      baseRetryDelay: options.baseRetryDelay || 1000, // 1 second
      maxRetryDelay: options.maxRetryDelay || 30000, // 30 seconds
      storageKey: options.storageKey || "offline_message_queue",
      batchSize: options.batchSize || 5,
    };
  }

  /**
   * Helper to handle ApiResponse<void> for MessagingAPI methods
   */
  private async handleApiResponseVoid(
    promise: Promise<import("../types/profile").ApiResponse<void>>,
    errorMsg: string
  ): Promise<void> {
    const response = await promise;
    if (!response.success) {
      throw new Error(response.error?.message || errorMsg);
    }
  }

  /**
   * Send typing indicator using MessagingAPI (void semantics)
   */
  async sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void> {
    try {
      await this.apiClient.sendTypingIndicator(conversationId, action);
    } catch (e) {
      console.warn("Failed to send typing indicator", e);
      throw e;
    }
  }

  /**
   * Send delivery receipt using MessagingAPI (void semantics)
   */
  async sendDeliveryReceipt(messageId: string, status: string): Promise<void> {
    try {
      await this.apiClient.sendDeliveryReceipt(messageId, status);
    } catch (e) {
      console.warn("Failed to send delivery receipt", e);
      throw e;
    }
  }

  /**
   * Initialize the queue by loading persisted messages
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFromStorage();
      this.emit("initialized", { queueSize: this.queue.size });
    } catch (error) {
      console.error("Failed to initialize offline message queue:", error);
      this.emit("error", {
        type: "initialization_failed",
        error,
      });
    }
  }

  /**
   * Add a message to the queue
   */
  async enqueue(
    messageData: Omit<Message, "_id">,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<string> {
    const queuedMessage: QueuedMessage = {
      id: this.generateId(),
      message: messageData,
      attempts: 0,
      maxAttempts: this.options.maxRetries,
      lastAttempt: 0,
      nextRetry: Date.now(),
      priority,
      createdAt: Date.now(),
    };

    this.queue.set(queuedMessage.id, queuedMessage);

    // Persist to storage
    await this.saveToStorage();

    this.emit("message_queued", {
      id: queuedMessage.id,
      priority,
      queueSize: this.queue.size,
    });

    // Try to process immediately if online
    if (this.isOnline && !this.isProcessing) {
      this.processQueue();
    }

    return queuedMessage.id;
  }

  /**
   * Remove a message from the queue
   */
  async dequeue(messageId: string): Promise<boolean> {
    const removed = this.queue.delete(messageId);
    this.processing.delete(messageId);

    if (removed) {
      await this.saveToStorage();
      this.emit("message_dequeued", {
        id: messageId,
        queueSize: this.queue.size,
      });
    }

    return removed;
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(online: boolean): void {
    const wasOnline = this.isOnline;
    this.isOnline = online;

    this.emit("connection_status_changed", {
      online,
      previousStatus: wasOnline,
    });

    if (online && !wasOnline && this.queue.size > 0) {
      // Just came online, start processing queue
      this.processQueue();
    }
  }

  /**
   * Process the message queue
   */
  // Exposed for tests & external manual triggering
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline || this.queue.size === 0) {
      return;
    }

    this.isProcessing = true;
    this.emit("processing_started", { queueSize: this.queue.size });

    try {
      // Get messages ready for processing (sorted by priority and retry time)
      const readyMessages = this.getReadyMessages();

      if (readyMessages.length === 0) {
        this.scheduleNextProcessing();
        return;
      }

      // Process messages in batches
      const batch = readyMessages.slice(0, this.options.batchSize);

      await Promise.allSettled(
        batch.map((message) => this.processMessage(message))
      );

      // Continue processing if there are more messages
      if (this.queue.size > 0 && this.isOnline) {
        // Schedule next batch with a small delay
        setTimeout(() => this.processQueue(), 100);
      }
    } catch (error) {
      console.error("Queue processing error:", error);
      this.emit("processing_error", error);
    } finally {
      this.isProcessing = false;
      this.emit("processing_completed");
    }
  }

  /**
   * Process a single message
   */
  private async processMessage(queuedMessage: QueuedMessage): Promise<void> {
    const { id, message } = queuedMessage;

    if (this.processing.has(id)) {
      return; // Already processing
    }

    this.processing.add(id);
    queuedMessage.attempts++;
    queuedMessage.lastAttempt = Date.now();

    this.emit("message_processing", {
      id,
      attempt: queuedMessage.attempts,
      maxAttempts: queuedMessage.maxAttempts,
    });

    try {
      // Send the message
      const response = await this.apiClient.sendMessage({
        conversationId: message.conversationId,
        fromUserId: message.fromUserId,
        toUserId: message.toUserId,
        text: message.text,
        type: message.type,
        audioStorageId: message.audioStorageId,
        duration: message.duration,
        fileSize: message.fileSize,
        mimeType: message.mimeType,
      });

      if (response.success) {
        // Success - remove from queue
        await this.dequeue(id);

        this.stats.totalProcessed++;
        this.stats.totalSuccessful++;
        this.stats.lastProcessedAt = Date.now();

        this.emit("message_sent", {
          id,
          message: response.data,
          attempts: queuedMessage.attempts,
        });
      } else {
        // API returned error
        await this.handleMessageError(queuedMessage, {
          type: this.classifyApiError(response.error),
          message: response.error?.message || "Unknown API error",
          details: response.error,
          recoverable: this.isRecoverableError(response.error),
        });
      }
    } catch (error) {
      // Network or other error
      await this.handleMessageError(queuedMessage, {
        type: MessagingErrorType.NETWORK_ERROR,
        message: error instanceof Error ? error.message : "Network error",
        details: error,
        recoverable: true,
      });
    } finally {
      this.processing.delete(id);
    }
  }

  /**
   * Backwards compatibility: tests expect addMessage instead of enqueue
   * and access to full queued metadata (QueuedMessage[])
   */
  addMessage(
    messageData: Omit<Message, "_id">,
    priority: "high" | "normal" | "low" = "normal"
  ) {
    return this.enqueue(messageData, priority);
  }

  /**
   * Original method returning full queued message objects with metadata
   */
  getQueuedMessages(): QueuedMessage[] {
    return Array.from(this.queue.values()).map((q) => ({ ...q }));
  }

  /**
   * Simple variant returning only raw message payloads (used by components that only need message fields)
   */
  getQueuedMessagesSimple(): Omit<Message, "_id">[] {
    return Array.from(this.queue.values()).map((q) => ({ ...q.message }));
  }

  /**
   * Handle message processing error
   */
  private async handleMessageError(
    queuedMessage: QueuedMessage,
    error: MessagingError
  ): Promise<void> {
    queuedMessage.error = error;

    if (
      queuedMessage.attempts >= queuedMessage.maxAttempts ||
      !error.recoverable
    ) {
      // Max attempts reached or non-recoverable error
      await this.dequeue(queuedMessage.id);

      this.stats.totalProcessed++;
      this.stats.totalFailed++;

      this.emit("message_failed", {
        id: queuedMessage.id,
        error,
        attempts: queuedMessage.attempts,
        message: queuedMessage.message,
      });
    } else {
      // Schedule retry with exponential backoff
      const delay = Math.min(
        this.options.baseRetryDelay * Math.pow(2, queuedMessage.attempts - 1),
        this.options.maxRetryDelay
      );

      queuedMessage.nextRetry = Date.now() + delay;
      await this.saveToStorage();

      this.emit("message_retry_scheduled", {
        id: queuedMessage.id,
        attempt: queuedMessage.attempts,
        nextRetry: queuedMessage.nextRetry,
        delay,
      });
    }
  }

  /**
   * Get messages ready for processing
   */
  private getReadyMessages(): QueuedMessage[] {
    const now = Date.now();
    const ready = Array.from(this.queue.values())
      .filter(
        (msg) =>
          !this.processing.has(msg.id) &&
          msg.nextRetry <= now &&
          msg.attempts < msg.maxAttempts
      )
      .sort((a, b) => {
        // Sort by priority first, then by creation time
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        const priorityDiff =
          priorityOrder[a.priority] - priorityOrder[b.priority];

        if (priorityDiff !== 0) {
          return priorityDiff;
        }

        return a.createdAt - b.createdAt;
      });

    return ready;
  }

  /**
   * Schedule next processing cycle
   */
  private scheduleNextProcessing(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
    }

    // Find the next message that will be ready
    const nextMessage = Array.from(this.queue.values())
      .filter((msg) => msg.attempts < msg.maxAttempts)
      .sort((a, b) => a.nextRetry - b.nextRetry)[0];

    if (nextMessage) {
      const delay = Math.max(0, nextMessage.nextRetry - Date.now());
      this.processingTimer = setTimeout(() => {
        this.processQueue();
      }, delay);
    }
  }

  /**
   * Classify API error type
   */
  private classifyApiError(error: any): MessagingErrorType {
    if (!error) return MessagingErrorType.UNKNOWN_ERROR;

    const code = error.code || error.status;

    switch (code) {
      case 401:
      case "AUTHENTICATION_ERROR":
        return MessagingErrorType.AUTHENTICATION_ERROR;
      case 403:
      case "PERMISSION_DENIED":
        return MessagingErrorType.PERMISSION_DENIED;
      case 429:
      case "RATE_LIMIT_EXCEEDED":
        return MessagingErrorType.RATE_LIMIT_EXCEEDED;
      case "SUBSCRIPTION_REQUIRED":
        return MessagingErrorType.SUBSCRIPTION_REQUIRED;
      case "USER_BLOCKED":
        return MessagingErrorType.USER_BLOCKED;
      default:
        return MessagingErrorType.UNKNOWN_ERROR;
    }
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: any): boolean {
    if (!error) return true;

    const nonRecoverableTypes = [
      MessagingErrorType.AUTHENTICATION_ERROR,
      MessagingErrorType.PERMISSION_DENIED,
      MessagingErrorType.SUBSCRIPTION_REQUIRED,
      MessagingErrorType.USER_BLOCKED,
      MessagingErrorType.MESSAGE_TOO_LONG,
    ];

    const errorType = this.classifyApiError(error);
    return !nonRecoverableTypes.includes(errorType);
  }

  /**
   * Generate unique ID for queued messages
   */
  private generateId(): string {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load queue from persistent storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.options.storageKey);

      if (stored) {
        const data = JSON.parse(stored);

        if (data.queue && Array.isArray(data.queue)) {
          this.queue.clear();
          data.queue.forEach((item: QueuedMessage) => {
            this.queue.set(item.id, item);
          });
        }

        if (data.stats) {
          this.stats = { ...this.stats, ...data.stats };
        }
      }
    } catch (error) {
      console.error("Failed to load queue from storage:", error);
    }
  }

  /**
   * Save queue to persistent storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        queue: Array.from(this.queue.values()),
        stats: this.stats,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(this.options.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save queue to storage:", error);
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const messages = Array.from(this.queue.values());
    const pending = messages.filter((m) => m.attempts < m.maxAttempts).length;
    const failed = messages.filter((m) => m.attempts >= m.maxAttempts).length;
    const processing = this.processing.size;

    const successRate =
      this.stats.totalProcessed > 0
        ? (this.stats.totalSuccessful / this.stats.totalProcessed) * 100
        : 0;

    return {
      totalQueued: this.queue.size,
      pending,
      failed,
      processing,
      lastProcessed: this.stats.lastProcessedAt,
      successRate,
    };
  }

  // (Original getQueuedMessages returning QueuedMessage[] removed in favor of compatibility variant above)

  /**
   * Get failed messages
   */
  getFailedMessages(): QueuedMessage[] {
    return Array.from(this.queue.values()).filter(
      (msg) => msg.attempts >= msg.maxAttempts
    );
  }

  /**
   * Retry a failed message
   */
  async retryMessage(messageId: string): Promise<boolean> {
    const message = this.queue.get(messageId);

    if (!message) {
      return false;
    }

    // Reset attempts and schedule for immediate processing
    message.attempts = 0;
    message.nextRetry = Date.now();
    message.error = undefined;

    await this.saveToStorage();

    this.emit("message_retry_manual", {
      id: messageId,
      message: message.message,
    });

    // Process if online
    if (this.isOnline) {
      this.processQueue();
    }

    return true;
  }

  /**
   * Clear failed messages
   */
  async clearFailedMessages(): Promise<number> {
    const failedMessages = this.getFailedMessages();

    for (const message of failedMessages) {
      await this.dequeue(message.id);
    }

    return failedMessages.length;
  }

  /**
   * Clear all messages from queue
   */
  async clearAll(): Promise<void> {
    this.queue.clear();
    this.processing.clear();

    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    await this.saveToStorage();

    this.emit("queue_cleared");
  }

  /**
   * Destroy the queue and cleanup resources
   */
  destroy(): void {
    if (this.processingTimer) {
      clearTimeout(this.processingTimer);
      this.processingTimer = null;
    }

    this.removeAllListeners();
    this.queue.clear();
    this.processing.clear();
  }
}
