import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtimeMessaging } from "./useRealtimeMessaging";

interface UseTypingIndicatorOptions {
  conversationId: string;
  userId: string;
  typingTimeout?: number;
  sendTypingEvents?: boolean;
}

interface TypingState {
  isTyping: boolean;
  typingUsers: string[];
  lastTypingTime: number;
}

/**
 * Hook for managing typing indicators in real-time
 */
export function useTypingIndicator({
  conversationId,
  userId,
  typingTimeout = 3000, // 3 seconds
  sendTypingEvents = true,
}: UseTypingIndicatorOptions) {
  const [typingState, setTypingState] = useState<TypingState>({
    isTyping: false,
    typingUsers: [],
    lastTypingTime: 0,
  });

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingSentRef = useRef<number>(0);
  const { service: realtimeService } = useRealtimeMessaging();

  // Clear typing timeout
  const clearTypingTimeout = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  }, []);

  // Start typing indicator
  const startTyping = useCallback(() => {
    const now = Date.now();

    // Update local state
    setTypingState((prev) => ({
      ...prev,
      isTyping: true,
      lastTypingTime: now,
    }));

    // Send typing event (throttled to avoid spam)
    if (
      sendTypingEvents &&
      realtimeService &&
      now - lastTypingSentRef.current > 1000
    ) {
      realtimeService.sendTypingIndicator(conversationId, true);
      lastTypingSentRef.current = now;
    }

    // Clear existing timeout
    clearTypingTimeout();

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
    }, typingTimeout);
  }, [
    conversationId,
    sendTypingEvents,
    realtimeService,
    typingTimeout,
    clearTypingTimeout,
  ]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    setTypingState((prev) => ({
      ...prev,
      isTyping: false,
    }));

    // Send stop typing event
    if (sendTypingEvents && realtimeService) {
      realtimeService.sendTypingIndicator(conversationId, false);
    }

    clearTypingTimeout();
  }, [conversationId, sendTypingEvents, realtimeService, clearTypingTimeout]);

  // Handle text input changes
  const handleTextChange = useCallback(
    (text: string) => {
      if (text.length > 0) {
        startTyping();
      } else {
        stopTyping();
      }
    },
    [startTyping, stopTyping]
  );

  // Handle message sent
  const handleMessageSent = useCallback(() => {
    stopTyping();
  }, [stopTyping]);

  // Update typing users from real-time events
  const updateTypingUsers = useCallback(
    (typingUserId: string, isTyping: boolean) => {
      if (typingUserId === userId) {
        return; // Don't track own typing
      }

      setTypingState((prev) => {
        const newTypingUsers = isTyping
          ? [
              ...prev.typingUsers.filter((id) => id !== typingUserId),
              typingUserId,
            ]
          : prev.typingUsers.filter((id) => id !== typingUserId);

        return {
          ...prev,
          typingUsers: newTypingUsers,
        };
      });
    },
    [userId]
  );

  // Setup real-time event listeners
  useEffect(() => {
    if (!realtimeService) return;

    const handleTypingStart = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (data.conversationId === conversationId) {
        updateTypingUsers(data.userId, true);
      }
    };

    const handleTypingStop = (data: {
      conversationId: string;
      userId: string;
    }) => {
      if (data.conversationId === conversationId) {
        updateTypingUsers(data.userId, false);
      }
    };

    realtimeService.on("typing:start", handleTypingStart);
    realtimeService.on("typing:stop", handleTypingStop);

    return () => {
      realtimeService.off("typing:start", handleTypingStart);
      realtimeService.off("typing:stop", handleTypingStop);
    };
  }, [realtimeService, conversationId, updateTypingUsers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTypingTimeout();
      if (typingState.isTyping) {
        stopTyping();
      }
    };
  }, [clearTypingTimeout, stopTyping, typingState.isTyping]);

  // Get typing text for display
  const getTypingText = useCallback(() => {
    const { typingUsers } = typingState;

    if (typingUsers.length === 0) {
      return "";
    }

    if (typingUsers.length === 1) {
      return "is typing...";
    }

    if (typingUsers.length === 2) {
      return "are typing...";
    }

    return `${typingUsers.length} people are typing...`;
  }, [typingState.typingUsers]);

  return {
    // State
    isTyping: typingState.isTyping,
    typingUsers: typingState.typingUsers,
    isAnyoneElseTyping: typingState.typingUsers.length > 0,

    // Actions
    startTyping,
    stopTyping,
    handleTextChange,
    handleMessageSent,
    updateTypingUsers,

    // Utilities
    getTypingText,
    isConnected: !!realtimeService,
  };
}

/**
 * Simplified hook for basic typing indicator
 */
export function useSimpleTypingIndicator(
  conversationId: string,
  userId: string
) {
  const {
    isTyping,
    isAnyoneElseTyping,
    handleTextChange,
    handleMessageSent,
    getTypingText,
  } = useTypingIndicator({
    conversationId,
    userId,
  });

  return {
    isTyping,
    isAnyoneElseTyping,
    handleTextChange,
    handleMessageSent,
    getTypingText,
  };
}
