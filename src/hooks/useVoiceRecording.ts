import { useState, useEffect, useRef, useCallback } from "react";
import { useAudioRecorder, RecordingPresets, AudioModule, setAudioModeAsync } from "expo-audio";
import { Platform } from "react-native";
import { useVoiceMessageLimits } from "./useMessagingFeatures";

interface VoiceRecordingOptions {
  maxDuration?: number; // in seconds
  quality?: any;
  onRecordingStart?: () => void;
  onRecordingStop?: (uri: string, duration: number) => void;
  onRecordingError?: (error: Error) => void;
  onDurationExceeded?: () => void;
}

export interface VoiceRecordingState {
  isRecording: boolean;
  duration: number;
  audioUri: string | null;
  error: string | null;
  hasPermission: boolean | null;
  maxDuration: number;
}

export interface UseVoiceRecordingResult {
  // Core functionality
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<Blob | null>;
  cancelRecording: () => Promise<void>;

  // State
  isRecording: boolean;
  duration: number;
  audioUri: string | null;
  error: string | null;
  hasPermission: boolean | null;

  // Subscription validation
  maxDuration: number;
  isDurationValid: (currentDuration?: number) => boolean;
}

/**
 * Hook for voice recording functionality
 */
export function useVoiceRecording(options: VoiceRecordingOptions = {}): UseVoiceRecordingResult {
  const {
    maxDuration = 300, // 5 minutes default
    quality = RecordingPresets.HIGH_QUALITY,
    onRecordingStart,
    onRecordingStop,
    onRecordingError,
    onDurationExceeded,
  } = options;
  const audioRecorder = useAudioRecorder(quality);
  const [recording, setRecording] = useState<any | null>(null);
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
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(permission.status === "granted");

        if (permission.status !== "granted") {
          setError("Permission to access microphone is required");
        }

        // Set audio mode for recording
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
          shouldPlayInBackground: true,
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
        const permission = await AudioModule.requestRecordingPermissionsAsync();
        setHasPermission(permission.status === "granted");

        if (permission.status !== "granted") {
          throw new Error("Permission to access microphone is required");
        }
      }

      // Reset state
      setError(null);
      setDuration(0);
      setAudioUri(null);

      // Prepare and start recording with expo-audio
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();

      setRecording(audioRecorder);
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
  await audioRecorder.stop();
      const finalDuration = Math.floor(
        (Date.now() - startTimeRef.current) / 1000
      );
      setDuration(finalDuration);

  // Get recording URI
  const uri = audioRecorder.uri;
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
  const cancelRecording = useCallback(async () => {
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
      await audioRecorder.stop();

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
