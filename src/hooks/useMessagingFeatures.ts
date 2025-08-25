import { useState, useEffect, useCallback } from "react";
import { MessagingFeatures } from "../../types/messaging";
import {
  getMessagingFeatures,
  MessagingPermissions,
  SubscriptionTier,
} from "@utils/messagingFeatures";
import { useSubscription } from "./useSubscription";

/**
 * Hook for managing messaging features and permissions based on subscription tier
 */
export function useMessagingFeatures() {
  const { subscription } = useSubscription();
  const subscriptionTier = subscription?.tier || "free";
  const [permissions, setPermissions] = useState<MessagingPermissions | null>(
    null
  );
  const [features, setFeatures] = useState<MessagingFeatures | null>(null);

  // Initialize permissions when subscription tier changes
  useEffect(() => {
    if (subscriptionTier) {
      const tier = subscriptionTier as SubscriptionTier;
      const messagingFeatures = getMessagingFeatures(tier);
      const messagingPermissions = new MessagingPermissions(tier);

      setFeatures(messagingFeatures);
      setPermissions(messagingPermissions);
    }
  }, [subscriptionTier]);

  // Check if user can initiate a chat
  const canInitiateChat = useCallback(() => {
    if (!permissions)
      return { allowed: false, reason: "Loading permissions..." };
    return permissions.canInitiateChat();
  }, [permissions]);

  // Check if user can send a text message
  const canSendTextMessage = useCallback(() => {
    if (!permissions)
      return { allowed: false, reason: "Loading permissions..." };
    return permissions.canSendTextMessage();
  }, [permissions]);

  // Check if user can send a voice message
  const canSendVoiceMessage = useCallback(
    (duration?: number) => {
      if (!permissions)
        return { allowed: false, reason: "Loading permissions..." };
      return permissions.canSendVoiceMessage(duration);
    },
    [permissions]
  );

  // Check if user can send an image message
  const canSendImageMessage = useCallback(() => {
    if (!permissions)
      return { allowed: false, reason: "Loading permissions..." };
    return permissions.canSendImageMessage();
  }, [permissions]);

  // Record that a message was sent (for daily limit tracking)
  const recordMessageSent = useCallback(() => {
    if (permissions) {
      permissions.recordMessageSent();
    }
  }, [permissions]);

  // Get remaining daily messages
  const getRemainingDailyMessages = useCallback(() => {
    if (!permissions) return 0;
    return permissions.getRemainingDailyMessages();
  }, [permissions]);

  // Update subscription tier manually (useful for testing or manual updates)
  const updateSubscriptionTier = useCallback(
    (tier: SubscriptionTier) => {
      const messagingFeatures = getMessagingFeatures(tier);
      const messagingPermissions = new MessagingPermissions(tier);

      setFeatures(messagingFeatures);
      setPermissions(messagingPermissions);

      if (permissions) {
        permissions.updateSubscriptionTier(tier);
      }
    },
    [permissions]
  );

  return {
    // Current features and permissions
    features,
    permissions,
    subscriptionTier: subscriptionTier as SubscriptionTier,

    // Permission check functions
    canInitiateChat,
    canSendTextMessage,
    canSendVoiceMessage,
    canSendImageMessage,

    // Usage tracking
    recordMessageSent,
    getRemainingDailyMessages,

    // Manual updates
    updateSubscriptionTier,

    // Loading state
    isLoading: !features || !permissions,
  };
}

/**
 * Hook for checking specific messaging permissions with automatic error handling
 */
export function useMessagingPermission(
  action: "initiate" | "text" | "voice" | "image",
  options?: {
    voiceDuration?: number;
    onPermissionDenied?: (reason: string) => void;
    onUpgradeRequired?: (requiredTier: SubscriptionTier) => void;
  }
) {
  const {
    canInitiateChat,
    canSendTextMessage,
    canSendVoiceMessage,
    canSendImageMessage,
    subscriptionTier,
    isLoading,
  } = useMessagingFeatures();

  const checkPermission = useCallback(() => {
    if (isLoading) {
      return { allowed: false, reason: "Loading permissions..." };
    }

    let result: { allowed: boolean; reason?: string };

    switch (action) {
      case "initiate":
        result = canInitiateChat();
        break;
      case "text":
        result = canSendTextMessage();
        break;
      case "voice":
        result = canSendVoiceMessage(options?.voiceDuration);
        break;
      case "image":
        result = canSendImageMessage();
        break;
      default:
        result = { allowed: false, reason: "Unknown action" };
    }

    // Handle permission denied callbacks
    if (!result.allowed && result.reason) {
      options?.onPermissionDenied?.(result.reason);

      // Determine required tier for upgrade
      if (result.reason.includes("Premium Plus")) {
        options?.onUpgradeRequired?.("premiumPlus");
      } else if (result.reason.includes("Premium")) {
        options?.onUpgradeRequired?.("premium");
      }
    }

    return result;
  }, [
    action,
    options?.voiceDuration,
    canInitiateChat,
    canSendTextMessage,
    canSendVoiceMessage,
    canSendImageMessage,
    isLoading,
    options?.onPermissionDenied,
    options?.onUpgradeRequired,
  ]);

  return {
    checkPermission,
    isAllowed: checkPermission().allowed,
    reason: checkPermission().reason,
    subscriptionTier,
    isLoading,
  };
}

/**
 * Hook for managing daily message limits
 */
export function useDailyMessageLimit() {
  const {
    features,
    getRemainingDailyMessages,
    recordMessageSent,
    subscriptionTier,
  } = useMessagingFeatures();

  const [remainingMessages, setRemainingMessages] = useState<number>(0);

  // Update remaining messages count
  const updateRemainingMessages = useCallback(() => {
    const remaining = getRemainingDailyMessages();
    setRemainingMessages(remaining);
  }, [getRemainingDailyMessages]);

  // Record message sent and update count
  const recordMessage = useCallback(() => {
    recordMessageSent();
    updateRemainingMessages();
  }, [recordMessageSent, updateRemainingMessages]);

  // Check if user has unlimited messages
  const hasUnlimitedMessages = features?.canSendUnlimitedMessages || false;

  // Check if user is near daily limit (within 2 messages)
  const isNearLimit =
    !hasUnlimitedMessages && remainingMessages <= 2 && remainingMessages > 0;

  // Check if user has reached daily limit
  const hasReachedLimit = !hasUnlimitedMessages && remainingMessages <= 0;

  // Update remaining messages when features change
  useEffect(() => {
    updateRemainingMessages();
  }, [updateRemainingMessages, features]);

  return {
    remainingMessages,
    hasUnlimitedMessages,
    isNearLimit,
    hasReachedLimit,
    dailyLimit: features?.dailyMessageLimit || 0,
    subscriptionTier,
    recordMessage,
    updateRemainingMessages,
  };
}

/**
 * Hook for voice message duration limits
 */
export function useVoiceMessageLimits() {
  const { features, canSendVoiceMessage, subscriptionTier } =
    useMessagingFeatures();

  const maxDuration = features?.voiceMessageDurationLimit || 0;
  const canSendVoice = features?.canSendVoiceMessages || false;

  // Check if a specific duration is allowed
  const isDurationAllowed = useCallback(
    (duration: number) => {
      if (!canSendVoice) return false;
      if (maxDuration === 0) return false;
      return duration <= maxDuration;
    },
    [canSendVoice, maxDuration]
  );

  // Get remaining duration for current recording
  const getRemainingDuration = useCallback(
    (currentDuration: number) => {
      if (!canSendVoice || maxDuration === 0) return 0;
      return Math.max(0, maxDuration - currentDuration);
    },
    [canSendVoice, maxDuration]
  );

  // Check if user is near duration limit (within 10 seconds)
  const isNearDurationLimit = useCallback(
    (currentDuration: number) => {
      if (!canSendVoice || maxDuration === 0) return false;
      const remaining = getRemainingDuration(currentDuration);
      return remaining <= 10 && remaining > 0;
    },
    [canSendVoice, maxDuration, getRemainingDuration]
  );

  return {
    maxDuration,
    canSendVoice,
    subscriptionTier,
    isDurationAllowed,
    getRemainingDuration,
    isNearDurationLimit,
    checkDuration: canSendVoiceMessage,
  };
}
