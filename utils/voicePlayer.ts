import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import type { AudioStatus } from "expo-audio";
import type { AudioPlayer } from "expo-audio";
import { VoicePlayer } from "../types/messaging";

/**
 * Voice player implementation for React Native using expo-audio
 */
export class ExpoVoicePlayer implements VoicePlayer {
  private player: AudioPlayer | null = null;
  private currentUrl: string | null = null;
  private positionUpdateInterval: NodeJS.Timeout | null = null;

  public isPlaying = false;
  public currentTime = 0;
  public duration = 0;

  constructor() {
    this.setupAudio();
  }

  /**
   * Sets up audio playback configuration
   */
  private async setupAudio(): Promise<void> {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldRouteThroughEarpiece: false,
        shouldPlayInBackground: false,
      });
    } catch (error) {
      console.error("Failed to setup audio playback:", error);
    }
  }

  /**
   * Plays audio from the given URL
   */
  async play(url: string): Promise<void> {
    try {
      // If already playing the same URL, just resume
      if (this.player && this.currentUrl === url && !this.isPlaying) {
        this.player.play();
        this.isPlaying = true;
        this.startPositionTracking();
        return;
      }

      // Stop current playback if playing different URL
      if (this.player && this.currentUrl !== url) {
        await this.stop();
      }

      // Load new audio if needed
      if (!this.player || this.currentUrl !== url) {
        await this.loadAudio(url);
      }

      // Start playback
      if (this.player) {
        this.player.play();
        this.isPlaying = true;
        this.startPositionTracking();
        console.log("Voice playback started for:", url);
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
      this.cleanup();
      if (error instanceof Error) {
        throw new Error(`Failed to play audio: ${error.message}`);
      } else {
        throw new Error("Failed to play audio: Unknown error");
      }
    }
  }

  /**
   * Pauses the current playback
   */
  async pause(): Promise<void> {
    try {
      if (this.player && this.isPlaying) {
        this.player.pause();
        this.isPlaying = false;
        this.stopPositionTracking();
        console.log("Voice playback paused");
      }
    } catch (error) {
      console.error("Failed to pause audio:", error);
    }
  }

  /**
   * Stops the current playback and resets position
   */
  async stop(): Promise<void> {
    try {
      if (this.player) {
        this.player.pause();
        await this.player.seekTo(0);
        this.isPlaying = false;
        this.currentTime = 0;
        this.stopPositionTracking();
        console.log("Voice playback stopped");
      }
    } catch (error) {
      console.error("Failed to stop audio:", error);
    }
  }

  /**
   * Seeks to a specific position in the audio
   */
  async seek(position: number): Promise<void> {
    try {
      if (this.player && position >= 0 && position <= this.duration) {
        await this.player.seekTo(position);
        this.currentTime = position;
        console.log("Voice playback seeked to:", position, "seconds");
      }
    } catch (error) {
      console.error("Failed to seek audio:", error);
    }
  }

  /**
   * Loads audio from URL
   */
  private async loadAudio(url: string): Promise<void> {
    try {
      // Unload previous sound
      if (this.player) {
        this.player.remove();
      }

      // Create new player
      const player = createAudioPlayer({ uri: url });
      this.player = player;
      this.currentUrl = url;

      // Set up playback status listener
      player.addListener("playbackStatusUpdate", (status: AudioStatus) => {
        this.handlePlaybackStatusUpdate(status);
      });

      // Get initial duration
      this.duration = player.duration || 0;

      console.log("Voice audio loaded, duration:", this.duration, "seconds");
    } catch (error) {
      console.error("Failed to load audio:", error);
      if (error instanceof Error) {
        throw new Error(`Failed to load audio: ${error.message}`);
      } else {
        throw new Error("Failed to load audio: Unknown error");
      }
    }
  }

  /**
   * Handles playback status updates
   */
  private handlePlaybackStatusUpdate(status: AudioStatus): void {
    // Map AudioStatus to our fields
    this.currentTime = status.currentTime || 0;
    this.duration = status.duration || 0;
    this.isPlaying = status.playing || false;
    if (status.didJustFinish) {
      this.isPlaying = false;
      this.currentTime = 0;
      this.stopPositionTracking();
      console.log("Voice playback completed");
    }
  }

  /**
   * Starts position tracking for UI updates
   */
  private startPositionTracking(): void {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
    }

    this.positionUpdateInterval = setInterval(async () => {
      if (this.player && this.isPlaying) {
        try {
          this.currentTime = this.player.currentTime || 0;
        } catch (error) {
          console.error("Failed to get playback position:", error);
        }
      }
    }, 100);
  }

  /**
   * Stops position tracking
   */
  private stopPositionTracking(): void {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }

  /**
   * Cleans up player resources
   */
  private cleanup(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.currentUrl = null;
    this.stopPositionTracking();

    if (this.player) {
      try {
        this.player.remove();
      } catch (e) {
        console.error(e);
      }
      this.player = null;
    }
  }

  /**
   * Gets the current playback status
   */
  getStatus(): {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isLoaded: boolean;
  } {
    return {
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.duration,
      isLoaded: this.player !== null,
    };
  }

  /**
   * Sets the playback volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    try {
      if (this.player && volume >= 0 && volume <= 1) {
        this.player.volume = volume;
      }
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  }

  /**
   * Gets the current volume
   */
  async getVolume(): Promise<number> {
    try {
      if (this.player) {
        return this.player.volume ?? 1.0;
      }
      return 1.0;
    } catch (error) {
      console.error("Failed to get volume:", error);
      return 1.0;
    }
  }

  /**
   * Disposes of the player and cleans up resources
   */
  async dispose(): Promise<void> {
    try {
      await this.stop();
      this.cleanup();
      console.log("Voice player disposed");
    } catch (error) {
      console.error("Failed to dispose player:", error);
    }
  }
}

/**
 * Factory function to create a voice player instance
 */
export function createVoicePlayer(): VoicePlayer {
  return new ExpoVoicePlayer();
}
