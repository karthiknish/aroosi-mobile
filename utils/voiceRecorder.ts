import { Audio } from "expo-av";
import { VoiceRecorder } from "../types/messaging";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

/**
 * Voice recorder implementation for React Native using Expo AV
 */
export class ExpoVoiceRecorder implements VoiceRecorder {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;
  private startTime: number = 0;
  private durationInterval: NodeJS.Timeout | null = null;

  public isRecording = false;
  public duration = 0;

  constructor() {
    this.setupAudio();
  }

  /**
   * Sets up audio recording configuration
   */
  private async setupAudio(): Promise<void> {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.error("Failed to setup audio:", error);
      throw new Error("Failed to initialize audio recording");
    }
  }

  /**
   * Starts voice recording
   */
  async startRecording(): Promise<void> {
    try {
      // Check permissions first
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        throw new Error("Microphone permission denied");
      }

      // Stop any existing recording
      if (this.recording) {
        await this.stopRecording();
      }

      // Create new recording
      this.recording = new Audio.Recording();

      const recordingOptions = {
        android: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
          audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: ".m4a",
          outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
          audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      this.isRecording = true;
      this.startTime = Date.now();
      this.duration = 0;

      // Start duration tracking
      this.durationInterval = setInterval(() => {
        if (this.isRecording) {
          this.duration = Math.floor((Date.now() - this.startTime) / 1000);
        }
      }, 100);

      console.log("Voice recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      this.cleanup();
      throw new Error(`Failed to start recording: ${error.message}`);
    }
  }

  /**
   * Stops voice recording and returns the audio blob
   */
  async stopRecording(): Promise<Blob> {
    try {
      if (!this.recording || !this.isRecording) {
        throw new Error("No active recording to stop");
      }

      await this.recording.stopAndUnloadAsync();
      this.recordingUri = this.recording.getURI();
      this.isRecording = false;

      // Clear duration interval
      if (this.durationInterval) {
        clearInterval(this.durationInterval);
        this.durationInterval = null;
      }

      if (!this.recordingUri) {
        throw new Error("Recording failed - no audio file created");
      }

      // Convert file to blob
      const audioBlob = await this.fileToBlob(this.recordingUri);

      console.log(
        "Voice recording stopped, duration:",
        this.duration,
        "seconds"
      );

      return audioBlob;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      this.cleanup();
      throw new Error(`Failed to stop recording: ${error.message}`);
    }
  }

  /**
   * Cancels the current recording
   */
  cancelRecording(): void {
    try {
      if (this.recording && this.isRecording) {
        this.recording.stopAndUnloadAsync().catch(console.error);
      }
      this.cleanup();
      console.log("Voice recording cancelled");
    } catch (error) {
      console.error("Failed to cancel recording:", error);
      this.cleanup();
    }
  }

  /**
   * Converts a file URI to a Blob for uploading
   */
  private async fileToBlob(uri: string): Promise<Blob> {
    try {
      if (Platform.OS === "web") {
        // For web platform, fetch the URI directly
        const response = await fetch(uri);
        return await response.blob();
      } else {
        // For React Native, read the file and create blob
        const fileInfo = await FileSystem.getInfoAsync(uri);
        if (!fileInfo.exists) {
          throw new Error("Recording file not found");
        }

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Convert base64 to blob
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);

        return new Blob([byteArray], { type: "audio/m4a" });
      }
    } catch (error) {
      console.error("Failed to convert file to blob:", error);
      throw new Error(`Failed to process recording: ${error.message}`);
    }
  }

  /**
   * Cleans up recording resources
   */
  private cleanup(): void {
    this.isRecording = false;
    this.duration = 0;
    this.recording = null;
    this.recordingUri = null;

    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
  }

  /**
   * Gets the current recording status
   */
  getStatus(): {
    isRecording: boolean;
    duration: number;
    canRecord: boolean;
  } {
    return {
      isRecording: this.isRecording,
      duration: this.duration,
      canRecord: !this.isRecording,
    };
  }

  /**
   * Checks if microphone permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Failed to check permissions:", error);
      return false;
    }
  }

  /**
   * Requests microphone permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === "granted";
    } catch (error) {
      console.error("Failed to request permissions:", error);
      return false;
    }
  }
}

/**
 * Factory function to create a voice recorder instance
 */
export function createVoiceRecorder(): VoiceRecorder {
  return new ExpoVoiceRecorder();
}
