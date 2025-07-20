import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useVoiceMessageLimits } from "../../hooks/useMessagingFeatures";

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
  const {
    maxDuration,
    canSendVoice,
    getRemainingDuration,
    isNearDurationLimit,
  } = useVoiceMessageLimits();

  const [pulseAnim] = useState(new Animated.Value(1));

  const remainingDuration = getRemainingDuration(currentDuration);
  const isNearLimit = isNearDurationLimit(currentDuration);
  const progressPercentage =
    maxDuration > 0 ? (currentDuration / maxDuration) * 100 : 0;

  // Pulse animation when near limit
  useEffect(() => {
    if (isNearLimit && isRecording) {
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
  }, [isNearLimit, isRecording, pulseAnim]);

  if (!canSendVoice || maxDuration === 0) {
    return null;
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getIndicatorColor = () => {
    if (remainingDuration <= 0) return "#f44336";
    if (isNearLimit) return "#ff9800";
    return "#4caf50";
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
      style={[styles.container, style, { transform: [{ scale: pulseAnim }] }]}
    >
      {/* Progress Circle */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBackground}>
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
            <Text style={styles.recordingText}>Recording</Text>
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
    <View style={styles.warningContainer}>
      <View style={styles.warningContent}>
        <Text style={styles.warningIcon}>🎤</Text>
        <Text style={styles.warningText}>{getWarningText()}</Text>
      </View>

      {onUpgradePress && (
        <View style={styles.warningActions}>
          <TouchableOpacity
            style={styles.warningUpgradeButton}
            onPress={onUpgradePress}
          >
            <Text style={styles.warningUpgradeText}>
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
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBackground: {
    height: 6,
    backgroundColor: "#e0e0e0",
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
    color: "#666",
    fontWeight: "500",
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
    alignItems: "flex-end",
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
});
