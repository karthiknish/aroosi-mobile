import { useEffect, useRef, useState, useCallback } from "react";
import { useClerkAuth } from "../contexts/ClerkAuthContext"
import { RealtimeManager, RealtimeEvent } from "../utils/realtimeManager";
import { API_BASE_URL } from "../utils/api";

interface UseRealtimeOptions {
  autoConnect?: boolean;
  onNewMessage?: (message: any) => void;
  onNewMatch?: (match: any) => void;
  onTypingIndicator?: (data: any) => void;
  onProfileView?: (data: any) => void;
}

export function useRealtime({
  autoConnect = true,
  onNewMessage,
  onNewMatch,
  onTypingIndicator,
  onProfileView,
}: UseRealtimeOptions = {}) {
  const { } = useClerkAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const realtimeManager = useRef<RealtimeManager | null>(null);

  // Initialize realtime manager
  useEffect(() => {
    if (!token || !user?.id) return;

    realtimeManager.current = new RealtimeManager({
      token,
      baseUrl: API_BASE_URL,
      onConnect: () => {
        setIsConnected(true);
        setConnectionError(null);
        console.log("Realtime connected");
      },
      onDisconnect: () => {
        setIsConnected(false);
        console.log("Realtime disconnected");
      },
      onError: (error) => {
        setConnectionError(error);
        setIsConnected(false);
        console.error("Realtime error:", error);
      },
      onMessage: (event) => {
        setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
      },
      onNewMessage,
      onNewMatch,
      onTypingIndicator,
      onProfileView,
    });

    if (autoConnect) {
      realtimeManager.current.connect();
    }

    return () => {
      if (realtimeManager.current) {
        realtimeManager.current.disconnect();
      }
    };
  }, [
    token,
    user?.id,
    autoConnect,
    onNewMessage,
    onNewMatch,
    onTypingIndicator,
    onProfileView,
  ]);

  // Update token when it changes
  useEffect(() => {
    if (realtimeManager.current && token) {
      realtimeManager.current.updateToken(token);
    }
  }, [token]);

  const connect = useCallback(() => {
    if (realtimeManager.current) {
      realtimeManager.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (realtimeManager.current) {
      realtimeManager.current.disconnect();
    }
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    isConnected,
    connectionError,
    events,
    connect,
    disconnect,
    clearEvents,
  };
}
