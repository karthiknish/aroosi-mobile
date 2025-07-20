import { useCallback, useEffect, useState } from "react";
import { useSubscription } from "./useSubscription";
import { useApiClient } from "../utils/api";
import { MessagingService } from "../services/messagingService";
import { SubscriptionTier } from "../utils/messagingFeatures";
import { ApiResponse } from "../types/profile";
import { Message, Conversation } from "../types/message";

/**
 * Comprehensive hook that integrates messaging functionality with subscription validation
 */
export function useMessagingWithSubscription() {
  const { subscription, hasActiveSubscription, checkFeatureAccess } =
    useSubscription();
  const apiClient = useApiClient();

  // Determine subscription tier
  const subscriptionTier: SubscriptionTier = hasActiveSubscription
    ? subscription?.plan === "premiumPlus"
      ? "premiumPlus"
      : "premium"
    : "free";

  // Initialize messaging service
  const [messagingService] = useState(
    () => new MessagingService(subscriptionTier)
  );

  // Update messaging service when subscription changes
  useEffect(() => {
    messagingService.updateSubscriptionTier(subscriptionTier);
  }, [subscriptionTier, messagingService]);

  // Send message with subscription validation
  const sendMessage = useCallback(
    async (messageData: {
      conversationId: string;
      fromUserId: string;
      toUserId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    }): Promise<ApiResponse<Message>> => {
      return messagingService.sendMessage(
        () => apiClient.sendMessage(messageData),
        messageData
      );
    },
    [messagingService, apiClient]
  );

  // Get messages with subscription-aware error handling
  const getMessages = useCallback(
    async (
      conversationId: string,
      options?: { limit?: number; before?: number }
    ): Promise<ApiResponse<Message[]>> => {
      return apiClient.getMessages(conversationId, options);
    },
    [apiClient]
  );

  // Initiate chat with subscription validation
  const initiateChat = useCallback(
    async (participantIds: string[]): Promise<ApiResponse<Conversation>> => {
      return messagingService.initiateChat(
        () => apiClient.createConversation(participantIds),
        participantIds
      );
    },
    [messagingService, apiClient]
  );

  // Mark conversation as read
  const markConversationAsRead = useCallback(
    async (conversationId: string): Promise<ApiResponse<void>> => {
      return apiClient.markConversationAsRead(conversationId);
    },
    [apiClient]
  );

  // Check if user can perform specific messaging actions
  const canInitiateChat = useCallback(() => {
    return messagingService.checkFeatureAvailability("initiate");
  }, [messagingService]);

  const canSendTextMessage = useCallback(() => {
    return messagingService.checkFeatureAvailability("text");
  }, [messagingService]);

  const canSendVoiceMessage = useCallback(
    (duration?: number) => {
      return messagingService.checkFeatureAvailability("voice", {
        voiceDuration: duration,
      });
    },
    [messagingService]
  );

  const canSendImageMessage = useCallback(() => {
    return messagingService.checkFeatureAvailability("image");
  }, [messagingService]);

  // Get messaging status and limits
  const getMessagingStatus = useCallback(() => {
    return messagingService.getMessagingStatus();
  }, [messagingService]);

  // Get upgrade information for features
  const getUpgradeInfo = useCallback(
    (feature: "initiate" | "text" | "voice" | "image") => {
      return messagingService.getUpgradeInfo(feature);
    },
    [messagingService]
  );

  // Validate voice message duration
  const validateVoiceDuration = useCallback(
    (duration: number) => {
      return messagingService.validateVoiceDuration(duration);
    },
    [messagingService]
  );

  // Get daily message statistics
  const getDailyMessageStats = useCallback(() => {
    return messagingService.getDailyMessageStats();
  }, [messagingService]);

  // Voice message specific methods
  const generateVoiceUploadUrl = useCallback(async () => {
    return apiClient.generateVoiceUploadUrl();
  }, [apiClient]);

  const getVoiceMessageUrl = useCallback(
    async (storageId: string) => {
      return apiClient.getVoiceMessageUrl(storageId);
    },
    [apiClient]
  );

  // Typing indicators and delivery receipts
  const sendTypingIndicator = useCallback(
    async (conversationId: string, action: "start" | "stop") => {
      return apiClient.sendTypingIndicator(conversationId, action);
    },
    [apiClient]
  );

  const sendDeliveryReceipt = useCallback(
    async (messageId: string, status: string) => {
      return apiClient.sendDeliveryReceipt(messageId, status);
    },
    [apiClient]
  );

  return {
    // Subscription info
    subscriptionTier,
    hasActiveSubscription,
    subscription,

    // Core messaging functions
    sendMessage,
    getMessages,
    initiateChat,
    markConversationAsRead,

    // Permission checks
    canInitiateChat,
    canSendTextMessage,
    canSendVoiceMessage,
    canSendImageMessage,

    // Status and limits
    getMessagingStatus,
    getUpgradeInfo,
    validateVoiceDuration,
    getDailyMessageStats,

    // Voice message functions
    generateVoiceUploadUrl,
    getVoiceMessageUrl,

    // Real-time features
    sendTypingIndicator,
    sendDeliveryReceipt,

    // Utility functions
    checkFeatureAccess: (feature: string) => checkFeatureAccess(feature as any),
  };
}

/**
 * Hook for managing message sending with automatic subscription validation
 */
export function useMessageSender() {
  const {
    sendMessage,
    canSendTextMessage,
    canSendVoiceMessage,
    canSendImageMessage,
    subscriptionTier,
    getUpgradeInfo,
  } = useMessagingWithSubscription();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendTextMessage = useCallback(
    async (
      conversationId: string,
      fromUserId: string,
      toUserId: string,
      text: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Check permissions first
        const permission = canSendTextMessage();
        if (!permission.available) {
          setError(permission.reason || "Cannot send text message");
          return {
            success: false,
            error: permission.reason,
            requiresUpgrade: permission.requiresUpgrade,
          };
        }

        // Send the message
        const result = await sendMessage({
          conversationId,
          fromUserId,
          toUserId,
          text,
          type: "text",
        });

        if (!result.success) {
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error?.message || "Failed to send message";
          setError(errorMessage);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [sendMessage, canSendTextMessage]
  );

  const sendVoiceMessage = useCallback(
    async (
      conversationId: string,
      fromUserId: string,
      toUserId: string,
      audioStorageId: string,
      duration: number,
      fileSize?: number,
      mimeType?: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Check permissions first
        const permission = canSendVoiceMessage(duration);
        if (!permission.available) {
          setError(permission.reason || "Cannot send voice message");
          return {
            success: false,
            error: permission.reason,
            requiresUpgrade: permission.requiresUpgrade,
          };
        }

        // Send the message
        const result = await sendMessage({
          conversationId,
          fromUserId,
          toUserId,
          type: "voice",
          audioStorageId,
          duration,
          fileSize,
          mimeType,
        });

        if (!result.success) {
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error?.message || "Failed to send voice message";
          setError(errorMessage);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [sendMessage, canSendVoiceMessage]
  );

  const sendImageMessage = useCallback(
    async (
      conversationId: string,
      fromUserId: string,
      toUserId: string,
      imageStorageId: string,
      fileSize?: number,
      mimeType?: string
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        // Check permissions first
        const permission = canSendImageMessage();
        if (!permission.available) {
          setError(permission.reason || "Cannot send image message");
          return {
            success: false,
            error: permission.reason,
            requiresUpgrade: permission.requiresUpgrade,
          };
        }

        // Send the message
        const result = await sendMessage({
          conversationId,
          fromUserId,
          toUserId,
          type: "image",
          imageStorageId,
          fileSize,
          mimeType,
        });

        if (!result.success) {
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error?.message || "Failed to send image message";
          setError(errorMessage);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [sendMessage, canSendImageMessage]
  );

  return {
    // Sending functions
    sendTextMessage,
    sendVoiceMessage,
    sendImageMessage,

    // State
    isLoading,
    error,
    subscriptionTier,

    // Permission checks
    canSendText: canSendTextMessage().available,
    canSendVoice: canSendVoiceMessage().available,
    canSendImage: canSendImageMessage().available,

    // Utility
    getUpgradeInfo,
    clearError: () => setError(null),
  };
}

/**
 * Hook for managing chat initiation with subscription validation
 */
export function useChatInitiation() {
  const { initiateChat, canInitiateChat, getUpgradeInfo } =
    useMessagingWithSubscription();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startChat = useCallback(
    async (participantIds: string[]) => {
      setIsLoading(true);
      setError(null);

      try {
        // Check permissions first
        const permission = canInitiateChat();
        if (!permission.available) {
          setError(permission.reason || "Cannot initiate chat");
          return {
            success: false,
            error: permission.reason,
            requiresUpgrade: permission.requiresUpgrade,
          };
        }

        // Initiate the chat
        const result = await initiateChat(participantIds);

        if (!result.success) {
          const errorMessage =
            typeof result.error === "string"
              ? result.error
              : result.error?.message || "Failed to initiate chat";
          setError(errorMessage);
        }

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [initiateChat, canInitiateChat]
  );

  const permission = canInitiateChat();

  return {
    startChat,
    isLoading,
    error,
    canInitiate: permission.available,
    reason: permission.reason,
    requiresUpgrade: permission.requiresUpgrade,
    upgradeInfo: permission.requiresUpgrade ? getUpgradeInfo("initiate") : null,
    clearError: () => setError(null),
  };
}
