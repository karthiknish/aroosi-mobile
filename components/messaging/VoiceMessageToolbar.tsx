import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { VoiceRecorder } from "./VoiceRecorder";
import {
  VoiceDurationIndicator,
  VoiceDurationWarning,
} from "./VoiceDurationIndicator";
import { FeatureGateModal } from "./FeatureGateModal";
import { useVoiceMessageLimits } from "@/hooks/useMessagingFeatures";

interface VoiceMessageToolbarProps {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  onVoiceMessageSent?: (messageId: string) => void;
  onError?: (error: Error) => void;
  style?: any;
  disabled?: boolean;
}

export const VoiceMessageToolbar: React.FC<VoiceMessageToolbarProps> = ({
  conversationId,
  fromUserId,
  toUserId,
  onVoiceMessageSent,
  onError,
  style,
  disabled = false,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  // Subscription and limits
  const {
    canSendVoice,
    maxDuration,
    getRemainingDuration,
    isNearDurationLimit,
    subscriptionTier,
  } = useVoiceMessageLimits();

  // Animation values
  const slideAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Show/hide recorder with animation
  const toggleRecorder = useCallback(
    (show: boolean) => {
      setShowRecorder(show);

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: show ? 1 : 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: show ? 1 : 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [slideAnim, scaleAnim]
  );

  // Handle voice button press
  const handleVoiceButtonPress = useCallback(() => {
    if (!canSendVoice) {
      setShowUpgradeModal(true);
      return;
    }

    if (disabled) {
      return;
    }

    toggleRecorder(!showRecorder);
  }, [canSendVoice, disabled, showRecorder, toggleRecorder]);

  // Handle recording completion
  const handleRecordingComplete = useCallback(
    (uri: string, duration: number) => {
      setIsRecording(false);
      setRecordingDuration(0);
      toggleRecorder(false);
      // The VoiceRecorder component will handle the actual upload
    },
    [toggleRecorder]
  );

  // Handle recording start
  const handleRecordingStart = useCallback(() => {
    setIsRecording(true);
    setRecordingDuration(0);
  }, []);

  // Handle recording cancel
  const handleRecordingCancel = useCallback(() => {
    setIsRecording(false);
    setRecordingDuration(0);
    toggleRecorder(false);
  }, [toggleRecorder]);

  // Handle upgrade required
  const handleUpgradeRequired = useCallback(() => {
    setShowUpgradeModal(true);
  }, []);

  // Handle duration update (for real-time tracking)
  const handleDurationUpdate = useCallback((duration: number) => {
    setRecordingDuration(duration);
  }, []);

  const remainingDuration = getRemainingDuration(recordingDuration);
  const showDurationWarning = isNearDurationLimit(recordingDuration);

  return (
    <View style={[styles.container, style]}>
      {/* Duration Warning */}
      <VoiceDurationWarning
        visible={showDurationWarning && isRecording}
        remainingDuration={remainingDuration}
        onUpgradePress={() => setShowUpgradeModal(true)}
      />

      {/* Voice Recorder (Animated) */}
      <Animated.View
        style={[
          styles.recorderContainer,
          {
            opacity: slideAnim,
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
              { scale: scaleAnim },
            ],
          },
        ]}
        pointerEvents={showRecorder ? "auto" : "none"}
      >
        <VoiceRecorder
          conversationId={conversationId}
          fromUserId={fromUserId}
          toUserId={toUserId}
          onRecordingComplete={handleRecordingComplete}
          onRecordingCancel={handleRecordingCancel}
          onRecordingError={onError}
          onUpgradeRequired={handleUpgradeRequired}
          onRecordingStart={handleRecordingStart}
          onDurationUpdate={handleDurationUpdate}
          style={styles.recorder}
        />

        {/* Duration Indicator */}
        {isRecording && (
          <VoiceDurationIndicator
            currentDuration={recordingDuration}
            isRecording={isRecording}
            style={styles.durationIndicator}
          />
        )}

        {/* Slide to Cancel Hint */}
        {isRecording && (
          <View style={styles.slideHintContainer}>
            <TouchableOpacity onPress={handleRecordingCancel}>
              <Text style={styles.slideHintText}>Tap to cancel</Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>

      {/* Voice Button */}
      <TouchableOpacity
        onPress={handleVoiceButtonPress}
        disabled={disabled}
        style={[
          styles.voiceButton,
          showRecorder && styles.voiceButtonActive,
          disabled && styles.voiceButtonDisabled,
          !canSendVoice && styles.voiceButtonRestricted,
        ]}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.voiceButtonIcon,
            showRecorder && styles.voiceButtonIconActive,
            !canSendVoice && styles.voiceButtonIconRestricted,
          ]}
        >
          {showRecorder ? "✕" : "🎤"}
        </Text>

        {!canSendVoice && (
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PRO</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Upgrade Modal */}
      <FeatureGateModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          // Handle upgrade navigation
          setShowUpgradeModal(false);
        }}
        feature="voice"
        currentTier={subscriptionTier as any}
        reason="Voice messages require a Premium subscription"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  recorderContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  recorder: {
    marginHorizontal: 16,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  durationIndicator: {
    marginHorizontal: 16,
    marginTop: 8,
  },
  slideHintContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  slideHintText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  voiceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  voiceButtonActive: {
    backgroundColor: "#FF3B30",
  },
  voiceButtonDisabled: {
    backgroundColor: "#C7C7CC",
    opacity: 0.6,
  },
  voiceButtonRestricted: {
    backgroundColor: "#FF9500",
  },
  voiceButtonIcon: {
    fontSize: 20,
    color: "#ffffff",
  },
  voiceButtonIconActive: {
    fontSize: 16,
  },
  voiceButtonIconRestricted: {
    fontSize: 18,
  },
  premiumBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFD700",
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  premiumBadgeText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#000",
  },
});
