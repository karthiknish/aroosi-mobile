import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  AudioModule,
} from "expo-audio";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Rect } from "react-native-svg";
import { Colors } from "../constants/Colors";

interface VoiceMessagePlayerProps {
  audioUri: string;
  duration: number;
  isOwn?: boolean;
  onPlaybackStatusUpdate?: (status: any) => void;
  style?: any;
  waveformData?: number[];
}

const { width: screenWidth } = Dimensions.get("window");
const WAVEFORM_WIDTH = screenWidth * 0.4;
const WAVEFORM_HEIGHT = 40;
const BAR_WIDTH = 2;
const BAR_SPACING = 1;

export function VoiceMessagePlayer({
  audioUri,
  duration,
  isOwn = false,
  onPlaybackStatusUpdate,
  style,
  waveformData,
}: VoiceMessagePlayerProps) {
  const player = useAudioPlayer({ uri: audioUri });
  const status = useAudioPlayerStatus(player);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  // Generate default waveform data if not provided
  const defaultWaveformData = React.useMemo(() => {
    if (waveformData) return waveformData;

    const bars = Math.floor(WAVEFORM_WIDTH / (BAR_WIDTH + BAR_SPACING));
    return Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2);
  }, [waveformData]);

  useEffect(() => {
    return () => {
      // player is managed by hook; ensure it stops
      try {
        player?.pause?.();
      } catch {}
    };
  }, [player]);

  useEffect(() => {
    if (status?.playing) startPulseAnimation();
    else stopPulseAnimation();
  }, [status?.playing]);

  const startPulseAnimation = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.current.start();
  };

  const stopPulseAnimation = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
      animatedValue.setValue(0);
    }
  };

  // Reflect status updates
  useEffect(() => {
    if (!status) return;
    setCurrentPosition(Math.floor((status.currentTime || 0) * 1000));
    if (typeof status.duration === "number")
      setPlaybackDuration(Math.floor(status.duration * 1000));
    if (status.didJustFinish) {
      setCurrentPosition(0);
    }
    onPlaybackStatusUpdate?.(status as any);
  }, [status, onPlaybackStatusUpdate]);

  const handlePlayPause = async () => {
    try {
      setIsLoading(true);
      if (status?.playing) player.pause();
      else player.play();
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to play/pause audio:", error);
      setIsLoading(false);
    }
  };

  const handleSeek = async (position: number) => {
    try {
      // position in ms -> seconds
      player.seekTo((position || 0) / 1000);
      setCurrentPosition(position);
    } catch (error) {
      console.error("Failed to seek audio:", error);
    }
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const getProgressPercentage = () => {
    if (playbackDuration === 0) return 0;
    return (currentPosition / playbackDuration) * 100;
  };

  const renderWaveform = () => {
    const progressPercentage = getProgressPercentage();
    const bars = defaultWaveformData;

    return (
      <Svg width={WAVEFORM_WIDTH} height={WAVEFORM_HEIGHT}>
        {bars.map((amplitude, index) => {
          const x = index * (BAR_WIDTH + BAR_SPACING);
          const barHeight = amplitude * WAVEFORM_HEIGHT;
          const y = (WAVEFORM_HEIGHT - barHeight) / 2;

          const barProgressPercentage = (index / bars.length) * 100;
          const isPlayed = barProgressPercentage <= progressPercentage;

          return (
            <Rect
              {...({
                x,
                y,
                width: BAR_WIDTH,
                height: barHeight,
                fill: isPlayed ? Colors.primary[500] : Colors.gray[300],
                rx: BAR_WIDTH / 2,
              } as any)}
              key={index}
            />
          );
        })}
      </Svg>
    );
  };

  const handleWaveformPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const percentage = locationX / WAVEFORM_WIDTH;
    const seekPosition = percentage * playbackDuration;
    handleSeek(seekPosition);
  };

  const playButtonScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={[styles.container, isOwn && styles.ownMessage, style]}>
      <Animated.View
        style={[styles.playButton, { transform: [{ scale: playButtonScale }] }]}
      >
        <TouchableOpacity
          onPress={handlePlayPause}
          disabled={isLoading}
          style={[
            styles.playButtonInner,
            isOwn ? styles.ownPlayButton : styles.otherPlayButton,
          ]}
        >
          {isLoading ? (
            <Animated.View
              style={[
                styles.loadingIndicator,
                {
                  transform: [
                    {
                      rotate: animatedValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0deg", "360deg"],
                      }),
                    },
                  ],
                },
              ]}
            />
          ) : (
            <Ionicons
              name={status?.playing ? "pause" : "play"}
              size={16}
              color={isOwn ? Colors.background.primary : Colors.primary[500]}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.waveformContainer}>
        <TouchableOpacity
          onPress={handleWaveformPress}
          activeOpacity={0.8}
          style={styles.waveformTouchable}
        >
          {renderWaveform()}
        </TouchableOpacity>

        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, isOwn && styles.ownTimeText]}>
            {formatTime(currentPosition)} / {formatTime(playbackDuration)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.gray[100],
    borderRadius: 20,
    padding: 12,
    maxWidth: screenWidth * 0.7,
  },
  ownMessage: {
    backgroundColor: Colors.primary[500],
  },
  playButton: {
    marginRight: 12,
  },
  playButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
  },
  ownPlayButton: {
    backgroundColor: Colors.background.primary,
  },
  otherPlayButton: {
    backgroundColor: Colors.primary[50],
  },
  loadingIndicator: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderTopColor: "transparent",
    borderRadius: 8,
  },
  waveformContainer: {
    flex: 1,
  },
  waveformTouchable: {
    marginBottom: 4,
  },
  timeContainer: {
    alignItems: "flex-end",
  },
  timeText: {
    fontSize: 12,
    color: Colors.gray[600],
    fontFamily: "NunitoSans-Regular",
  },
  ownTimeText: {
    color: Colors.background.primary,
    opacity: 0.8,
  },
  recorderContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.error[50],
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 50,
  },
  cancelButton: {
    padding: 8,
    marginRight: 12,
  },
  recordingIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.error[500],
    marginRight: 12,
  },
  durationText: {
    flex: 1,
    fontSize: 16,
    color: Colors.gray[900],
    fontFamily: "NunitoSans-Medium",
    textAlign: "center",
  },
  stopButton: {
    padding: 8,
    marginLeft: 12,
  },
  recordButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
});

// Voice message recorder component
interface VoiceMessageRecorderProps {
  onRecordingComplete: (audioData: {
    uri: string;
    duration: number;
    fileSize: number;
  }) => void;
  onRecordingCancel: () => void;
  maxDuration?: number;
  style?: any;
}

export function VoiceMessageRecorder({
  onRecordingComplete,
  onRecordingCancel,
  maxDuration = 120000, // 2 minutes
  style,
}: VoiceMessageRecorderProps) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const durationInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isRecording) {
      startRecordingAnimation();
      startDurationTimer();
    } else {
      stopRecordingAnimation();
      stopDurationTimer();
    }

    return () => {
      stopDurationTimer();
    };
  }, [isRecording]);

  const startRecordingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopRecordingAnimation = () => {
    animatedValue.setValue(0);
  };

  const startDurationTimer = () => {
    const startTime = Date.now();
    durationInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRecordingDuration(elapsed);

      if (elapsed >= maxDuration) {
        stopRecording();
      }
    }, 100);
  };

  const stopDurationTimer = () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
  };

  const startRecording = async () => {
    try {
      const p = await AudioModule.requestRecordingPermissionsAsync();
      if (!p.granted) {
        console.error("Audio recording permission not granted");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error("Failed to start recording:", error);
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri || null;
      if (uri) {
        const fileInfo = await FileSystem.getInfoAsync(uri);

        onRecordingComplete({
          uri,
          duration: recordingDuration,
          fileSize:
            fileInfo.exists &&
            !fileInfo.isDirectory &&
            typeof fileInfo.size === "number"
              ? fileInfo.size
              : 0,
        });
      }
      setRecordingDuration(0);
    } catch (error) {
      console.error("Failed to stop recording:", error);
    }
  };

  const cancelRecording = async () => {
    try {
      setIsRecording(false);
      await recorder.stop();
      const uri = recorder.uri || null;
  if (uri) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
      setRecordingDuration(0);
      onRecordingCancel();
    } catch (error) {
      console.error("Failed to cancel recording:", error);
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const recordButtonScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const recordButtonOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });

  if (isRecording) {
    return (
      <View style={[styles.recorderContainer, style]}>
        <TouchableOpacity onPress={cancelRecording} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color={Colors.error[500]} />
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.recordingIndicator,
            {
              transform: [{ scale: recordButtonScale }],
              opacity: recordButtonOpacity,
            },
          ]}
        />

        <Text style={styles.durationText}>
          {formatDuration(recordingDuration)}
        </Text>

        <TouchableOpacity onPress={stopRecording} style={styles.stopButton}>
          <Ionicons name="send" size={24} color={Colors.primary[500]} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={startRecording}
      style={[styles.recordButton, style]}
    >
      <Ionicons name="mic" size={24} color={Colors.primary[500]} />
    </TouchableOpacity>
  );
}

