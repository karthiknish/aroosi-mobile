import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useVoiceMessageLimits } from "@/hooks/useMessagingFeatures";
import { VoiceDurationIndicator } from "./VoiceDurationIndicator";

interface VoiceRecorderProps {
  conversationId?: string;
  fromUserId?: string;
  toUserId?: string;
  onRecordingComplete: (uri: string, duration: number) => void;
  onRecordingCancel?: () => void;
  onCancel?: () => void;
  onRecordingError?: (error: Error) => void;
  onUpgradeRequired?: () => void;
  onRecordingStart?: () => void;
  onDurationUpdate?: (duration: number) => void;
  maxDuration?: number;
  style?: any;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  conversationId,
  fromUserId,
  toUserId,
  onRecordingComplete,
  onRecordingCancel,
  onCancel,
  onRecordingError,
  onUpgradeRequired,
  onRecordingStart,
  onDurationUpdate,
  maxDuration,
  style,
}) => {
  // Get subscription-based voice limits
  const { canSendVoice } = useVoiceMessageLimits();

  // Voice recording hook
  const {
    startRecording,
    stopRecording,
    cancelRecording,
    isRecording,
    duration,
    audioUri,
    error,
    hasPermission,
  } = useVoiceRecording();

  // UI state
  const [recordingState, setRecordingState] = useState<
    "idle" | "recording" | "processing" | "error"
  >("idle");

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Update duration callback
  useEffect(() => {
    onDurationUpdate?.(duration);
  }, [duration, onDurationUpdate]);

  // Start pulse animation when recording
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Wave animation
      Animated.loop(
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      waveAnim.setValue(0);
    }
  }, [isRecording, pulseAnim, waveAnim]);

  // Handle recording button press
  const handleRecordPress = async () => {
    if (isRecording) {
      setRecordingState("processing");
      const audioBlob = await stopRecording();
      if (Platform.OS === "web") {
        if (audioBlob) {
          const uri = URL.createObjectURL(audioBlob);
          onRecordingComplete(uri, duration);
        }
      } else {
        // On native, use the file URI from the hook
        if (audioUri) {
          onRecordingComplete(audioUri, duration);
        }
      }
      setRecordingState("idle");
    } else {
      // Check if user can send voice messages based on subscription
      if (!canSendVoice) {
        onUpgradeRequired?.();
        return;
      }

      setRecordingState("recording");
      const success = await startRecording();
      if (success) {
        onRecordingStart?.();
      } else {
        setRecordingState("idle");
        onRecordingError?.(new Error(error || "Failed to start recording"));
      }
    }
  };

  // Handle cancel button press
  const handleCancelPress = async () => {
    await cancelRecording();
    setRecordingState("idle");
    onRecordingCancel?.();
    onCancel?.();
  };

  // Generate wave bars for animation
  const renderWaveBars = () => {
    const bars = [];
    const numBars = 7;

    for (let i = 0; i < numBars; i++) {
      const heightPercent = 30 + Math.sin((i / numBars) * Math.PI) * 70;
      const delay = i * (1 / numBars);

      const animatedHeight = waveAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [heightPercent * 0.5, heightPercent, heightPercent * 0.5],
      });

      bars.push(
        <Animated.View
          key={i}
          style={[
            styles.waveBar,
            {
              height: animatedHeight,
              opacity: isRecording ? 1 : 0.5,
              backgroundColor: isRecording ? "#e74c3c" : "#bdc3c7",
            },
          ]}
        />
      );
    }

    return bars;
  };

  // Render different button states
  const renderButton = () => {
    if (recordingState === "processing") {
      return (
        <View style={styles.recordButton}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      );
    }

    if (isRecording) {
      return (
        <Animated.View
          style={[
            styles.recordButton,
            styles.recordingButton,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.stopIcon} />
        </Animated.View>
      );
    }

    return (
      <View
        style={[styles.recordButton, !canSendVoice && styles.disabledButton]}
      >
        <View style={styles.micIcon}>
          <View style={styles.micTop} />
          <View style={styles.micBody} />
          <View style={styles.micBottom} />
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Voice Duration Indicator */}
      {isRecording && (
        <VoiceDurationIndicator
          currentDuration={duration}
          isRecording={isRecording}
          style={styles.durationIndicator}
        />
      )}

      <View style={styles.controlsContainer}>
        {/* Wave Visualization */}
        <View style={styles.waveContainer}>{renderWaveBars()}</View>

        {/* Record Button */}
        <TouchableOpacity
          onPress={handleRecordPress}
          disabled={recordingState === "processing" || !canSendVoice}
          style={styles.buttonContainer}
        >
          {renderButton()}
        </TouchableOpacity>

        {/* Cancel Button (only when recording) */}
        {isRecording && (
          <TouchableOpacity
            onPress={handleCancelPress}
            style={styles.cancelButton}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Message */}
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Permission Message */}
      {hasPermission === false && (
        <Text style={styles.permissionText}>
          Microphone permission is required to record voice messages.
        </Text>
      )}

      {/* Subscription Message */}
      {!canSendVoice && (
        <TouchableOpacity
          onPress={onUpgradeRequired}
          style={styles.upgradeContainer}
        >
          <Text style={styles.upgradeText}>
            Upgrade to Premium to send voice messages
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#f8f9fa",
  },
  durationIndicator: {
    marginBottom: 16,
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  waveContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    height: 60,
    marginRight: 16,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: "#bdc3c7",
  },
  buttonContainer: {
    marginLeft: "auto",
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e74c3c",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  recordingButton: {
    backgroundColor: "#c0392b",
  },
  disabledButton: {
    backgroundColor: "#bdc3c7",
  },
  stopIcon: {
    width: 20,
    height: 20,
    backgroundColor: "#fff",
    borderRadius: 2,
  },
  micIcon: {
    alignItems: "center",
  },
  micTop: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  micBody: {
    width: 4,
    height: 15,
    backgroundColor: "#fff",
    marginTop: -2,
  },
  micBottom: {
    width: 16,
    height: 4,
    backgroundColor: "#fff",
    borderRadius: 2,
    marginTop: -2,
  },
  cancelButton: {
    marginLeft: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  cancelText: {
    color: "#7f8c8d",
    fontWeight: "600",
  },
  errorText: {
    color: "#e74c3c",
    marginTop: 8,
    fontSize: 14,
  },
  permissionText: {
    color: "#e67e22",
    marginTop: 8,
    fontSize: 14,
  },
  upgradeContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "rgba(52, 152, 219, 0.1)",
    borderRadius: 8,
    alignItems: "center",
  },
  upgradeText: {
    color: "#3498db",
    fontWeight: "600",
    fontSize: 14,
  },
});
