import { useState, useEffect, useCallback } from "react";
import { useRealtimeMessaging } from "./useRealtimeMessaging";
import { Message, MessageStatus } from "../types/message";

interface MessageStatusState {
  messageStatuses: Record<string, MessageStatus>;
  deliveryReceipts: Record<string, number>; // messageId -> timestamp
  readReceipts: Record<string, number>; // messageId -> timestamp
}

interface UseMessageStatusOptions {
  conversationId: string;
  userId: string;
  autoSendReceipts?: boolean;
}

/**
 * Hook for tracking message delivery and read status
 */
export function useMessageStatus({
  conversationId,
  userId,
  autoSendReceipts = true,
}: UseMessageStatusOptions) {
  const [statusState, setStatusState] = useState<MessageStatusState>({
    messageStatuses: {},
    deliveryReceipts: {},
    readReceipts: {},
  });

  const { service: realtimeService } = useRealtimeMessaging();

  // Update message status
  const updateMessageStatus = useCallback(
    (messageId: string, status: MessageStatus) => {
      setStatusState((prev) => ({
        ...prev,
        messageStatuses: {
          ...prev.messageStatuses,
          [messageId]: status,
        },
      }));
    },
    []
  );

  // Send delivery receipt
  const sendDeliveryReceipt = useCallback(
    (messageId: string) => {
      if (realtimeService) {
        realtimeService.sendDeliveryReceipt(
          messageId,
          "delivered",
          conversationId
        );

        setStatusState((prev) => ({
          ...prev,
          deliveryReceipts: {
            ...prev.deliveryReceipts,
            [messageId]: Date.now(),
          },
        }));
      }
    },
    [realtimeService]
  );

  // Send read receipt
  const sendReadReceipt = useCallback(
    (messageId: string) => {
      if (realtimeService) {
        realtimeService.sendDeliveryReceipt(messageId, "read", conversationId);

        setStatusState((prev) => ({
          ...prev,
          readReceipts: {
            ...prev.readReceipts,
            [messageId]: Date.now(),
          },
        }));
      }
    },
    [realtimeService]
  );

  // Mark messages as delivered when received
  const handleMessageReceived = useCallback(
    (message: Message) => {
      if (message.fromUserId !== userId && autoSendReceipts) {
        // Send delivery receipt for messages from others
        sendDeliveryReceipt(message._id);
      }

      // Update local status
      updateMessageStatus(message._id, "delivered");
    },
    [userId, autoSendReceipts, sendDeliveryReceipt, updateMessageStatus]
  );

  // Mark messages as read when viewed
  const markMessagesAsRead = useCallback(
    (messageIds: string[]) => {
      messageIds.forEach((messageId) => {
        if (autoSendReceipts) {
          sendReadReceipt(messageId);
        }
        updateMessageStatus(messageId, "read");
      });
    },
    [autoSendReceipts, sendReadReceipt, updateMessageStatus]
  );

  // Handle message sent
  const handleMessageSent = useCallback(
    (messageId: string) => {
      updateMessageStatus(messageId, "sent");
    },
    [updateMessageStatus]
  );

  // Handle message failed
  const handleMessageFailed = useCallback(
    (messageId: string) => {
      updateMessageStatus(messageId, "failed");
    },
    [updateMessageStatus]
  );

  // Setup real-time event listeners
  useEffect(() => {
    if (!realtimeService) return;

    const handleDeliveryReceipt = (data: {
      messageId: string;
      conversationId: string;
      status: string;
      timestamp: number;
    }) => {
      if (data.conversationId === conversationId) {
        if (data.status === "delivered") {
          setStatusState((prev) => ({
            ...prev,
            deliveryReceipts: {
              ...prev.deliveryReceipts,
              [data.messageId]: data.timestamp,
            },
          }));
          updateMessageStatus(data.messageId, "delivered");
        } else if (data.status === "read") {
          setStatusState((prev) => ({
            ...prev,
            readReceipts: {
              ...prev.readReceipts,
              [data.messageId]: data.timestamp,
            },
          }));
          updateMessageStatus(data.messageId, "read");
        }
      }
    };

    const handleMessageDelivered = (data: { messageId: string }) => {
      updateMessageStatus(data.messageId, "delivered");
    };

    const handleMessageRead = (data: {
      messageId: string;
      readByUserId: string;
    }) => {
      if (data.readByUserId !== userId) {
        updateMessageStatus(data.messageId, "read");
      }
    };

    realtimeService.on("message:delivered", handleMessageDelivered);
    realtimeService.on("message:read", handleMessageRead);
    realtimeService.on("delivery_receipt", handleDeliveryReceipt);

    return () => {
      realtimeService.off("message:delivered", handleMessageDelivered);
      realtimeService.off("message:read", handleMessageRead);
      realtimeService.off("delivery_receipt", handleDeliveryReceipt);
    };
  }, [realtimeService, conversationId, userId, updateMessageStatus]);

  // Get status for a specific message
  const getMessageStatus = useCallback(
    (messageId: string): MessageStatus => {
      return statusState.messageStatuses[messageId] || "pending";
    },
    [statusState.messageStatuses]
  );

  // Check if message is read
  const isMessageRead = useCallback(
    (messageId: string): boolean => {
      return (
        !!statusState.readReceipts[messageId] ||
        statusState.messageStatuses[messageId] === "read"
      );
    },
    [statusState.readReceipts, statusState.messageStatuses]
  );

  // Check if message is delivered
  const isMessageDelivered = useCallback(
    (messageId: string): boolean => {
      return (
        !!statusState.deliveryReceipts[messageId] ||
        statusState.messageStatuses[messageId] === "delivered" ||
        isMessageRead(messageId)
      );
    },
    [statusState.deliveryReceipts, statusState.messageStatuses, isMessageRead]
  );

  // Get read timestamp
  const getReadTimestamp = useCallback(
    (messageId: string): number | undefined => {
      return statusState.readReceipts[messageId];
    },
    [statusState.readReceipts]
  );

  // Get delivery timestamp
  const getDeliveryTimestamp = useCallback(
    (messageId: string): number | undefined => {
      return statusState.deliveryReceipts[messageId];
    },
    [statusState.deliveryReceipts]
  );

  // Get unread messages
  const getUnreadMessages = useCallback(
    (messages: Message[]): Message[] => {
      return messages.filter(
        (msg) => msg.fromUserId !== userId && !isMessageRead(msg._id)
      );
    },
    [userId, isMessageRead]
  );

  return {
    // State
    messageStatuses: statusState.messageStatuses,
    deliveryReceipts: statusState.deliveryReceipts,
    readReceipts: statusState.readReceipts,

    // Actions
    updateMessageStatus,
    sendDeliveryReceipt,
    sendReadReceipt,
    markMessagesAsRead,
    handleMessageReceived,
    handleMessageSent,
    handleMessageFailed,

    // Utilities
    getMessageStatus,
    isMessageRead,
    isMessageDelivered,
    getReadTimestamp,
    getDeliveryTimestamp,
    getUnreadMessages,

    // Connection status
    isConnected: !!realtimeService,
  };
}

/**
 * Hook for tracking status of a single message
 */
export function useSingleMessageStatus(
  messageId: string,
  conversationId: string,
  userId: string
) {
  const {
    getMessageStatus,
    isMessageRead,
    isMessageDelivered,
    getReadTimestamp,
    getDeliveryTimestamp,
  } = useMessageStatus({ conversationId, userId });

  return {
    status: getMessageStatus(messageId),
    isRead: isMessageRead(messageId),
    isDelivered: isMessageDelivered(messageId),
    readAt: getReadTimestamp(messageId),
    deliveredAt: getDeliveryTimestamp(messageId),
  };
}
