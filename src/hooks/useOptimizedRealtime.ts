import { useState, useEffect, useCallback, useRef } from "react";
import { AppState } from "react-native";
import {
  OptimizedRealtimeService,
  ConnectionPoolConfig,
  ConnectionMetrics,
} from "../../services/OptimizedRealtimeService";
import {
  RealtimeMessage,
  TypingIndicator,
  DeliveryReceipt,
  RealtimeEventHandlers,
} from "../../services/RealtimeMessagingService";
import { useAuth } from "@contexts/AuthProvider";

interface UseOptimizedRealtimeOptions {
  autoConnect?: boolean;
  connectionPoolConfig?: Partial<ConnectionPoolConfig>;
  onMessage?: (message: RealtimeMessage) => void;
  onTypingIndicator?: (indicator: TypingIndicator) => void;
  onDeliveryReceipt?: (receipt: DeliveryReceipt) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedRealtimeReturn {
  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionMetrics: ConnectionMetrics | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;

  // Messaging
  sendMessage: (
    message: Omit<RealtimeMessage, "id" | "timestamp">
  ) => Promise<void>;
  sendTypingIndicator: (
    conversationId: string,
    action: "start" | "stop"
  ) => void;

  // Connection management
  optimizeConnection: () => void;
  getConnectionHealth: () => number;

  // Subscription management
  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: (conversationId: string) => void;
}

export function useOptimizedRealtime(
  options: UseOptimizedRealtimeOptions = {}
): UseOptimizedRealtimeReturn {
  const { userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionMetrics, setConnectionMetrics] =
    useState<ConnectionMetrics | null>(null);

  const serviceRef = useRef<OptimizedRealtimeService | null>(null);
  const optionsRef = useRef(options);

  // Update options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize service
  useEffect(() => {
    if (!userId) return;

    const eventHandlers: RealtimeEventHandlers = {
      onMessage: (message: RealtimeMessage) => {
        optionsRef.current.onMessage?.(message);
      },
      onTypingIndicator: (indicator: TypingIndicator) => {
        optionsRef.current.onTypingIndicator?.(indicator);
      },
      onDeliveryReceipt: (receipt: DeliveryReceipt) => {
        optionsRef.current.onDeliveryReceipt?.(receipt);
      },
      onConnectionChange: (connected: boolean) => {
        setIsConnected(connected);
        optionsRef.current.onConnectionChange?.(connected);
      },
      onError: (error: Error) => {
        optionsRef.current.onError?.(error);
      },
    };

    serviceRef.current = new OptimizedRealtimeService(
      userId,
      eventHandlers,
      options.connectionPoolConfig
    );

    // Auto-connect if enabled
    if (options.autoConnect !== false) {
      connect();
    }

    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
        serviceRef.current = null;
      }
    };
  }, [userId]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (!serviceRef.current) return;

      if (nextAppState === "active") {
        // App came to foreground - reconnect if needed
        if (!isConnected && !isConnecting) {
          connect();
        }
      } else if (nextAppState === "background") {
        // App went to background - optimize connection
        serviceRef.current.optimizeForBackground();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => subscription?.remove();
  }, [isConnected, isConnecting]);

  // Update metrics periodically
  useEffect(() => {
    if (!serviceRef.current || !isConnected) return;

    const interval = setInterval(() => {
      if (serviceRef.current) {
        const metrics = serviceRef.current.getConnectionMetrics();
        setConnectionMetrics(metrics);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isConnected]);

  const connect = useCallback(async () => {
    if (!serviceRef.current || isConnecting) return;

    setIsConnecting(true);
    try {
      await serviceRef.current.connect();
    } catch (error) {
      console.error("Failed to connect:", error);
      optionsRef.current.onError?.(error as Error);
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
    }
  }, []);

  const sendMessage = useCallback(
    async (message: Omit<RealtimeMessage, "id" | "timestamp">) => {
      if (!serviceRef.current || !isConnected) {
        throw new Error("Not connected to realtime service");
      }

      await serviceRef.current.sendMessage(message);
    },
    [isConnected]
  );

  const sendTypingIndicator = useCallback(
    (conversationId: string, action: "start" | "stop") => {
      if (!serviceRef.current || !isConnected) return;

      serviceRef.current.sendTypingIndicator(conversationId, action);
    },
    [isConnected]
  );

  const optimizeConnection = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.optimizeConnection();
    }
  }, []);

  const getConnectionHealth = useCallback((): number => {
    if (!serviceRef.current) return 0;
    return serviceRef.current.getConnectionHealth();
  }, []);

  const subscribeToConversation = useCallback((conversationId: string) => {
    if (serviceRef.current) {
      serviceRef.current.subscribeToConversation(conversationId);
    }
  }, []);

  const unsubscribeFromConversation = useCallback((conversationId: string) => {
    if (serviceRef.current) {
      serviceRef.current.unsubscribeFromConversation(conversationId);
    }
  }, []);

  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionMetrics,

    // Actions
    connect,
    disconnect,

    // Messaging
    sendMessage,
    sendTypingIndicator,

    // Connection management
    optimizeConnection,
    getConnectionHealth,

    // Subscription management
    subscribeToConversation,
    unsubscribeFromConversation,
  };
}
