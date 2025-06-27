import { useState, useEffect, useCallback } from "react";
import { useEnhancedApiClient } from "../utils/enhancedApiClient";
import { Message, Conversation } from "../types/message";
import PushNotificationService from "../services/PushNotificationService";
import { normalizeMessage, normalizeConversation } from "../utils/messageUtils";

export interface UseMessagingProps {
  matchId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useMessaging({
  matchId,
  autoRefresh = false,
  refreshInterval = 30000,
}: UseMessagingProps = {}) {
  const apiClient = useEnhancedApiClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Load conversations (matches with messaging data)
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getMatches();
      if (response.success && response.data) {
        let conversationsList: Conversation[];
        if (Array.isArray(response.data)) {
          conversationsList = response.data;
        } else if (
          typeof response.data === "object" &&
          response.data !== null &&
          "matches" in response.data &&
          Array.isArray((response.data as { matches?: unknown }).matches)
        ) {
          conversationsList = (response.data as { matches: Conversation[] })
            .matches;
        } else {
          conversationsList = [];
        }
        const normalizedConversations = conversationsList.map(
          normalizeConversation
        );
        setConversations(normalizedConversations);

        // Extract unread counts
        const counts: Record<string, number> = {};
        normalizedConversations.forEach((conversation: Conversation) => {
          if (conversation.unreadCount) {
            counts[conversation._id] = conversation.unreadCount;
          }
        });
        setUnreadCounts(counts);
      }
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Load messages for specific conversation
  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!conversationId) return [];

      try {
        const response = await apiClient.getMessages(conversationId);
        if (response.success && response.data) {
          let messagesList: Message[];
          if (Array.isArray(response.data)) {
            messagesList = response.data;
          } else if (
            typeof response.data === "object" &&
            response.data !== null &&
            "messages" in response.data &&
            Array.isArray((response.data as { messages?: unknown }).messages)
          ) {
            messagesList = (response.data as { messages: Message[] }).messages;
          } else {
            messagesList = [];
          }
          const normalizedMessages = messagesList.map(normalizeMessage);

          if (conversationId === matchId) {
            setMessages(normalizedMessages);
          }
          return normalizedMessages;
        }
      } catch (error) {
        console.error("Error loading messages:", error);
      }
      return [];
    },
    [apiClient, matchId]
  );

  // Send message
  const sendMessage = useCallback(
    async (conversationId: string, text: string) => {
      if (!conversationId || !text.trim() || sending) return false;

      try {
        setSending(true);
        const response = await apiClient.sendMessage(
          conversationId,
          text.trim()
        );

        if (response.success) {
          // Reload messages to get the updated list
          await loadMessages(conversationId);

          // Trigger push notification for the recipient (handled by backend)
          // This is just a local notification for testing
          await PushNotificationService.getInstance().scheduleLocalNotification(
            {
              title: "Message Sent",
              body: "Your message has been sent successfully",
            },
            1
          );

          return true;
        }
      } catch (error) {
        console.error("Error sending message:", error);
      } finally {
        setSending(false);
      }
      return false;
    },
    [apiClient, sending, loadMessages]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (conversationId: string) => {
      try {
        await apiClient.markConversationAsRead(conversationId);

        // Update local unread counts
        setUnreadCounts((prev) => ({
          ...prev,
          [conversationId]: 0,
        }));
      } catch (error) {
        console.error("Error marking messages as read:", error);
      }
    },
    [apiClient]
  );

  // Get total unread count across all conversations
  const getTotalUnreadCount = useCallback(() => {
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  }, [unreadCounts]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (matchId) {
        loadMessages(matchId);
      } else {
        loadConversations();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, matchId, loadMessages, loadConversations]);

  // Initial load
  useEffect(() => {
    if (matchId) {
      loadMessages(matchId);
    } else {
      loadConversations();
    }
  }, [matchId, loadMessages, loadConversations]);

  return {
    // Data
    messages,
    conversations,
    matches: conversations, // For backward compatibility
    unreadCounts,

    // State
    loading,
    sending,

    // Actions
    loadConversations,
    loadMatches: loadConversations, // For backward compatibility
    loadMessages,
    sendMessage,
    markAsRead,

    // Computed
    getTotalUnreadCount,
  };
}

// Hook specifically for chat screens
export function useChatMessages(matchId: string) {
  return useMessaging({
    matchId,
    autoRefresh: true,
    refreshInterval: 10000, // Refresh every 10 seconds for active chats
  });
}

// Hook specifically for matches list
export function useMatchesList() {
  return useMessaging({
    autoRefresh: true,
    refreshInterval: 30000, // Refresh every 30 seconds for matches list
  });
}
