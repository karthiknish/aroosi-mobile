import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import { ApiResponse } from "../types/profile";
import { MessagingAPI } from "../types/messaging";
import { UnifiedResponseSystem } from "@utils/unifiedResponseSystem";
import { uriToBlob } from "@utils/fileUtils";

/**
 * Service for managing voice message storage and uploads
 */
export class VoiceMessageStorage {
  private api: MessagingAPI;
  private cacheDirectory: string;

  constructor(api: MessagingAPI) {
    this.api = api;
    this.cacheDirectory = `${FileSystem.cacheDirectory}voice-messages/`;
    this.ensureCacheDirectoryExists();
  }

  /**
   * Ensures the cache directory exists
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDirectory, {
          intermediates: true,
        });
      }
    } catch (error) {
      console.error("Failed to create cache directory:", error);
    }
  }

  /**
   * Generates a secure upload URL for voice messages
   */
  async generateUploadUrl(): Promise<
    ApiResponse<{ uploadUrl: string; storageId: string }>
  > {
    return UnifiedResponseSystem.executeVoiceOperation(
      () => this.api.generateVoiceUploadUrl(),
      "generateVoiceUploadUrl"
    );
  }

  /**
   * Uploads a voice message to storage
   */
  async uploadVoiceMessage(
    audioUri: string,
    metadata?: {
      duration?: number;
      fileSize?: number;
      mimeType?: string;
    }
  ): Promise<ApiResponse<{ storageId: string; url: string }>> {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error("Audio file does not exist");
      }

      // Get upload URL
      const uploadUrlResponse = await this.generateUploadUrl();
      if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
        return uploadUrlResponse as any;
      }

      const { uploadUrl, storageId } = uploadUrlResponse.data;

      // Determine mime type
      const mimeType = metadata?.mimeType || "audio/m4a";

      // Upload the file
      let uploadResponse;

      if (Platform.OS === "web") {
        // For web, convert to blob and upload
        const blob = await uriToBlob(audioUri);
        uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: blob,
          headers: {
            "Content-Type": mimeType,
          },
        });
      } else {
        // For native platforms, use FileSystem.uploadAsync
        uploadResponse = await FileSystem.uploadAsync(uploadUrl, audioUri, {
          httpMethod: "PUT",
          headers: {
            "Content-Type": mimeType,
          },
        });
      }

      if (uploadResponse.status !== 200) {
        return {
          success: false,
          error: {
            code: "UPLOAD_FAILED",
            message: `Failed to upload voice message: ${uploadResponse.status}`,
            details: uploadResponse,
          },
        };
      }

      // Get the URL for the uploaded file
      const urlResponse = await this.api.getVoiceMessageUrl(storageId);
      if (!urlResponse.success || !urlResponse.data) {
        return {
          success: false,
          error: {
            code: "URL_RETRIEVAL_FAILED",
            message: "Failed to get URL for uploaded voice message",
            details: urlResponse.error,
          },
        };
      }

      return {
        success: true,
        data: {
          storageId,
          url: urlResponse.data.url,
        },
      };
    } catch (error) {
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
  async getVoiceMessageUrl(
    storageId: string
  ): Promise<ApiResponse<{ url: string }>> {
    return this.api.getVoiceMessageUrl(storageId);
  }

  /**
   * Downloads a voice message to local cache
   */
  async downloadVoiceMessage(
    storageId: string
  ): Promise<ApiResponse<{ uri: string }>> {
    try {
      // Check if already cached
      const cachedPath = `${this.cacheDirectory}${storageId}.m4a`;
      const cachedInfo = await FileSystem.getInfoAsync(cachedPath);

      if (cachedInfo.exists) {
        return {
          success: true,
          data: { uri: cachedPath },
        };
      }

      // Get the download URL
      const urlResponse = await this.getVoiceMessageUrl(storageId);
      if (!urlResponse.success || !urlResponse.data) {
        return {
          success: false,
          error: {
            code: "URL_RETRIEVAL_FAILED",
            message: "Failed to get download URL for voice message",
            details: urlResponse.error,
          },
        };
      }

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(
        urlResponse.data.url,
        cachedPath
      );

      if (downloadResult.status !== 200) {
        return {
          success: false,
          error: {
            code: "DOWNLOAD_FAILED",
            message: `Failed to download voice message: ${downloadResult.status}`,
            details: downloadResult,
          },
        };
      }

      return {
        success: true,
        data: { uri: downloadResult.uri },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "DOWNLOAD_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to download voice message",
          details: error,
        },
      };
    }
  }

  /**
   * Clears cached voice messages
   */
  async clearCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.cacheDirectory, { idempotent: true });
        await this.ensureCacheDirectoryExists();
      }
    } catch (error) {
      console.error("Failed to clear voice message cache:", error);
    }
  }

  /**
   * Gets cache size in bytes
   */
  async getCacheSize(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        return 0;
      }

      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      let totalSize = 0;

      for (const file of files) {
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);
        if (fileInfo.exists && fileInfo.size) {
          totalSize += fileInfo.size;
        }
      }

      return totalSize;
    } catch (error) {
      console.error("Failed to get cache size:", error);
      return 0;
    }
  }

  /**
   * Removes old cached files to free up space
   */
  async cleanupOldCache(
    maxAgeMs: number = 7 * 24 * 60 * 60 * 1000
  ): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDirectory);
      if (!dirInfo.exists) {
        return;
      }

      const files = await FileSystem.readDirectoryAsync(this.cacheDirectory);
      const now = Date.now();

      for (const file of files) {
        const filePath = `${this.cacheDirectory}${file}`;
        const fileInfo = await FileSystem.getInfoAsync(filePath);

        if (fileInfo.exists && fileInfo.modificationTime) {
          const fileAge = now - fileInfo.modificationTime * 1000;
          if (fileAge > maxAgeMs) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
          }
        }
      }
    } catch (error) {
      console.error("Failed to cleanup old cache:", error);
    }
  }
}
