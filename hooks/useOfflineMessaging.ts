import { useState, useEffect, useCallback, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import { AppState, AppStateStatus } from "react-native";
import {
  OfflineMessagingService,
  SendMessageOptions,
  SendMessageResult,
} from "../services/offlineMessagingService";
import { MessagingAPI } from "../types/messaging";
import { Message } from "../types/message";
import { useApiClient } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";

interface UseOfflineMessagingOptions {
  enableOfflineQueue?: boolean;
  enableAutoSync?: boolean;
  maxRetries?: number;
  syncInterval?: number;
  cacheMessages?: boolean;
  autoInitialize?: boolean;
}

interface OfflineMessagingState {
  isInitialized: boolean;
  isOnline: boolean;
  queueStats: any;
  failedMessages: any[];
  optimisticMessages: number;
  lastSyncTime: number;
  syncInProgress: boolean;
}

/**
 * Hook for using offline messaging service
 */
export function useOfflineMessaging(options: UseOfflineMessagingOptions = {}) {
  const {
    enableOfflineQueue = true,
    enableAutoSync = true,
    maxRetries = 3,
    syncInterval = 30000,
    cacheMessages = true,
    autoInitialize = true,
  } = options;

  const [state, setState] = useState<OfflineMessagingState>({
    isInitialized: false,
    isOnline: false,
    queueStats: null,
    failedMessages: [],
    optimisticMessages: 0,
    lastSyncTime: 0,
    syncInProgress: false,
  });

  const { userId } = useAuth();
  const apiClient = useApiClient();
  const serviceRef = useRef<OfflineMessagingService | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Initialize service
  useEffect(() => {
    if (!userId || !apiClient || serviceRef.current) return;

    const initializeService = async () => {
      try {
        const service = new OfflineMessagingService(apiClient as MessagingAPI, {
          enableOfflineQueue,
          enableAutoSync,
          maxRetries,
          syncInterval,
          cacheMessages,
        });

        // Setup event listeners
        service.on("initialized", () => {
          setState((prev) => ({
            ...prev,
            isInitialized: true,
            ...service.getStatus(),
          }));
        });

        service.on("connection_status_changed", ({ online }) => {
          setState((prev) => ({ ...prev, isOnline: online }));
        });

        service.on("message_sent", (message) => {
          updateServiceState();
        });

        service.on("message_queued", () => {
          updateServiceState();
        });

        service.on("queued_message_sent", () => {
          updateServiceState();
        });

        service.on("queued_message_failed", () => {
          updateServiceState();
        });

        service.on("sync_completed", () => {
          setState((prev) => ({
            ...prev,
            lastSyncTime: Date.now(),
            syncInProgress: false,
          }));
        });

        service.on("sync_error", (error) => {
          console.error("Sync error:", error);
          setState((prev) => ({ ...prev, syncInProgress: false }));
        });

        service.on("optimistic_message_added", () => {
          updateServiceState();
        });

        service.on("optimistic_message_confirmed", () => {
          updateServiceState();
        });

        service.on("optimistic_message_rejected", () => {
          updateServiceState();
        });

        const updateServiceState = () => {
          const status = service.getStatus();
          setState((prev) => ({
            ...prev,
            queueStats: status.queueStats,
            failedMessages: service.getFailedMessages(),
            optimisticMessages: status.optimisticMessages,
          }));
        };

        // Initialize the service
        if (autoInitialize) {
          await service.initialize(userId);
        }

        serviceRef.current = service;

        // Start network monitoring
        startNetworkMonitoring();
      } catch (error) {
        console.error("Failed to initialize offline messaging service:", error);
      }
    };

    initializeService();

    return () => {
      if (serviceRef.current) {
        serviceRef.current.destroy();
        serviceRef.current = null;
      }
    };
  }, [
    userId,
    apiClient,
    enableOfflineQueue,
    enableAutoSync,
    maxRetries,
    syncInterval,
    cacheMessages,
    autoInitialize,
  ]);

  // Network monitoring
  const startNetworkMonitoring = useCallback(() => {
    // Monitor network connectivity
    const unsubscribeNetInfo = NetInfo.addEventListener((netState) => {
      const isOnline = netState.isConnected && netState.isInternetReachable;

      if (serviceRef.current) {
        serviceRef.current.setOnlineStatus(isOnline || false);
      }
    });

    // Monitor app state changes
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground, check network and sync
        NetInfo.fetch().then((netState) => {
          const isOnline = netState.isConnected && netState.isInternetReachable;
          if (serviceRef.current) {
            serviceRef.current.setOnlineStatus(isOnline || false);

            // Trigger sync if online
            if (isOnline && enableAutoSync) {
              serviceRef.current.syncAllConversations();
            }
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
  }, [enableAutoSync]);

  // Send message
  const sendMessage = useCallback(
    async (
      messageData: Omit<Message, "_id">,
      options: SendMessageOptions = {}
    ): Promise<SendMessageResult> => {
      if (!serviceRef.current) {
        return {
          success: false,
          queued: false,
          error: {
            type: "UNKNOWN_ERROR" as any,
            message: "Service not initialized",
            recoverable: false,
          },
        };
      }

      return await serviceRef.current.sendMessage(messageData, options);
    },
    []
  );

  // Get messages
  const getMessages = useCallback(
    async (
      conversationId: string,
      options: { limit?: number; before?: number } = {}
    ): Promise<Message[]> => {
      if (!serviceRef.current) {
        return [];
      }

      return await serviceRef.current.getMessages(conversationId, options);
    },
    []
  );

  // Retry failed message
  const retryMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      if (!serviceRef.current) {
        return false;
      }

      return await serviceRef.current.retryMessage(messageId);
    },
    []
  );

  // Retry all failed messages
  const retryAllFailed = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      return;
    }

    const failedMessages = serviceRef.current.getFailedMessages();

    for (const message of failedMessages) {
      try {
        await serviceRef.current.retryMessage(message.id);
      } catch (error) {
        console.error(`Failed to retry message ${message.id}:`, error);
      }
    }
  }, []);

  // Clear failed messages
  const clearFailedMessages = useCallback(async (): Promise<number> => {
    if (!serviceRef.current) {
      return 0;
    }

    return await serviceRef.current.clearFailedMessages();
  }, []);

  // Sync all conversations
  const syncAllConversations = useCallback(async (): Promise<void> => {
    if (!serviceRef.current) {
      return;
    }

    setState((prev) => ({ ...prev, syncInProgress: true }));

    try {
      await serviceRef.current.syncAllConversations();
    } catch (error) {
      console.error("Sync failed:", error);
      setState((prev) => ({ ...prev, syncInProgress: false }));
    }
  }, []);

  // Sync specific conversation
  const syncConversation = useCallback(
    async (conversationId: string): Promise<void> => {
      if (!serviceRef.current) {
        return;
      }

      await serviceRef.current.syncConversation(conversationId);
    },
    []
  );

  // Manual initialization
  const initialize = useCallback(async (): Promise<void> => {
    if (!serviceRef.current || !userId) {
      return;
    }

    await serviceRef.current.initialize(userId);
  }, [userId]);

  // Get service status
  const getStatus = useCallback(() => {
    if (!serviceRef.current) {
      return null;
    }

    return serviceRef.current.getStatus();
  }, []);

  return {
    // State
    ...state,

    // Actions
    sendMessage,
    getMessages,
    retryMessage,
    retryAllFailed,
    clearFailedMessages,
    syncAllConversations,
    syncConversation,
    initialize,

    // Utilities
    getStatus,

    // Computed properties
    hasFailedMessages: state.failedMessages.length > 0,
    hasOptimisticMessages: state.optimisticMessages > 0,
    canRetry: state.failedMessages.length > 0,
    needsSync: Date.now() - state.lastSyncTime > syncInterval,
    isReady: state.isInitialized && !state.syncInProgress,
  };
}

/**
 * Hook for conversation-specific offline messaging
 */
export function useConversationMessaging(conversationId: string) {
  const {
    sendMessage: baseSendMessage,
    getMessages,
    syncConversation,
    isOnline,
    isInitialized,
  } = useOfflineMessaging();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load messages for conversation
  const loadMessages = useCallback(
    async (options: { limit?: number; before?: number } = {}) => {
      if (!conversationId) return;

      setLoading(true);
      setError(null);

      try {
        const conversationMessages = await getMessages(conversationId, options);

        if (options.before) {
          // Prepending older messages
          setMessages((prev) => [...conversationMessages, ...prev]);
        } else {
          // Setting initial messages
          setMessages(conversationMessages);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load messages"
        );
      } finally {
        setLoading(false);
      }
    },
    [conversationId, getMessages]
  );

  // Send message for this conversation
  const sendMessage = useCallback(
    async (
      messageData: Omit<Message, "_id" | "conversationId">,
      options: SendMessageOptions = {}
    ): Promise<SendMessageResult> => {
      const fullMessageData = {
        ...messageData,
        conversationId,
      };

      const result = await baseSendMessage(fullMessageData, options);

      // Add optimistic message to local state if successful
      if (result.success && result.optimisticId) {
        const optimisticMessage: Message = {
          ...fullMessageData,
          _id: result.optimisticId,
          status: "pending",
          createdAt: Date.now(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
      }

      return result;
    },
    [conversationId, baseSendMessage]
  );

  // Sync this conversation
  const sync = useCallback(async () => {
    if (!conversationId) return;

    try {
      await syncConversation(conversationId);
      // Reload messages after sync
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    }
  }, [conversationId, syncConversation, loadMessages]);

  // Load messages on mount and conversation change
  useEffect(() => {
    if (isInitialized && conversationId) {
      loadMessages();
    }
  }, [isInitialized, conversationId, loadMessages]);

  return {
    // State
    messages,
    loading,
    error,
    isOnline,
    isInitialized,

    // Actions
    sendMessage,
    loadMessages,
    sync,

    // Computed
    hasMessages: messages.length > 0,
    canSend: isInitialized && conversationId,
  };
}

/**
 * Hook for monitoring offline messaging health
 */
export function useOfflineMessagingHealth() {
  const {
    isOnline,
    queueStats,
    failedMessages,
    optimisticMessages,
    lastSyncTime,
    syncInProgress,
    retryAllFailed,
    clearFailedMessages,
    syncAllConversations,
  } = useOfflineMessaging();

  // Get health status
  const getHealthStatus = useCallback((): {
    status: "healthy" | "warning" | "error";
    message: string;
    details: string[];
  } => {
    const details: string[] = [];

    if (!isOnline) {
      details.push("Device is offline");
    }

    if (queueStats?.failed > 0) {
      details.push(`${queueStats.failed} messages failed to send`);
    }

    if (queueStats?.pending > 0) {
      details.push(`${queueStats.pending} messages waiting to send`);
    }

    if (optimisticMessages > 0) {
      details.push(`${optimisticMessages} messages pending confirmation`);
    }

    if (syncInProgress) {
      details.push("Syncing messages...");
    }

    // Determine status
    if (queueStats?.failed > 0) {
      return {
        status: "error",
        message: "Some messages failed to send",
        details,
      };
    }

    if (!isOnline && (queueStats?.pending > 0 || optimisticMessages > 0)) {
      return {
        status: "warning",
        message: "Offline - messages will be sent when connected",
        details,
      };
    }

    if (syncInProgress || queueStats?.processing > 0) {
      return {
        status: "warning",
        message: "Sending messages...",
        details,
      };
    }

    return {
      status: "healthy",
      message: "All messages sent successfully",
      details,
    };
  }, [
    isOnline,
    queueStats,
    failedMessages,
    optimisticMessages,
    syncInProgress,
  ]);

  // Get user actions
  const getAvailableActions = useCallback(() => {
    const actions = [];

    if (failedMessages.length > 0) {
      actions.push({
        id: "retry_failed",
        label: "Retry Failed Messages",
        action: retryAllFailed,
      });

      actions.push({
        id: "clear_failed",
        label: "Clear Failed Messages",
        action: clearFailedMessages,
      });
    }

    if (isOnline) {
      actions.push({
        id: "sync_all",
        label: "Sync All Conversations",
        action: syncAllConversations,
      });
    }

    return actions;
  }, [
    failedMessages,
    isOnline,
    retryAllFailed,
    clearFailedMessages,
    syncAllConversations,
  ]);

  return {
    healthStatus: getHealthStatus(),
    availableActions: getAvailableActions(),
    stats: {
      isOnline,
      queueStats,
      failedMessages: failedMessages.length,
      optimisticMessages,
      lastSyncTime,
      syncInProgress,
    },
  };
}
