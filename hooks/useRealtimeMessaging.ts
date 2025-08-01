import { useState, useEffect, useCallback, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import {
  RealtimeMessagingService,
  RealtimeMessage,
  TypingIndicator,
  DeliveryReceipt,
  RealtimeEventHandlers,
} from "../services/RealtimeMessagingService";
import { useAuth } from "../contexts/AuthContext";
import { WEBSOCKET_CONFIG } from "../utils/websocketConfig";

interface UseRealtimeMessagingOptions {
  autoConnect?: boolean;
  onMessage?: (message: RealtimeMessage) => void;
  onTypingIndicator?: (indicator: TypingIndicator) => void;
  onDeliveryReceipt?: (receipt: DeliveryReceipt) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing real-time messaging functionality
 */
export function useRealtimeMessaging(
  options: UseRealtimeMessagingOptions = {}
) {
  const { userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(
    new Map()
  );
  const [messageQueue, setMessageQueue] = useState<RealtimeMessage[]>([]);

  const serviceRef = useRef<RealtimeMessagingService | null>(null);
  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // WebSocket URL - using Vercel-compatible configuration
  const wsUrl = process.env.EXPO_PUBLIC_WS_URL || WEBSOCKET_CONFIG.getUrl();

  // Initialize service
  useEffect(() => {
    if (!serviceRef.current) {
      serviceRef.current = new RealtimeMessagingService(wsUrl);
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
    };
  }, [wsUrl]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App came to foreground, reconnect if needed
        if (!isConnected && userId && options.autoConnect !== false) {
          connect();
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background, disconnect to save resources
        disconnect();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [isConnected, userId, options.autoConnect]);

  // Auto-connect when user is available
  useEffect(() => {
    if (
      userId &&
      options.autoConnect !== false &&
      !isConnected &&
      !isConnecting
    ) {
      connect();
    }
  }, [userId, options.autoConnect, isConnected, isConnecting]);

  // Event handlers
  const eventHandlers: RealtimeEventHandlers = {
    onMessage: (message) => {
      setMessageQueue((prev) => [...prev, message]);
      options.onMessage?.(message);
    },
    onTypingIndicator: (indicator) => {
      handleTypingIndicator(indicator);
      options.onTypingIndicator?.(indicator);
    },
    onDeliveryReceipt: (receipt) => {
      options.onDeliveryReceipt?.(receipt);
    },
    onConnectionChange: (connected) => {
      setIsConnected(connected);
      setIsConnecting(false);
      if (connected) {
        setError(null);
      }
      options.onConnectionChange?.(connected);
    },
    onError: (error) => {
      setError(error);
      setIsConnecting(false);
      options.onError?.(error);
    },
  };

  // Handle typing indicators
  const handleTypingIndicator = useCallback((indicator: TypingIndicator) => {
    const { conversationId, userId: typingUserId, isTyping } = indicator;

    setTypingUsers((prev) => {
      const newMap = new Map(prev);

      if (!newMap.has(conversationId)) {
        newMap.set(conversationId, new Set());
      }

      const conversationTypers = newMap.get(conversationId)!;

      if (isTyping) {
        conversationTypers.add(typingUserId);

        // Clear existing timeout
        const timeoutKey = `${conversationId}-${typingUserId}`;
        const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout to remove typing indicator
        const timeout = setTimeout(() => {
          setTypingUsers((current) => {
            const updated = new Map(current);
            const typers = updated.get(conversationId);
            if (typers) {
              typers.delete(typingUserId);
              if (typers.size === 0) {
                updated.delete(conversationId);
              }
            }
            return updated;
          });
          typingTimeoutsRef.current.delete(timeoutKey);
        }, 3000); // Remove typing indicator after 3 seconds

        typingTimeoutsRef.current.set(timeoutKey, timeout);
      } else {
        conversationTypers.delete(typingUserId);
        if (conversationTypers.size === 0) {
          newMap.delete(conversationId);
        }

        // Clear timeout
        const timeoutKey = `${conversationId}-${typingUserId}`;
        const existingTimeout = typingTimeoutsRef.current.get(timeoutKey);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
          typingTimeoutsRef.current.delete(timeoutKey);
        }
      }

      return newMap;
    });
  }, []);

  // Connect to real-time service
  const connect = useCallback(async () => {
    if (!userId || !serviceRef.current || isConnecting) {
      return false;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const success = await serviceRef.current.initialize(
        userId,
        eventHandlers
      );

      if (success) {
        console.log("Real-time messaging connected");
        return true;
      } else {
        setIsConnecting(false);
        return false;
      }
    } catch (error) {
      console.error("Failed to connect to real-time messaging:", error);
      setError(error instanceof Error ? error : new Error("Connection failed"));
      setIsConnecting(false);
      return false;
    }
  }, [userId, isConnecting, eventHandlers]);

  // Disconnect from real-time service
  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
    setIsConnected(false);
    setIsConnecting(false);
    setTypingUsers(new Map());

    // Clear all typing timeouts
    typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    typingTimeoutsRef.current.clear();
  }, []);

  // Send typing indicator (single canonical path via RealtimeMessagingService)
  const sendTypingIndicator = useCallback(
    (conversationId: string, isTyping: boolean) => {
      if (serviceRef.current && isConnected) {
        serviceRef.current.sendTypingIndicator(conversationId, isTyping);
      }
    },
    [isConnected]
  );

  // Send delivery receipt (single canonical path via RealtimeMessagingService)
  const sendDeliveryReceipt = useCallback(
    (
      messageId: string,
      conversationId: string,
      status: "sent" | "delivered" | "read"
    ) => {
      if (serviceRef.current && isConnected) {
        serviceRef.current.sendDeliveryReceipt(
          messageId,
          conversationId,
          status
        );
      }
    },
    [isConnected]
  );

  // Send read receipt (single canonical path via RealtimeMessagingService)
  const sendReadReceipt = useCallback(
    (messageId: string, conversationId: string) => {
      if (serviceRef.current && isConnected) {
        serviceRef.current.sendReadReceipt(messageId, conversationId);
      }
    },
    [isConnected]
  );

  // Join conversation
  const joinConversation = useCallback(
    (conversationId: string) => {
      if (serviceRef.current && isConnected) {
        serviceRef.current.joinConversation(conversationId);
      }
    },
    [isConnected]
  );

  // Leave conversation
  const leaveConversation = useCallback(
    (conversationId: string) => {
      if (serviceRef.current && isConnected) {
        serviceRef.current.leaveConversation(conversationId);
      }
    },
    [isConnected]
  );

  // Get typing users for a conversation
  const getTypingUsers = useCallback(
    (conversationId: string): string[] => {
      const typers = typingUsers.get(conversationId);
      return typers ? Array.from(typers) : [];
    },
    [typingUsers]
  );

  // Check if anyone is typing in a conversation
  const isAnyoneTyping = useCallback(
    (conversationId: string): boolean => {
      const typers = typingUsers.get(conversationId);
      return typers ? typers.size > 0 : false;
    },
    [typingUsers]
  );

  // Clear message queue
  const clearMessageQueue = useCallback(() => {
    setMessageQueue([]);
  }, []);

  // Get queued messages
  const getQueuedMessages = useCallback(() => {
    return messageQueue;
  }, [messageQueue]);

  return {
    // Connection state
    isConnected,
    isConnecting,
    error,

    // Connection control
    connect,
    disconnect,

    // Messaging functions
    sendTypingIndicator,
    sendDeliveryReceipt,
    sendReadReceipt,
    joinConversation,
    leaveConversation,

    // Typing indicators
    getTypingUsers,
    isAnyoneTyping,
    typingUsers: Array.from(typingUsers.entries()).reduce(
      (acc, [conversationId, users]) => {
        acc[conversationId] = Array.from(users);
        return acc;
      },
      {} as Record<string, string[]>
    ),

    // Message queue
    messageQueue,
    clearMessageQueue,
    getQueuedMessages,

    // Service reference (for advanced usage)
    service: serviceRef.current,
  };
}
