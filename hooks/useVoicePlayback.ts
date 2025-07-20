import { useState, useEffect, useRef, useCallback } from "react";
import { Audio } from "expo-av";

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

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const positionUpdateInterval = useRef<NodeJS.Timeout | null>(null);

  // Load sound when URI changes
  useEffect(() => {
    let isMounted = true;

    const loadSound = async () => {
      if (!uri) {
        return;
      }

      try {
        // Unload any existing sound
        if (sound) {
          await sound.unloadAsync();
        }

        // Reset state
        setIsLoaded(false);
        setDuration(0);
        setPosition(0);
        setError(null);

        // Load new sound
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: autoPlay },
          onPlaybackStatusUpdate
        );

        if (isMounted) {
          setSound(newSound);
          setIsLoaded(true);

          if (autoPlay) {
            setIsPlaying(true);
            onPlaybackStart?.();
            startPositionTracking();
          }
        } else {
          // Cleanup if component unmounted during loading
          await newSound.unloadAsync();
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err : new Error("Failed to load audio")
          );
          onPlaybackError?.(
            err instanceof Error ? err : new Error("Failed to load audio")
          );
        }
      }
    };

    loadSound();

    return () => {
      isMounted = false;
      stopPositionTracking();

      // Cleanup sound
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [uri]);

  // Handle playback status updates
  const onPlaybackStatusUpdate = useCallback(
    (status: Audio.PlaybackStatus) => {
      if (!status.isLoaded) return;

      // Update duration and position
      if (status.durationMillis) {
        setDuration(status.durationMillis / 1000);
      }

      if (status.positionMillis !== undefined) {
        setPosition(status.positionMillis / 1000);
        onPositionChange?.(status.positionMillis / 1000);
      }

      // Update playing state
      setIsPlaying(status.isPlaying);

      // Handle playback completion
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        stopPositionTracking();
        onPlaybackComplete?.();
      }
    },
    [onPlaybackComplete, onPositionChange]
  );

  // Start tracking position during playback
  const startPositionTracking = useCallback(() => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
    }

    positionUpdateInterval.current = setInterval(async () => {
      if (sound && isPlaying) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.positionMillis !== undefined) {
          setPosition(status.positionMillis / 1000);
          onPositionChange?.(status.positionMillis / 1000);
        }
      }
    }, 100);
  }, [sound, isPlaying, onPositionChange]);

  // Stop tracking position
  const stopPositionTracking = useCallback(() => {
    if (positionUpdateInterval.current) {
      clearInterval(positionUpdateInterval.current);
      positionUpdateInterval.current = null;
    }
  }, []);

  // Play function
  const play = useCallback(
    async (playbackUri?: string) => {
      try {
        setError(null);

        // If a new URI is provided, load it
        if (playbackUri && playbackUri !== uri) {
          if (sound) {
            await sound.unloadAsync();
          }

          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: playbackUri },
            { shouldPlay: true },
            onPlaybackStatusUpdate
          );

          setSound(newSound);
          setIsLoaded(true);
          setIsPlaying(true);
          startPositionTracking();
          onPlaybackStart?.();
          return;
        }

        // Otherwise play existing sound
        if (sound && isLoaded) {
          await sound.playFromPositionAsync(position * 1000);
          setIsPlaying(true);
          startPositionTracking();
          onPlaybackStart?.();
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to play audio")
        );
        onPlaybackError?.(
          err instanceof Error ? err : new Error("Failed to play audio")
        );
      }
    },
    [
      sound,
      uri,
      isLoaded,
      position,
      onPlaybackStatusUpdate,
      onPlaybackStart,
      onPlaybackError,
    ]
  );

  // Pause function
  const pause = useCallback(async () => {
    try {
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        stopPositionTracking();
        onPlaybackStop?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to pause audio"));
      onPlaybackError?.(
        err instanceof Error ? err : new Error("Failed to pause audio")
      );
    }
  }, [sound, isPlaying, onPlaybackStop, onPlaybackError]);

  // Stop function
  const stop = useCallback(async () => {
    try {
      if (sound) {
        await sound.stopAsync();
        await sound.setPositionAsync(0);
        setIsPlaying(false);
        setPosition(0);
        stopPositionTracking();
        onPlaybackStop?.();
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to stop audio"));
      onPlaybackError?.(
        err instanceof Error ? err : new Error("Failed to stop audio")
      );
    }
  }, [sound, onPlaybackStop, onPlaybackError]);

  // Seek function
  const seek = useCallback(
    async (seconds: number) => {
      try {
        if (sound && isLoaded) {
          await sound.setPositionAsync(seconds * 1000);
          setPosition(seconds);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to seek audio")
        );
        onPlaybackError?.(
          err instanceof Error ? err : new Error("Failed to seek audio")
        );
      }
    },
    [sound, isLoaded, onPlaybackError]
  );

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  return {
    // Core functionality
    play,
    pause,
    stop,
    seek,
    togglePlayPause,

    // State
    isPlaying,
    isLoaded,
    duration,
    position,
    error,

    // Progress helpers
    progress: duration > 0 ? position / duration : 0,
    formattedPosition: formatTime(position),
    formattedDuration: formatTime(duration),
  };
}

// Helper to format time as MM:SS
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
