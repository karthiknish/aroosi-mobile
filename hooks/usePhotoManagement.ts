import { useState, useEffect, useCallback } from "react";
import { useEnhancedApiClient } from "../utils/enhancedApiClient";
import { photoService, PhotoUploadResult } from "../services/PhotoService";
import { ProfileImage } from "../types/image";
import { useClerkAuth } from "../contexts/ClerkAuthContext"
import { useToast } from "../providers/ToastContext";
import { fontSize } from "../constants";

export interface UsePhotoManagementResult {
  // Data
  images: ProfileImage[];

  // Loading states
  loading: boolean;
  uploading: boolean;
  deleting: string | null;
  reordering: boolean;

  // Actions
  loadImages: () => Promise<void>;
  addPhoto: () => Promise<boolean>;
  deletePhoto: (imageId: string) => Promise<boolean>;
  reorderPhotos: (newOrder: ProfileImage[]) => Promise<boolean>;
  setMainPhoto: (imageId: string) => Promise<boolean>;
  batchDeletePhotos: (imageIds: string[]) => Promise<boolean>;
  validateImageBeforeUpload: (imageUri: string) => Promise<boolean>;

  // Computed values
  hasPhotos: boolean;
  mainPhoto: ProfileImage | null;
  canAddMore: boolean;
  maxPhotos: number;
}

const MAX_PHOTOS = 5;

export function usePhotoManagement(): UsePhotoManagementResult {
  const apiClient = useEnhancedApiClient();
  const { } = useClerkAuth();
  const toast = useToast();
  const [images, setImages] = useState<ProfileImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  // Load profile images
  const loadImages = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.getProfileImages();

      if (response.success && response.data) {
        const imagesList =
          (response.data as ProfileImage[]) ||
          (response.data as ProfileImage[]);
        setImages(
          imagesList.sort(
            (a: ProfileImage, b: ProfileImage) => a.order - b.order
          )
        );
      }
    } catch (error) {
      console.error("Error loading images:", error);
      toast.show("Failed to load images.", "error");
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Add a new photo
  const addPhoto = useCallback(async (): Promise<boolean> => {
    if (uploading || images.length >= MAX_PHOTOS) {
      toast.show(`You can only upload up to ${MAX_PHOTOS} photos.`, "info");
      return false;
    }

    try {
      setUploading(true);

      const result: PhotoUploadResult = await photoService.addPhoto(user?.id);

      if (result.success && result.imageId) {
        await loadImages();
        toast.show("Photo added.", "success");
        return true;
      } else {
        toast.show("Failed to add photo.", "error");
        return false;
      }
    } catch (error) {
      console.error("Error adding photo:", error);
      toast.show("An error occurred while adding photo.", "error");
      return false;
    } finally {
      setUploading(false);
    }
  }, [uploading, images.length, loadImages]);

  // Delete a photo
  const deletePhoto = useCallback(
    async (imageId: string): Promise<boolean> => {
      if (deleting) return false;

      try {
        setDeleting(imageId);
        const response = await apiClient.deleteProfileImage({
          userId: user?.id || "",
          imageId,
        });

        if (response.success) {
          setImages((prev) => prev.filter((img) => img.id !== imageId));
          toast.show("Photo deleted.", "success");
          return true;
        } else {
          toast.show("Failed to delete photo.", "error");
          return false;
        }
      } catch (error) {
        console.error("Error deleting photo:", error);
        toast.show("An error occurred while deleting photo.", "error");
        return false;
      } finally {
        setDeleting(null);
      }
    },
    [deleting, apiClient]
  );

  // Reorder photos
  const reorderPhotos = useCallback(
    async (newOrder: ProfileImage[]): Promise<boolean> => {
      if (reordering) return false;

      try {
        setReordering(true);

        // Update local state optimistically
        const updatedImages = newOrder.map((img, index) => ({
          ...img,
          order: index,
        }));
        setImages(updatedImages);

        // Send new order to server
        const imageIds = updatedImages.map((img) => img.id);
        const response = await apiClient.updateImageOrder(imageIds);

        if (!response.success) {
          await loadImages();
          toast.show("Failed to reorder photos.", "error");
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error reordering photos:", error);
        await loadImages();
        toast.show("An error occurred while reordering.", "error");
        return false;
      } finally {
        setReordering(false);
      }
    },
    [reordering, apiClient, loadImages]
  );

  // Set main photo
  const setMainPhoto = useCallback(
    async (imageId: string): Promise<boolean> => {
      try {
        const response = await apiClient.setMainProfileImage(imageId);

        if (response.success) {
          setImages((prev) =>
            prev.map((img) => ({
              ...img,
              isMain: img.id === imageId,
            }))
          );
          toast.show("Set as main photo.", "success");
          return true;
        } else {
          toast.show("Failed to set main photo.", "error");
          return false;
        }
      } catch (error) {
        console.error("Error setting main photo:", error);
        toast.show("An error occurred while setting main photo.", "error");
        return false;
      }
    },
    [apiClient]
  );

  // Batch operations
  const batchDeletePhotos = useCallback(
    async (imageIds: string[]): Promise<boolean> => {
      if (deleting || imageIds.length === 0) return false;

      try {
        if (imageIds.length === 0) return false;
        setDeleting("batch");

        const operations = imageIds.map((imageId) => ({
          type: "delete",
          imageId,
          userId: user?.id || "",
        }));

        const response = await apiClient.batchProfileImageOperations(operations);

        if (response.success) {
          setImages((prev) => prev.filter((img) => !imageIds.includes(img.id)));
          toast.show("Selected photos deleted.", "success");
          return true;
        } else {
          toast.show("Batch delete failed.", "error");
          return false;
        }
      } catch (error) {
        console.error("Error batch deleting photos:", error);
        toast.show("An error occurred while deleting photos.", "error");
        return false;
      } finally {
        setDeleting(null);
      }
    },
    [deleting, apiClient, user?.id]
  );

  const validateImageBeforeUpload = useCallback(
    async (imageUri: string): Promise<boolean> => {
      try {
        // Check file size and dimensions
        const response = await fetch(imageUri);
        const blob = await response.blob();

        if (blob.size > 5 * 1024 * 1024) {
          // 5MB limit
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error validating image:", error);
        return false;
      }
    },
    []
  );

  // Computed values
  const hasPhotos = images.length > 0;
  const mainPhoto = images.find((img) => img.isMain) || images[0] || null;
  const canAddMore = images.length < MAX_PHOTOS && !uploading;

  // Auto-load images on mount
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  return {
    // Data
    images,

    // Loading states
    loading,
    uploading,
    deleting,
    reordering,

    // Actions
    loadImages,
    addPhoto,
    deletePhoto,
    reorderPhotos,
    setMainPhoto,
    batchDeletePhotos,
    validateImageBeforeUpload,

    // Computed values
    hasPhotos,
    mainPhoto,
    canAddMore,
    maxPhotos: MAX_PHOTOS,
  };
}

// Hook specifically for profile setup (simplified)
export function useProfileSetupPhotos() {
  const { images, uploading, addPhoto, deletePhoto, hasPhotos } =
    usePhotoManagement();

  return {
    images,
    uploading,
    addPhoto,
    deletePhoto,
    hasPhotos,
    hasRequiredPhoto: hasPhotos, // At least one photo required
  };
}
