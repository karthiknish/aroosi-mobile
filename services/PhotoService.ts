import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "react-native";
import { enhancedApiClient } from "../utils/enhancedApiClient";
import { ProfileImage } from "../types/image";
import { errorHandler, AppError } from "../utils/errorHandling";
import { networkManager } from "../utils/NetworkManager";
import { offlineImageQueue } from "../utils/OfflineImageQueue";
// Removed util toast usage. Services remain UI-agnostic; UI surfaces messages via ToastContext.

export interface PhotoUploadResult {
  success: boolean;
  imageId?: string;
  error?: string;
}

export interface PhotoMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
}

export interface ProcessedPhoto {
  uri: string;
  metadata: PhotoMetadata;
  compressed: boolean;
}

export class PhotoService {
  private apiClient = enhancedApiClient;

  // Maximum file size in bytes (5MB)
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024;

  // Maximum dimensions
  private readonly MAX_WIDTH = 1080;
  private readonly MAX_HEIGHT = 1080;

  // Compression quality
  private readonly COMPRESSION_QUALITY = 0.8;

  // Helper to use centralized picker (library by default)
  private async pickOneFromLibrary(): Promise<string | null> {
    try {
      const { pickFromLibrary } = await import("../utils/imagePicker");
      const res = await pickFromLibrary({ allowsEditing: true, aspect: [1, 1], quality: 1 });
      if (res.canceled || !res.assets?.[0]?.uri) return null;
      return res.assets[0].uri;
    } catch (e) {
      console.error("pickOneFromLibrary error:", e);
      return null;
    }
  }

  /**
   * Request camera and media library permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permission
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== "granted") {
        // UI should surface a toast; service returns false to signal denial
        return false;
      }

      // Request media library permission
      const mediaPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaPermission.status !== "granted") {
        // UI should surface a toast; service returns false to signal denial
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      return false;
    }
  }

  // removed legacy showPhotoOptions (use utils/imagePicker.* instead)

  // removed legacy openCamera (use utils/imagePicker.pickFromCamera instead)

  // removed legacy openImageLibrary (use utils/imagePicker.pickFromLibrary instead)

  /**
   * Process and compress an image (unified processor)
   */
  async processImage(imageUri: string): Promise<ProcessedPhoto | null> {
    try {
      const { processImage, DEFAULT_PROCESS_IMAGE_OPTIONS } = await import("../utils/imageProcessing");
      const processed = await processImage(imageUri, {
        maxWidth: this.MAX_WIDTH,
        maxHeight: this.MAX_HEIGHT,
        quality: this.COMPRESSION_QUALITY,
        format: "jpeg",
        preserveAspectRatio: true,
      });

      return {
        uri: processed.uri,
        metadata: {
          width: processed.width,
          height: processed.height,
          size: 0, // compute during upload if needed
          type: processed.type,
        },
        compressed:
          processed.width < this.MAX_WIDTH || processed.height < this.MAX_HEIGHT,
      };
    } catch (error) {
      console.error("Error processing image:", error);
      return null;
    }
  }

  /**
   * Upload a processed photo to the server with enhanced error handling
   */
  async uploadPhoto(
    processedPhoto: ProcessedPhoto,
    userId?: string
  ): Promise<PhotoUploadResult & { profileImage?: ProfileImage }> {
    try {
      // Generate a unique filename
      const fileName = `profile_${Date.now()}.jpg`;

      // Check network connectivity
      if (!networkManager.isOnline()) {
        // Queue for offline upload
        await offlineImageQueue.addToQueue({
          uri: processedPhoto.uri,
          fileName,
          userId: userId || "",
          timestamp: Date.now(),
        });
        return {
          success: false,
          error: "No internet connection. Upload queued for when online.",
        };
      }

      // Get upload URL from server
      const urlResponse = await this.apiClient.getUploadUrl();
      const uploadData = urlResponse.data as { uploadUrl?: string };
      const uploadUrl = urlResponse.success && uploadData.uploadUrl;
      if (!uploadUrl) {
        const error = new AppError(
          typeof urlResponse.error === "string"
            ? urlResponse.error
            : "Failed to get upload URL",
          "network",
          { action: "getUploadUrl" },
          true
        );
        errorHandler.handle(error);
        return {
          success: false,
          error: error.userMessage,
        };
      }

      // Convert image to blob for upload
      const response = await fetch(processedPhoto.uri);
      const imageBlob = await response.blob();

      // Upload image to the signed URL
      const uploadResult = await this.apiClient.uploadImageToStorage(
        uploadUrl,
        imageBlob,
        "image/jpeg"
      );
      if (!uploadResult.success) {
        const error = new AppError(
          typeof uploadResult.error === "string"
            ? uploadResult.error
            : "Failed to upload image",
          "network",
          { action: "uploadImageToStorage" },
          true
        );
        errorHandler.handle(error);
        return {
          success: false,
          error: error.userMessage,
        };
      }

      // Save image metadata
      const metadataResult = await this.apiClient.saveImageMetadata({
        userId: userId || "",
        storageId: uploadResult.data?.storageId || "",
        fileName,
        contentType: "image/jpeg",
        fileSize: imageBlob.size,
      });
      if (!metadataResult.success) {
        const error = new AppError(
          typeof metadataResult.error === "string"
            ? metadataResult.error
            : "Failed to save image metadata",
          "server",
          { action: "saveImageMetadata" },
          true
        );
        errorHandler.handle(error);
        return {
          success: false,
          error: error.userMessage,
        };
      }
      const metaData = metadataResult.data as { id?: string };
      return {
        success: true,
        imageId: metaData.id || "",
        profileImage: metadataResult.data as ProfileImage,
      };
    } catch (error) {
      const appError = errorHandler.handle(error as Error, {
        action: "uploadPhoto",
        metadata: { fileName: processedPhoto.uri },
      });
      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  /**
   * Complete photo upload process from selection to server
   */
  async addPhoto(userId?: string): Promise<
    PhotoUploadResult & { profileImage?: ProfileImage }
  > {
    try {
      // Use centralized picker (library by default)
      const { pickFromLibrary } = await import("../utils/imagePicker");
      const pickerResult = await pickFromLibrary({ allowsEditing: true, aspect: [1, 1], quality: 1 });

      if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
        return { success: false, error: "No photo selected" };
      }

      const pickedUri = pickerResult.assets[0].uri;

      // Validate image before processing
      const isValid = await this.validateImage(pickedUri);
      if (!isValid) {
        return { success: false, error: "Invalid image selected" };
      }

      // Process the image
      const processedPhoto = await this.processImage(pickedUri);

      if (!processedPhoto) {
        return { success: false, error: "Failed to process image" };
      }

      // Upload the processed image
      const uploadResult = await this.uploadPhoto(processedPhoto, userId);

      return uploadResult;
    } catch (error) {
      const appError = errorHandler.handle(error as Error, {
        action: "addPhoto",
      });
      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  /**
   * Validate image before processing (unified validator)
   */
  async validateImage(imageUri: string): Promise<boolean> {
    try {
      const { validateImageUri, DEFAULT_VALIDATION_OPTIONS } = await import("../utils/imageValidation");
      const result = await validateImageUri(imageUri, {
        maxFileSizeBytes: DEFAULT_VALIDATION_OPTIONS.maxFileSizeBytes, // 5MB default
        minWidth: DEFAULT_VALIDATION_OPTIONS.minWidth,                 // 200
        minHeight: DEFAULT_VALIDATION_OPTIONS.minHeight,               // 200
        allowedFormats: DEFAULT_VALIDATION_OPTIONS.allowedFormats,
      });
      if (!result.isValid) {
        console.warn("Image validation failed:", result.errors.join("; "));
      }
      return result.isValid;
    } catch (e) {
      console.error("Validation error:", e);
      return false;
    }
  }

  /**
   * Initialize offline queue processing
   */
  initializeOfflineQueue(): void {
    offlineImageQueue.initializeNetworkListener();
  }
}

// Export singleton instance
export const photoService = new PhotoService();