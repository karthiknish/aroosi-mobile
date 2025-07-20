import { Audio } from "expo-av";
import { Platform } from "react-native";
import { ApiResponse } from "../types/profile";
import { MessagingAPI } from "../types/messaging";
import { getFileSize, getMimeTypeFromUri } from "../utils/fileUtils";
import { UnifiedResponseSystem } from "../utils/unifiedResponseSystem";
import { VoiceMessageStorage } from "./voiceMessageStorage";

/**
 * Service for managing voice message recording, uploading, and playback
 */
export class VoiceMessageManager {
  private api: MessagingAPI;
  private storage: VoiceMessageStorage;

  constructor(api: MessagingAPI) {
    this.api = api;
    this.storage = new VoiceMessageStorage(api);
  }

  /**
   * Records a voice message
   */
  async recordVoiceMessage(options?: {
    maxDuration?: number;
    quality?: Audio.RecordingOptionsQualityPreset;
  }): Promise<{ uri: string; duration: number } | null> {
    try {
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        throw new Error("Permission to access microphone is required");
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        options?.quality || Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      // Track start time
      const startTime = Date.now();

      // Return promise that resolves when recording is stopped
      return new Promise((resolve, reject) => {
        // Set timeout for max duration
        const maxDuration = options?.maxDuration || 300; // 5 minutes default
        const timeout = setTimeout(() => {
          stopRecording();
        }, maxDuration * 1000);

        // Function to stop recording
        const stopRecording = async () => {
          clearTimeout(timeout);
          try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            const duration = Math.floor((Date.now() - startTime) / 1000);

            if (uri) {
              resolve({ uri, duration });
            } else {
              reject(new Error("Failed to get recording URI"));
            }
          } catch (error) {
            reject(
              error instanceof Error
                ? error
                : new Error("Failed to stop recording")
            );
          }
        };

        // Expose stop function
        (global as any).__stopVoiceRecording = stopRecording;
      });
    } catch (error) {
      console.error("Voice recording error:", error);
      return null;
    }
  }

  /**
   * Uploads a voice message
   */
  async uploadVoiceMessage(
    audioBlob: Blob | string,
    conversationId: string,
    fromUserId: string,
    toUserId: string,
    duration: number
  ): Promise<ApiResponse<any>> {
    try {
      let audioUri: string;
      let fileSize: number;
      let mimeType: string;

      if (typeof audioBlob === "string") {
        // URI provided
        audioUri = audioBlob;
        fileSize = await getFileSize(audioUri);
        mimeType = getMimeTypeFromUri(audioUri);
      } else {
        // Blob provided (web platform)
        fileSize = audioBlob.size;
        mimeType = audioBlob.type || "audio/m4a";
        // For web, we'll need to create a temporary URI
        audioUri = URL.createObjectURL(audioBlob);
      }

      // Upload using storage service
      const uploadResult = await this.storage.uploadVoiceMessage(audioUri, {
        duration,
        fileSize,
        mimeType,
      });

      if (!uploadResult.success || !uploadResult.data) {
        return uploadResult as any;
      }

      const { storageId } = uploadResult.data;

      // Send the message with the storage ID
      return this.api.sendMessage({
        conversationId,
        fromUserId,
        toUserId,
        type: "voice",
        audioStorageId: storageId,
        duration,
        fileSize,
        mimeType,
      });
    } catch (error) {
      console.error("Voice upload error:", error);
      return {
        success: false,
        error: {
          code: "UPLOAD_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to upload voice message",
          details: error,
        },
      };
    }
  }

  /**
   * Gets the URL for a voice message
   */
  async getVoiceMessageUrl(storageId: string): Promise<string | null> {
    try {
      const response = await this.storage.getVoiceMessageUrl(storageId);

      if (response.success && response.data?.url) {
        return response.data.url;
      }

      return null;
    } catch (error) {
      console.error("Failed to get voice message URL:", error);
      return null;
    }
  }

  /**
   * Downloads a voice message for offline playback
   */
  async downloadVoiceMessage(storageId: string): Promise<string | null> {
    try {
      const response = await this.storage.downloadVoiceMessage(storageId);

      if (response.success && response.data?.uri) {
        return response.data.uri;
      }

      return null;
    } catch (error) {
      console.error("Failed to download voice message:", error);
      return null;
    }
  }

  /**
   * Plays a voice message
   */
  async playVoiceMessage(storageId: string): Promise<Audio.Sound | null> {
    try {
      // Try to get cached version first
      let uri = await this.downloadVoiceMessage(storageId);

      // If not cached, get URL
      if (!uri) {
        uri = await this.getVoiceMessageUrl(storageId);
      }

      if (!uri) {
        throw new Error("Failed to get voice message URL");
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
      });

      // Load and play the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true }
      );

      return sound;
    } catch (error) {
      console.error("Failed to play voice message:", error);
      return null;
    }
  }

  /**
   * Stops all audio playback
   */
  async stopAllPlayback(): Promise<void> {
    try {
      await Audio.setIsEnabledAsync(false);
      await Audio.setIsEnabledAsync(true);
    } catch (error) {
      console.error("Failed to stop audio playback:", error);
    }
  }

  /**
   * Clears voice message cache
   */
  async clearCache(): Promise<void> {
    await this.storage.clearCache();
  }

  /**
   * Gets cache size
   */
  async getCacheSize(): Promise<number> {
    return this.storage.getCacheSize();
  }

  /**
   * Cleans up old cached files
   */
  async cleanupCache(maxAgeMs?: number): Promise<void> {
    await this.storage.cleanupOldCache(maxAgeMs);
  }
}
