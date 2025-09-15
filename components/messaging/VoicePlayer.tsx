import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from "react-native";
import { useVoicePlayback } from "@/hooks/useVoicePlayback";
import { useTheme } from "@contexts/ThemeContext";

interface VoicePlayerProps {
  uri?: string;
  storageId?: string;
  duration?: number;
  onPlaybackStart?: () => void;
  onPlaybackComplete?: () => void;
  onPlaybackError?: (error: Error) => void;
  onFetchUrl?: (storageId: string) => Promise<string | null>;
  style?: any;
  small?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({
  uri,
  storageId,
  duration: initialDuration,
  onPlaybackStart,
  onPlaybackComplete,
  onPlaybackError,
  onFetchUrl,
  style,
  small = false,
}) => {
  const { theme } = useTheme();
  const [audioUrl, setAudioUrl] = useState<string | undefined>(uri);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch URL from storage ID if needed
  useEffect(() => {
    if (!audioUrl && storageId && onFetchUrl) {
      const fetchAudioUrl = async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
          const url = await onFetchUrl(storageId);
          if (url) {
            setAudioUrl(url);
          } else {
            setFetchError("Failed to load audio");
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to load audio";
          setFetchError(errorMessage);
          onPlaybackError?.(
            error instanceof Error ? error : new Error(errorMessage)
          );
        } finally {
          setIsLoading(false);
        }
      };

      fetchAudioUrl();
    }
  }, [storageId, audioUrl, onFetchUrl, onPlaybackError]);

  // Voice playback hook
  const {
    play,
    pause,
    stop,
    seek,
    togglePlayPause,
    isPlaying,
    isLoaded,
    duration,
    position,
    error,
    progress,
    formattedPosition,
    formattedDuration,
  } = useVoicePlayback(audioUrl, {
    onPlaybackStart,
    onPlaybackComplete,
    onPlaybackError,
  });

  // Animation for progress bar
  const [progressAnim] = useState(new Animated.Value(0));

  // Update progress animation
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  // Handle seek on progress bar press
  const handleSeek = (event: any) => {
    if (!isLoaded || isLoading) return;

    const { locationX } = event.nativeEvent;
    const width = event.nativeEvent.target?.offsetWidth || 200;
    const seekPosition =
      (locationX / width) * (duration || initialDuration || 0);
    seek(seekPosition);
  };

  // Render loading state
  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          style,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <ActivityIndicator size="small" color={theme.colors.primary[500]} />
        <Text
          style={[styles.loadingText, { color: theme.colors.text.secondary }]}
        >
          Loading audio...
        </Text>
      </View>
    );
  }

  // Render error state
  if (fetchError || error) {
    return (
      <View
        style={[
          styles.container,
          style,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <Text style={[styles.errorText, { color: theme.colors.error[600] }]}>
          {fetchError || error?.message || "Failed to load audio"}
        </Text>
      </View>
    );
  }

  // Compact player for small mode
  if (small) {
    return (
      <View
        style={[
          styles.smallContainer,
          style,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <TouchableOpacity
          onPress={togglePlayPause}
          style={styles.smallPlayButton}
        >
          <Text style={[styles.playIcon, { color: theme.colors.text.inverse }]}>
            {isPlaying ? "⏸️" : "▶️"}
          </Text>
        </TouchableOpacity>

        <View style={styles.smallProgressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        <Text style={styles.smallDuration}>
          {formattedPosition} /{" "}
          {formattedDuration || formatTime(initialDuration || 0)}
        </Text>
      </View>
    );
  }

  // Full player
  return (
    <View style={[styles.container, style]}>
      {/* Play/Pause Button */}
      <TouchableOpacity onPress={togglePlayPause} style={styles.playButton}>
        <View style={[styles.playIcon, isPlaying && styles.pauseIcon]}>
          {isPlaying ? (
            <View style={styles.pauseIconInner}>
              <View
                style={[
                  styles.pauseBar,
                  { backgroundColor: theme.colors.text.inverse },
                ]}
              />
              <View
                style={[
                  styles.pauseBar,
                  { backgroundColor: theme.colors.text.inverse },
                ]}
              />
            </View>
          ) : (
            <View
              style={[
                styles.playTriangle,
                { borderBottomColor: theme.colors.text.inverse },
              ]}
            />
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.controlsContainer}>
        {/* Progress Bar */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSeek}
          style={styles.progressContainer}
        >
          <View
            style={[
              styles.progressBackground,
              { backgroundColor: theme.colors.neutral[300] },
            ]}
          />
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: theme.colors.primary[500],
              },
            ]}
          />
        </TouchableOpacity>

        {/* Duration Text */}
        <View style={styles.timeContainer}>
          <Text
            style={[styles.timeText, { color: theme.colors.text.secondary }]}
          >
            {formattedPosition}
          </Text>
          <Text
            style={[styles.timeText, { color: theme.colors.text.secondary }]}
          >
            {formattedDuration || formatTime(initialDuration || 0)}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Helper to format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  playIcon: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  playTriangle: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderBottomWidth: 18,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "transparent",
    transform: [{ rotate: "90deg" }],
    marginLeft: 4,
  },
  pauseIcon: {},
  pauseIconInner: {
    flexDirection: "row",
    width: 18,
    height: 18,
    justifyContent: "space-between",
    alignItems: "center",
  },
  pauseBar: {
    width: 6,
    height: 18,
    backgroundColor: "transparent",
    borderRadius: 2,
  },
  controlsContainer: {
    flex: 1,
  },
  progressContainer: {
    height: 20,
    justifyContent: "center",
    marginBottom: 4,
  },
  progressBackground: {
    height: 4,
    backgroundColor: "transparent",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    right: 0,
  },
  progressBar: {
    height: 4,
    backgroundColor: "transparent",
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeText: {
    fontSize: 12,
    color: undefined,
  },
  loadingText: {
    marginLeft: 8,
    color: undefined,
  },
  errorText: {
    color: undefined,
  },

  // Small player styles
  smallContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    backgroundColor: "transparent",
    borderRadius: 16,
  },
  smallPlayButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  smallProgressContainer: {
    flex: 1,
    height: 4,
    backgroundColor: "transparent",
    borderRadius: 2,
    marginHorizontal: 8,
    overflow: "hidden",
  },
  smallDuration: {
    fontSize: 12,
    color: undefined,
    marginLeft: 8,
  },
});
