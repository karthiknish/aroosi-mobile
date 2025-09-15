import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useDailyMessageLimit } from "@/hooks/useMessagingFeatures";
import { useTheme } from "@contexts/ThemeContext";

interface MessageLimitIndicatorProps {
  onUpgradePress?: () => void;
  style?: any;
  showWhenUnlimited?: boolean;
}

export const MessageLimitIndicator: React.FC<MessageLimitIndicatorProps> = ({
  onUpgradePress,
  style,
  showWhenUnlimited = false,
}) => {
  const { theme } = useTheme();
  const {
    remainingMessages,
    hasUnlimitedMessages,
    isNearLimit,
    hasReachedLimit,
    dailyLimit,
    subscriptionTier,
  } = useDailyMessageLimit();

  // Don't show if user has unlimited messages and showWhenUnlimited is false
  if (hasUnlimitedMessages && !showWhenUnlimited) {
    return null;
  }

  const getIndicatorColor = () => {
    if (hasUnlimitedMessages) return theme.colors.success[500];
    if (hasReachedLimit) return theme.colors.error[500];
    if (isNearLimit) return theme.colors.warning[500];
    return theme.colors.info[500];
  };

  const getIndicatorText = () => {
    if (hasUnlimitedMessages) {
      return "Unlimited messages";
    }

    if (hasReachedLimit) {
      return "Daily limit reached";
    }

    return `${remainingMessages} messages left today`;
  };

  const getProgressPercentage = () => {
    if (hasUnlimitedMessages || dailyLimit <= 0) return 100;
    return ((dailyLimit - remainingMessages) / dailyLimit) * 100;
  };

  const shouldShowUpgradeButton = () => {
    return !hasUnlimitedMessages && (hasReachedLimit || isNearLimit);
  };

  return (
    <View
      style={[
        styles.container,
        style,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBackground,
            { backgroundColor: theme.colors.neutral[300] },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${getProgressPercentage()}%`,
                backgroundColor: getIndicatorColor(),
              },
            ]}
          />
        </View>
      </View>

      {/* Text and Action */}
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={[styles.mainText, { color: getIndicatorColor() }]}>
            {getIndicatorText()}
          </Text>

          {!hasUnlimitedMessages && dailyLimit > 0 && (
            <Text
              style={[styles.subText, { color: theme.colors.text.secondary }]}
            >
              {dailyLimit - remainingMessages} of {dailyLimit} used
            </Text>
          )}

          {hasUnlimitedMessages && (
            <Text
              style={[styles.subText, { color: theme.colors.text.secondary }]}
            >
              Premium {subscriptionTier === "premiumPlus" ? "Plus" : ""} member
            </Text>
          )}
        </View>

        {shouldShowUpgradeButton() && onUpgradePress && (
          <TouchableOpacity
            style={[
              styles.upgradeButton,
              { backgroundColor: theme.colors.primary[600] },
            ]}
            onPress={onUpgradePress}
          >
            <Text
              style={[
                styles.upgradeButtonText,
                { color: theme.colors.text.inverse },
              ]}
            >
              Upgrade
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

interface MessageLimitWarningProps {
  visible: boolean;
  remainingMessages: number;
  onUpgradePress?: () => void;
  onDismiss?: () => void;
}

export const MessageLimitWarning: React.FC<MessageLimitWarningProps> = ({
  visible,
  remainingMessages,
  onUpgradePress,
  onDismiss,
}) => {
  if (!visible) return null;
  const { theme } = useTheme();

  const getWarningText = () => {
    if (remainingMessages <= 0) {
      return "You've reached your daily message limit. Upgrade to Premium for unlimited messaging!";
    }

    if (remainingMessages === 1) {
      return "You have 1 message left today. Upgrade to Premium for unlimited messaging!";
    }

    return `You have ${remainingMessages} messages left today. Upgrade to Premium for unlimited messaging!`;
  };

  return (
    <View
      style={[
        styles.warningContainer,
        {
          backgroundColor: theme.colors.warning[100],
          borderColor: theme.colors.warning[200],
        },
      ]}
    >
      <View style={styles.warningContent}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text
          style={[styles.warningText, { color: theme.colors.warning[700] }]}
        >
          {getWarningText()}
        </Text>
      </View>

      <View style={styles.warningActions}>
        {onUpgradePress && (
          <TouchableOpacity
            style={[
              styles.warningUpgradeButton,
              { backgroundColor: theme.colors.primary[600] },
            ]}
            onPress={onUpgradePress}
          >
            <Text
              style={[
                styles.warningUpgradeText,
                { color: theme.colors.text.inverse },
              ]}
            >
              Upgrade Now
            </Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity
            style={styles.warningDismissButton}
            onPress={onDismiss}
          >
            <Text
              style={[
                styles.warningDismissText,
                { color: theme.colors.warning[700] },
              ]}
            >
              Dismiss
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 4,
    backgroundColor: "transparent",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  content: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  mainText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  subText: {
    fontSize: 14,
    color: undefined,
  },
  upgradeButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },

  // Warning styles
  warningContainer: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  warningContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 16,
    color: undefined,
    lineHeight: 22,
  },
  warningActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  warningUpgradeButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningUpgradeText: {
    color: undefined,
    fontSize: 14,
    fontWeight: "600",
  },
  warningDismissButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "transparent",
  },
  warningDismissText: {
    color: undefined,
    fontSize: 14,
    fontWeight: "500",
  },
});
