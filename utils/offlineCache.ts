import AsyncStorage from "@react-native-async-storage/async-storage";
import { Message } from "../types/messaging";
import { EventEmitter } from "events";

export interface QueuedMessage {
  id: string;
  message: Message;
  timestamp: number;
  retryCount: number;
  lastRetryTime: number;
  status: "pending" | "sending" | "failed" | "sent";
  error?: string;
}

export interface OfflineAction {
  id: string;
  type: "send_message" | "mark_read" | "delete_message" | "update_message";
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  status: "pending" | "processing" | "completed" | "failed";
}

export interface OfflineCacheOptions {
  maxQueueSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  persistenceKey?: string;
  enableCompression?: boolean;
}

/**
 * Offline cache and message queue manager
 */
export class OfflineCache extends EventEmitter {
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private actionQueue: Map<string, OfflineAction> = new Map();
  private isOnline = true;
  private isProcessing = false;
  private options: Required<OfflineCacheOptions>;
  private persistenceTimer: NodeJS.Timeout | null = null;

  constructor(options: OfflineCacheOptions = {}) {
    super();
    this.options = {
      maxQueueSize: options.maxQueueSize || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      persistenceKey: options.persistenceKey || "offline_cache",
      enableCompression: options.enableCompression || false,
    };
  }

  /**
   * Initialize offline cache
   */
  async initialize(): Promise<void> {
    try {
      await this.loadFromStorage();
      this.startPersistenceTimer();
      this.emit("initialized");
    } catch (error) {
      console.error("Failed to initialize offline cache:", error);
      throw error;
    }
  }

  /**
   * Set online/offline status
   */
  setOnlineStatus(isOnline: boolean): void {
    const wasOffline = !this.isOnline;
    this.isOnline = isOnline;

    this.emit("connection_changed", isOnline);

    // If we just came online, process queued items
    if (wasOffline && isOnline) {
      this.processQueue();
    }
  }

  /**
   * Queue a message for sending when online
   */
  queueMessage(message: Message): string {
    const queuedMessage: QueuedMessage = {
      id: `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: {
        ...message,
        _id:
          message._id ||
          `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: "pending",
        isOptimistic: true,
      },
      timestamp: Date.now(),
      retryCount: 0,
      lastRetryTime: 0,
      status: "pending",
    };

    // Check queue size limit
    if (this.messageQueue.size >= this.options.maxQueueSize) {
      this.removeOldestQueuedMessage();
    }

    this.messageQueue.set(queuedMessage.id, queuedMessage);
    this.emit("message_queued", queuedMessage);

    // Try to send immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return queuedMessage.id;
  }

  /**
   * Queue an action for execution when online
   */
  queueAction(
    type: OfflineAction["type"],
    data: any,
    maxRetries?: number
  ): string {
    const action: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: maxRetries || this.options.maxRetries,
      status: "pending",
    };

    this.actionQueue.set(action.id, action);
    this.emit("action_queued", action);

    // Try to process immediately if online
    if (this.isOnline) {
      this.processQueue();
    }

    return action.id;
  }

  /**
   * Process queued messages and actions
   */
  async processQueue(): Promise<void> {
    if (!this.isOnline || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.emit("queue_processing_started");

    try {
      // Process messages first
      await this.processMessageQueue();

      // Then process actions
      await this.processActionQueue();

      this.emit("queue_processing_completed");
    } catch (error) {
      console.error("Queue processing failed:", error);
      this.emit("queue_processing_failed", error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    const pendingMessages = Array.from(this.messageQueue.values())
      .filter((qm) => qm.status === "pending" || qm.status === "failed")
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const queuedMessage of pendingMessages) {
      try {
        await this.sendQueuedMessage(queuedMessage);
      } catch (error) {
        console.error(
          `Failed to send queued message ${queuedMessage.id}:`,
          error
        );
      }
    }
  }

  /**
   * Process queued actions
   */
  private async processActionQueue(): Promise<void> {
    const pendingActions = Array.from(this.actionQueue.values())
      .filter((action) => action.status === "pending")
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const action of pendingActions) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error(`Failed to execute action ${action.id}:`, error);
      }
    }
  }

  /**
   * Send a queued message
   */
  private async sendQueuedMessage(queuedMessage: QueuedMessage): Promise<void> {
    // Update status
    queuedMessage.status = "sending";
    queuedMessage.lastRetryTime = Date.now();
    this.emit("message_sending", queuedMessage);

    try {
      // This would integrate with your API client
      const response = await this.sendMessageToServer(queuedMessage.message);

      if (response.success) {
        // Message sent successfully
        queuedMessage.status = "sent";
        queuedMessage.message.status = "sent";
        queuedMessage.message._id = response.data._id; // Update with server ID

        this.emit("message_sent", queuedMessage);

        // Remove from queue after successful send
        setTimeout(() => {
          this.messageQueue.delete(queuedMessage.id);
        }, 5000); // Keep for 5 seconds for UI feedback
      } else {
        throw new Error(response.error?.message || "Failed to send message");
      }
    } catch (error) {
      queuedMessage.retryCount++;
      queuedMessage.error =
        error instanceof Error ? error.message : "Unknown error";

      if (queuedMessage.retryCount >= this.options.maxRetries) {
        queuedMessage.status = "failed";
        this.emit("message_failed", queuedMessage);
      } else {
        queuedMessage.status = "pending";
        this.emit("message_retry_scheduled", queuedMessage);

        // Schedule retry with exponential backoff
        const delay =
          this.options.retryDelay * Math.pow(2, queuedMessage.retryCount - 1);
        setTimeout(() => {
          if (this.isOnline && queuedMessage.status === "pending") {
            this.sendQueuedMessage(queuedMessage);
          }
        }, delay);
      }
    }
  }

  /**
   * Execute a queued action
   */
  private async executeAction(action: OfflineAction): Promise<void> {
    action.status = "processing";
    this.emit("action_processing", action);

    try {
      let success = false;

      switch (action.type) {
        case "mark_read":
          success = await this.executeMarkReadAction(action.data);
          break;
        case "delete_message":
          success = await this.executeDeleteMessageAction(action.data);
          break;
        case "update_message":
          success = await this.executeUpdateMessageAction(action.data);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      if (success) {
        action.status = "completed";
        this.emit("action_completed", action);

        // Remove completed action
        setTimeout(() => {
          this.actionQueue.delete(action.id);
        }, 1000);
      } else {
        throw new Error("Action execution returned false");
      }
    } catch (error) {
      action.retryCount++;

      if (action.retryCount >= action.maxRetries) {
        action.status = "failed";
        this.emit("action_failed", action);
      } else {
        action.status = "pending";
        this.emit("action_retry_scheduled", action);

        // Schedule retry
        const delay =
          this.options.retryDelay * Math.pow(2, action.retryCount - 1);
        setTimeout(() => {
          if (this.isOnline && action.status === "pending") {
            this.executeAction(action);
          }
        }, delay);
      }
    }
  }

  /**
   * Send message to server (placeholder - integrate with your API)
   */
  private async sendMessageToServer(message: Message): Promise<any> {
    // This would be replaced with actual API call
    console.log("Sending message to server:", message);

    // Simulate API call
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          data: {
            _id: `server_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`,
            ...message,
          },
        });
      }, 1000);
    });
  }

  /**
   * Execute mark read action
   */
  private async executeMarkReadAction(data: any): Promise<boolean> {
    // Implement mark read API call
    console.log("Executing mark read action:", data);
    return true;
  }

  /**
   * Execute delete message action
   */
  private async executeDeleteMessageAction(data: any): Promise<boolean> {
    // Implement delete message API call
    console.log("Executing delete message action:", data);
    return true;
  }

  /**
   * Execute update message action
   */
  private async executeUpdateMessageAction(data: any): Promise<boolean> {
    // Implement update message API call
    console.log("Executing update message action:", data);
    return true;
  }

  /**
   * Remove oldest queued message to make room
   */
  private removeOldestQueuedMessage(): void {
    let oldestId: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [id, queuedMessage] of this.messageQueue.entries()) {
      if (queuedMessage.timestamp < oldestTimestamp) {
        oldestTimestamp = queuedMessage.timestamp;
        oldestId = id;
      }
    }

    if (oldestId) {
      const removed = this.messageQueue.get(oldestId);
      this.messageQueue.delete(oldestId);
      this.emit("message_removed_from_queue", removed);
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    messageQueue: {
      total: number;
      pending: number;
      sending: number;
      failed: number;
      sent: number;
    };
    actionQueue: {
      total: number;
      pending: number;
      processing: number;
      completed: number;
      failed: number;
    };
    isOnline: boolean;
    isProcessing: boolean;
  } {
    const messages = Array.from(this.messageQueue.values());
    const actions = Array.from(this.actionQueue.values());

    return {
      messageQueue: {
        total: messages.length,
        pending: messages.filter((m) => m.status === "pending").length,
        sending: messages.filter((m) => m.status === "sending").length,
        failed: messages.filter((m) => m.status === "failed").length,
        sent: messages.filter((m) => m.status === "sent").length,
      },
      actionQueue: {
        total: actions.length,
        pending: actions.filter((a) => a.status === "pending").length,
        processing: actions.filter((a) => a.status === "processing").length,
        completed: actions.filter((a) => a.status === "completed").length,
        failed: actions.filter((a) => a.status === "failed").length,
      },
      isOnline: this.isOnline,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Get queued messages
   */
  getQueuedMessages(): QueuedMessage[] {
    return Array.from(this.messageQueue.values());
  }

  /**
   * Get queued actions
   */
  getQueuedActions(): OfflineAction[] {
    return Array.from(this.actionQueue.values());
  }

  /**
   * Retry failed message
   */
  async retryFailedMessage(messageId: string): Promise<void> {
    const queuedMessage = this.messageQueue.get(messageId);

    if (!queuedMessage || queuedMessage.status !== "failed") {
      throw new Error("Message not found or not in failed state");
    }

    queuedMessage.status = "pending";
    queuedMessage.retryCount = 0;
    queuedMessage.error = undefined;

    if (this.isOnline) {
      await this.sendQueuedMessage(queuedMessage);
    }
  }

  /**
   * Remove message from queue
   */
  removeQueuedMessage(messageId: string): boolean {
    const removed = this.messageQueue.delete(messageId);
    if (removed) {
      this.emit("message_removed_from_queue", messageId);
    }
    return removed;
  }

  /**
   * Clear all queued messages
   */
  clearMessageQueue(): void {
    const count = this.messageQueue.size;
    this.messageQueue.clear();
    this.emit("message_queue_cleared", count);
  }

  /**
   * Clear all queued actions
   */
  clearActionQueue(): void {
    const count = this.actionQueue.size;
    this.actionQueue.clear();
    this.emit("action_queue_cleared", count);
  }

  /**
   * Load cache from storage
   */
  private async loadFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(this.options.persistenceKey);

      if (data) {
        const parsed = JSON.parse(data);

        // Restore message queue
        if (parsed.messageQueue) {
          for (const [id, queuedMessage] of Object.entries(
            parsed.messageQueue
          )) {
            this.messageQueue.set(id, queuedMessage as QueuedMessage);
          }
        }

        // Restore action queue
        if (parsed.actionQueue) {
          for (const [id, action] of Object.entries(parsed.actionQueue)) {
            this.actionQueue.set(id, action as OfflineAction);
          }
        }
      }
    } catch (error) {
      console.error("Failed to load offline cache from storage:", error);
    }
  }

  /**
   * Save cache to storage
   */
  private async saveToStorage(): Promise<void> {
    try {
      const data = {
        messageQueue: Object.fromEntries(this.messageQueue),
        actionQueue: Object.fromEntries(this.actionQueue),
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        this.options.persistenceKey,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error("Failed to save offline cache to storage:", error);
    }
  }

  /**
   * Start persistence timer
   */
  private startPersistenceTimer(): void {
    this.persistenceTimer = setInterval(() => {
      this.saveToStorage();
    }, 10000); // Save every 10 seconds
  }

  /**
   * Stop persistence timer
   */
  private stopPersistenceTimer(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
      this.persistenceTimer = null;
    }
  }

  /**
   * Cleanup and destroy
   */
  async destroy(): Promise<void> {
    this.stopPersistenceTimer();
    await this.saveToStorage();
    this.removeAllListeners();
    this.messageQueue.clear();
    this.actionQueue.clear();
  }
}

/**
 * Global offline cache instance
 */
export const offlineCache = new OfflineCache();
