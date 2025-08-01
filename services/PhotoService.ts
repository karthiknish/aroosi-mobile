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

  /**
   * Show photo selection options (camera or library)
   */
  showPhotoOptions(): Promise<ImagePicker.ImagePickerResult | null> {
    // Non-blocking UX preferred; if callers expect a chooser, they should present UI.
    // For backward compatibility, open image library by default.
    return this.openImageLibrary();
  }

  /**
   * Open camera to take a photo
   */
  private async openCamera(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      return result;
    } catch (error) {
      console.error("Error opening camera:", error);
      // UI should surface a toast based on returned null
      return null;
    }
  }

  /**
   * Open image library to select a photo
   */
  private async openImageLibrary(): Promise<ImagePicker.ImagePickerResult | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        exif: false,
      });

      return result;
    } catch (error) {
      console.error("Error opening image library:", error);
      // UI should surface a toast based on returned null
      return null;
    }
  }

  /**
   * Process and compress an image
   */
  async processImage(imageUri: string): Promise<ProcessedPhoto | null> {
    try {
      // First, get image info to check size and dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(imageUri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      let processedUri = imageUri;
      let needsProcessing = false;

      // Check if image needs resizing
      if (
        imageInfo.width > this.MAX_WIDTH ||
        imageInfo.height > this.MAX_HEIGHT
      ) {
        needsProcessing = true;
      }

      // Check file size (estimate based on dimensions)
      const estimatedSize = imageInfo.width * imageInfo.height * 3; // RGB
      if (estimatedSize > this.MAX_FILE_SIZE) {
        needsProcessing = true;
      }

      // Process image if needed
      if (needsProcessing) {
        const manipulateActions: ImageManipulator.Action[] = [];

        // Resize if too large
        if (
          imageInfo.width > this.MAX_WIDTH ||
          imageInfo.height > this.MAX_HEIGHT
        ) {
          const aspectRatio = imageInfo.width / imageInfo.height;
          let newWidth = this.MAX_WIDTH;
          let newHeight = this.MAX_HEIGHT;

          if (aspectRatio > 1) {
            newHeight = this.MAX_WIDTH / aspectRatio;
          } else {
            newWidth = this.MAX_HEIGHT * aspectRatio;
          }

          manipulateActions.push({
            resize: { width: newWidth, height: newHeight },
          });
        }

        const processed = await ImageManipulator.manipulateAsync(
          imageUri,
          manipulateActions,
          {
            compress: this.COMPRESSION_QUALITY,
            format: ImageManipulator.SaveFormat.JPEG,
          }
        );

        processedUri = processed.uri;
      }

      // Get final image info
      const finalInfo = await ImageManipulator.manipulateAsync(
        processedUri,
        [],
        { format: ImageManipulator.SaveFormat.JPEG }
      );

      return {
        uri: processedUri,
        metadata: {
          width: finalInfo.width,
          height: finalInfo.height,
          size: 0, // We'll calculate this during upload
          type: "image/jpeg",
        },
        compressed: needsProcessing,
      };
    } catch (error) {
      console.error("Error processing image:", error);
      // UI should surface a toast based on returned null
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
      // Show photo selection options
      const pickerResult = await this.showPhotoOptions();

      if (!pickerResult || pickerResult.canceled || !pickerResult.assets?.[0]) {
        return { success: false, error: "No photo selected" };
      }

      const asset = pickerResult.assets[0];

      // Validate image before processing
      const isValid = await this.validateImage(asset.uri);
      if (!isValid) {
        return { success: false, error: "Invalid image selected" };
      }

      // Process the image
      const processedPhoto = await this.processImage(asset.uri);

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
   * Validate image before processing
   */
  validateImage(imageUri: string): Promise<boolean> {
    return new Promise((resolve) => {
      Image.getSize(
        imageUri,
        (width, height) => {
          // Check minimum dimensions
          if (width < 200 || height < 200) {
            // UI should surface a toast via caller; we only return validation result
            resolve(false);
            return;
          }

          resolve(true);
        },
        (error) => {
          console.error("Error getting image size:", error);
          // UI should surface a toast via caller; we only return validation result
          resolve(false);
        }
      );
    });
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