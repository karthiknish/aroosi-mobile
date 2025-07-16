import { useEffect, useCallback, useState } from 'react';
import { useAuth } from "../contexts/AuthContext";
import realtimeMessagingService from '../services/RealtimeMessagingService';
import { Message, MessageStatus } from '../types/message';
import { normalizeMessage } from '../utils/messageUtils';

export interface UseRealtimeMessagingProps {
  conversationId: string;
  onMessageReceived?: (message: Message) => void;
  onMessageRead?: (messageId: string, userId: string) => void;
  onTypingStart?: (userId: string) => void;
  onTypingStop?: (userId: string) => void;
  onUserOnline?: (userId: string) => void;
  onUserOffline?: (userId: string) => void;
}

export interface UseRealtimeMessagingResult {
  isConnected: boolean;
  connectionError: string | null;
  sendTypingIndicator: (action: 'start' | 'stop') => Promise<void>;
  sendDeliveryReceipt: (messageId: string, status: MessageStatus) => Promise<void>;
  connect: () => void;
  disconnect: () => void;
}

export function useRealtimeMessaging({
  conversationId,
  onMessageReceived,
  onMessageRead,
  onTypingStart,
  onTypingStop,
  onUserOnline,
  onUserOffline,
}: UseRealtimeMessagingProps): UseRealtimeMessagingResult {
  const { getToken } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Connect to real-time messaging
  const connect = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      realtimeMessagingService.connect(conversationId, token);
    } catch (error) {
      console.error('Failed to connect to real-time messaging:', error);
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [conversationId, getToken]);

  // Disconnect from real-time messaging
  const disconnect = useCallback(() => {
    realtimeMessagingService.disconnect();
  }, []);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (action: 'start' | 'stop') => {
    try {
      await realtimeMessagingService.sendTypingIndicator(conversationId, action);
    } catch (error) {
      console.error('Failed to send typing indicator:', error);
    }
  }, [conversationId]);

  // Send delivery receipt
  const sendDeliveryReceipt = useCallback(async (messageId: string, status: MessageStatus) => {
    try {
      await realtimeMessagingService.sendDeliveryReceipt(messageId, status);
    } catch (error) {
      console.error('Failed to send delivery receipt:', error);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (error: any) => {
      setConnectionError(error?.message || 'Connection error');
      setIsConnected(false);
    };

    const handleMessageReceived = (messageData: any) => {
      if (onMessageReceived) {
        const normalizedMessage = normalizeMessage(messageData);
        onMessageReceived(normalizedMessage);
      }
    };

    const handleMessageRead = (data: { messageId: string; userId: string }) => {
      if (onMessageRead) {
        onMessageRead(data.messageId, data.userId);
      }
    };

    const handleTypingStart = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && onTypingStart) {
        onTypingStart(data.userId);
      }
    };

    const handleTypingStop = (data: { userId: string; conversationId: string }) => {
      if (data.conversationId === conversationId && onTypingStop) {
        onTypingStop(data.userId);
      }
    };

    const handleUserOnline = (data: { userId: string }) => {
      if (onUserOnline) {
        onUserOnline(data.userId);
      }
    };

    const handleUserOffline = (data: { userId: string }) => {
      if (onUserOffline) {
        onUserOffline(data.userId);
      }
    };

    // Add event listeners
    realtimeMessagingService.on('connected', handleConnected);
    realtimeMessagingService.on('disconnected', handleDisconnected);
    realtimeMessagingService.on('error', handleError);
    realtimeMessagingService.on('messageReceived', handleMessageReceived);
    realtimeMessagingService.on('messageRead', handleMessageRead);
    realtimeMessagingService.on('typingStart', handleTypingStart);
    realtimeMessagingService.on('typingStop', handleTypingStop);
    realtimeMessagingService.on('userOnline', handleUserOnline);
    realtimeMessagingService.on('userOffline', handleUserOffline);

    // Auto-connect when component mounts
    connect();

    // Cleanup on unmount
    return () => {
      realtimeMessagingService.off('connected', handleConnected);
      realtimeMessagingService.off('disconnected', handleDisconnected);
      realtimeMessagingService.off('error', handleError);
      realtimeMessagingService.off('messageReceived', handleMessageReceived);
      realtimeMessagingService.off('messageRead', handleMessageRead);
      realtimeMessagingService.off('typingStart', handleTypingStart);
      realtimeMessagingService.off('typingStop', handleTypingStop);
      realtimeMessagingService.off('userOnline', handleUserOnline);
      realtimeMessagingService.off('userOffline', handleUserOffline);
      
      disconnect();
    };
  }, [
    conversationId,
    connect,
    disconnect,
    onMessageReceived,
    onMessageRead,
    onTypingStart,
    onTypingStop,
    onUserOnline,
    onUserOffline,
  ]);

  return {
    isConnected,
    connectionError,
    sendTypingIndicator,
    sendDeliveryReceipt,
    connect,
    disconnect,
  };
}