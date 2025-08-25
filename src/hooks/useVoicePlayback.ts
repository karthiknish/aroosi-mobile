import { useEffect, useCallback, useMemo } from "react";
import { useAudioPlayback } from "./useAudioPlayback";

interface VoicePlaybackOptions {
  autoPlay?: boolean;
  onPlaybackStart?: () => void;
  onPlaybackStop?: () => void;
  onPlaybackComplete?: () => void;
  onPlaybackError?: (error: Error) => void;
  onPositionChange?: (position: number) => void;
}

/**
 * Hook for voice message playback functionality
 */
export function useVoicePlayback(
  uri?: string,
  options: VoicePlaybackOptions = {}
) {
  const {
    autoPlay = false,
    onPlaybackStart,
    onPlaybackStop,
    onPlaybackComplete,
    onPlaybackError,
    onPositionChange,
  } = options;
  // Wire up the expo-audio based playback
  const {
    playbackState,
    loadAudio,
    play,
    pause,
    stop,
    seekTo,
    getProgress,
    getFormattedTime,
  } = useAudioPlayback(autoPlay, onPlaybackComplete);

  // Load/replace audio when uri changes
  useEffect(() => {
    if (uri) {
      loadAudio(uri).then((ok) => {
        if (ok && autoPlay) {
          onPlaybackStart?.();
        }
      }).catch((err) => {
        const e = err instanceof Error ? err : new Error("Failed to load audio");
        onPlaybackError?.(e);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri]);

  // Bridge position updates to consumer if requested
  useEffect(() => {
    if (onPositionChange) {
      onPositionChange(Math.floor(playbackState.position / 1000));
    }
  }, [playbackState.position, onPositionChange]);

  const seek = useCallback(
    async (seconds: number) => {
      seekTo(seconds * 1000);
    },
    [seekTo]
  );

  const togglePlayPause = useCallback(async () => {
    if (playbackState.isPlaying) {
      pause();
      onPlaybackStop?.();
    } else {
      play();
      onPlaybackStart?.();
    }
  }, [playbackState.isPlaying, pause, play, onPlaybackStart, onPlaybackStop]);

  const isLoaded = useMemo(() => {
    // Consider loaded when we have duration or not loading
    return playbackState.duration > 0 || !playbackState.isLoading;
  }, [playbackState.duration, playbackState.isLoading]);

  const durationSec = Math.floor(playbackState.duration / 1000);
  const positionSec = Math.floor(playbackState.position / 1000);

  return {
    // Core functionality
    play,
    pause,
    stop,
    seek,
    togglePlayPause,

    // State
    isPlaying: playbackState.isPlaying,
    isLoaded,
    duration: durationSec,
    position: positionSec,
    error: playbackState.error ? new Error(playbackState.error) : null,

    // Progress helpers
    progress: getProgress(),
    formattedPosition: getFormattedTime(playbackState.position),
    formattedDuration: getFormattedTime(playbackState.duration),
  };
}

// Helper to format time as MM:SS retained via useAudioPlayback.getFormattedTime
