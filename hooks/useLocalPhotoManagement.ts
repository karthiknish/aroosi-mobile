import { useState, useCallback } from "react";
import { pickFromLibrary } from "../utils/imagePicker";
import { ImageType } from "../types/image";
import { IMAGE_VALIDATION } from "../types/image";

// Extended interface for local images with main photo flag
interface LocalImageType extends ImageType {
  isMain?: boolean;
}

export interface UseLocalPhotoManagementResult {
  // Data
  images: LocalImageType[];

  // Loading states
  uploading: boolean;

  // Actions
  addPhoto: () => Promise<boolean>;
  deletePhoto: (imageId: string) => Promise<boolean>;
  reorderPhotos: (newOrder: LocalImageType[]) => Promise<boolean>;
  setMainPhoto: (imageId: string) => Promise<boolean>;
  validateImageBeforeUpload: (imageUri: string) => Promise<boolean>;

  // Computed values
  hasPhotos: boolean;
  mainPhoto: LocalImageType | null;
  canAddMore: boolean;
  maxPhotos: number;
}

const MAX_PHOTOS = 5;

export function useLocalPhotoManagement(): UseLocalPhotoManagementResult {
  const [images, setImages] = useState<LocalImageType[]>([]);
  const [uploading, setUploading] = useState(false);

  // Validate image before upload
  const validateImageBeforeUpload = useCallback(
    async (imageUri: string): Promise<boolean> => {
      try {
        const { validateImageUri, DEFAULT_VALIDATION_OPTIONS } = await import("../utils/imageValidation");
        const result = await validateImageUri(imageUri, {
          maxFileSizeBytes: DEFAULT_VALIDATION_OPTIONS.maxFileSizeBytes,
          minWidth: DEFAULT_VALIDATION_OPTIONS.minWidth,
          minHeight: DEFAULT_VALIDATION_OPTIONS.minHeight,
          allowedFormats: DEFAULT_VALIDATION_OPTIONS.allowedFormats,
        });
        if (!result.isValid) {
          console.warn("Local image validation failed:", result.errors.join("; "));
        }
        return result.isValid;
      } catch (error) {
        console.error("Error validating image:", error);
        return false;
      }
    },
    []
  );

  // Add a new photo locally
  const addPhoto = useCallback(async (): Promise<boolean> => {
    if (images.length >= MAX_PHOTOS) {
      return false;
    }

    try {
      setUploading(true);

      // Launch image picker via centralized utility (permissions handled internally)
      const result = await pickFromLibrary({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length || !result.assets[0]?.uri) {
        return false;
      }

      const asset = result.assets[0];

      // Validate the image
      const isValid = await validateImageBeforeUpload(asset.uri);
      if (!isValid) {
        return false;
      }

      // Create local image object
      const newImage: LocalImageType = {
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: asset.uri,
        fileName: asset.fileName || `image-${Date.now()}.jpg`,
        size: asset.fileSize || 0,
        storageId: `local-${Date.now()}`,
        uploadedAt: Date.now(),
        isMain: images.length === 0, // First photo is main by default
      };

      setImages((prev) => [...prev, newImage]);
      return true;
    } catch (error) {
      console.error("Error adding photo:", error);
      return false;
    } finally {
      setUploading(false);
    }
  }, [images.length, validateImageBeforeUpload]);

  // Delete a photo locally
  const deletePhoto = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      setImages((prev) => {
        const newImages = prev.filter((img) => img.id !== imageId);
        if (newImages.length > 0 && !newImages.some((img) => img.isMain)) {
          newImages[0].isMain = true;
        }
        return newImages;
      });
      return true;
    } catch (error) {
      console.error("Error deleting photo:", error);
      return false;
    }
  }, []);

  // Reorder photos locally
  const reorderPhotos = useCallback(
    async (newOrder: LocalImageType[]): Promise<boolean> => {
      try {
        setImages(newOrder);
        return true;
      } catch (error) {
        console.error("Error reordering photos:", error);
        return false;
      }
    },
    []
  );

  // Set main photo locally
  const setMainPhoto = useCallback(
    async (imageId: string): Promise<boolean> => {
      try {
        setImages((prev) =>
          prev.map((img) => ({
            ...img,
            isMain: img.id === imageId,
          }))
        );
        return true;
      } catch (error) {
        console.error("Error setting main photo:", error);
        return false;
      }
    },
    []
  );

  // Computed values
  const hasPhotos = images.length > 0;
  const mainPhoto = images.find((img) => img.isMain) || images[0] || null;
  const canAddMore = images.length < MAX_PHOTOS;

  return {
    // Data
    images,

    // Loading states
    uploading,

    // Actions
    addPhoto,
    deletePhoto,
    reorderPhotos,
    setMainPhoto,
    validateImageBeforeUpload,

    // Computed values
    hasPhotos,
    mainPhoto,
    canAddMore,
    maxPhotos: MAX_PHOTOS,
  };
}

// Hook specifically for profile setup (simplified)
export function useLocalProfileSetupPhotos() {
  const { images, uploading, addPhoto, deletePhoto, hasPhotos } =
    useLocalPhotoManagement();

  return {
    images,
    uploading,
    addPhoto,
    deletePhoto,
    hasPhotos,
    hasRequiredPhoto: hasPhotos, // At least one photo required
  };
}
