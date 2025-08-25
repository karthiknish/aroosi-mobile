import React from "react";
import { View, Text } from "react-native";
import { GradientButton } from "@/components/ui/GradientComponents";
import * as Haptics from "expo-haptics";
import { useTheme } from "@contexts/ThemeContext";
import { useSubscription } from "@/hooks/useSubscription";

interface PremiumFeatureGuardProps {
  feature: string; // descriptive label
  requiredPlan?: "premium" | "premiumPlus";
  onUpgrade: () => void;
  children: React.ReactNode;
  fallbackText?: string;
  showIfAllowed?: boolean;
  allowed?: boolean;
}

/**
 * Reusable wrapper to gate premium-only UI sections across screens.
 */
export const PremiumFeatureGuard: React.FC<PremiumFeatureGuardProps> = ({
  feature,
  requiredPlan = "premium",
  onUpgrade,
  children,
  fallbackText,
  showIfAllowed = true,
  allowed,
}) => {
  const { theme } = useTheme();
  const { subscription } = useSubscription();

  const isAllowed =
    typeof allowed === "boolean"
      ? allowed
      : (() => {
          const plan = subscription?.plan;
          if (!plan || plan === "free") return false;
          if (requiredPlan === "premium")
            return plan === "premium" || plan === "premiumPlus";
          if (requiredPlan === "premiumPlus") return plan === "premiumPlus";
          return false;
        })();

  if (isAllowed) {
    return <>{showIfAllowed ? children : null}</>;
  }

  return (
    <View
      style={{
        gap: 12,
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors.background.primary,
        borderWidth: 1,
        borderColor: theme.colors.border.primary,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: theme.colors.text.secondary,
          fontSize: 14,
        }}
      >
        {fallbackText ||
          (requiredPlan === "premiumPlus"
            ? `Upgrade to Premium Plus to access ${feature}.`
            : `Upgrade to Premium to access ${feature}.`)}
      </Text>
      <GradientButton
        title="Upgrade"
        size="small"
        variant="primary"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onUpgrade();
        }}
      />
    </View>
  );
};

export default PremiumFeatureGuard;
