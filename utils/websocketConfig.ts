import { Platform } from "react-native";

// WebSocket configuration for mobile app
export const WEBSOCKET_CONFIG = {
  // Vercel production endpoint
  PRODUCTION_URL: "wss://aroosi.vercel.app/api/websocket",

  // Development endpoint
  DEVELOPMENT_URL: "ws://localhost:3000/api/websocket",

  // Get appropriate URL based on environment
  getUrl: () => {
    if (__DEV__) {
      return WEBSOCKET_CONFIG.DEVELOPMENT_URL;
    }
    return WEBSOCKET_CONFIG.PRODUCTION_URL;
  },

  // Connection settings
  CONNECTION: {
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
    connectionTimeout: 10000,
    heartbeatInterval: 30000,
  },

  // Message types - aligned with Vercel endpoint
  MESSAGE_TYPES: {
    JOIN_CONVERSATION: "join_conversation",
    MESSAGE: "message",
    TYPING: "typing",
    DELIVERY_RECEIPT: "delivery_receipt",
    READ_RECEIPT: "read_receipt",
    PING: "ping",
    PONG: "pong",
  },

  // Error codes
  ERROR_CODES: {
    CONNECTION_FAILED: "CONNECTION_FAILED",
    MESSAGE_FAILED: "MESSAGE_FAILED",
    RECONNECT_FAILED: "RECONNECT_FAILED",
  },
};

// Helper function to get WebSocket URL with user ID
export const getWebSocketUrl = (userId: string): string => {
  const baseUrl = WEBSOCKET_CONFIG.getUrl();
  return `${baseUrl}?userId=${userId}`;
};

// Validate WebSocket connection
export const validateWebSocketConnection = async (
  url: string
): Promise<boolean> => {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.close();
      resolve(true);
    };

    ws.onerror = () => {
      resolve(false);
    };

    // Timeout after 5 seconds
    setTimeout(() => {
      ws.close();
      resolve(false);
    }, 5000);
  });
};
