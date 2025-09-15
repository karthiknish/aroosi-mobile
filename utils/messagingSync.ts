import EventEmitter from "eventemitter3";
import { Message } from "../types/message";
import { messageCache } from "./MessageCache";
import { RealtimeMessagingService } from "../services/RealtimeMessagingService";
import { OfflineMessageQueue } from "./offlineMessageQueue";

export interface SyncState {
  lastSyncTimestamp: number;
  pendingMessages: Message[];
  conflictedMessages: Message[];
  syncInProgress: boolean;
  syncErrors: SyncError[];
}

export interface SyncError {
  id: string;
  type: "network" | "conflict" | "validation" | "permission";
  message: string;
  timestamp: number;
  retryCount: number;
  data?: any;
}

export interface ConversationSyncState {
  conversationId: string;
  lastMessageTimestamp: number;
  lastReadTimestamp: number;
  unreadCount: number;
  syncStatus: "synced" | "syncing" | "error" | "conflict";
  lastSyncAttempt: number;
}

export interface SyncOptions {
  batchSize?: number;
  maxRetries?: number;
  retryDelay?: number;
  conflictResolution?: "client" | "server" | "manual";
  enableRealtime?: boolean;
}

/**
 * Cross-platform message synchronization manager
 */
export class MessageSyncManager extends EventEmitter {
  private syncState: Map<string, ConversationSyncState> = new Map();
  private globalSyncState: SyncState = {
    lastSyncTimestamp: 0,
    pendingMessages: [],
    conflictedMessages: [],
    syncInProgress: false,
    syncErrors: [],
  };

  private apiClient: any;
  private realtimeService: RealtimeMessagingService | null = null;
  private offlineQueue: OfflineMessageQueue | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private options: Required<SyncOptions>;
  private userId: string | null = null;

  constructor(apiClient: any, options: SyncOptions = {}) {
    super();
    this.apiClient = apiClient;
    this.options = {
      batchSize: options.batchSize || 50,
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      conflictResolution: options.conflictResolution || "server",
      enableRealtime: options.enableRealtime !== false,
    };
  }

  /**
   * Initialize sync manager
   */
  async initialize(
    userId: string,
    realtimeService?: RealtimeMessagingService,
    offlineQueue?: OfflineMessageQueue
  ): Promise<void> {
    this.userId = userId;

    if (realtimeService && this.options.enableRealtime) {
      this.realtimeService = realtimeService;
      this.setupRealtimeHandlers();
    }

    if (offlineQueue) {
      this.offlineQueue = offlineQueue;
      this.setupOfflineQueueHandlers();
    }

    // Load sync state from storage
    await this.loadSyncState();

    // Start periodic sync
    this.startPeriodicSync();

    this.emit("initialized");
  }

  /**
   * Setup real-time event handlers
   */
  private setupRealtimeHandlers(): void {
    if (!this.realtimeService) return;

    this.realtimeService.on("message", (message) => {
      this.handleRealtimeMessage(message);
    });

    this.realtimeService.on("delivery_receipt", (receipt) => {
      this.handleDeliveryReceipt(receipt);
    });

    this.realtimeService.on("read_receipt", (receipt) => {
      this.handleReadReceipt(receipt);
    });

    this.realtimeService.on("connected", () => {
      this.emit("realtime_connected");
      // Trigger sync when reconnected
      this.syncAllConversations();
    });

    this.realtimeService.on("disconnected", () => {
      this.emit("realtime_disconnected");
    });
  }

  /**
   * Setup offline queue event handlers
   */
  private setupOfflineQueueHandlers(): void {
    if (!this.offlineQueue) return;

    this.offlineQueue.on("message_sent", ({ message }) => {
      // Message was successfully sent from queue
      // Add to cache and update sync state
      messageCache.addMessages(message.conversationId, [message]);

      this.updateConversationSyncState(message.conversationId, {
        lastMessageTimestamp: message.createdAt || Date.now(),
        syncStatus: "synced",
      });

      this.emit("queued_message_sent", message);
    });

    this.offlineQueue.on("message_failed", ({ message, error }) => {
      // Message failed to send from queue
      this.addSyncError("network", `Queued message failed: ${error.message}`, {
        message,
        error,
      });

      this.emit("queued_message_failed", { message, error });
    });

    this.offlineQueue.on("connection_status_changed", ({ online }) => {
      if (online) {
        // When coming online, trigger sync to catch up on any missed messages
        this.syncAllConversations();
      }

      this.emit("connection_status_changed", { online });
    });

    this.offlineQueue.on("processing_started", () => {
      this.emit("queue_processing_started");
    });

    this.offlineQueue.on("processing_completed", () => {
      this.emit("queue_processing_completed");
      // After queue processing, sync to ensure we have latest messages
      this.syncAllConversations();
    });
  }

  /**
   * Handle real-time message
   */
  private handleRealtimeMessage(realtimeMessage: any): void {
    const message: Message = {
      _id: realtimeMessage.id,
      conversationId: realtimeMessage.conversationId,
      fromUserId: realtimeMessage.fromUserId,
      toUserId: realtimeMessage.toUserId,
      text: realtimeMessage.content,
      type: realtimeMessage.type || "text",
      createdAt: realtimeMessage.timestamp,
      status: "delivered",
    };

    // Add to cache
    messageCache.addMessages(message.conversationId, [message]);

    // Update conversation sync state
    this.updateConversationSyncState(message.conversationId, {
      lastMessageTimestamp: message.createdAt || Date.now(),
      syncStatus: "synced",
    });

    this.emit("message_received", message);
  }

  /**
   * Handle delivery receipt
   */
  private handleDeliveryReceipt(receipt: any): void {
    const { messageId, conversationId, status } = receipt;

    // Update message status in cache
    messageCache.updateMessage(conversationId, messageId, { status });

    this.emit("message_status_updated", { messageId, conversationId, status });
  }

  /**
   * Handle read receipt
   */
  private handleReadReceipt(receipt: any): void {
    const { messageId, conversationId, timestamp } = receipt;

    // Update message as read in cache
    messageCache.updateMessage(conversationId, messageId, {
      status: "read",
      readAt: timestamp,
    });

    // Update conversation sync state
    this.updateConversationSyncState(conversationId, {
      lastReadTimestamp: timestamp,
    });

    this.emit("message_read", { messageId, conversationId, timestamp });
  }

  /**
   * Sync all conversations
   */
  async syncAllConversations(): Promise<void> {
    if (this.globalSyncState.syncInProgress) {
      return;
    }

    this.globalSyncState.syncInProgress = true;
    this.emit("sync_started");

    try {
      // Get list of conversations to sync
      const conversationsResponse = await this.apiClient.getConversations();

      if (!conversationsResponse.success) {
        throw new Error("Failed to get conversations list");
      }

      // Normalize conversations payload into an array
      const payload: any = conversationsResponse.data;
      let conversations: any[] = [];
      if (Array.isArray(payload)) {
        conversations = payload;
      } else if (payload && typeof payload === "object") {
        if (Array.isArray(payload.conversations)) {
          conversations = payload.conversations;
        } else if (Array.isArray(payload.data?.conversations)) {
          conversations = payload.data.conversations;
        } else if (Array.isArray(payload.items)) {
          conversations = payload.items;
        } else if (Array.isArray(payload.results)) {
          conversations = payload.results;
        } else {
          conversations = [];
        }
      }

      // Sync each conversation (defensively derive the ID)
      for (const c of conversations) {
        const convId = c?.conversationId || c?._id || c?.id;
        if (!convId) continue;
        try {
          await this.syncConversation(convId);
        } catch (error) {
          console.error(`Failed to sync conversation ${convId}:`, error);
          this.addSyncError(
            "network",
            `Failed to sync conversation: ${error}`,
            {
              conversationId: convId,
            }
          );
        }
      }

      this.globalSyncState.lastSyncTimestamp = Date.now();
      await this.saveSyncState();

      this.emit("sync_completed");
    } catch (error) {
      console.error("Global sync failed:", error);
      this.addSyncError("network", `Global sync failed: ${error}`);
      this.emit("sync_failed", error);
    } finally {
      this.globalSyncState.syncInProgress = false;
    }
  }

  /**
   * Sync a specific conversation
   */
  async syncConversation(conversationId: string): Promise<void> {
    const syncState = this.getConversationSyncState(conversationId);

    if (syncState.syncStatus === "syncing") {
      return; // Already syncing
    }

    this.updateConversationSyncState(conversationId, {
      syncStatus: "syncing",
      lastSyncAttempt: Date.now(),
    });

    try {
      // Get cached messages
      const cachedMessages = messageCache.get(conversationId) || [];
      const lastCachedTimestamp =
        cachedMessages.length > 0
          ? Math.max(...cachedMessages.map((m) => m.createdAt || 0))
          : syncState.lastMessageTimestamp;

      // Fetch latest messages from server (API supports 'before' for older pages, not 'after')
      // We'll request the latest batch and then filter by timestamp > lastCachedTimestamp
      const response = await this.apiClient.getMessages(conversationId, {
        limit: this.options.batchSize,
      });

      if (!response.success) {
        throw new Error(response.error?.message || "Failed to fetch messages");
      }

      const serverMessages = (response.data || []).filter(
        (m: Message) => (m.createdAt || 0) > (lastCachedTimestamp || 0)
      );

      if (serverMessages.length > 0) {
        // Check for conflicts
        const conflicts = this.detectConflicts(cachedMessages, serverMessages);

        if (conflicts.length > 0) {
          await this.resolveConflicts(conversationId, conflicts);
        }

        // Merge messages
        const mergedMessages = this.mergeMessages(
          cachedMessages,
          serverMessages
        );

        // Update cache
        messageCache.set(conversationId, mergedMessages);

        // Update sync state
        const latestTimestamp = Math.max(
          ...serverMessages.map((m: Message) => m.createdAt || 0)
        );
        this.updateConversationSyncState(conversationId, {
          lastMessageTimestamp: latestTimestamp,
          syncStatus: "synced",
        });
      } else {
        this.updateConversationSyncState(conversationId, {
          syncStatus: "synced",
        });
      }

      // Sync read status
      await this.syncReadStatus(conversationId);

      this.emit("conversation_synced", conversationId);
    } catch (error) {
      console.error(`Conversation sync failed for ${conversationId}:`, error);
      this.updateConversationSyncState(conversationId, {
        syncStatus: "error",
      });
      this.addSyncError("network", `Conversation sync failed: ${error}`, {
        conversationId,
      });
      throw error;
    }
  }

  /**
   * Sync read status for a conversation
   */
  private async syncReadStatus(conversationId: string): Promise<void> {
    try {
      // Get unread messages from server
      const response = await this.apiClient.getUnreadCounts();

      if (response.success && response.data) {
        const conversationUnread = response.data.find(
          (c: any) => c.conversationId === conversationId
        );

        if (conversationUnread) {
          this.updateConversationSyncState(conversationId, {
            unreadCount: conversationUnread.unreadCount,
          });
        }
      }
    } catch (error) {
      console.warn("Failed to sync read status:", error);
    }
  }

  /**
   * Detect conflicts between cached and server messages
   */
  private detectConflicts(
    cachedMessages: Message[],
    serverMessages: Message[]
  ): Message[] {
    const conflicts: Message[] = [];
    const cachedById = new Map(cachedMessages.map((m) => [m._id, m]));

    for (const serverMessage of serverMessages) {
      const cachedMessage = cachedById.get(serverMessage._id);

      if (cachedMessage && this.hasConflict(cachedMessage, serverMessage)) {
        conflicts.push(serverMessage);
      }
    }

    return conflicts;
  }

  /**
   * Check if two messages have conflicts
   */
  private hasConflict(cached: Message, server: Message): boolean {
    // Check for content differences
    if (cached.text !== server.text) return true;
    if (cached.status !== server.status) return true;
    if (cached.readAt !== server.readAt) return true;

    return false;
  }

  /**
   * Resolve message conflicts
   */
  private async resolveConflicts(
    conversationId: string,
    conflicts: Message[]
  ): Promise<void> {
    for (const conflictMessage of conflicts) {
      switch (this.options.conflictResolution) {
        case "server":
          // Server wins - no action needed, server message will overwrite
          break;

        case "client":
          // Client wins - push local version to server
          try {
            await this.pushMessageToServer(conflictMessage);
          } catch (error) {
            console.error(
              "Failed to push conflicted message to server:",
              error
            );
            this.globalSyncState.conflictedMessages.push(conflictMessage);
          }
          break;

        case "manual":
          // Add to conflicts for manual resolution
          this.globalSyncState.conflictedMessages.push(conflictMessage);
          this.emit("conflict_detected", {
            conversationId,
            message: conflictMessage,
          });
          break;
      }
    }
  }

  /**
   * Merge cached and server messages
   */
  private mergeMessages(cached: Message[], server: Message[]): Message[] {
    const merged = new Map<string, Message>();

    // Add cached messages
    cached.forEach((msg) => merged.set(msg._id, msg));

    // Add/update with server messages
    server.forEach((msg) => merged.set(msg._id, msg));

    // Sort by timestamp
    return Array.from(merged.values()).sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
  }

  /**
   * Push message to server
   */
  private async pushMessageToServer(message: Message): Promise<void> {
    const response = await this.apiClient.sendMessage({
      conversationId: message.conversationId,
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      text: message.text,
      type: message.type,
    });

    if (!response.success) {
      throw new Error(
        response.error?.message || "Failed to push message to server"
      );
    }
  }

  /**
   * Get conversation sync state
   */
  private getConversationSyncState(
    conversationId: string
  ): ConversationSyncState {
    if (!this.syncState.has(conversationId)) {
      this.syncState.set(conversationId, {
        conversationId,
        lastMessageTimestamp: 0,
        lastReadTimestamp: 0,
        unreadCount: 0,
        syncStatus: "synced",
        lastSyncAttempt: 0,
      });
    }

    return this.syncState.get(conversationId)!;
  }

  /**
   * Update conversation sync state
   */
  private updateConversationSyncState(
    conversationId: string,
    updates: Partial<ConversationSyncState>
  ): void {
    const current = this.getConversationSyncState(conversationId);
    const updated = { ...current, ...updates };
    this.syncState.set(conversationId, updated);

    this.emit("sync_state_updated", { conversationId, state: updated });
  }

  /**
   * Add sync error
   */
  private addSyncError(
    type: SyncError["type"],
    message: string,
    data?: any
  ): void {
    const error: SyncError = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: Date.now(),
      retryCount: 0,
      data,
    };

    this.globalSyncState.syncErrors.push(error);
    this.emit("sync_error", error);
  }

  /**
   * Start periodic sync
   */
  private startPeriodicSync(): void {
    // Sync every 30 seconds when app is active
    this.syncInterval = setInterval(() => {
      if (!this.globalSyncState.syncInProgress) {
        this.syncAllConversations();
      }
    }, 30000);
  }

  /**
   * Stop periodic sync
   */
  private stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Load sync state from storage
   */
  private async loadSyncState(): Promise<void> {
    try {
      // This would load from AsyncStorage or similar
      // For now, we'll use in-memory state
      console.log("Loading sync state from storage...");
    } catch (error) {
      console.error("Failed to load sync state:", error);
    }
  }

  /**
   * Save sync state to storage
   */
  private async saveSyncState(): Promise<void> {
    try {
      // This would save to AsyncStorage or similar
      // For now, we'll just log
      console.log("Saving sync state to storage...");
    } catch (error) {
      console.error("Failed to save sync state:", error);
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    totalConversations: number;
    syncedConversations: number;
    syncingConversations: number;
    errorConversations: number;
    conflictedMessages: number;
    lastSyncTimestamp: number;
    syncInProgress: boolean;
  } {
    const states = Array.from(this.syncState.values());

    return {
      totalConversations: states.length,
      syncedConversations: states.filter((s) => s.syncStatus === "synced")
        .length,
      syncingConversations: states.filter((s) => s.syncStatus === "syncing")
        .length,
      errorConversations: states.filter((s) => s.syncStatus === "error").length,
      conflictedMessages: this.globalSyncState.conflictedMessages.length,
      lastSyncTimestamp: this.globalSyncState.lastSyncTimestamp,
      syncInProgress: this.globalSyncState.syncInProgress,
    };
  }

  /**
   * Force sync a conversation
   */
  async forceSyncConversation(conversationId: string): Promise<void> {
    // Reset sync state
    this.updateConversationSyncState(conversationId, {
      syncStatus: "synced",
      lastSyncAttempt: 0,
    });

    await this.syncConversation(conversationId);
  }

  /**
   * Clear sync errors
   */
  clearSyncErrors(): void {
    this.globalSyncState.syncErrors = [];
    this.emit("sync_errors_cleared");
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(
    messageId: string,
    resolution: "keep_local" | "keep_server"
  ): Promise<void> {
    const conflictIndex = this.globalSyncState.conflictedMessages.findIndex(
      (m) => m._id === messageId
    );

    if (conflictIndex === -1) {
      throw new Error("Conflict not found");
    }

    const conflictedMessage =
      this.globalSyncState.conflictedMessages[conflictIndex];

    if (resolution === "keep_local") {
      await this.pushMessageToServer(conflictedMessage);
    }
    // For 'keep_server', we don't need to do anything as server version will be used

    // Remove from conflicts
    this.globalSyncState.conflictedMessages.splice(conflictIndex, 1);
    this.emit("conflict_resolved", { messageId, resolution });
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopPeriodicSync();
    this.removeAllListeners();
    this.syncState.clear();
  }
}
