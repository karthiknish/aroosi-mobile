import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import InlineUpgradeBanner from "./InlineUpgradeBanner";
import UpgradePrompt from "./UpgradePrompt";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useSubscription } from "@/hooks/useSubscription";
import type { SubscriptionTier, SubscriptionFeatures } from "@/types/subscription";

export type GuardMode = "inline" | "modal";

interface PremiumFeatureGuardProps {
  feature: keyof SubscriptionFeatures;
  children?: ReactNode;
  mode?: GuardMode; // inline banner or modal prompt on demand
  message?: string;
  ctaLabel?: string;
  recommendedTier?: SubscriptionTier;
  containerStyle?: any;
  // If provided, called when user chooses to upgrade
  onUpgrade?: (tier: SubscriptionTier) => void;
}

/**
 * A tiny guard to consistently gate premium UI.
 * If access is allowed, renders children. Otherwise shows an inline banner or a modal prompt.
 * Intentionally simple for incremental adoption across screens.
 */
export default function PremiumFeatureGuard({
  feature,
  children,
  mode = "inline",
  message,
  ctaLabel = "Upgrade",
  recommendedTier,
  containerStyle,
  onUpgrade,
}: PremiumFeatureGuardProps) {
  const { checkFeatureAccess } = useFeatureAccess();
  const { subscription } = useSubscription();
  const currentTier = subscription?.plan || "free";
  const [allowed, setAllowed] = useState<boolean>(true);
  const [reason, setReason] = useState<string | undefined>(undefined);
  const [visible, setVisible] = useState<boolean>(false);

  // Infer recommended tier if not provided
  const inferredTier: SubscriptionTier = useMemo(() => {
    if (recommendedTier) return recommendedTier;
    // Heuristic: features that mention incognito require premiumPlus, otherwise premium
    if (feature === "canUseIncognitoMode") return "premiumPlus";
    return "premium";
  }, [feature, recommendedTier]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const res = await checkFeatureAccess(feature);
      if (!mounted) return;
      setAllowed(res.allowed);
      setReason(res.reason);
      setVisible(!res.allowed && mode === "modal");
    })();
    return () => {
      mounted = false;
    };
  }, [checkFeatureAccess, feature, mode, currentTier]);

  if (allowed) {
    return <>{children}</>;
  }

  const defaultMessage =
    message ||
    reason ||
    (inferredTier === "premiumPlus"
      ? "This feature requires Premium Plus."
      : "This feature requires Premium.");

  if (mode === "inline") {
    return (
      <View style={containerStyle}>
        <InlineUpgradeBanner
          message={defaultMessage}
          ctaLabel={ctaLabel}
          onPress={() => setVisible(true)}
        />
        <UpgradePrompt
          visible={visible}
          onClose={() => setVisible(false)}
          onUpgrade={(tier) => {
            setVisible(false);
            if (onUpgrade) onUpgrade(tier);
          }}
          currentTier={currentTier}
          recommendedTier={inferredTier}
          title={
            inferredTier === "premiumPlus"
              ? "Premium Plus required"
              : "Upgrade required"
          }
          message={defaultMessage}
        />
      </View>
    );
  }

  // mode === "modal": render children, but show prompt on mount
  return (
    <>
      {children}
      <UpgradePrompt
        visible={visible}
        onClose={() => setVisible(false)}
        onUpgrade={(tier) => {
          setVisible(false);
          if (onUpgrade) onUpgrade(tier);
        }}
        currentTier={currentTier}
        recommendedTier={inferredTier}
        title={
          inferredTier === "premiumPlus"
            ? "Premium Plus required"
            : "Upgrade required"
        }
        message={defaultMessage}
      />
    </>
  );
}
