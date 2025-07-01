import { useState, useEffect, useCallback } from "react";
import {
  createAudioPlayer,
  useAudioPlayerStatus,
  AudioPlayer,
} from "expo-audio";

export interface AudioPlaybackState {
  isPlaying: boolean;
  isLoading: boolean;
  position: number; // ms
  duration: number; // ms
  playbackRate: number;
  error: string | null;
}

export interface UseAudioPlaybackResult {
  playbackState: AudioPlaybackState;
  loadAudio: (uri: string) => Promise<boolean>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (position: number) => void;
  setPlaybackRate: (rate: number) => void;
  getProgress: () => number;
  getFormattedTime: (ms?: number) => string;
  getRemainingTime: () => string;
}

export function useAudioPlayback(
  autoPlay = false,
  onPlaybackComplete?: () => void
): UseAudioPlaybackResult {
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const status = useAudioPlayerStatus(player);

  const [playbackState, setPlaybackState] = useState<AudioPlaybackState>({
    isPlaying: false,
    isLoading: false,
    position: 0,
    duration: 0,
    playbackRate: 1,
    error: null,
  });

  // Reflect status changes into local state
  useEffect(() => {
    if (!status) return;

    setPlaybackState((prev) => ({
      ...prev,
      isPlaying: status.playing ?? false,
      position: Math.floor((status.currentTime ?? 0) * 1000),
      duration: Math.floor((status.duration ?? 0) * 1000),
      playbackRate: status.playbackRate ?? 1,
      isLoading: false,
    }));

    if (status.didJustFinish) {
      onPlaybackComplete?.();
    }
  }, [status, onPlaybackComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      player?.remove();
    };
  }, [player]);

  const loadAudio = useCallback(
    async (uri: string): Promise<boolean> => {
      try {
        setPlaybackState((p) => ({ ...p, isLoading: true }));
        // dispose old
        player?.remove();
        const newPlayer = createAudioPlayer({ uri });
        setPlayer(newPlayer);
        if (autoPlay) newPlayer.play();
        return true;
      } catch (e) {
        console.error("Failed to load audio", e);
        setPlaybackState((p) => ({
          ...p,
          error: "Failed to load audio",
          isLoading: false,
        }));
        return false;
      }
    },
    [autoPlay, player]
  );

  const play = useCallback(() => {
    player?.play();
  }, [player]);

  const pause = useCallback(() => {
    player?.pause();
  }, [player]);

  const stop = useCallback(() => {
    if (!player) return;
    player.pause();
    player.seekTo(0);
  }, [player]);

  const seekTo = useCallback(
    (position: number) => {
      if (!player) return;
      const ms = Math.max(0, Math.min(position, playbackState.duration));
      player.seekTo(ms / 1000);
    },
    [player, playbackState.duration]
  );

  const setPlaybackRate = useCallback(
    (rate: number) => {
      if (!player) return;
      const r = Math.max(0.5, Math.min(rate, 2));
      player.setPlaybackRate(r);
    },
    [player]
  );

  const getProgress = useCallback(() => {
    if (playbackState.duration === 0) return 0;
    return playbackState.position / playbackState.duration;
  }, [playbackState]);

  const getFormattedTime = useCallback(
    (ms?: number) => {
      const total = Math.floor((ms ?? playbackState.position) / 1000);
      const mins = Math.floor(total / 60);
      const secs = total % 60;
      return `${mins}:${secs.toString().padStart(2, "0")}`;
    },
    [playbackState.position]
  );

  const getRemainingTime = useCallback(() => {
    return getFormattedTime(
      Math.max(0, playbackState.duration - playbackState.position)
    );
  }, [getFormattedTime, playbackState]);

  return {
    playbackState,
    loadAudio,
    play,
    pause,
    stop,
    seekTo,
    setPlaybackRate,
    getProgress,
    getFormattedTime,
    getRemainingTime,
  };
}
