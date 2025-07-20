import {
  MessagingPermissions,
  getMessagingFeatures,
  SubscriptionTier,
} from "../utils/messagingFeatures";
import { MessageValidator } from "../utils/messageValidation";
import { UnifiedResponseSystem } from "../utils/unifiedResponseSystem";
import { ApiResponse } from "../types/profile";
import { Message } from "../types/message";
import { MessagingErrorType } from "../types/messaging";

/**
 * Comprehensive messaging service that integrates subscription checks into the message flow
 */
export class MessagingService {
  private permissions: MessagingPermissions | null = null;
  private subscriptionTier: SubscriptionTier = "free";

  constructor(subscriptionTier: SubscriptionTier = "free") {
    this.updateSubscriptionTier(subscriptionTier);
  }

  /**
   * Updates the subscription tier and refreshes permissions
   */
  updateSubscriptionTier(tier: SubscriptionTier): void {
    this.subscriptionTier = tier;
    this.permissions = new MessagingPermissions(tier);
  }

  /**
   * Validates if a user can send a message with subscription checks
   */
  async validateMessageSend(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    requiresUpgrade?: SubscriptionTier;
  }> {
    if (!this.permissions) {
      return { allowed: false, reason: "Permissions not initialized" };
    }

    // Basic message validation first
    const validation = MessageValidator.validateMessageSendData(data);
    if (!validation.valid) {
      return { allowed: false, reason: validation.error };
    }

    // Check subscription-based permissions based on message type
    switch (data.type) {
      case "voice":
        const voiceCheck = this.permissions.canSendVoiceMessage(data.duration);
        if (!voiceCheck.allowed) {
          return {
            allowed: false,
            reason: voiceCheck.reason,
            requiresUpgrade:
              this.subscriptionTier === "free" ? "premium" : undefined,
          };
        }
        break;

      case "image":
        const imageCheck = this.permissions.canSendImageMessage();
        if (!imageCheck.allowed) {
          return {
            allowed: false,
            reason: imageCheck.reason,
            requiresUpgrade: "premiumPlus",
          };
        }
        break;

      default:
        // Text message or default
        const textCheck = this.permissions.canSendTextMessage();
        if (!textCheck.allowed) {
          return {
            allowed: false,
            reason: textCheck.reason,
            requiresUpgrade:
              this.subscriptionTier === "free" ? "premium" : undefined,
          };
        }
        break;
    }

    return { allowed: true };
  }

  /**
   * Validates if a user can initiate a new chat
   */
  validateChatInitiation(): {
    allowed: boolean;
    reason?: string;
    requiresUpgrade?: SubscriptionTier;
  } {
    if (!this.permissions) {
      return { allowed: false, reason: "Permissions not initialized" };
    }

    const check = this.permissions.canInitiateChat();
    if (!check.allowed) {
      return {
        allowed: false,
        reason: check.reason,
        requiresUpgrade: "premium",
      };
    }

    return { allowed: true };
  }

  /**
   * Sends a message with integrated subscription validation
   */
  async sendMessage(
    apiCall: () => Promise<ApiResponse<Message>>,
    messageData: {
      conversationId: string;
      fromUserId: string;
      toUserId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      audioStorageId?: string;
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    }
  ): Promise<ApiResponse<Message>> {
    // Validate subscription permissions first
    const validation = await this.validateMessageSend(messageData);
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
            currentTier: this.subscriptionTier,
            messageType: messageData.type || "text",
          },
        },
      };
    }

    // Execute the API call with unified response handling
    const result = await UnifiedResponseSystem.executeMessageOperation(
      apiCall,
      "sendMessage",
      { retryStrategy: "send" }
    );

    // Record message sent for daily limit tracking (only if successful)
    if (result.success && this.permissions) {
      this.permissions.recordMessageSent();
    }

    return result;
  }

  /**
   * Initiates a new chat with subscription validation
   */
  async initiateChat(
    apiCall: () => Promise<ApiResponse<any>>,
    participantIds: string[]
  ): Promise<ApiResponse<any>> {
    // Validate chat initiation permissions
    const validation = this.validateChatInitiation();
    if (!validation.allowed) {
      return {
        success: false,
        error: {
          code: "SUBSCRIPTION_REQUIRED",
          message: validation.reason || "Chat initiation not allowed",
          details: {
            requiresUpgrade: validation.requiresUpgrade,
            currentTier: this.subscriptionTier,
            feature: "chat_initiation",
          },
        },
      };
    }

    // Execute the API call with unified response handling
    return UnifiedResponseSystem.executeMessagingOperation(
      apiCall,
      "initiateChat",
      { retryStrategy: "default" }
    );
  }

  /**
   * Gets current messaging features and limits
   */
  getMessagingStatus(): {
    tier: SubscriptionTier;
    features: ReturnType<typeof getMessagingFeatures>;
    remainingMessages: number;
    canInitiateChat: boolean;
    canSendVoice: boolean;
    canSendImages: boolean;
  } {
    const features = getMessagingFeatures(this.subscriptionTier);
    const remainingMessages =
      this.permissions?.getRemainingDailyMessages() || 0;

    return {
      tier: this.subscriptionTier,
      features,
      remainingMessages,
      canInitiateChat: features.canInitiateChat,
      canSendVoice: features.canSendVoiceMessages,
      canSendImages: features.canSendImageMessages,
    };
  }

  /**
   * Checks if a specific feature is available
   */
  checkFeatureAvailability(
    feature: "initiate" | "text" | "voice" | "image",
    options?: {
      voiceDuration?: number;
    }
  ): {
    available: boolean;
    reason?: string;
    requiresUpgrade?: SubscriptionTier;
  } {
    if (!this.permissions) {
      return { available: false, reason: "Permissions not initialized" };
    }

    let check: { allowed: boolean; reason?: string };

    switch (feature) {
      case "initiate":
        check = this.permissions.canInitiateChat();
        break;
      case "text":
        check = this.permissions.canSendTextMessage();
        break;
      case "voice":
        check = this.permissions.canSendVoiceMessage(options?.voiceDuration);
        break;
      case "image":
        check = this.permissions.canSendImageMessage();
        break;
      default:
        return { available: false, reason: "Unknown feature" };
    }

    if (!check.allowed) {
      let requiresUpgrade: SubscriptionTier | undefined;

      if (check.reason?.includes("Premium Plus")) {
        requiresUpgrade = "premiumPlus";
      } else if (check.reason?.includes("Premium")) {
        requiresUpgrade = "premium";
      }

      return {
        available: false,
        reason: check.reason,
        requiresUpgrade,
      };
    }

    return { available: true };
  }

  /**
   * Gets upgrade information for a specific feature
   */
  getUpgradeInfo(feature: "initiate" | "text" | "voice" | "image"): {
    currentTier: SubscriptionTier;
    requiredTier: SubscriptionTier;
    benefits: string[];
    upgradeMessage: string;
  } {
    const { MessagingFeatureUtils } = require("../utils/messagingFeatures");

    let requiredTier: SubscriptionTier;
    switch (feature) {
      case "image":
        requiredTier = "premiumPlus";
        break;
      default:
        requiredTier = "premium";
        break;
    }

    return {
      currentTier: this.subscriptionTier,
      requiredTier,
      benefits: MessagingFeatureUtils.getSubscriptionBenefits(requiredTier),
      upgradeMessage: MessagingFeatureUtils.getUpgradePrompt(feature),
    };
  }

  /**
   * Validates voice message duration against subscription limits
   */
  validateVoiceDuration(duration: number): {
    valid: boolean;
    reason?: string;
    maxDuration: number;
    remainingDuration: number;
  } {
    const features = getMessagingFeatures(this.subscriptionTier);
    const maxDuration = features.voiceMessageDurationLimit;

    if (!features.canSendVoiceMessages) {
      return {
        valid: false,
        reason: "Voice messages not available for your subscription tier",
        maxDuration: 0,
        remainingDuration: 0,
      };
    }

    if (duration > maxDuration) {
      return {
        valid: false,
        reason: `Voice message too long. Maximum duration: ${Math.floor(
          maxDuration / 60
        )}:${(maxDuration % 60).toString().padStart(2, "0")}`,
        maxDuration,
        remainingDuration: Math.max(0, maxDuration - duration),
      };
    }

    return {
      valid: true,
      maxDuration,
      remainingDuration: Math.max(0, maxDuration - duration),
    };
  }

  /**
   * Gets daily message usage statistics
   */
  getDailyMessageStats(): {
    used: number;
    remaining: number;
    limit: number;
    unlimited: boolean;
    resetTime: Date;
  } {
    const features = getMessagingFeatures(this.subscriptionTier);
    const remaining = this.permissions?.getRemainingDailyMessages() || 0;
    const limit = features.dailyMessageLimit;
    const unlimited = features.canSendUnlimitedMessages;

    // Calculate reset time (midnight of next day)
    const resetTime = new Date();
    resetTime.setDate(resetTime.getDate() + 1);
    resetTime.setHours(0, 0, 0, 0);

    return {
      used: unlimited ? 0 : Math.max(0, limit - remaining),
      remaining: unlimited ? -1 : remaining,
      limit: unlimited ? -1 : limit,
      unlimited,
      resetTime,
    };
  }
}

/**
 * Hook for using the messaging service with subscription integration
 */
export function useMessagingService(subscriptionTier?: SubscriptionTier) {
  const [service] = React.useState(
    () => new MessagingService(subscriptionTier)
  );

  React.useEffect(() => {
    if (subscriptionTier) {
      service.updateSubscriptionTier(subscriptionTier);
    }
  }, [subscriptionTier, service]);

  return service;
}

// Import React for the hook
import React from "react";
