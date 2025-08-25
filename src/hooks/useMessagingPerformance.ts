import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessagingPerformanceOptimizer,
  PerformanceMetrics,
  OptimizationConfig,
  OptimisticMessage,
  initializePerformanceOptimizer,
  getPerformanceOptimizer,
} from "@utils/messagingPerformanceOptimizer";
import { MessageCache, messageCache } from "@utils/MessageCache";
import { Message } from "../../types/message";
import { ApiResponse } from "../../types/messaging";
import { useApiClient } from "@utils/api";

export interface MessagingPerformanceHookResult {
  /**
   * Load messages with performance optimizations
   */
  loadMessagesOptimized: (
    conversationId: string,
    options?: {
      useCache?: boolean;
      enableOptimistic?: boolean;
      batchKey?: string;
    }
  ) => Promise<Message[]>;

  /**
   * Send message with optimistic updates
   */
  sendMessageOptimistic: (
    message: Omit<Message, "_id" | "createdAt">
  ) => Promise<Message>;

  /**
   * Retry failed optimistic message
   */
  retryOptimisticMessage: (tempId: string) => Promise<Message>;

  /**
   * Get optimistic messages for a conversation
   */
  getOptimisticMessages: (conversationId: string) => OptimisticMessage[];

  /**
   * Clear optimistic messages for a conversation
   */
  clearOptimisticMessages: (conversationId: string) => void;

  /**
   * Preload recent conversations
   */
  preloadRecentConversations: (
    recentConversationIds: string[]
  ) => Promise<void>;

  /**
   * Current performance metrics
   */
  performanceMetrics: PerformanceMetrics;

  /**
   * Performance recommendations
   */
  performanceRecommendations: string[];

  /**
   * Whether performance monitoring is enabled
   */
  isMonitoringEnabled: boolean;

  /**
   * Toggle performance monitoring
   */
  toggleMonitoring: (enabled: boolean) => void;

  /**
   * Reset performance metrics
   */
  resetMetrics: () => void;

  /**
   * Get cache statistics
   */
  getCacheStats: () => {
    size: number;
    maxSize: number;
    totalMessages: number;
    conversations: string[];
  };
}

/**
 * Hook for messaging performance optimization
 */
export function useMessagingPerformance(
  customMessageCache?: MessageCache,
  config?: Partial<OptimizationConfig>
): MessagingPerformanceHookResult {
  const apiClient = useApiClient();

  // Create a simple messaging API wrapper
  const api = {
    getMessages: async (conversationId: string) => {
      return apiClient.transportRequest(
        `/conversations/${conversationId}/messages`
      );
    },
    sendMessage: async (messageData: any) => {
      return apiClient.transportRequest("/messages", {
        method: "POST",
        body: messageData,
      });
    },
  };
  const optimizerRef = useRef<MessagingPerformanceOptimizer | null>(null);
  const [performanceMetrics, setPerformanceMetrics] =
    useState<PerformanceMetrics>({
      cacheHitRate: 0,
      averageLoadTime: 0,
      apiCallCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      optimisticUpdates: 0,
      failedOptimisticUpdates: 0,
      averageOptimisticConfirmTime: 0,
    });
  const [performanceRecommendations, setPerformanceRecommendations] = useState<
    string[]
  >([]);
  const [isMonitoringEnabled, setIsMonitoringEnabled] = useState(true);
  const metricsUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize performance optimizer
  useEffect(() => {
    const cacheInstance = customMessageCache || messageCache;
    optimizerRef.current = initializePerformanceOptimizer(cacheInstance, {
      enablePerformanceMonitoring: isMonitoringEnabled,
      ...config,
    });

    return () => {
      if (optimizerRef.current) {
        optimizerRef.current.destroy();
        optimizerRef.current = null;
      }
    };
  }, [customMessageCache, config, isMonitoringEnabled]);

  // Update metrics periodically
  useEffect(() => {
    if (isMonitoringEnabled && optimizerRef.current) {
      const updateMetrics = () => {
        if (optimizerRef.current) {
          const metrics = optimizerRef.current.getMetrics();
          setPerformanceMetrics(metrics);

          const recommendations =
            optimizerRef.current.getPerformanceRecommendations();
          setPerformanceRecommendations(recommendations);
        }
      };

      // Update immediately
      updateMetrics();

      // Set up periodic updates
      metricsUpdateInterval.current = setInterval(updateMetrics, 30000); // Every 30 seconds

      return () => {
        if (metricsUpdateInterval.current) {
          clearInterval(metricsUpdateInterval.current);
          metricsUpdateInterval.current = null;
        }
      };
    }
  }, [isMonitoringEnabled]);

  // Load messages with optimizations
  const loadMessagesOptimized = useCallback(
    async (
      conversationId: string,
      options: {
        useCache?: boolean;
        enableOptimistic?: boolean;
        batchKey?: string;
      } = {}
    ): Promise<Message[]> => {
      if (!optimizerRef.current) {
        throw new Error("Performance optimizer not initialized");
      }

      return await optimizerRef.current.loadMessages(
        conversationId,
        () => api.getMessages(conversationId),
        options
      );
    },
    [api]
  );

  // Send message with optimistic updates
  const sendMessageOptimistic = useCallback(
    async (message: Omit<Message, "_id" | "createdAt">): Promise<Message> => {
      if (!optimizerRef.current) {
        throw new Error("Performance optimizer not initialized");
      }

      return await optimizerRef.current.sendMessageOptimistic(
        message,
        (messageData: any) => api.sendMessage(messageData)
      );
    },
    [api]
  );

  // Retry failed optimistic message
  const retryOptimisticMessage = useCallback(
    async (tempId: string): Promise<Message> => {
      if (!optimizerRef.current) {
        throw new Error("Performance optimizer not initialized");
      }

      return await optimizerRef.current.retryOptimisticMessage(
        tempId,
        (messageData: any) => api.sendMessage(messageData)
      );
    },
    [api]
  );

  // Get optimistic messages for a conversation
  const getOptimisticMessages = useCallback(
    (conversationId: string): OptimisticMessage[] => {
      if (!optimizerRef.current) {
        return [];
      }

      return optimizerRef.current.getOptimisticMessages(conversationId);
    },
    []
  );

  // Clear optimistic messages for a conversation
  const clearOptimisticMessages = useCallback(
    (conversationId: string): void => {
      if (optimizerRef.current) {
        optimizerRef.current.clearOptimisticMessages(conversationId);
      }
    },
    []
  );

  // Preload recent conversations
  const preloadRecentConversations = useCallback(
    async (recentConversationIds: string[]): Promise<void> => {
      if (!optimizerRef.current) {
        return;
      }

      await optimizerRef.current.preloadRecentConversations(
        async () => recentConversationIds,
        async (conversationId: string) => {
          const response = await api.getMessages(conversationId);
          if (response.success && response.data) {
            return response.data;
          }
          throw new Error(response.error?.message || "Failed to load messages");
        }
      );
    },
    [api]
  );

  // Toggle performance monitoring
  const toggleMonitoring = useCallback((enabled: boolean): void => {
    setIsMonitoringEnabled(enabled);
  }, []);

  // Reset performance metrics
  const resetMetrics = useCallback((): void => {
    if (optimizerRef.current) {
      // Reinitialize optimizer to reset metrics
      const cacheInstance = customMessageCache || messageCache;
      optimizerRef.current.destroy();
      optimizerRef.current = initializePerformanceOptimizer(cacheInstance, {
        enablePerformanceMonitoring: isMonitoringEnabled,
        ...config,
      });

      // Reset state
      setPerformanceMetrics({
        cacheHitRate: 0,
        averageLoadTime: 0,
        apiCallCount: 0,
        cacheHits: 0,
        cacheMisses: 0,
        memoryUsage: 0,
        optimisticUpdates: 0,
        failedOptimisticUpdates: 0,
        averageOptimisticConfirmTime: 0,
      });
      setPerformanceRecommendations([]);
    }
  }, [customMessageCache, config, isMonitoringEnabled]);

  // Get cache statistics
  const getCacheStats = useCallback(() => {
    const cacheInstance = customMessageCache || messageCache;
    return cacheInstance.getStats();
  }, [customMessageCache]);

  return {
    loadMessagesOptimized,
    sendMessageOptimistic,
    retryOptimisticMessage,
    getOptimisticMessages,
    clearOptimisticMessages,
    preloadRecentConversations,
    performanceMetrics,
    performanceRecommendations,
    isMonitoringEnabled,
    toggleMonitoring,
    resetMetrics,
    getCacheStats,
  };
}

/**
 * Hook for performance monitoring only (lightweight)
 */
export function usePerformanceMonitoring(): {
  metrics: PerformanceMetrics;
  recommendations: string[];
  cacheStats: {
    size: number;
    maxSize: number;
    totalMessages: number;
    conversations: string[];
  } | null;
} {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheHitRate: 0,
    averageLoadTime: 0,
    apiCallCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memoryUsage: 0,
    optimisticUpdates: 0,
    failedOptimisticUpdates: 0,
    averageOptimisticConfirmTime: 0,
  });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [cacheStats, setCacheStats] = useState<{
    size: number;
    maxSize: number;
    totalMessages: number;
    conversations: string[];
  } | null>(null);

  useEffect(() => {
    const updateMetrics = () => {
      const optimizer = getPerformanceOptimizer();
      if (optimizer) {
        setMetrics(optimizer.getMetrics());
        setRecommendations(optimizer.getPerformanceRecommendations());
      }

      setCacheStats(messageCache.getStats());
    };

    // Update immediately
    updateMetrics();

    // Set up periodic updates
    const interval = setInterval(updateMetrics, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    recommendations,
    cacheStats,
  };
}

/**
 * Hook for optimistic message management
 */
export function useOptimisticMessages(conversationId: string): {
  optimisticMessages: OptimisticMessage[];
  sendOptimistic: (
    message: Omit<Message, "_id" | "createdAt">
  ) => Promise<Message>;
  retryMessage: (tempId: string) => Promise<Message>;
  clearOptimistic: () => void;
} {
  const {
    sendMessageOptimistic,
    retryOptimisticMessage,
    getOptimisticMessages,
    clearOptimisticMessages,
  } = useMessagingPerformance();
  const [optimisticMessages, setOptimisticMessages] = useState<
    OptimisticMessage[]
  >([]);

  // Update optimistic messages when conversation changes
  useEffect(() => {
    const updateOptimisticMessages = () => {
      const messages = getOptimisticMessages(conversationId);
      setOptimisticMessages(messages);
    };

    updateOptimisticMessages();

    // Set up periodic updates to catch status changes
    const interval = setInterval(updateOptimisticMessages, 1000);

    return () => clearInterval(interval);
  }, [conversationId, getOptimisticMessages]);

  const sendOptimistic = useCallback(
    async (message: Omit<Message, "_id" | "createdAt">) => {
      const result = await sendMessageOptimistic({
        ...message,
        conversationId,
      });

      // Update local state
      setOptimisticMessages(getOptimisticMessages(conversationId));

      return result;
    },
    [conversationId, sendMessageOptimistic, getOptimisticMessages]
  );

  const retryMessage = useCallback(
    async (tempId: string) => {
      const result = await retryOptimisticMessage(tempId);

      // Update local state
      setOptimisticMessages(getOptimisticMessages(conversationId));

      return result;
    },
    [conversationId, retryOptimisticMessage, getOptimisticMessages]
  );

  const clearOptimistic = useCallback(() => {
    clearOptimisticMessages(conversationId);
    setOptimisticMessages([]);
  }, [conversationId, clearOptimisticMessages]);

  return {
    optimisticMessages,
    sendOptimistic,
    retryMessage,
    clearOptimistic,
  };
}
