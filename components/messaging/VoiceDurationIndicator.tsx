import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useVoiceMessageLimits } from "@/hooks/useMessagingFeatures";
import { useTheme } from "@contexts/ThemeContext";
import { useReduceMotion } from "@/hooks/useReduceMotion";

interface VoiceDurationIndicatorProps {
  currentDuration: number;
  isRecording: boolean;
  style?: any;
}

export const VoiceDurationIndicator: React.FC<VoiceDurationIndicatorProps> = ({
  currentDuration,
  isRecording,
  style,
}) => {
  const { theme } = useTheme();
  const {
    maxDuration,
    canSendVoice,
    getRemainingDuration,
    isNearDurationLimit,
  } = useVoiceMessageLimits();

  const [pulseAnim] = useState(new Animated.Value(1));
  const { reduceMotion } = useReduceMotion();

  const remainingDuration = getRemainingDuration(currentDuration);
  const isNearLimit = isNearDurationLimit(currentDuration);
  const progressPercentage =
    maxDuration > 0 ? (currentDuration / maxDuration) * 100 : 0;

  // Pulse animation when near limit
  useEffect(() => {
    if (isNearLimit && isRecording && !reduceMotion) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isNearLimit, isRecording, reduceMotion, pulseAnim]);

  if (!canSendVoice || maxDuration === 0) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getIndicatorColor = () => {
    if (remainingDuration <= 0) return theme.colors.error[500];
    if (isNearLimit) return theme.colors.warning[500];
    return theme.colors.success[500];
  };

  const getStatusText = () => {
    if (remainingDuration <= 0) {
      return "Maximum duration reached";
    }

    if (isNearLimit) {
      return `${formatDuration(remainingDuration)} remaining`;
    }

    return `${formatDuration(currentDuration)} / ${formatDuration(
      maxDuration
    )}`;
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background.secondary },
        style,
        { transform: [{ scale: pulseAnim }] },
      ]}
    >
      {/* Progress Circle */}
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
                width: `${Math.min(progressPercentage, 100)}%`,
                backgroundColor: getIndicatorColor(),
              },
            ]}
          />
        </View>
      </View>

      {/* Duration Text */}
      <View style={styles.textContainer}>
        <Text style={[styles.durationText, { color: getIndicatorColor() }]}>
          {getStatusText()}
        </Text>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View
              style={[
                styles.recordingDot,
                { backgroundColor: getIndicatorColor() },
              ]}
            />
            <Text
              style={[
                styles.recordingText,
                { color: theme.colors.text.secondary },
              ]}
            >
              Recording
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

interface VoiceDurationWarningProps {
  visible: boolean;
  remainingDuration: number;
  onUpgradePress?: () => void;
}

export const VoiceDurationWarning: React.FC<VoiceDurationWarningProps> = ({
  visible,
  remainingDuration,
  onUpgradePress,
}) => {
  if (!visible) return null;
  const { theme } = useTheme();

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getWarningText = () => {
    if (remainingDuration <= 0) {
      return "You've reached the maximum voice message duration. Upgrade to Premium Plus for longer voice messages!";
    }

    return `Only ${formatDuration(
      remainingDuration
    )} left! Upgrade to Premium Plus for longer voice messages.`;
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
        <Text style={styles.warningIcon}>🎤</Text>
        <Text
          style={[styles.warningText, { color: theme.colors.warning[700] }]}
        >
          {getWarningText()}
        </Text>
      </View>

      {onUpgradePress && (
        <View style={styles.warningActions}>
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
              Upgrade to Premium Plus
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    height: 6,
    backgroundColor: "transparent",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  textContainer: {
    alignItems: "center",
  },
  durationText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 14,
    color: undefined,
    fontWeight: "500",
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
    alignItems: "flex-end",
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
});
