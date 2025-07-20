import { MessagingFeatures } from "../types/messaging";

// Subscription tier types - should match your existing subscription types
export type SubscriptionTier = "free" | "premium" | "premiumPlus";

/**
 * Gets messaging features based on subscription tier
 */
export const getMessagingFeatures = (
  tier: SubscriptionTier
): MessagingFeatures => {
  switch (tier) {
    case "free":
      return {
        canInitiateChat: false,
        canSendUnlimitedMessages: false,
        canSendVoiceMessages: false,
        canSendImageMessages: false,
        dailyMessageLimit: 5,
        voiceMessageDurationLimit: 0,
      };

    case "premium":
      return {
        canInitiateChat: true,
        canSendUnlimitedMessages: true,
        canSendVoiceMessages: true,
        canSendImageMessages: false,
        dailyMessageLimit: -1, // unlimited
        voiceMessageDurationLimit: 60, // 1 minute
      };

    case "premiumPlus":
      return {
        canInitiateChat: true,
        canSendUnlimitedMessages: true,
        canSendVoiceMessages: true,
        canSendImageMessages: true,
        dailyMessageLimit: -1, // unlimited
        voiceMessageDurationLimit: 300, // 5 minutes
      };

    default:
      // Default to free tier for unknown tiers
      return getMessagingFeatures("free");
  }
};

/**
 * Checks if a user can perform a specific messaging action
 */
export class MessagingPermissions {
  private features: MessagingFeatures;
  private dailyMessageCount: number = 0;
  private lastResetDate: string = new Date().toDateString();

  constructor(subscriptionTier: SubscriptionTier) {
    this.features = getMessagingFeatures(subscriptionTier);
    this.loadDailyMessageCount();
  }

  /**
   * Updates subscription tier and refreshes features
   */
  updateSubscriptionTier(tier: SubscriptionTier): void {
    this.features = getMessagingFeatures(tier);
  }

  /**
   * Checks if user can initiate a new chat
   */
  canInitiateChat(): { allowed: boolean; reason?: string } {
    if (!this.features.canInitiateChat) {
      return {
        allowed: false,
        reason: "Upgrade to Premium to start new conversations",
      };
    }

    return { allowed: true };
  }

  /**
   * Checks if user can send a text message
   */
  canSendTextMessage(): { allowed: boolean; reason?: string } {
    // Check daily limit for non-unlimited users
    if (!this.features.canSendUnlimitedMessages) {
      this.resetDailyCountIfNeeded();

      if (this.dailyMessageCount >= this.features.dailyMessageLimit) {
        return {
          allowed: false,
          reason: `Daily message limit reached (${this.features.dailyMessageLimit}). Upgrade to Premium for unlimited messaging.`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Checks if user can send a voice message
   */
  canSendVoiceMessage(duration?: number): {
    allowed: boolean;
    reason?: string;
  } {
    if (!this.features.canSendVoiceMessages) {
      return {
        allowed: false,
        reason: "Upgrade to Premium to send voice messages",
      };
    }

    if (duration && duration > this.features.voiceMessageDurationLimit) {
      const maxMinutes = Math.floor(
        this.features.voiceMessageDurationLimit / 60
      );
      const maxSeconds = this.features.voiceMessageDurationLimit % 60;
      return {
        allowed: false,
        reason: `Voice message too long. Maximum duration: ${maxMinutes}:${maxSeconds
          .toString()
          .padStart(2, "0")}`,
      };
    }

    // Also check daily message limit
    const textMessageCheck = this.canSendTextMessage();
    if (!textMessageCheck.allowed) {
      return textMessageCheck;
    }

    return { allowed: true };
  }

  /**
   * Checks if user can send an image message
   */
  canSendImageMessage(): { allowed: boolean; reason?: string } {
    if (!this.features.canSendImageMessages) {
      return {
        allowed: false,
        reason: "Upgrade to Premium Plus to send images",
      };
    }

    // Also check daily message limit
    const textMessageCheck = this.canSendTextMessage();
    if (!textMessageCheck.allowed) {
      return textMessageCheck;
    }

    return { allowed: true };
  }

  /**
   * Records that a message was sent (for daily limit tracking)
   */
  recordMessageSent(): void {
    if (!this.features.canSendUnlimitedMessages) {
      this.resetDailyCountIfNeeded();
      this.dailyMessageCount++;
      this.saveDailyMessageCount();
    }
  }

  /**
   * Gets remaining messages for the day (for free users)
   */
  getRemainingDailyMessages(): number {
    if (this.features.canSendUnlimitedMessages) {
      return -1; // unlimited
    }

    this.resetDailyCountIfNeeded();
    return Math.max(
      0,
      this.features.dailyMessageLimit - this.dailyMessageCount
    );
  }

  /**
   * Gets current messaging features
   */
  getFeatures(): MessagingFeatures {
    return { ...this.features };
  }

  /**
   * Resets daily message count if it's a new day
   */
  private resetDailyCountIfNeeded(): void {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyMessageCount = 0;
      this.lastResetDate = today;
      this.saveDailyMessageCount();
    }
  }

  /**
   * Loads daily message count from storage
   */
  private loadDailyMessageCount(): void {
    try {
      // In React Native, you might use AsyncStorage or SecureStore
      // For now, using a simple in-memory approach
      // TODO: Implement persistent storage
      const stored = global.__messagingDailyCount;
      if (stored && stored.date === new Date().toDateString()) {
        this.dailyMessageCount = stored.count;
        this.lastResetDate = stored.date;
      }
    } catch (error) {
      console.warn("Failed to load daily message count:", error);
    }
  }

  /**
   * Saves daily message count to storage
   */
  private saveDailyMessageCount(): void {
    try {
      // In React Native, you might use AsyncStorage or SecureStore
      // For now, using a simple in-memory approach
      // TODO: Implement persistent storage
      global.__messagingDailyCount = {
        count: this.dailyMessageCount,
        date: this.lastResetDate,
      };
    } catch (error) {
      console.warn("Failed to save daily message count:", error);
    }
  }
}

/**
 * Utility functions for messaging feature checks
 */
export class MessagingFeatureUtils {
  /**
   * Gets user-friendly description of subscription benefits
   */
  static getSubscriptionBenefits(tier: SubscriptionTier): string[] {
    const features = getMessagingFeatures(tier);
    const benefits: string[] = [];

    if (features.canInitiateChat) {
      benefits.push("Start new conversations");
    }

    if (features.canSendUnlimitedMessages) {
      benefits.push("Unlimited messaging");
    } else {
      benefits.push(`${features.dailyMessageLimit} messages per day`);
    }

    if (features.canSendVoiceMessages) {
      const maxMinutes = Math.floor(features.voiceMessageDurationLimit / 60);
      benefits.push(
        `Voice messages (up to ${maxMinutes} minute${
          maxMinutes !== 1 ? "s" : ""
        })`
      );
    }

    if (features.canSendImageMessages) {
      benefits.push("Send images");
    }

    return benefits;
  }

  /**
   * Gets upgrade prompt message for a specific feature
   */
  static getUpgradePrompt(
    feature: "chat" | "voice" | "image" | "unlimited"
  ): string {
    switch (feature) {
      case "chat":
        return "Upgrade to Premium to start new conversations and connect with more people!";
      case "voice":
        return "Upgrade to Premium to send voice messages and make your conversations more personal!";
      case "image":
        return "Upgrade to Premium Plus to share images and express yourself better!";
      case "unlimited":
        return "Upgrade to Premium for unlimited messaging and never worry about daily limits!";
      default:
        return "Upgrade to Premium to unlock all messaging features!";
    }
  }

  /**
   * Determines which subscription tier is needed for a feature
   */
  static getRequiredTierForFeature(
    feature: "chat" | "voice" | "image" | "unlimited"
  ): SubscriptionTier {
    switch (feature) {
      case "chat":
      case "voice":
      case "unlimited":
        return "premium";
      case "image":
        return "premiumPlus";
      default:
        return "premium";
    }
  }
}
