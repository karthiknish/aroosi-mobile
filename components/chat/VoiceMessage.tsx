import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../../constants";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { Message } from "../../types/message";
import MessageStatusIndicator from "./MessageStatusIndicator";
import PlatformHaptics from "../../utils/PlatformHaptics";

interface VoiceMessageProps {
  message: Message;
  isOwnMessage: boolean;
  showStatus?: boolean;
  // Web-parity props: when provided, override message.voiceWaveform/voiceDuration
  peaks?: number[];
  durationSeconds?: number;
  // Ephemeral upload support
  uploading?: boolean;
  progress?: number; // 0..1
  errorText?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
}

export default function VoiceMessage({
  message,
  isOwnMessage,
  showStatus = false,
  peaks,
  durationSeconds,
  uploading,
  progress,
  errorText,
  onRetry,
  onCancel,
  onDismiss,
}: VoiceMessageProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const waveformAnim = new Animated.Value(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const isScrubbingRef = useRef(false);

  const {
    playbackState,
    loadAudio,
    play,
    pause,
    seekTo,
    getProgress,
    getFormattedTime,
  } = useAudioPlayback(false, () => {
    // Reset to beginning when playback completes
    PlatformHaptics.light();
  });

  // Initialize audio when component mounts (skip while uploading)
  useEffect(() => {
    if (message.voiceUrl && !isInitialized && !uploading) {
      loadAudio(message.voiceUrl).then((loaded) => {
        setIsInitialized(loaded);
      });
    }
  }, [message.voiceUrl, loadAudio, isInitialized, uploading]);

  // Animate waveform when playing
  useEffect(() => {
    if (playbackState.isPlaying) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(waveformAnim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [playbackState.isPlaying, waveformAnim]);

  const handlePlayPause = async () => {
    if (uploading) return; // disabled while uploading
    await PlatformHaptics.selection();
    if (playbackState.isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handleSeek = async (percentage: number) => {
    if (playbackState.duration > 0) {
      const position = percentage * playbackState.duration;
      await seekTo(position);
    }
  };

  const formatDuration = (ms: number): string => {
    if (ms === 0 && message.voiceDuration) {
      return getFormattedTime(message.voiceDuration);
    }
    return getFormattedTime(ms);
  };

  const renderWaveform = () => {
    // Prefer provided peaks (normalized 0..1) from server; fallback to message.voiceWaveform; else generate defaults
    const normalizedPeaks =
      Array.isArray(peaks) && peaks.length
        ? peaks.map((p) => {
            if (typeof p !== "number" || !isFinite(p)) return 0;
            return p < 0 ? 0 : p > 1 ? 1 : p;
          })
        : undefined;

    const waveform =
      (normalizedPeaks && normalizedPeaks.length
        ? normalizedPeaks.map((p) => 4 + p * 16) // map 0..1 -> 4..20 height bars
        : message.voiceWaveform) || generateDefaultWaveform();

    const progress = getProgress();

    return (
      <View
        style={styles.waveformContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={async (e) => {
          isScrubbingRef.current = true;
          await PlatformHaptics.selection();
          if (containerWidth > 0) {
            const x = e.nativeEvent.locationX;
            const pct = Math.max(0, Math.min(1, x / containerWidth));
            await handleSeek(pct);
          }
        }}
        onResponderMove={async (e) => {
          if (!isScrubbingRef.current || containerWidth <= 0) return;
          const x = e.nativeEvent.locationX;
          const pct = Math.max(0, Math.min(1, x / containerWidth));
          await handleSeek(pct);
        }}
        onResponderRelease={async (e) => {
          if (containerWidth > 0) {
            const x = e.nativeEvent.locationX;
            const pct = Math.max(0, Math.min(1, x / containerWidth));
            await handleSeek(pct);
          }
          isScrubbingRef.current = false;
          await PlatformHaptics.selection();
        }}
      >
        {waveform.map((height, index) => {
          const isActive = index / waveform.length <= progress;
          const animatedHeight =
            isActive && playbackState.isPlaying
              ? waveformAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [height, height * 1.5],
                })
              : height;

          return (
            <TouchableOpacity
              key={index}
              style={styles.waveformBarContainer}
              onPress={() => handleSeek(index / waveform.length)}
            >
              <Animated.View
                style={[
                  styles.waveformBar,
                  {
                    height: animatedHeight,
                    backgroundColor: isActive
                      ? isOwnMessage
                        ? Colors.background.primary
                        : Colors.primary[500]
                      : Colors.neutral[300],
                  },
                ]}
              />
            </TouchableOpacity>
          );
        })}

        {/* Scrub handle indicator */}
        <View
          pointerEvents="none"
          style={[
            styles.scrubHandle,
            {
              left: `${Math.max(0, Math.min(100, progress * 100))}%`,
              backgroundColor: isOwnMessage
                ? Colors.background.primary
                : Colors.primary[500],
            },
          ]}
        />
      </View>
    );
  };

  const effectiveStatus = ():
    | "pending"
    | "sent"
    | "delivered"
    | "read"
    | "failed" => {
    if (!isOwnMessage) return (message.status as any) || "sent";
    if (message.readAt) return "read";
    const receipts = Array.isArray(message.deliveryReceipts)
      ? message.deliveryReceipts
      : [];
    if (receipts.some((r: any) => r?.status === "read")) return "read";
    if (receipts.some((r: any) => r?.status === "delivered"))
      return "delivered";
    if (message.status === "failed") return "failed";
    if (message.status === "pending") return message.status as any;
    if (message.status === "delivered" || message.status === "read")
      return message.status as any;
    return "sent";
  };

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      <View style={styles.content}>
        {/* Play/Pause Button */}
        <TouchableOpacity
          style={[
            styles.playButton,
            isOwnMessage ? styles.ownPlayButton : styles.otherPlayButton,
          ]}
          onPress={handlePlayPause}
          disabled={!isInitialized || playbackState.isLoading}
        >
          {playbackState.isLoading ? (
            <Ionicons
              name="hourglass"
              size={20}
              color={
                isOwnMessage ? Colors.primary[500] : Colors.background.primary
              }
            />
          ) : (
            <Ionicons
              name={playbackState.isPlaying ? "pause" : "play"}
              size={20}
              color={
                isOwnMessage ? Colors.primary[500] : Colors.background.primary
              }
            />
          )}
        </TouchableOpacity>

        {/* Waveform and Duration */}
        <View style={styles.audioInfo}>
          {renderWaveform()}

          <View style={styles.durationContainer}>
            <Text
              style={[
                styles.duration,
                isOwnMessage ? styles.ownText : styles.otherText,
              ]}
            >
              {uploading
                ? "Uploading…"
                : playbackState.isPlaying
                ? getFormattedTime(playbackState.position)
                : // Prefer provided durationSeconds; fallback to playbackState.duration; finally message.voiceDuration
                typeof durationSeconds === "number" && durationSeconds > 0
                ? getFormattedTime(durationSeconds * 1000)
                : formatDuration(playbackState.duration)}
            </Text>

            {playbackState.duration > 0 && (
              <Text
                style={[
                  styles.totalDuration,
                  isOwnMessage
                    ? styles.ownTextSecondary
                    : styles.otherTextSecondary,
                ]}
              >
                / {formatDuration(playbackState.duration)}
              </Text>
            )}
          </View>
        </View>

        {/* Upload progress / error or Status Indicator */}
        {showStatus && isOwnMessage && (
          <View style={styles.statusContainer}>
            {uploading ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text
                  style={[
                    styles.totalDuration,
                    isOwnMessage
                      ? styles.ownTextSecondary
                      : styles.otherTextSecondary,
                  ]}
                >
                  {Math.round(Math.max(0, Math.min(1, progress ?? 0)) * 100)}%
                </Text>
                {!!onCancel && (
                  <TouchableOpacity onPress={onCancel}>
                    <Text
                      style={[
                        styles.totalDuration,
                        { textDecorationLine: "underline" },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : errorText ? (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Text style={[styles.errorText, { marginTop: 0 }]}>Failed</Text>
                {!!onRetry && (
                  <TouchableOpacity onPress={onRetry}>
                    <Text
                      style={[
                        styles.totalDuration,
                        {
                          color: Colors.error[600],
                          textDecorationLine: "underline",
                        },
                      ]}
                    >
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}
                {!!onDismiss && (
                  <TouchableOpacity onPress={onDismiss}>
                    <Text
                      style={[
                        styles.totalDuration,
                        { textDecorationLine: "underline" },
                      ]}
                    >
                      Dismiss
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <MessageStatusIndicator status={effectiveStatus()} size={14} />
            )}
          </View>
        )}
      </View>

      {/* Error State */}
      {!uploading && playbackState.error && (
        <Text style={styles.errorText}>Failed to load voice message</Text>
      )}
      {errorText && <Text style={styles.errorText}>{errorText}</Text>}
    </View>
  );
}

// Generate default waveform if not provided
function generateDefaultWaveform(): number[] {
  const bars = 20;
  return Array.from(
    { length: bars },
    () => 4 + Math.random() * 16 // Heights between 4-20
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: "80%",
    marginVertical: Layout.spacing.xs,
  },

  ownMessage: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.lg,
    borderBottomRightRadius: Layout.radius.sm,
  },

  otherMessage: {
    alignSelf: "flex-start",
    backgroundColor: Colors.neutral[100],
    borderRadius: Layout.radius.lg,
    borderBottomLeftRadius: Layout.radius.sm,
  },

  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },

  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },

  ownPlayButton: {
    backgroundColor: Colors.background.primary,
  },

  otherPlayButton: {
    backgroundColor: Colors.primary[500],
  },

  audioInfo: {
    flex: 1,
    gap: Layout.spacing.xs,
  },

  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    height: 24,
  },

  waveformBarContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Layout.spacing.xs,
  },

  waveformBar: {
    width: 3,
    borderRadius: 1.5,
    minHeight: 4,
  },

  scrubHandle: {
    position: "absolute",
    top: -4,
    bottom: -4,
    width: 2,
    borderRadius: 1,
    opacity: 0.7,
  },

  durationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  duration: {
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
    fontVariant: ["tabular-nums"],
  },

  totalDuration: {
    fontSize: Layout.typography.fontSize.xs,
    marginLeft: Layout.spacing.xs,
  },

  ownText: {
    color: Colors.background.primary,
  },

  otherText: {
    color: Colors.text.primary,
  },

  ownTextSecondary: {
    color: Colors.background.primary,
    opacity: 0.7,
  },

  otherTextSecondary: {
    color: Colors.text.secondary,
  },

  statusContainer: {
    marginLeft: Layout.spacing.xs,
  },

  errorText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.error[500],
    fontStyle: "italic",
    marginTop: Layout.spacing.xs,
    marginHorizontal: Layout.spacing.md,
  },
});
