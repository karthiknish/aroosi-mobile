import { useState, useEffect, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import { Platform } from "react-native";
import { useVoiceMessageLimits } from "./useMessagingFeatures";

interface VoiceRecordingOptions {
  maxDuration?: number; // in seconds
  quality?: Audio.RecordingOptionsQualityPreset;
  onRecordingStart?: () => void;
  onRecordingStop?: (uri: string, duration: number) => void;
  onRecordingError?: (error: Error) => void;
  onDurationExceeded?: () => void;
}

/**
 * Hook for voice recording functionality
 */
export function useVoiceRecording(options: VoiceRecordingOptions = {}) {
  const {
    maxDuration = 300, // 5 minutes default
    quality = Audio.RecordingOptionsPresets.HIGH_QUALITY,
    onRecordingStart,
    onRecordingStop,
    onRecordingError,
    onDurationExceeded,
  } = options;

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Get subscription-based voice message limits
  const { maxDuration: subscriptionMaxDuration, isDurationAllowed } =
    useVoiceMessageLimits();

  // Use the more restrictive of the two max durations
  const effectiveMaxDuration =
    subscriptionMaxDuration > 0 && subscriptionMaxDuration < maxDuration
      ? subscriptionMaxDuration
      : maxDuration;

  // Request permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const permission = await Audio.requestPermissionsAsync();
        setHasPermission(permission.status === "granted");

        if (permission.status !== "granted") {
          setError("Permission to access microphone is required");
        }

        // Set audio mode for recording
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to request permissions"
        );
        onRecordingError?.(
          err instanceof Error
            ? err
            : new Error("Failed to request permissions")
        );
      }
    })();

    // Cleanup
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

  // Start recording function
  const startRecording = useCallback(async (): Promise<boolean> => {
    try {
      // Check permissions
      if (hasPermission !== true) {
        const permission = await Audio.requestPermissionsAsync();
        setHasPermission(permission.status === "granted");

        if (permission.status !== "granted") {
          throw new Error("Permission to access microphone is required");
        }
      }

      // Reset state
      setError(null);
      setDuration(0);
      setAudioUri(null);

      // Create recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        quality
      );

      setRecording(newRecording);
      setIsRecording(true);
      startTimeRef.current = Date.now();

      // Start duration timer
      durationInterval.current = setInterval(() => {
        const currentDuration = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        setDuration(currentDuration);

        // Check if max duration exceeded
        if (currentDuration >= effectiveMaxDuration) {
          stopRecording();
          onDurationExceeded?.();
        }
      }, 100);

      onRecordingStart?.();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start recording"
      );
      onRecordingError?.(
        err instanceof Error ? err : new Error("Failed to start recording")
      );
      return false;
    }
  }, [
    hasPermission,
    quality,
    effectiveMaxDuration,
    onRecordingStart,
    onDurationExceeded,
    onRecordingError,
  ]);

  // Stop recording function
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    if (!recording) {
      return null;
    }

    try {
      // Stop the timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop recording
      await recording.stopAndUnloadAsync();
      const finalDuration = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      setDuration(finalDuration);

      // Get recording URI
      const uri = recording.getURI();
      setAudioUri(uri || null);
      setIsRecording(false);
      setRecording(null);

      if (uri) {
        onRecordingStop?.(uri, finalDuration);

        // Convert URI to Blob for web compatibility
        if (Platform.OS === "web") {
          const response = await fetch(uri);
          return response.blob();
        } else {
          // For native platforms, create a mock blob
          return new Blob([], { type: "audio/m4a" });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop recording");
      onRecordingError?.(
        err instanceof Error ? err : new Error("Failed to stop recording")
      );
    }

    return null;
  }, [recording, onRecordingStop, onRecordingError]);

  // Cancel recording function
  const cancelRecording = useCallback(() => {
    if (!recording) {
      return;
    }

    try {
      // Stop the timer
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Stop and delete recording
      recording.stopAndUnloadAsync();

      setIsRecording(false);
      setRecording(null);
      setAudioUri(null);
      setDuration(0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to cancel recording"
      );
      onRecordingError?.(
        err instanceof Error ? err : new Error("Failed to cancel recording")
      );
    }
  }, [recording, onRecordingError]);

  // Check if current duration is allowed by subscription
  const isDurationValid = useCallback(
    (currentDuration: number = duration) => {
      return isDurationAllowed(currentDuration);
    },
    [duration, isDurationAllowed]
  );

  return {
    // Core functionality
    startRecording,
    stopRecording,
    cancelRecording,

    // State
    isRecording,
    duration,
    audioUri,
    error,
    hasPermission,

    // Subscription validation
    maxDuration: effectiveMaxDuration,
    isDurationValid,
  };
}
