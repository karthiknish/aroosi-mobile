import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../../contexts/AuthProvider";
import { RealtimeManager, RealtimeEvent } from "../../utils/realtimeManager";
import { API_BASE_URL } from "../../utils/api";

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
  const { user, getToken } = useAuth();
  const userId = user?.id;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const realtimeManager = useRef<RealtimeManager | null>(null);

  // Initialize realtime manager
  useEffect(() => {
    let isMounted = true;

    const initializeRealtime = async () => {
      if (!userId) return;

      try {
        const token = await getToken();
        if (!token) return;

        realtimeManager.current = new RealtimeManager({
          token,
          baseUrl: API_BASE_URL,
          onConnect: () => {
            if (isMounted) {
              setIsConnected(true);
              setConnectionError(null);
            }
          },
          onDisconnect: () => {
            if (isMounted) {
              setIsConnected(false);
            }
          },
          onError: (error) => {
            if (isMounted) {
              setConnectionError(error);
              setIsConnected(false);
            }
          },
          onMessage: (event) => {
            if (isMounted) {
              setEvents((prev) => [...prev.slice(-99), event]); // Keep last 100 events
            }
          },
          onNewMessage,
          onNewMatch,
          onTypingIndicator,
          onProfileView,
        });

        if (autoConnect && isMounted) {
          realtimeManager.current.connect();
        }
      } catch (error) {
        if (isMounted) {
          setConnectionError(error instanceof Error ? error.message : "Failed to initialize realtime connection");
          setIsConnected(false);
        }
      }
    };

    initializeRealtime();

    return () => {
      isMounted = false;
      if (realtimeManager.current) {
        realtimeManager.current.disconnect();
      }
    };
  }, [
    userId,
    autoConnect,
    onNewMessage,
    onNewMatch,
    onTypingIndicator,
    onProfileView,
    getToken,
  ]);

  // Update token when it changes
  useEffect(() => {
    let isMounted = true;
    
    const updateToken = async () => {
      if (realtimeManager.current && getToken) {
        try {
          const token = await getToken();
          if (token && isMounted) {
            realtimeManager.current.updateToken(token);
          }
        } catch (error) {
          if (isMounted) {
            console.error("Failed to update realtime token:", error);
          }
        }
      }
    };

    updateToken();

    return () => {
      isMounted = false;
    };
  }, [getToken]);

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
