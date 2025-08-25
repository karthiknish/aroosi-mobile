import { MessagingApiAdapter } from "../utils/messagingApiAdapter";
import { useState, useEffect, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";
import {
  OfflineMessageQueue,
  QueuedMessage,
  QueueStats,
} from "@utils/offlineMessageQueue";
import { MessagingAPI } from "../../types/messaging";
import { Message } from "../types/message";
import { useApiClient } from "@utils/api";

interface UseOfflineMessageQueueOptions {
  maxRetries?: number;
  baseRetryDelay?: number;
  autoStart?: boolean;
  onMessageSent?: (message: Message) => void;
  onMessageFailed?: (queuedMessage: QueuedMessage, error: any) => void;
  onQueueProcessed?: () => void;
}

interface OfflineMessageQueueState {
  isInitialized: boolean;
  isOnline: boolean;
  isProcessing: boolean;
  stats: QueueStats;
  queuedMessages: QueuedMessage[];
  failedMessages: QueuedMessage[];
}

/**
 * Hook for managing offline message queue
 */
export function useOfflineMessageQueue(
  options: UseOfflineMessageQueueOptions = {}
) {
  const {
    maxRetries = 3,
    baseRetryDelay = 1000,
    autoStart = true,
    onMessageSent,
    onMessageFailed,
    onQueueProcessed,
  } = options;

  const [state, setState] = useState<OfflineMessageQueueState>({
    isInitialized: false,
    isOnline: false,
    isProcessing: false,
    stats: {
      totalQueued: 0,
      pending: 0,
      failed: 0,
      processing: 0,
      lastProcessed: 0,
      successRate: 0,
    },
    queuedMessages: [],
    failedMessages: [],
  });

  const apiClient = useApiClient();
  const queueRef = useRef<OfflineMessageQueue | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Initialize queue
  useEffect(() => {
    if (queueRef.current) return;

    const initializeQueue = async () => {
      try {
  const messagingApi = new MessagingApiAdapter();
  // Realtime methods now return Promise<void>; compatibility helpers exist if ApiResponse envelope needed
  const queue = new OfflineMessageQueue(messagingApi, {
          maxRetries,
          baseRetryDelay,
        });

        // Setup event listeners
        queue.on("initialized", ({ queueSize }) => {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            stats: queue.getStats(),
            queuedMessages: queue.getQueuedMessages(),
            failedMessages: queue.getFailedMessages(),
          }));
        });

        queue.on("message_queued", () => {
          setState((prev) => ({
            ...prev,
            stats: queue.getStats(),
            queuedMessages: queue.getQueuedMessages(),
          }));
        });

        queue.on("message_sent", ({ message }) => {
          setState((prev) => ({
            ...prev,
            stats: queue.getStats(),
            queuedMessages: queue.getQueuedMessages(),
            failedMessages: queue.getFailedMessages(),
          }));
          onMessageSent?.(message);
        });

        queue.on("message_failed", ({ message, error }) => {
          setState((prev) => ({
            ...prev,
            stats: queue.getStats(),
            queuedMessages: queue.getQueuedMessages(),
            failedMessages: queue.getFailedMessages(),
          }));
          onMessageFailed?.(message as QueuedMessage, error);
        });

        queue.on("processing_started", () => {
          setState((prev) => ({ ...prev, isProcessing: true }));
        });

        queue.on("processing_completed", () => {
          setState((prev) => ({
            ...prev,
            isProcessing: false,
            stats: queue.getStats(),
            queuedMessages: queue.getQueuedMessages(),
            failedMessages: queue.getFailedMessages(),
          }));
          onQueueProcessed?.();
        });

        queue.on("connection_status_changed", ({ online }) => {
          setState((prev) => ({ ...prev, isOnline: online }));
        });

        queue.on("error", (error) => {
          console.error("Offline message queue error:", error);
        });

        // Initialize the queue
        await queue.initialize();
        queueRef.current = queue;

        // Start monitoring network status if auto-start is enabled
        if (autoStart) {
          startNetworkMonitoring();
        }
      } catch (error) {
        console.error("Failed to initialize offline message queue:", error);
      }
    };

    initializeQueue();

    return () => {
      if (queueRef.current) {
        queueRef.current.destroy();
        queueRef.current = null;
      }
    };
  }, [
    apiClient,
    maxRetries,
    baseRetryDelay,
    autoStart,
    onMessageSent,
    onMessageFailed,
    onQueueProcessed,
  ]);

  // Network monitoring
  const startNetworkMonitoring = useCallback(() => {
    // Monitor network connectivity
    const unsubscribeNetInfo = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected && netState.isInternetReachable;

      if (queueRef.current) {
        queueRef.current.setOnlineStatus(isOnline || false);
      }
    });

    // Monitor app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground, check network status
        NetInfo.fetch().then((netState) => {
          const isOnline = netState.isConnected && netState.isInternetReachable;
          if (queueRef.current) {
            queueRef.current.setOnlineStatus(isOnline || false);
          }
        });
      }
      appStateRef.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      unsubscribeNetInfo();
      appStateSubscription?.remove();
    };
  }, []);

  // Queue a message for sending
  const queueMessage = useCallback(
    async (
      messageData: Omit<Message, "_id">,
      priority: "high" | "normal" | "low" = "normal"
    ): Promise<string | null> => {
      if (!queueRef.current) {
        console.error("Queue not initialized");
        return null;
      }

      try {
        const messageId = await queueRef.current.enqueue(messageData, priority);
        return messageId;
      } catch (error) {
        console.error("Failed to queue message:", error);
        return null;
      }
    },
    []
  );

  // Remove a message from queue
  const removeMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!queueRef.current) {
        return false;
      }

      return await queueRef.current.dequeue(messageId);
    },
    []
  );

  // Retry a failed message
  const retryMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!queueRef.current) {
        return false;
      }

      return await queueRef.current.retryMessage(messageId);
    },
    []
  );

  // Retry all failed messages
  const retryAllFailed = useCallback(async (): Promise<void> => {
    if (!queueRef.current) {
      return;
    }

    const failedMessages = queueRef.current.getFailedMessages();

    for (const message of failedMessages) {
      try {
        await queueRef.current.retryMessage(message.id);
      } catch (error) {
        console.error(`Failed to retry message ${message.id}:`, error);
      }
    }
  }, []);

  // Clear failed messages
  const clearFailedMessages = useCallback(async (): Promise<number> => {
    if (!queueRef.current) {
      return 0;
    }

    const count = await queueRef.current.clearFailedMessages();

    setState((prev) => ({
      ...prev,
      stats: queueRef.current!.getStats(),
      queuedMessages: queueRef.current!.getQueuedMessages(),
      failedMessages: queueRef.current!.getFailedMessages(),
    }));

    return count;
  }, []);

  // Clear all messages
  const clearAll = useCallback(async (): Promise<void> => {
    if (!queueRef.current) {
      return;
    }

    await queueRef.current.clearAll();

    setState((prev) => ({
      ...prev,
      stats: queueRef.current!.getStats(),
      queuedMessages: [],
      failedMessages: [],
    }));
  }, []);

  // Force online status (for testing)
  const setOnlineStatus = useCallback((online: boolean): void => {
    if (queueRef.current) {
      queueRef.current.setOnlineStatus(online);
    }
  }, []);

  // Get current queue stats
  const getStats = useCallback((): QueueStats | null => {
    if (!queueRef.current) {
      return null;
    }
    return queueRef.current.getStats();
  }, []);

  // Refresh state from queue
  const refreshState = useCallback((): void => {
    if (!queueRef.current) {
      return;
    }

    setState((prev) => ({
      ...prev,
      stats: queueRef.current!.getStats(),
      queuedMessages: queueRef.current!.getQueuedMessages(),
      failedMessages: queueRef.current!.getFailedMessages(),
    }));
  }, []);

  return {
    // State
    ...state,

    // Actions
    queueMessage,
    removeMessage,
    retryMessage,
    retryAllFailed,
    clearFailedMessages,
    clearAll,
    setOnlineStatus,
    refreshState,

    // Utilities
    getStats,

    // Computed properties
    hasQueuedMessages: state.queuedMessages.length > 0,
    hasFailedMessages: state.failedMessages.length > 0,
    canRetry: state.failedMessages.length > 0,
    isReady: state.isInitialized && !state.isProcessing,
  };
}

/**
 * Hook for queuing a specific message type with automatic retry
 */
export function useMessageSender() {
  const { queueMessage, isOnline, isInitialized } = useOfflineMessageQueue();

  const sendMessage = useCallback(
    async (
      messageData: Omit<Message, "_id">,
      options: {
        priority?: "high" | "normal" | "low";
        forceQueue?: boolean;
      } = {}
    ): Promise<{
      success: boolean;
      messageId?: string;
      queued: boolean;
      error?: string;
    }> => {
      const { priority = "normal", forceQueue = false } = options;

      if (!isInitialized) {
        return {
          success: false,
          queued: false,
          error: "Message queue not initialized",
        };
      }

      // Always queue the message for offline support
      // The queue will handle immediate sending if online
      const messageId = await queueMessage(messageData, priority);

      if (!messageId) {
        return {
          success: false,
          queued: false,
          error: "Failed to queue message",
        };
      }

      return {
        success: true,
        messageId,
        queued: true,
      };
    },
    [queueMessage, isInitialized]
  );

  return {
    sendMessage,
    isOnline,
    isInitialized,
  };
}

/**
 * Hook for monitoring queue health and providing user feedback
 */
export function useQueueMonitor() {
  const {
    stats,
    isOnline,
    isProcessing,
    hasFailedMessages,
    failedMessages,
    retryAllFailed,
    clearFailedMessages,
  } = useOfflineMessageQueue();

  // Get user-friendly status message
  const getStatusMessage = useCallback((): string => {
    if (!isOnline) {
      if (stats.pending > 0) {
        return `${stats.pending} message${
          stats.pending === 1 ? "" : "s"
        } waiting to send`;
      }
      return "Offline - messages will be sent when connected";
    }

    if (isProcessing) {
      return "Sending messages...";
    }

    if (hasFailedMessages) {
      return `${failedMessages.length} message${
        failedMessages.length === 1 ? "" : "s"
      } failed to send`;
    }

    if (stats.pending > 0) {
      return `${stats.pending} message${
        stats.pending === 1 ? "" : "s"
      } in queue`;
    }

    return "All messages sent";
  }, [isOnline, isProcessing, hasFailedMessages, stats, failedMessages]);

  // Get status color for UI
  const getStatusColor = useCallback(():
    | "success"
    | "warning"
    | "error"
    | "info" => {
    if (hasFailedMessages) return "error";
    if (!isOnline && stats.pending > 0) return "warning";
    if (isProcessing) return "info";
    return "success";
  }, [hasFailedMessages, isOnline, stats.pending, isProcessing]);

  // Check if user action is needed
  const needsUserAction = useCallback((): boolean => {
    return hasFailedMessages;
  }, [hasFailedMessages]);

  return {
    stats,
    statusMessage: getStatusMessage(),
    statusColor: getStatusColor(),
    needsUserAction: needsUserAction(),
    isOnline,
    isProcessing,
    hasFailedMessages,
    failedMessages,
    retryAllFailed,
    clearFailedMessages,
  };
}
