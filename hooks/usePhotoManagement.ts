import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { useEnhancedApiClient } from "../utils/enhancedApiClient";
import { photoService, PhotoUploadResult } from "../services/PhotoService";
import { ProfileImage } from "../types/image";
import { useAuth } from "../contexts/AuthContext";

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
  const { user } = useAuth();
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
    } finally {
      setLoading(false);
    }
  }, [apiClient]);

  // Add a new photo
  const addPhoto = useCallback(async (): Promise<boolean> => {
    if (uploading || images.length >= MAX_PHOTOS) {
      if (images.length >= MAX_PHOTOS) {
        Alert.alert(
          "Photo Limit Reached",
          `You can only have up to ${MAX_PHOTOS} photos. Please delete a photo first.`
        );
      }
      return false;
    }

    try {
      setUploading(true);

      const result: PhotoUploadResult = await photoService.addPhoto(user?.id);

      if (result.success && result.imageId) {
        // Reload images to get the updated list
        await loadImages();
        return true;
      } else {
        Alert.alert(
          "Upload Failed",
          result.error || "Failed to upload photo. Please try again."
        );
        return false;
      }
    } catch (error) {
      console.error("Error adding photo:", error);
      Alert.alert("Error", "Failed to add photo. Please try again.");
      return false;
    } finally {
      setUploading(false);
    }
  }, [uploading, images.length, loadImages]);

  // Delete a photo
  const deletePhoto = useCallback(
    async (imageId: string): Promise<boolean> => {
      if (deleting) return false;

      return new Promise((resolve) => {
        Alert.alert(
          "Delete Photo",
          "Are you sure you want to delete this photo?",
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  setDeleting(imageId);

                  const response = await apiClient.deleteProfileImage({
                    userId: user?.id || "",
                    imageId,
                  });

                  if (response.success) {
                    // Remove from local state
                    setImages((prev) =>
                      prev.filter((img) => img.id !== imageId)
                    );
                    resolve(true);
                  } else {
                    Alert.alert(
                      "Error",
                      typeof response.error === "string"
                        ? response.error
                        : "Failed to delete photo"
                    );
                    resolve(false);
                  }
                } catch (error) {
                  console.error("Error deleting photo:", error);
                  Alert.alert(
                    "Error",
                    "Failed to delete photo. Please try again."
                  );
                  resolve(false);
                } finally {
                  setDeleting(null);
                }
              },
            },
          ]
        );
      });
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
          // Revert on failure
          await loadImages();
          Alert.alert(
            "Error",
            typeof response.error === "string"
              ? response.error
              : "Failed to reorder photos"
          );
          return false;
        }

        return true;
      } catch (error) {
        console.error("Error reordering photos:", error);
        await loadImages(); // Revert on error
        Alert.alert("Error", "Failed to reorder photos. Please try again.");
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
          // Update local state
          setImages((prev) =>
            prev.map((img) => ({
              ...img,
              isMain: img.id === imageId,
            }))
          );
          return true;
        } else {
          Alert.alert(
            "Error",
            typeof response.error === "string"
              ? response.error
              : "Failed to set main photo"
          );
          return false;
        }
      } catch (error) {
        console.error("Error setting main photo:", error);
        Alert.alert("Error", "Failed to set main photo. Please try again.");
        return false;
      }
    },
    [apiClient]
  );

  // Batch operations
  const batchDeletePhotos = useCallback(
    async (imageIds: string[]): Promise<boolean> => {
      if (deleting || imageIds.length === 0) return false;

      return new Promise((resolve) => {
        Alert.alert(
          "Delete Photos",
          `Are you sure you want to delete ${imageIds.length} photo(s)?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  setDeleting("batch");

                  // Use batch operation if available, otherwise delete individually
                  const operations = imageIds.map((imageId) => ({
                    type: "delete",
                    imageId,
                    userId: user?.id || "",
                  }));

                  const response = await apiClient.batchProfileImageOperations(
                    operations
                  );

                  if (response.success) {
                    // Remove from local state
                    setImages((prev) =>
                      prev.filter((img) => !imageIds.includes(img.id))
                    );
                    resolve(true);
                  } else {
                    Alert.alert(
                      "Error",
                      typeof response.error === "string"
                        ? response.error
                        : "Failed to delete photos"
                    );
                    resolve(false);
                  }
                } catch (error) {
                  console.error("Error batch deleting photos:", error);
                  Alert.alert(
                    "Error",
                    "Failed to delete photos. Please try again."
                  );
                  resolve(false);
                } finally {
                  setDeleting(null);
                }
              },
            },
          ]
        );
      });
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
          Alert.alert(
            "File Too Large",
            "Please select an image smaller than 5MB."
          );
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
