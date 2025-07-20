import { Audio } from "expo-av";
import { VoicePlayer } from "../types/messaging";

/**
 * Voice player implementation for React Native using Expo AV
 */
export class ExpoVoicePlayer implements VoicePlayer {
  private sound: Audio.Sound | null = null;
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
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
      if (this.sound && this.currentUrl === url && !this.isPlaying) {
        await this.sound.playAsync();
        this.isPlaying = true;
        this.startPositionTracking();
        return;
      }

      // Stop current playback if playing different URL
      if (this.sound && this.currentUrl !== url) {
        await this.stop();
      }

      // Load new audio if needed
      if (!this.sound || this.currentUrl !== url) {
        await this.loadAudio(url);
      }

      // Start playback
      if (this.sound) {
        await this.sound.playAsync();
        this.isPlaying = true;
        this.startPositionTracking();
        console.log("Voice playback started for:", url);
      }
    } catch (error) {
      console.error("Failed to play audio:", error);
      this.cleanup();
      throw new Error(`Failed to play audio: ${error.message}`);
    }
  }

  /**
   * Pauses the current playback
   */
  async pause(): Promise<void> {
    try {
      if (this.sound && this.isPlaying) {
        await this.sound.pauseAsync();
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
      if (this.sound) {
        await this.sound.stopAsync();
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
      if (this.sound && position >= 0 && position <= this.duration) {
        const positionMs = position * 1000;
        await this.sound.setPositionAsync(positionMs);
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
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      // Create new sound
      const { sound, status } = await Audio.Sound.createAsync(
        { uri: url },
        {
          shouldPlay: false,
          isLooping: false,
          volume: 1.0,
        }
      );

      this.sound = sound;
      this.currentUrl = url;

      // Set up playback status listener
      this.sound.setOnPlaybackStatusUpdate((status) => {
        this.handlePlaybackStatusUpdate(status);
      });

      // Get initial duration
      if (status.isLoaded) {
        this.duration = (status.durationMillis || 0) / 1000;
      }

      console.log("Voice audio loaded, duration:", this.duration, "seconds");
    } catch (error) {
      console.error("Failed to load audio:", error);
      throw new Error(`Failed to load audio: ${error.message}`);
    }
  }

  /**
   * Handles playback status updates
   */
  private handlePlaybackStatusUpdate(status: any): void {
    if (status.isLoaded) {
      this.currentTime = (status.positionMillis || 0) / 1000;
      this.duration = (status.durationMillis || 0) / 1000;
      this.isPlaying = status.isPlaying || false;

      // Handle playback completion
      if (status.didJustFinish) {
        this.isPlaying = false;
        this.currentTime = 0;
        this.stopPositionTracking();
        console.log("Voice playback completed");
      }
    } else if (status.error) {
      console.error("Playback error:", status.error);
      this.cleanup();
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
      if (this.sound && this.isPlaying) {
        try {
          const status = await this.sound.getStatusAsync();
          if (status.isLoaded) {
            this.currentTime = (status.positionMillis || 0) / 1000;
          }
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

    if (this.sound) {
      this.sound.unloadAsync().catch(console.error);
      this.sound = null;
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
      isLoaded: this.sound !== null,
    };
  }

  /**
   * Sets the playback volume (0.0 to 1.0)
   */
  async setVolume(volume: number): Promise<void> {
    try {
      if (this.sound && volume >= 0 && volume <= 1) {
        await this.sound.setVolumeAsync(volume);
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
      if (this.sound) {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded) {
          return status.volume || 1.0;
        }
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
