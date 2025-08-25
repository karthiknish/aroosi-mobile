import { Message } from "../types/message";
import { MessageCache } from "./MessageCache";
import { ApiResponse } from "../types/messaging";

export interface PerformanceMetrics {
  /**
   * Cache hit rate (0-1)
   */
  cacheHitRate: number;

  /**
   * Average message load time in milliseconds
   */
  averageLoadTime: number;

  /**
   * Number of API calls made
   */
  apiCallCount: number;

  /**
   * Number of cache hits
   */
  cacheHits: number;

  /**
   * Number of cache misses
   */
  cacheMisses: number;

  /**
   * Memory usage estimate in bytes
   */
  memoryUsage: number;

  /**
   * Number of optimistic updates
   */
  optimisticUpdates: number;

  /**
   * Number of failed optimistic updates
   */
  failedOptimisticUpdates: number;

  /**
   * Average time for optimistic update confirmation
   */
  averageOptimisticConfirmTime: number;
}

export interface OptimisticMessage extends Message {
  /**
   * Temporary ID for optimistic updates
   */
  tempId?: string;

  /**
   * Whether this is an optimistic update
   */
  isOptimistic: boolean;

  /**
   * Timestamp when optimistic update was created
   */
  optimisticTimestamp?: number;

  /**
   * Retry count for failed messages
   */
  retryCount?: number;
}

export interface CacheStrategy {
  /**
   * Maximum number of messages per conversation to cache
   */
  maxMessagesPerConversation: number;

  /**
   * Maximum number of conversations to cache
   */
  maxConversations: number;

  /**
   * Cache TTL in milliseconds
   */
  cacheTTL: number;

  /**
   * Whether to preload recent conversations
   */
  preloadRecentConversations: boolean;

  /**
   * Number of recent conversations to preload
   */
  preloadCount: number;

  /**
   * Whether to use compression for cached data
   */
  useCompression: boolean;
}

export interface OptimizationConfig {
  /**
   * Cache strategy configuration
   */
  cacheStrategy: CacheStrategy;

  /**
   * Whether to enable optimistic updates
   */
  enableOptimisticUpdates: boolean;

  /**
   * Timeout for optimistic updates in milliseconds
   */
  optimisticTimeout: number;

  /**
   * Whether to batch API requests
   */
  enableRequestBatching: boolean;

  /**
   * Batch size for API requests
   */
  batchSize: number;

  /**
   * Batch timeout in milliseconds
   */
  batchTimeout: number;

  /**
   * Whether to enable performance monitoring
   */
  enablePerformanceMonitoring: boolean;

  /**
   * Performance metrics collection interval
   */
  metricsInterval: number;
}

export class MessagingPerformanceOptimizer {
  private messageCache: MessageCache;
  private config: OptimizationConfig;
  private metrics: PerformanceMetrics;
  private optimisticMessages = new Map<string, OptimisticMessage>();
  private pendingBatches = new Map<
    string,
    {
      requests: Array<() => Promise<any>>;
      timeout: NodeJS.Timeout;
    }
  >();
  private performanceTimer: NodeJS.Timeout | null = null;
  private loadTimes: number[] = [];
  private optimisticTimes: number[] = [];

  constructor(
    messageCache: MessageCache,
    config: Partial<OptimizationConfig> = {}
  ) {
    this.messageCache = messageCache;
    this.config = {
      cacheStrategy: {
        maxMessagesPerConversation: 500,
        maxConversations: 50,
        cacheTTL: 30 * 60 * 1000, // 30 minutes
        preloadRecentConversations: true,
        preloadCount: 5,
        useCompression: false,
      },
      enableOptimisticUpdates: true,
      optimisticTimeout: 10000, // 10 seconds
      enableRequestBatching: true,
      batchSize: 5,
      batchTimeout: 100, // 100ms
      enablePerformanceMonitoring: true,
      metricsInterval: 60000, // 1 minute
      ...config,
    };

    this.metrics = {
      cacheHitRate: 0,
      averageLoadTime: 0,
      apiCallCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      optimisticUpdates: 0,
      failedOptimisticUpdates: 0,
      averageOptimisticConfirmTime: 0,
    };

    if (this.config.enablePerformanceMonitoring) {
      this.startPerformanceMonitoring();
    }
  }

  /**
   * Optimized message loading with caching and batching
   */
  async loadMessages(
    conversationId: string,
    apiCall: () => Promise<ApiResponse<Message[]>>,
    options: {
      useCache?: boolean;
      enableOptimistic?: boolean;
      batchKey?: string;
    } = {}
  ): Promise<Message[]> {
    const startTime = Date.now();
    const {
      useCache = true,
      enableOptimistic = this.config.enableOptimisticUpdates,
      batchKey,
    } = options;

    try {
      // Try cache first
      if (useCache) {
        const cachedMessages = this.messageCache.get(conversationId);
        if (cachedMessages) {
          this.metrics.cacheHits++;
          this.recordLoadTime(Date.now() - startTime);
          return cachedMessages;
        }
        this.metrics.cacheMisses++;
      }

      // Use batching if enabled and batch key provided
      if (this.config.enableRequestBatching && batchKey) {
        const batchResult = await this.batchRequest(batchKey, apiCall);
        return Array.isArray(batchResult)
          ? batchResult
          : batchResult?.data || [];
      }

      // Make API call
      const response = await apiCall();
      this.metrics.apiCallCount++;

      if (response.success && response.data) {
        // Cache the results
        if (useCache) {
          this.messageCache.set(conversationId, response.data);
        }

        this.recordLoadTime(Date.now() - startTime);
        return response.data;
      }

      throw new Error(response.error?.message || "Failed to load messages");
    } catch (error) {
      this.recordLoadTime(Date.now() - startTime);
      throw error;
    }
  }

  /**
   * Send message with optimistic updates
   */
  async sendMessageOptimistic(
    message: Omit<Message, "_id" | "createdAt">,
    apiCall: (message: any) => Promise<ApiResponse<Message>>
  ): Promise<Message> {
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const optimisticTimestamp = Date.now();

    // Create optimistic message
    const optimisticMessage: OptimisticMessage = {
      ...message,
      _id: tempId,
      tempId,
      createdAt: optimisticTimestamp,
      isOptimistic: true,
      optimisticTimestamp,
      status: "pending",
      retryCount: 0,
    };

    // Add to cache immediately for optimistic UI
    this.optimisticMessages.set(tempId, optimisticMessage);
    this.messageCache.addMessages(message.conversationId, [optimisticMessage]);
    this.metrics.optimisticUpdates++;

    try {
      // Send actual message
      const response = await apiCall(message);

      if (response.success && response.data) {
        // Replace optimistic message with real one
        const realMessage = response.data;
        this.confirmOptimisticMessage(tempId, realMessage);

        // Record confirmation time
        const confirmTime = Date.now() - optimisticTimestamp;
        this.optimisticTimes.push(confirmTime);

        return realMessage;
      } else {
        // Mark as failed
        this.failOptimisticMessage(
          tempId,
          response.error?.message || "Send failed"
        );
        throw new Error(response.error?.message || "Failed to send message");
      }
    } catch (error: any) {
      this.failOptimisticMessage(tempId, error.message);
      throw error;
    }
  }

  /**
   * Retry failed optimistic message
   */
  async retryOptimisticMessage(
    tempId: string,
    apiCall: (message: any) => Promise<ApiResponse<Message>>
  ): Promise<Message> {
    const optimisticMessage = this.optimisticMessages.get(tempId);
    if (!optimisticMessage) {
      throw new Error("Optimistic message not found");
    }

    // Increment retry count
    optimisticMessage.retryCount = (optimisticMessage.retryCount || 0) + 1;
    optimisticMessage.status = "pending";

    // Update in cache
    this.messageCache.updateMessage(optimisticMessage.conversationId, tempId, {
      status: "pending",
    });

    try {
      const response = await apiCall(optimisticMessage);

      if (response.success && response.data) {
        this.confirmOptimisticMessage(tempId, response.data);
        return response.data;
      } else {
        this.failOptimisticMessage(
          tempId,
          response.error?.message || "Retry failed"
        );
        throw new Error(response.error?.message || "Failed to retry message");
      }
    } catch (error: any) {
      this.failOptimisticMessage(tempId, error.message);
      throw error;
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Get optimistic messages for a conversation
   */
  getOptimisticMessages(conversationId: string): OptimisticMessage[] {
    return Array.from(this.optimisticMessages.values()).filter(
      (msg) => msg.conversationId === conversationId
    );
  }

  /**
   * Clear optimistic messages for a conversation
   */
  clearOptimisticMessages(conversationId: string): void {
    const toDelete: string[] = [];

    for (const [tempId, message] of this.optimisticMessages.entries()) {
      if (message.conversationId === conversationId) {
        toDelete.push(tempId);
      }
    }

    toDelete.forEach((tempId) => {
      this.optimisticMessages.delete(tempId);
    });
  }

  /**
   * Destroy optimizer and clean up resources
   */
  destroy(): void {
    if (this.performanceTimer) {
      clearInterval(this.performanceTimer);
      this.performanceTimer = null;
    }

    // Clear all pending batches
    for (const batch of this.pendingBatches.values()) {
      clearTimeout(batch.timeout);
    }
    this.pendingBatches.clear();

    this.optimisticMessages.clear();
  }

  /**
   * Confirm optimistic message with real message
   */
  private confirmOptimisticMessage(tempId: string, realMessage: Message): void {
    const optimisticMessage = this.optimisticMessages.get(tempId);
    if (!optimisticMessage) {
      return;
    }

    // Remove optimistic message from cache and add real message
    this.messageCache.removeMessage(optimisticMessage.conversationId, tempId);
    this.messageCache.addMessages(optimisticMessage.conversationId, [
      realMessage,
    ]);

    // Clean up
    this.optimisticMessages.delete(tempId);
  }

  /**
   * Mark optimistic message as failed
   */
  private failOptimisticMessage(tempId: string, error: string): void {
    const optimisticMessage = this.optimisticMessages.get(tempId);
    if (!optimisticMessage) {
      return;
    }

    // Update message status in cache
    this.messageCache.updateMessage(optimisticMessage.conversationId, tempId, {
      status: "failed",
    });

    this.metrics.failedOptimisticUpdates++;
  }

  /**
   * Batch API requests for better performance
   */
  private async batchRequest<T>(
    batchKey: string,
    request: () => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.pendingBatches.get(batchKey);

      if (!batch) {
        batch = {
          requests: [],
          timeout: setTimeout(() => {
            this.executeBatch(batchKey);
          }, this.config.batchTimeout),
        };
        this.pendingBatches.set(batchKey, batch);
      }

      batch.requests.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      // Execute immediately if batch is full
      if (batch.requests.length >= this.config.batchSize) {
        clearTimeout(batch.timeout);
        this.executeBatch(batchKey);
      }
    });
  }

  /**
   * Execute batched requests
   */
  private async executeBatch(batchKey: string): Promise<void> {
    const batch = this.pendingBatches.get(batchKey);
    if (!batch) {
      return;
    }

    this.pendingBatches.delete(batchKey);

    // Execute all requests in parallel
    await Promise.all(batch.requests.map((request) => request()));
  }

  /**
   * Record load time for metrics
   */
  private recordLoadTime(time: number): void {
    this.loadTimes.push(time);

    // Keep only recent load times (last 100)
    if (this.loadTimes.length > 100) {
      this.loadTimes = this.loadTimes.slice(-100);
    }

    // Update average
    this.metrics.averageLoadTime =
      this.loadTimes.reduce((sum, t) => sum + t, 0) / this.loadTimes.length;
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    this.performanceTimer = setInterval(() => {
      this.updateMetrics();
    }, this.config.metricsInterval);
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(): void {
    // Update cache hit rate
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate =
      totalRequests > 0 ? this.metrics.cacheHits / totalRequests : 0;

    // Update average optimistic confirm time
    if (this.optimisticTimes.length > 0) {
      this.metrics.averageOptimisticConfirmTime =
        this.optimisticTimes.reduce((sum, t) => sum + t, 0) /
        this.optimisticTimes.length;

      // Keep only recent times
      if (this.optimisticTimes.length > 100) {
        this.optimisticTimes = this.optimisticTimes.slice(-100);
      }
    }

    // Estimate memory usage
    const stats = this.messageCache.getStats();
    this.metrics.memoryUsage = this.estimateMemoryUsage(stats.totalMessages);
  }

  /**
   * Estimate memory usage based on message count
   */
  private estimateMemoryUsage(messageCount: number): number {
    // Rough estimate: 1KB per message on average
    return messageCount * 1024;
  }

  /**
   * Preload recent conversations for better performance
   */
  async preloadRecentConversations(
    getRecentConversations: () => Promise<string[]>,
    loadMessages: (conversationId: string) => Promise<Message[]>
  ): Promise<void> {
    if (!this.config.cacheStrategy.preloadRecentConversations) {
      return;
    }

    try {
      const recentConversationIds = await getRecentConversations();
      const conversationsToPreload = recentConversationIds
        .slice(0, this.config.cacheStrategy.preloadCount)
        .filter((id) => !this.messageCache.has(id));

      // Preload in parallel but limit concurrency
      const batchSize = 3;
      for (let i = 0; i < conversationsToPreload.length; i += batchSize) {
        const batch = conversationsToPreload.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (conversationId) => {
            try {
              const messages = await loadMessages(conversationId);
              this.messageCache.set(conversationId, messages);
            } catch (error) {
              console.warn(
                `Failed to preload conversation ${conversationId}:`,
                error
              );
            }
          })
        );
      }
    } catch (error) {
      console.warn("Failed to preload recent conversations:", error);
    }
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.cacheHitRate < 0.6) {
      recommendations.push(
        "Consider increasing cache size or TTL to improve hit rate"
      );
    }

    if (this.metrics.averageLoadTime > 2000) {
      recommendations.push(
        "Average load time is high, consider optimizing API calls or network"
      );
    }

    if (
      this.metrics.failedOptimisticUpdates / this.metrics.optimisticUpdates >
      0.1
    ) {
      recommendations.push(
        "High optimistic update failure rate, check network stability"
      );
    }

    if (this.metrics.averageOptimisticConfirmTime > 5000) {
      recommendations.push(
        "Optimistic updates taking too long to confirm, check API performance"
      );
    }

    return recommendations;
  }
}

/**
 * Global performance optimizer instance
 */
export let messagingPerformanceOptimizer: MessagingPerformanceOptimizer | null =
  null;

/**
 * Initialize performance optimizer
 */
export function initializePerformanceOptimizer(
  messageCache: MessageCache,
  config?: Partial<OptimizationConfig>
): MessagingPerformanceOptimizer {
  if (messagingPerformanceOptimizer) {
    messagingPerformanceOptimizer.destroy();
  }

  messagingPerformanceOptimizer = new MessagingPerformanceOptimizer(
    messageCache,
    config
  );
  return messagingPerformanceOptimizer;
}

/**
 * Get global performance optimizer instance
 */
export function getPerformanceOptimizer(): MessagingPerformanceOptimizer | null {
  return messagingPerformanceOptimizer;
}
