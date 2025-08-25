import { setAudioModeAsync } from "expo-audio";
import { ApiResponse } from "../types/profile";
import { MessagingAPI } from "../types/messaging";
import { getFileSize, getMimeTypeFromUri } from "@utils/fileUtils";
import { VoiceMessageStorage } from "./voiceMessageStorage";

/**
 * Service for managing voice message recording, uploading, and playback
 */
export class VoiceMessageManager {
  // Public for tests that introspect underlying client
  public readonly apiClient: MessagingAPI;
  private storage: VoiceMessageStorage;

  constructor(api: MessagingAPI) {
    this.apiClient = api;
    this.storage = new VoiceMessageStorage(api);
  }

  // Recording is handled by useVoiceRecording hook via expo-audio. This service keeps upload/storage helpers.

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
      return this.apiClient.sendMessage({
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
  async playVoiceMessage(storageId: string): Promise<string | null> {
    // Return a URI to be consumed by expo-audio player hooks
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

      // Configure audio mode for playback (expo-audio)
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: true,
      });

      return uri;
    } catch (error) {
      console.error("Failed to prepare voice message for playback:", error);
      return null;
    }
  }

  /**
   * Stops all audio playback
   */
  async stopAllPlayback(): Promise<void> {
    try {
          // expo-audio does not provide global toggle; this is a no-op here.
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
