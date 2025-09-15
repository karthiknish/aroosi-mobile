import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
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
   * Starts a cancellable upload for a voice message, returning a handle with promise and cancel
   */
  beginUploadVoiceMessage(
    audioUri: string,
    metadata?: { duration?: number; fileSize?: number; mimeType?: string },
    onProgress?: (progress: number) => void
  ): {
    promise: Promise<ApiResponse<{ storageId: string; url: string }>>;
    cancel: () => void;
  } {
    let cancelImpl: () => void = () => {};

    const promise = (async () => {
      try {
        const fileInfo = await FileSystem.getInfoAsync(audioUri);
        if (!fileInfo.exists) throw new Error("Audio file does not exist");

        const uploadUrlResponse = await this.generateUploadUrl();
        if (!uploadUrlResponse.success || !uploadUrlResponse.data) {
          return uploadUrlResponse as any;
        }
        const { uploadUrl, storageId } = uploadUrlResponse.data;
        const mimeType = metadata?.mimeType || "audio/m4a";

        let statusCode = 0;

        if (Platform.OS === "web") {
          const blob = await uriToBlob(audioUri);
          const xhr = new XMLHttpRequest();
          cancelImpl = () => {
            try {
              xhr.abort();
            } catch {}
          };
          await new Promise<void>((resolve, reject) => {
            xhr.upload.onprogress = (evt) => {
              if (evt.lengthComputable && onProgress) {
                const pct = evt.total > 0 ? evt.loaded / evt.total : 0;
                onProgress(Math.max(0, Math.min(1, pct)));
              }
            };
            xhr.onerror = () => reject(new Error("Upload failed"));
            xhr.onabort = () => reject(new Error("Upload canceled"));
            xhr.onload = () => resolve();
            xhr.open("PUT", uploadUrl);
            xhr.setRequestHeader("Content-Type", mimeType);
            xhr.send(blob);
          });
          statusCode = xhr.status;
        } else {
          const hasCreateUploadTask = typeof (FileSystem as any).createUploadTask === "function";
          if (hasCreateUploadTask) {
            const task: any = (FileSystem as any).createUploadTask(
              uploadUrl,
              audioUri,
              {
                httpMethod: "PUT",
                headers: { "Content-Type": mimeType },
              },
              ({ totalBytesSent, totalBytesExpectedToSend }: any) => {
                if (onProgress && totalBytesExpectedToSend > 0) {
                  onProgress(totalBytesSent / totalBytesExpectedToSend);
                }
              }
            );
            cancelImpl = () => {
              try {
                task.cancelAsync?.();
              } catch {}
            };
            const resp: any = await task.uploadAsync();
            statusCode = resp?.status ?? 0;
          } else {
            const resp: any = await (FileSystem as any).uploadAsync(uploadUrl, audioUri, {
              httpMethod: "PUT",
              headers: { "Content-Type": mimeType },
            });
            statusCode = resp?.status ?? 0;
          }
        }

        if (statusCode !== 200) {
          return {
            success: false,
            error: {
              code: "UPLOAD_FAILED",
              message: `Failed to upload voice message: ${statusCode}`,
              details: { status: statusCode },
            },
          };
        }

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
          data: { storageId, url: urlResponse.data.url },
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
    })();

    return { promise, cancel: () => cancelImpl() };
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
    },
    onProgress?: (progress: number) => void
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

      // Upload the file with progress reporting when possible
      let statusCode = 0;
      if (Platform.OS === "web") {
        // Web: use XMLHttpRequest to get upload progress
        const blob = await uriToBlob(audioUri);
        const xhr = new XMLHttpRequest();
        const result: { status?: number } = {};
        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && onProgress) {
              const pct = evt.total > 0 ? evt.loaded / evt.total : 0;
              try {
                onProgress(Math.max(0, Math.min(1, pct)));
              } catch {}
            }
          };
          xhr.onerror = () => reject(new Error("Upload failed"));
          xhr.onload = () => {
            result.status = xhr.status;
            resolve();
          };
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", mimeType);
          xhr.send(blob);
        });
        statusCode = result.status ?? 0;
      } else {
        // Native: prefer createUploadTask with progress callback; fallback to uploadAsync
        const hasCreateUploadTask =
          typeof (FileSystem as any).createUploadTask === "function";
        if (hasCreateUploadTask) {
          const task: any = (FileSystem as any).createUploadTask(
            uploadUrl,
            audioUri,
            {
              httpMethod: "PUT",
              headers: {
                "Content-Type": mimeType,
              },
            },
            ({ totalBytesSent, totalBytesExpectedToSend }: any) => {
              if (onProgress && totalBytesExpectedToSend > 0) {
                try {
                  onProgress(totalBytesSent / totalBytesExpectedToSend);
                } catch {}
              }
            }
          );
          const resp: any = await task.uploadAsync();
          statusCode = resp?.status ?? 0;
        } else {
          const resp: any = await (FileSystem as any).uploadAsync(
            uploadUrl,
            audioUri,
            {
              httpMethod: "PUT",
              headers: {
                "Content-Type": mimeType,
              },
            }
          );
          statusCode = resp?.status ?? 0;
        }
      }

      if (statusCode !== 200) {
        return {
          success: false,
          error: {
            code: "UPLOAD_FAILED",
            message: `Failed to upload voice message: ${statusCode}`,
            details: { status: statusCode },
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
