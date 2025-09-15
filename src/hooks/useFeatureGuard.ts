import { useMemo } from "react";
import {
  useMessagingFeatures,
  useDailyMessageLimit,
} from "@/hooks/useMessagingFeatures";

export type FeatureAction = "text" | "voice" | "image";
type GuardTier = "premium" | "premiumPlus";

export function useFeatureGuard() {
  const { canSendTextMessage, canSendVoiceMessage, canSendImageMessage } =
    useMessagingFeatures();
  const { hasReachedLimit } = useDailyMessageLimit();

  function ensureAllowed(
    action: FeatureAction,
    opts?: { voiceDuration?: number }
  ): { allowed: boolean; reason?: string; recommendedTier?: GuardTier } {
    const perm =
      action === "text"
        ? canSendTextMessage()
        : action === "voice"
        ? canSendVoiceMessage(opts?.voiceDuration)
        : canSendImageMessage();

    if (!perm.allowed) {
      const reason = perm.reason || "Upgrade required";
      return {
        allowed: false,
        reason,
        recommendedTier: reason.toLowerCase().includes("plus")
          ? "premiumPlus"
          : "premium",
      };
    }

    if (hasReachedLimit) {
      return {
        allowed: false,
        reason: "Daily message limit reached",
        recommendedTier: "premium",
      };
    }

    return { allowed: true };
  }

  return useMemo(() => ({ ensureAllowed }), [hasReachedLimit]);
}
