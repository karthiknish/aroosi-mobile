import { ApiResponse } from "../types/profile";
import { Message } from "../types/message";
import { MessagingService } from "../services/messagingService";
import { SubscriptionTier } from "../utils/messagingFeatures";

/**
 * Utility functions for integrating subscription checks into existing message flows
 */
export class MessagingSubscriptionIntegration {
  /**
   * Wraps an existing message sending function with subscription validation
   */
  static wrapMessageSender(
    originalSender: (data: any) => Promise<ApiResponse<Message>>,
    subscriptionTier: SubscriptionTier
  ) {
    const messagingService = new MessagingService(subscriptionTier);

    return async (messageData: {
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
        () => originalSender(messageData),
        messageData
      );
    };
  }

  /**
   * Wraps an existing chat initiation function with subscription validation
   */
  static wrapChatInitiator(
    originalInitiator: (participantIds: string[]) => Promise<ApiResponse<any>>,
    subscriptionTier: SubscriptionTier
  ) {
    const messagingService = new MessagingService(subscriptionTier);

    return async (participantIds: string[]): Promise<ApiResponse<any>> => {
      return messagingService.initiateChat(
        () => originalInitiator(participantIds),
        participantIds
      );
    };
  }

  /**
   * Creates a subscription-aware message validator
   */
  static createMessageValidator(subscriptionTier: SubscriptionTier) {
    const messagingService = new MessagingService(subscriptionTier);

    return {
      validateTextMessage: () =>
        messagingService.checkFeatureAvailability("text"),
      validateVoiceMessage: (duration?: number) =>
        messagingService.checkFeatureAvailability("voice", {
          voiceDuration: duration,
        }),
      validateImageMessage: () =>
        messagingService.checkFeatureAvailability("image"),
      validateChatInitiation: () =>
        messagingService.checkFeatureAvailability("initiate"),
      validateVoiceDuration: (duration: number) =>
        messagingService.validateVoiceDuration(duration),
      getMessagingStatus: () => messagingService.getMessagingStatus(),
      getDailyStats: () => messagingService.getDailyMessageStats(),
    };
  }

  /**
   * Creates subscription-aware error handlers for messaging operations
   */
  static createSubscriptionErrorHandler(subscriptionTier: SubscriptionTier) {
    return {
      handleMessageSendError: (
        error: any,
        messageType: "text" | "voice" | "image" = "text"
      ) => {
        if (typeof error === "object" && error.error) {
          const errorCode =
            typeof error.error === "string" ? error.error : error.error.code;
          const errorMessage =
            typeof error.error === "string" ? error.error : error.error.message;

          if (
            errorCode === "SUBSCRIPTION_REQUIRED" ||
            errorMessage?.includes("subscription")
          ) {
            return {
              type: "subscription_required",
              message: this.getUpgradeMessage(messageType, subscriptionTier),
              requiresUpgrade: this.getRequiredTier(messageType),
              currentTier: subscriptionTier,
            };
          }

          if (
            errorCode === "RATE_LIMIT_EXCEEDED" ||
            errorMessage?.includes("limit")
          ) {
            return {
              type: "rate_limit",
              message:
                "Daily message limit reached. Upgrade to Premium for unlimited messaging.",
              requiresUpgrade: "premium" as SubscriptionTier,
              currentTier: subscriptionTier,
            };
          }
        }

        return {
          type: "general_error",
          message: "Failed to send message. Please try again.",
          currentTier: subscriptionTier,
        };
      },

      handleChatInitiationError: (error: any) => {
        if (typeof error === "object" && error.error) {
          const errorCode =
            typeof error.error === "string" ? error.error : error.error.code;
          const errorMessage =
            typeof error.error === "string" ? error.error : error.error.message;

          if (
            errorCode === "SUBSCRIPTION_REQUIRED" ||
            errorMessage?.includes("subscription")
          ) {
            return {
              type: "subscription_required",
              message: "Upgrade to Premium to start new conversations.",
              requiresUpgrade: "premium" as SubscriptionTier,
              currentTier: subscriptionTier,
            };
          }
        }

        return {
          type: "general_error",
          message: "Failed to start chat. Please try again.",
          currentTier: subscriptionTier,
        };
      },
    };
  }

  /**
   * Gets the appropriate upgrade message for a message type
   */
  private static getUpgradeMessage(
    messageType: "text" | "voice" | "image",
    currentTier: SubscriptionTier
  ): string {
    switch (messageType) {
      case "voice":
        return "Upgrade to Premium to send voice messages and make your conversations more personal!";
      case "image":
        return "Upgrade to Premium Plus to share images and express yourself better!";
      default:
        return currentTier === "free"
          ? "Upgrade to Premium for unlimited messaging!"
          : "This feature requires a higher subscription tier.";
    }
  }

  /**
   * Gets the required subscription tier for a message type
   */
  private static getRequiredTier(
    messageType: "text" | "voice" | "image"
  ): SubscriptionTier {
    switch (messageType) {
      case "image":
        return "premiumPlus";
      case "voice":
      default:
        return "premium";
    }
  }

  /**
   * Creates a subscription-aware message flow interceptor
   */
  static createMessageFlowInterceptor(subscriptionTier: SubscriptionTier) {
    const messagingService = new MessagingService(subscriptionTier);

    return {
      // Pre-send validation
      beforeSend: async (messageData: any) => {
        const validation = await messagingService.validateMessageSend(
          messageData
        );
        if (!validation.allowed) {
          throw new Error(
            JSON.stringify({
              type: "subscription_validation_failed",
              reason: validation.reason,
              requiresUpgrade: validation.requiresUpgrade,
              currentTier: subscriptionTier,
            })
          );
        }
        return messageData;
      },

      // Post-send processing
      afterSend: (result: ApiResponse<Message>, messageData: any) => {
        // Record message sent for daily limit tracking if successful
        if (result.success) {
          // This is handled internally by the messaging service
        }
        return result;
      },

      // Error processing
      onError: (error: any, messageData: any) => {
        const errorHandler =
          this.createSubscriptionErrorHandler(subscriptionTier);
        return errorHandler.handleMessageSendError(error, messageData.type);
      },
    };
  }

  /**
   * Creates subscription-aware feature flags for UI components
   */
  static createFeatureFlags(subscriptionTier: SubscriptionTier) {
    const messagingService = new MessagingService(subscriptionTier);
    const status = messagingService.getMessagingStatus();

    return {
      // Basic flags
      canInitiateChat: status.canInitiateChat,
      canSendVoice: status.canSendVoice,
      canSendImages: status.canSendImages,
      hasUnlimitedMessages: status.features.canSendUnlimitedMessages,

      // Detailed checks
      checkTextMessage: () => messagingService.checkFeatureAvailability("text"),
      checkVoiceMessage: (duration?: number) =>
        messagingService.checkFeatureAvailability("voice", {
          voiceDuration: duration,
        }),
      checkImageMessage: () =>
        messagingService.checkFeatureAvailability("image"),
      checkChatInitiation: () =>
        messagingService.checkFeatureAvailability("initiate"),

      // Usage stats
      dailyStats: messagingService.getDailyMessageStats(),
      voiceValidation: (duration: number) =>
        messagingService.validateVoiceDuration(duration),

      // Upgrade info
      getUpgradeInfo: (feature: "initiate" | "text" | "voice" | "image") =>
        messagingService.getUpgradeInfo(feature),

      // Current status
      subscriptionTier,
      messagingStatus: status,
    };
  }

  /**
   * Integrates subscription checks into existing API client methods
   */
  static enhanceApiClient(apiClient: any, subscriptionTier: SubscriptionTier) {
    const originalSendMessage = apiClient.sendMessage.bind(apiClient);
    const originalCreateConversation =
      apiClient.createConversation?.bind(apiClient);

    // Wrap sendMessage with subscription validation
    apiClient.sendMessage = this.wrapMessageSender(
      originalSendMessage,
      subscriptionTier
    );

    // Wrap createConversation with subscription validation if it exists
    if (originalCreateConversation) {
      apiClient.createConversation = this.wrapChatInitiator(
        originalCreateConversation,
        subscriptionTier
      );
    }

    // Add subscription-aware helper methods
    apiClient.checkMessagingPermissions = (
      messageType: "text" | "voice" | "image",
      options?: any
    ) => {
      const validator = this.createMessageValidator(subscriptionTier);
      switch (messageType) {
        case "text":
          return validator.validateTextMessage();
        case "voice":
          return validator.validateVoiceMessage(options?.duration);
        case "image":
          return validator.validateImageMessage();
        default:
          return { available: false, reason: "Unknown message type" };
      }
    };

    apiClient.getMessagingStatus = () => {
      const validator = this.createMessageValidator(subscriptionTier);
      return validator.getMessagingStatus();
    };

    return apiClient;
  }
}

/**
 * Decorator function for adding subscription validation to message sending functions
 */
export function withSubscriptionValidation(subscriptionTier: SubscriptionTier) {
  return function <T extends (...args: any[]) => Promise<ApiResponse<Message>>>(
    target: any,
    propertyName: string,
    descriptor: TypedPropertyDescriptor<T>
  ) {
    const method = descriptor.value!;

    descriptor.value = async function (this: any, ...args: any[]) {
      const messageData = args[0]; // Assume first argument is message data

      if (messageData && typeof messageData === "object") {
        const messagingService = new MessagingService(subscriptionTier);
        const validation = await messagingService.validateMessageSend(
          messageData
        );

        if (!validation.allowed) {
          return {
            success: false,
            error: {
              code: validation.requiresUpgrade
                ? "SUBSCRIPTION_REQUIRED"
                : "PERMISSION_DENIED",
              message: validation.reason || "Message sending not allowed",
              details: {
                requiresUpgrade: validation.requiresUpgrade,
                currentTier: subscriptionTier,
                messageType: messageData.type || "text",
              },
            },
          };
        }
      }

      return method.apply(this, args);
    } as T;

    return descriptor;
  };
}
