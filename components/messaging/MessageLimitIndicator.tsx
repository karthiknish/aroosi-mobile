import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useDailyMessageLimit } from "@/hooks/useMessagingFeatures";

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
    if (hasUnlimitedMessages) return "#4caf50";
    if (hasReachedLimit) return "#f44336";
    if (isNearLimit) return "#ff9800";
    return "#2196f3";
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
    <View style={[styles.container, style]}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
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
            <Text style={styles.subText}>
              {dailyLimit - remainingMessages} of {dailyLimit} used
            </Text>
          )}

          {hasUnlimitedMessages && (
            <Text style={styles.subText}>
              Premium {subscriptionTier === "premiumPlus" ? "Plus" : ""} member
            </Text>
          )}
        </View>

        {shouldShowUpgradeButton() && onUpgradePress && (
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
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
    <View style={styles.warningContainer}>
      <View style={styles.warningContent}>
        <Text style={styles.warningIcon}>⚠️</Text>
        <Text style={styles.warningText}>{getWarningText()}</Text>
      </View>

      <View style={styles.warningActions}>
        {onUpgradePress && (
          <TouchableOpacity
            style={styles.warningUpgradeButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.warningUpgradeText}>Upgrade Now</Text>
          </TouchableOpacity>
        )}

        {onDismiss && (
          <TouchableOpacity
            style={styles.warningDismissButton}
            onPress={onDismiss}
          >
            <Text style={styles.warningDismissText}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 4,
    backgroundColor: "#e0e0e0",
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
    color: "#666",
  },
  upgradeButton: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },

  // Warning styles
  warningContainer: {
    backgroundColor: "#fff3cd",
    borderColor: "#ffeaa7",
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
    color: "#856404",
    lineHeight: 22,
  },
  warningActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  warningUpgradeButton: {
    backgroundColor: "#1976d2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  warningUpgradeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  warningDismissButton: {
    backgroundColor: "transparent",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#856404",
  },
  warningDismissText: {
    color: "#856404",
    fontSize: 14,
    fontWeight: "500",
  },
});
