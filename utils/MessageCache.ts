import { Message } from "../types/message";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface MessageCacheOptions {
  maxSize?: number;
  maxAge?: number; // in milliseconds
  cleanupInterval?: number; // in milliseconds
}

/**
 * LRU Cache implementation for messages with automatic cleanup
 */
export class MessageCache {
  private cache = new Map<string, CacheEntry<Message[]>>();
  private conversationSizes = new Map<string, number>();
  private maxSize: number;
  private maxAge: number;
  private cleanupInterval: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: MessageCacheOptions = {}) {
    this.maxSize = options.maxSize || 1000; // Max number of message arrays
    this.maxAge = options.maxAge || 30 * 60 * 1000; // 30 minutes default
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes cleanup interval

    this.startCleanupTimer();
  }

  /**
   * Get messages for a conversation
   */
  get(conversationId: string): Message[] | null {
    const entry = this.cache.get(conversationId);

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(conversationId);
      this.conversationSizes.delete(conversationId);
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;

    return [...entry.data]; // Return a copy to prevent mutations
  }

  /**
   * Set messages for a conversation
   */
  set(conversationId: string, messages: Message[]): void {
    // If cache is at max size, remove least recently used entries
    if (this.cache.size >= this.maxSize && !this.cache.has(conversationId)) {
      this.evictLRU();
    }

    const now = Date.now();
    const entry: CacheEntry<Message[]> = {
      data: [...messages], // Store a copy to prevent external mutations
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
    };

    this.cache.set(conversationId, entry);
    this.conversationSizes.set(conversationId, messages.length);
  }

  /**
   * Add messages to existing conversation cache
   */
  addMessages(
    conversationId: string,
    newMessages: Message[],
    prepend = false
  ): void {
    const existing = this.get(conversationId);

    if (!existing) {
      this.set(conversationId, newMessages);
      return;
    }

    // Merge messages, avoiding duplicates
    const messageIds = new Set(existing.map((m) => m._id));
    const uniqueNewMessages = newMessages.filter((m) => !messageIds.has(m._id));

    let mergedMessages: Message[];
    if (prepend) {
      // Add older messages to the beginning
      mergedMessages = [...uniqueNewMessages, ...existing];
    } else {
      // Add newer messages to the end
      mergedMessages = [...existing, ...uniqueNewMessages];
    }

    // Sort by timestamp to maintain order
    mergedMessages.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

    this.set(conversationId, mergedMessages);
  }

  /**
   * Update a specific message in the cache
   */
  updateMessage(
    conversationId: string,
    messageId: string,
    updates: Partial<Message>
  ): boolean {
    const messages = this.get(conversationId);

    if (!messages) {
      return false;
    }

    const messageIndex = messages.findIndex((m) => m._id === messageId);
    if (messageIndex === -1) {
      return false;
    }

    // Update the message
    messages[messageIndex] = { ...messages[messageIndex], ...updates };
    this.set(conversationId, messages);

    return true;
  }

  /**
   * Remove a message from the cache
   */
  removeMessage(conversationId: string, messageId: string): boolean {
    const messages = this.get(conversationId);

    if (!messages) {
      return false;
    }

    const filteredMessages = messages.filter((m) => m._id !== messageId);

    if (filteredMessages.length === messages.length) {
      return false; // Message not found
    }

    this.set(conversationId, filteredMessages);
    return true;
  }

  /**
   * Check if conversation is cached
   */
  has(conversationId: string): boolean {
    const entry = this.cache.get(conversationId);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(conversationId);
      this.conversationSizes.delete(conversationId);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    totalMessages: number;
    conversations: string[];
    hitRate?: number;
    memoryUsage: number;
    averageAccessTime: number;
  } {
    const totalMessages = Array.from(this.conversationSizes.values()).reduce(
      (sum, count) => sum + count,
      0
    );

    // Calculate average access count for hit rate estimation
    let totalAccess = 0;
    let entryCount = 0;
    for (const entry of this.cache.values()) {
      totalAccess += entry.accessCount;
      entryCount++;
    }
    const averageAccess = entryCount > 0 ? totalAccess / entryCount : 0;

    // Estimate memory usage (rough calculation)
    const estimatedMemoryUsage = totalMessages * 1024; // 1KB per message estimate

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalMessages,
      conversations: Array.from(this.cache.keys()),
      hitRate:
        averageAccess > 1
          ? Math.min(1, (averageAccess - 1) / averageAccess)
          : 0,
      memoryUsage: estimatedMemoryUsage,
      averageAccessTime: 0, // Would need timing instrumentation for accurate measurement
    };
  }

  /**
   * Clear cache for a specific conversation
   */
  delete(conversationId: string): boolean {
    const deleted = this.cache.delete(conversationId);
    this.conversationSizes.delete(conversationId);
    return deleted;
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.conversationSizes.clear();
  }

  /**
   * Get messages in a specific range
   */
  getRange(
    conversationId: string,
    start: number,
    end: number
  ): Message[] | null {
    const messages = this.get(conversationId);

    if (!messages) {
      return null;
    }

    return messages.slice(start, end);
  }

  /**
   * Get the most recent messages
   */
  getRecent(conversationId: string, count: number): Message[] | null {
    const messages = this.get(conversationId);

    if (!messages) {
      return null;
    }

    return messages.slice(-count);
  }

  /**
   * Search messages in cache
   */
  searchMessages(conversationId: string, query: string): Message[] | null {
    const messages = this.get(conversationId);

    if (!messages) {
      return null;
    }

    const lowercaseQuery = query.toLowerCase();
    return messages.filter((message) =>
      message.text?.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(): void {
    if (this.cache.size === 0) {
      return;
    }

    // Find the least recently used entry
    let lruKey: string | null = null;
    let lruTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      this.conversationSizes.delete(lruKey);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => {
      this.cache.delete(key);
      this.conversationSizes.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(
        `MessageCache: Cleaned up ${expiredKeys.length} expired entries`
      );
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Optimize cache performance based on usage patterns
   */
  optimize(): void {
    const stats = this.getStats();

    // If cache is underutilized, reduce cleanup frequency
    if (stats.size < this.maxSize * 0.5) {
      // Cache is less than 50% full, reduce cleanup frequency
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = setInterval(() => {
          this.cleanup();
        }, this.cleanupInterval * 2); // Double the cleanup interval
      }
    }

    // If cache hit rate is low, consider preloading strategies
    if (stats.hitRate && stats.hitRate < 0.6) {
      console.log(
        "MessageCache: Low hit rate detected, consider preloading recent conversations"
      );
    }

    // Compact cache by removing least accessed entries if memory usage is high
    if (stats.memoryUsage > 50 * 1024 * 1024) {
      // 50MB threshold
      this.compactCache();
    }
  }

  /**
   * Compact cache by removing least accessed entries
   */
  private compactCache(): void {
    if (this.cache.size <= this.maxSize * 0.8) {
      return; // Don't compact if cache isn't nearly full
    }

    // Sort entries by access count (ascending)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].accessCount - b[1].accessCount
    );

    // Remove bottom 20% of entries
    const toRemove = Math.floor(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.conversationSizes.delete(key);
    }

    console.log(`MessageCache: Compacted cache, removed ${toRemove} entries`);
  }

  /**
   * Preload messages for conversations (for performance optimization)
   */
  async preloadConversations(
    conversationIds: string[],
    loadFunction: (conversationId: string) => Promise<Message[]>
  ): Promise<void> {
    const toPreload = conversationIds.filter((id) => !this.has(id));

    if (toPreload.length === 0) {
      return;
    }

    console.log(`MessageCache: Preloading ${toPreload.length} conversations`);

    // Preload in batches to avoid overwhelming the system
    const batchSize = 3;
    for (let i = 0; i < toPreload.length; i += batchSize) {
      const batch = toPreload.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (conversationId) => {
          try {
            const messages = await loadFunction(conversationId);
            this.set(conversationId, messages);
          } catch (error) {
            console.warn(
              `MessageCache: Failed to preload conversation ${conversationId}:`,
              error
            );
          }
        })
      );

      // Small delay between batches to prevent overwhelming
      if (i + batchSize < toPreload.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Stop cleanup timer and cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

/**
 * Global message cache instance
 */
export const messageCache = new MessageCache({
  maxSize: 100, // Cache up to 100 conversations
  maxAge: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // Cleanup every 5 minutes
});

/**
 * Message pagination helper
 */
export class MessagePagination {
  private pageSize: number;
  private loadedPages = new Map<string, Set<number>>();
  private totalCounts = new Map<string, number>();
  private isLoading = new Set<string>();

  constructor(pageSize = 20) {
    this.pageSize = pageSize;
  }

  /**
   * Check if a page is loaded for a conversation
   */
  isPageLoaded(conversationId: string, page: number): boolean {
    const pages = this.loadedPages.get(conversationId);
    return pages ? pages.has(page) : false;
  }

  /**
   * Mark a page as loaded
   */
  markPageLoaded(conversationId: string, page: number): void {
    if (!this.loadedPages.has(conversationId)) {
      this.loadedPages.set(conversationId, new Set());
    }
    this.loadedPages.get(conversationId)!.add(page);
  }

  /**
   * Get loaded pages for a conversation
   */
  getLoadedPages(conversationId: string): number[] {
    const pages = this.loadedPages.get(conversationId);
    return pages ? Array.from(pages).sort((a, b) => a - b) : [];
  }

  /**
   * Check if currently loading
   */
  isLoadingPage(conversationId: string): boolean {
    return this.isLoading.has(conversationId);
  }

  /**
   * Set loading state
   */
  setLoading(conversationId: string, loading: boolean): void {
    if (loading) {
      this.isLoading.add(conversationId);
    } else {
      this.isLoading.delete(conversationId);
    }
  }

  /**
   * Set total message count for a conversation
   */
  setTotalCount(conversationId: string, count: number): void {
    this.totalCounts.set(conversationId, count);
  }

  /**
   * Get total message count for a conversation
   */
  getTotalCount(conversationId: string): number {
    return this.totalCounts.get(conversationId) || 0;
  }

  /**
   * Calculate if there are more pages to load
   */
  hasMorePages(conversationId: string): boolean {
    const totalCount = this.getTotalCount(conversationId);
    const loadedPages = this.getLoadedPages(conversationId);

    if (totalCount === 0 || loadedPages.length === 0) {
      return true; // Assume there might be more if we haven't loaded anything
    }

    const maxLoadedPage = Math.max(...loadedPages);
    const expectedTotalPages = Math.ceil(totalCount / this.pageSize);

    return maxLoadedPage < expectedTotalPages - 1;
  }

  /**
   * Get next page to load
   */
  getNextPage(conversationId: string): number {
    const loadedPages = this.getLoadedPages(conversationId);

    if (loadedPages.length === 0) {
      return 0; // Start with first page
    }

    // Find the first missing page
    const maxPage = Math.max(...loadedPages);
    for (let i = 0; i <= maxPage; i++) {
      if (!loadedPages.includes(i)) {
        return i;
      }
    }

    // All pages up to maxPage are loaded, return next page
    return maxPage + 1;
  }

  /**
   * Clear pagination data for a conversation
   */
  clearConversation(conversationId: string): void {
    this.loadedPages.delete(conversationId);
    this.totalCounts.delete(conversationId);
    this.isLoading.delete(conversationId);
  }

  /**
   * Clear all pagination data
   */
  clear(): void {
    this.loadedPages.clear();
    this.totalCounts.clear();
    this.isLoading.clear();
  }
}

/**
 * Global pagination helper instance
 */
export const messagePagination = new MessagePagination(20);
