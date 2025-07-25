import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { Platform } from "react-native";
import { apiClient } from "./api";

export interface ImageUploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  compress?: boolean;
  allowsEditing?: boolean;
  aspect?: [number, number];
}

export interface ImageUploadResult {
  success: boolean;
  storageId?: string;
  url?: string;
  error?: string;
  localUri?: string;
}

export interface ImageValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const DEFAULT_OPTIONS: Required<ImageUploadOptions> = {
  quality: 0.8,
  maxWidth: 1200,
  maxHeight: 1200,
  compress: true,
  allowsEditing: true,
  aspect: [1, 1],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];
const MIN_DIMENSIONS = { width: 200, height: 200 };

export class ImageUploadManager {
  private static instance: ImageUploadManager;

  private constructor() {}

  public static getInstance(): ImageUploadManager {
    if (!ImageUploadManager.instance) {
      ImageUploadManager.instance = new ImageUploadManager();
    }
    return ImageUploadManager.instance;
  }

  public async requestPermissions(): Promise<boolean> {
    try {
      // Request camera permissions
      const cameraPermission =
        await ImagePicker.requestCameraPermissionsAsync();

      // Request media library permissions
      const mediaPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      return (
        cameraPermission.status === "granted" &&
        mediaPermission.status === "granted"
      );
    } catch (error) {
      console.error("Failed to request image permissions:", error);
      return false;
    }
  }

  public async pickImageFromCamera(
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: "Camera permission not granted",
      };
    }

    try {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: mergedOptions.allowsEditing,
        aspect: mergedOptions.aspect,
        quality: mergedOptions.quality,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: "Image selection cancelled",
        };
      }

      const asset = result.assets[0];
      return await this.processAndUploadImage(asset.uri, mergedOptions);
    } catch (error) {
      console.error("Failed to pick image from camera:", error);
      return {
        success: false,
        error: "Failed to capture image",
      };
    }
  }

  public async pickImageFromLibrary(
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return {
        success: false,
        error: "Media library permission not granted",
      };
    }

    try {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: mergedOptions.allowsEditing,
        aspect: mergedOptions.aspect,
        quality: mergedOptions.quality,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return {
          success: false,
          error: "Image selection cancelled",
        };
      }

      const asset = result.assets[0];
      return await this.processAndUploadImage(asset.uri, mergedOptions);
    } catch (error) {
      console.error("Failed to pick image from library:", error);
      return {
        success: false,
        error: "Failed to select image",
      };
    }
  }

  public async pickMultipleImages(
    maxCount = 6,
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      return [
        {
          success: false,
          error: "Media library permission not granted",
        },
      ];
    }

    try {
      const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing for multiple selection
        quality: mergedOptions.quality,
        allowsMultipleSelection: true,
        selectionLimit: maxCount,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return [
          {
            success: false,
            error: "Image selection cancelled",
          },
        ];
      }

      const uploadPromises = result.assets.map((asset) =>
        this.processAndUploadImage(asset.uri, mergedOptions)
      );

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error("Failed to pick multiple images:", error);
      return [
        {
          success: false,
          error: "Failed to select images",
        },
      ];
    }
  }

  public async validateImage(uri: string): Promise<ImageValidationResult> {
    const result: ImageValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      // Check file existence
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        result.isValid = false;
        result.errors.push("Image file does not exist");
        return result;
      }

      // Check file size
      if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
        result.isValid = false;
        result.errors.push(
          `Image size (${Math.round(
            fileInfo.size / 1024 / 1024
          )}MB) exceeds maximum allowed size (${MAX_FILE_SIZE / 1024 / 1024}MB)`
        );
      }

      // Check file format
      const extension = uri.split(".").pop()?.toLowerCase();
      if (!extension || !ALLOWED_FORMATS.includes(extension)) {
        result.isValid = false;
        result.errors.push(
          `Unsupported image format. Allowed formats: ${ALLOWED_FORMATS.join(
            ", "
          )}`
        );
      }

      // Get image dimensions
      const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {
        format: ImageManipulator.SaveFormat.JPEG,
      });

      // Note: ImageManipulator doesn't provide dimensions directly
      // We'll need to use a different approach or accept this limitation
    } catch (error) {
      result.isValid = false;
      result.errors.push("Failed to validate image");
    }

    return result;
  }

  private async processAndUploadImage(
    uri: string,
    options: Required<ImageUploadOptions>
  ): Promise<ImageUploadResult> {
    try {
      // Validate image
      const validation = await this.validateImage(uri);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      // Process image (resize, compress, etc.)
      const processedUri = await this.processImage(uri, options);

      // Upload to server
      const uploadResult = await this.uploadToServer(processedUri);

      return {
        success: uploadResult.success,
        storageId: uploadResult.storageId,
        url: uploadResult.url,
        error: uploadResult.error,
        localUri: processedUri,
      };
    } catch (error) {
      console.error("Failed to process and upload image:", error);
      return {
        success: false,
        error: "Failed to process image",
      };
    }
  }

  private async processImage(
    uri: string,
    options: Required<ImageUploadOptions>
  ): Promise<string> {
    try {
      const manipulateOptions: ImageManipulator.Action[] = [];

      // Resize if needed
      if (options.maxWidth || options.maxHeight) {
        manipulateOptions.push({
          resize: {
            width: options.maxWidth,
            height: options.maxHeight,
          },
        });
      }

      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulateOptions,
        {
          compress: options.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );

      return result.uri;
    } catch (error) {
      console.error("Failed to process image:", error);
      return uri; // Return original URI if processing fails
    }
  }

  private async uploadToServer(uri: string): Promise<{
    success: boolean;
    storageId?: string;
    url?: string;
    error?: string;
  }> {
    try {
      // First, get upload URL from server
      const uploadUrlResponse = await apiClient.request("/images/upload-url", {
        method: "POST",
        body: JSON.stringify({
          contentType: "image/jpeg",
        }),
      });

      if (!uploadUrlResponse.success || !uploadUrlResponse.data?.uploadUrl) {
        return {
          success: false,
          error: "Failed to get upload URL",
        };
      }

      const { uploadUrl, storageId } = uploadUrlResponse.data;

      // Upload file to storage
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        return {
          success: false,
          error: "Image file not found",
        };
      }

      const uploadResponse = await FileSystem.uploadAsync(uploadUrl, uri, {
        httpMethod: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
        },
      });

      if (uploadResponse.status !== 200) {
        return {
          success: false,
          error: "Failed to upload image to storage",
        };
      }

      // Confirm upload with server
      const confirmResponse = await apiClient.request(
        "/images/confirm-upload",
        {
          method: "POST",
          body: JSON.stringify({
            storageId,
          }),
        }
      );

      if (!confirmResponse.success) {
        return {
          success: false,
          error: "Failed to confirm image upload",
        };
      }

      return {
        success: true,
        storageId,
        url: confirmResponse.data?.url,
      };
    } catch (error) {
      console.error("Failed to upload image to server:", error);
      return {
        success: false,
        error: "Upload failed",
      };
    }
  }

  public async deleteImage(storageId: string): Promise<boolean> {
    try {
      const response = await apiClient.request(`/images/${storageId}`, {
        method: "DELETE",
      });

      return response.success;
    } catch (error) {
      console.error("Failed to delete image:", error);
      return false;
    }
  }

  public async reorderImages(imageIds: string[]): Promise<boolean> {
    try {
      const response = await apiClient.request("/images/reorder", {
        method: "POST",
        body: JSON.stringify({
          imageIds,
        }),
      });

      return response.success;
    } catch (error) {
      console.error("Failed to reorder images:", error);
      return false;
    }
  }
}

// Image gallery component utilities
export interface GalleryImage {
  id: string;
  uri: string;
  storageId?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
}

export class ImageGalleryManager {
  private static instance: ImageGalleryManager;
  private images: GalleryImage[] = [];
  private listeners: ((images: GalleryImage[]) => void)[] = [];

  private constructor() {}

  public static getInstance(): ImageGalleryManager {
    if (!ImageGalleryManager.instance) {
      ImageGalleryManager.instance = new ImageGalleryManager();
    }
    return ImageGalleryManager.instance;
  }

  public setImages(images: GalleryImage[]): void {
    this.images = [...images];
    this.notifyListeners();
  }

  public addImage(image: GalleryImage): void {
    this.images.push(image);
    this.notifyListeners();
  }

  public updateImage(id: string, updates: Partial<GalleryImage>): void {
    const index = this.images.findIndex((img) => img.id === id);
    if (index !== -1) {
      this.images[index] = { ...this.images[index], ...updates };
      this.notifyListeners();
    }
  }

  public removeImage(id: string): void {
    this.images = this.images.filter((img) => img.id !== id);
    this.notifyListeners();
  }

  public reorderImages(fromIndex: number, toIndex: number): void {
    const newImages = [...this.images];
    const [removed] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, removed);
    this.images = newImages;
    this.notifyListeners();
  }

  public getImages(): GalleryImage[] {
    return [...this.images];
  }

  public addListener(listener: (images: GalleryImage[]) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.images));
  }
}

// React hooks for image management
export function useImageUpload() {
  const uploadManager = ImageUploadManager.getInstance();

  const pickFromCamera = React.useCallback(
    (options?: ImageUploadOptions) => {
      return uploadManager.pickImageFromCamera(options);
    },
    [uploadManager]
  );

  const pickFromLibrary = React.useCallback(
    (options?: ImageUploadOptions) => {
      return uploadManager.pickImageFromLibrary(options);
    },
    [uploadManager]
  );

  const pickMultiple = React.useCallback(
    (maxCount?: number, options?: ImageUploadOptions) => {
      return uploadManager.pickMultipleImages(maxCount, options);
    },
    [uploadManager]
  );

  const deleteImage = React.useCallback(
    (storageId: string) => {
      return uploadManager.deleteImage(storageId);
    },
    [uploadManager]
  );

  const reorderImages = React.useCallback(
    (imageIds: string[]) => {
      return uploadManager.reorderImages(imageIds);
    },
    [uploadManager]
  );

  return {
    pickFromCamera,
    pickFromLibrary,
    pickMultiple,
    deleteImage,
    reorderImages,
  };
}

export function useImageGallery() {
  const [images, setImages] = React.useState<GalleryImage[]>([]);
  const galleryManager = ImageGalleryManager.getInstance();

  React.useEffect(() => {
    setImages(galleryManager.getImages());

    const unsubscribe = galleryManager.addListener(setImages);
    return unsubscribe;
  }, [galleryManager]);

  const addImage = React.useCallback(
    (image: GalleryImage) => {
      galleryManager.addImage(image);
    },
    [galleryManager]
  );

  const updateImage = React.useCallback(
    (id: string, updates: Partial<GalleryImage>) => {
      galleryManager.updateImage(id, updates);
    },
    [galleryManager]
  );

  const removeImage = React.useCallback(
    (id: string) => {
      galleryManager.removeImage(id);
    },
    [galleryManager]
  );

  const reorderImages = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      galleryManager.reorderImages(fromIndex, toIndex);
    },
    [galleryManager]
  );

  return {
    images,
    addImage,
    updateImage,
    removeImage,
    reorderImages,
    setImages: galleryManager.setImages.bind(galleryManager),
  };
}
