import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from "react-native";
import {
  createAudioPlayer,
  useAudioPlayerStatus,
  AudioPlayer,
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  cancelAnimation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
// Import Colors and typography scale (fontSize) from constants; if fontSize isn't exported, fallback to inline sizes
import { Colors } from "@constants";
import { useToast } from "@providers/ToastContext";
import { API_BASE_URL } from "@constants";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import { Responsive } from "@constants/responsive";
import { rgbaHex } from "@utils/color";

interface VoiceMessageProps {
  audioUri?: string;
  audioStorageId?: string; // Added for main project compatibility
  duration?: number;
  isOwnMessage?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  style?: any;
}

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  onCancel?: () => void;
  maxDuration?: number;
  style?: any;
}

// Voice Message Player Component
export const VoiceMessage: React.FC<VoiceMessageProps> = ({
  audioUri,
  audioStorageId,
  duration = 0,
  isOwnMessage = false,
  onPlay,
  onPause,
  style,
}) => {
  const toast = useToast();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  // Only subscribe when player is initialized to satisfy strict null checks
  const status = player ? useAudioPlayerStatus(player) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const playbackProgress = useSharedValue(0);
  const waveformScale = useSharedValue(1);

  useEffect(() => {
    return () => {
      player?.remove();
    };
  }, [player]);

  const loadAudio = async () => {
    // Support both direct URI and storage ID from main project
    let finalAudioUri = audioUri;

    if (!finalAudioUri && audioStorageId) {
      // Construct URL for storage ID using central API base URL
      finalAudioUri = `${API_BASE_URL}/api/voice-messages/${audioStorageId}/url`;
    }

    if (!finalAudioUri) return;

    try {
      setIsLoading(true);

      const newPlayer = createAudioPlayer({ uri: finalAudioUri });
      setPlayer(newPlayer);
    } catch (error) {
      console.error("Error loading audio:", error);
      const toast = useToast();
      toast.show("Failed to load audio message", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlayback = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!player) {
      await loadAudio();
      return;
    }

    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
        onPause?.();
        cancelAnimation(waveformScale);
        waveformScale.value = withTiming(1);
      } else {
        player.play();
        setIsPlaying(true);
        onPlay?.();
        waveformScale.value = withRepeat(
          withSequence(
            withTiming(1.2, { duration: 300 }),
            withTiming(0.8, { duration: 300 })
          ),
          -1,
          true
        );
      }
    } catch (error) {
      console.error("Error controlling playback:", error);
    }
  };

  // Sync local state with player status
  useEffect(() => {
    if (!status) return;

    setPosition(Math.floor((status.currentTime ?? 0) * 1000));

    const prog =
      duration > 0 ? ((status.currentTime ?? 0) * 1000) / duration : 0;
    playbackProgress.value = prog;

    if (status.didJustFinish) {
      setIsPlaying(false);
      playbackProgress.value = 0;
      cancelAnimation(waveformScale);
      waveformScale.value = withTiming(1);
    }
  }, [status, duration]);

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${playbackProgress.value * 100}%`,
    };
  });

  const waveformStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: waveformScale.value }],
    };
  });

  // Responsive styles using hooks
  const styles = StyleSheet.create({
    voiceMessageContainer: {
      borderRadius: spacing.md,
      overflow: "hidden",
      maxWidth: "70%", // Use percentage instead of hardcoded screen width
      marginVertical: spacing.xs,
    },
    ownMessage: {
      alignSelf: "flex-end",
    },
    otherMessage: {
      alignSelf: "flex-start",
    },
    messageGradient: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    playButton: {
      width: spacing.xl * 2,
      height: spacing.xl * 2,
      borderRadius: spacing.xl,
      backgroundColor: rgbaHex(Colors.background.primary, 0.2),
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
    },
    playButtonText: {
      fontSize: fontSize.sm,
    },
    waveformContainer: {
      flex: 1,
      height: spacing.xl * 1.5,
      position: "relative",
      marginRight: spacing.sm,
    },
    waveformBackground: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: rgbaHex(Colors.background.primary, 0.2),
      borderRadius: spacing.xl,
    },
    waveformProgress: {
      height: "100%",
      backgroundColor: rgbaHex(Colors.background.primary, 0.4),
      borderRadius: spacing.xl,
    },
    waveform: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      height: "100%",
      paddingHorizontal: spacing.xs,
    },
    waveformBar: {
      width: 2,
      borderRadius: 1,
      opacity: 0.7,
    },
    durationText: {
      fontSize: fontSize.xs,
      fontWeight: "500",
    },
    recorderContainer: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    recordingControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: spacing.xl * 7.5,
    },
    cancelButton: {
      width: spacing.xl * 1.25,
      height: spacing.xl * 1.25,
      borderRadius: spacing.xl * 0.625,
      backgroundColor: Colors.error[500],
      justifyContent: "center",
      alignItems: "center",
    },
    cancelButtonText: {
      color: Colors.background.primary,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    recordingIndicator: {
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    pulseCircle: {
      position: "absolute",
      width: spacing.xl * 5,
      height: spacing.xl * 5,
      borderRadius: spacing.xl * 2.5,
      backgroundColor: Colors.error[500],
    },
    recordButton: {
      width: spacing.xl * 3.75,
      height: spacing.xl * 3.75,
      borderRadius: spacing.xl * 1.875,
      backgroundColor: Colors.error[500],
      justifyContent: "center",
      alignItems: "center",
    },
    recordingDot: {
      width: spacing.md * 1.25,
      height: spacing.md * 1.25,
      borderRadius: spacing.md * 0.625,
      backgroundColor: Colors.background.primary,
    },
    stopButton: {
      width: spacing.xl * 1.25,
      height: spacing.xl * 1.25,
      borderRadius: spacing.xl * 0.625,
      backgroundColor: Colors.success[500],
      justifyContent: "center",
      alignItems: "center",
    },
    stopButtonText: {
      color: Colors.background.primary,
      fontSize: fontSize.base,
    },
    startRecordButton: {
      width: spacing.xl * 1.875,
      height: spacing.xl * 1.875,
      borderRadius: spacing.xl * 0.9375,
      backgroundColor: Colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
    },
    startRecordButtonText: {
      fontSize: fontSize.lg,
    },
    recordingDuration: {
      marginTop: spacing.sm,
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      fontWeight: "500",
    },
  });

  return (
    <View
      style={[
        styles.voiceMessageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
        style,
      ]}
    >
      <LinearGradient
        colors={
          isOwnMessage
            ? [Colors.primary[500], Colors.primary[600]]
            : [Colors.background.primary, Colors.neutral[100]]
        }
        style={styles.messageGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayback}
          disabled={isLoading}
        >
          <Text style={styles.playButtonText}>
            {isLoading ? "⏳" : isPlaying ? "⏸️" : "▶️"}
          </Text>
        </TouchableOpacity>

        <View style={styles.waveformContainer}>
          <View style={styles.waveformBackground}>
            <Animated.View style={[styles.waveformProgress, progressStyle]} />
          </View>

          <Animated.View style={[styles.waveform, waveformStyle]}>
            {Array.from({ length: 20 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.waveformBar,
                  {
                    height: Math.random() * 20 + 10,
                    backgroundColor: isOwnMessage
                      ? Colors.background.primary
                      : Colors.primary[500],
                  },
                ]}
              />
            ))}
          </Animated.View>
        </View>

        <Text
          style={[
            styles.durationText,
            {
              color: isOwnMessage
                ? Colors.background.primary
                : Colors.text.secondary,
            },
          ]}
        >
          {formatDuration(position || duration)}
        </Text>
      </LinearGradient>
    </View>
  );
};

// Voice Recorder Component
export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onCancel,
  maxDuration = 60000, // 60 seconds
  style,
}) => {
  const toast = useToast();
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState<boolean>(false);

  // Responsive values for local styles
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const recordingScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  const requestPerms = async () => {
    if (permissionGranted) return true;
    const status = await AudioModule.requestRecordingPermissionsAsync();
    if (!status.granted) {
      toast.show(
        "Microphone permission is required to record voice messages.",
        "error"
      );
      return false;
    }
    setPermissionGranted(true);
    return true;
  };

  const startRecording = async () => {
    try {
      const ok = await requestPerms();
      if (!ok) return;

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setIsRecording(true);
      setRecordingDuration(0);

      // Start animations
      recordingScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );

      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.3, { duration: 500 })
        ),
        -1,
        true
      );

      // Start duration timer
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => {
          const newDuration = prev + 100;
          if (newDuration >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newDuration;
        });
      }, 100);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      console.error("Failed to start recording", err);
      toast.show("Failed to start recording", "error");
    }
  };

  const stopRecording = async () => {
    if (!audioRecorder.isRecording) return;

    try {
      setIsRecording(false);
      await audioRecorder.stop();

      const uri = audioRecorder.uri;
      if (uri) {
        onRecordingComplete(uri, recordingDuration);
      }

      // Stop animations
      cancelAnimation(recordingScale);
      cancelAnimation(pulseOpacity);
      recordingScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0);

      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      console.error("Error stopping recording:", error);
    }

    setRecordingDuration(0);
  };

  const cancelRecording = async () => {
    if (audioRecorder.isRecording) {
      await audioRecorder.stop();
    }

    setIsRecording(false);
    setRecordingDuration(0);

    // Stop animations
    cancelAnimation(recordingScale);
    cancelAnimation(pulseOpacity);
    recordingScale.value = withTiming(1);
    pulseOpacity.value = withTiming(0);

    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    onCancel?.();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const recordingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordingScale.value }],
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseOpacity.value,
    };
  });

  // Local styles for the recorder UI
  const styles = StyleSheet.create({
    recorderContainer: {
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    recordingControls: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: spacing.xl * 7.5,
    },
    cancelButton: {
      width: spacing.xl * 1.25,
      height: spacing.xl * 1.25,
      borderRadius: spacing.xl * 0.625,
      backgroundColor: Colors.error[500],
      justifyContent: "center",
      alignItems: "center",
    },
    cancelButtonText: {
      color: Colors.background.primary,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    recordingIndicator: {
      position: "relative",
      justifyContent: "center",
      alignItems: "center",
    },
    pulseCircle: {
      position: "absolute",
      width: spacing.xl * 5,
      height: spacing.xl * 5,
      borderRadius: spacing.xl * 2.5,
      backgroundColor: Colors.error[500],
    },
    recordButton: {
      width: spacing.xl * 3.75,
      height: spacing.xl * 3.75,
      borderRadius: spacing.xl * 1.875,
      backgroundColor: Colors.error[500],
      justifyContent: "center",
      alignItems: "center",
    },
    recordingDot: {
      width: spacing.md * 1.25,
      height: spacing.md * 1.25,
      borderRadius: spacing.md * 0.625,
      backgroundColor: Colors.background.primary,
    },
    stopButton: {
      width: spacing.xl * 1.25,
      height: spacing.xl * 1.25,
      borderRadius: spacing.xl * 0.625,
      backgroundColor: Colors.success[500],
      justifyContent: "center",
      alignItems: "center",
    },
    stopButtonText: {
      color: Colors.background.primary,
      fontSize: fontSize.base,
    },
    startRecordButton: {
      width: spacing.xl * 1.875,
      height: spacing.xl * 1.875,
      borderRadius: spacing.xl * 0.9375,
      backgroundColor: Colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
    },
    startRecordButtonText: {
      fontSize: fontSize.lg,
    },
    recordingDuration: {
      marginTop: spacing.sm,
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      fontWeight: "500",
    },
  });

  return (
    <View style={[styles.recorderContainer, style]}>
      {isRecording ? (
        <View style={styles.recordingControls}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelRecording}
          >
            <Text style={styles.cancelButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.recordingIndicator}>
            <Animated.View style={[styles.pulseCircle, pulseAnimatedStyle]} />
            <Animated.View
              style={[styles.recordButton, recordingAnimatedStyle]}
            >
              <View style={styles.recordingDot} />
            </Animated.View>
          </View>

          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <Text style={styles.stopButtonText}>⏹️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.startRecordButton}
          onPress={startRecording}
        >
          <Text style={styles.startRecordButtonText}>🎤</Text>
        </TouchableOpacity>
      )}

      {isRecording && (
        <Text style={styles.recordingDuration}>
          {formatDuration(recordingDuration)}
        </Text>
      )}
    </View>
  );
};