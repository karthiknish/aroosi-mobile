import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
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
        // Check file info
        const fileInfo = await ImagePicker.getPendingResultAsync();

        // For local validation, we'll use basic checks
        if (!imageUri) {
          Alert.alert("Invalid Image", "Please select a valid image.");
          return false;
        }

        // Check file extension
        const extension = imageUri.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["jpg", "jpeg", "png", "webp"];

        if (!extension || !allowedExtensions.includes(extension)) {
          Alert.alert(
            "Invalid Format",
            "Please select an image in JPG, PNG, or WebP format."
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

  // Add a new photo locally
  const addPhoto = useCallback(async (): Promise<boolean> => {
    if (images.length >= MAX_PHOTOS) {
      Alert.alert(
        "Photo Limit Reached",
        `You can only have up to ${MAX_PHOTOS} photos. Please delete a photo first.`
      );
      return false;
    }

    try {
      setUploading(true);

      // Request permission
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow access to your photos to upload images."
        );
        return false;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
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
      }

      return false;
    } catch (error) {
      console.error("Error adding photo:", error);
      Alert.alert("Error", "Failed to add photo. Please try again.");
      return false;
    } finally {
      setUploading(false);
    }
  }, [images.length, validateImageBeforeUpload]);

  // Delete a photo locally
  const deletePhoto = useCallback(async (imageId: string): Promise<boolean> => {
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
                setImages((prev) => {
                  const newImages = prev.filter((img) => img.id !== imageId);
                  // If we deleted the main photo and there are still photos, set a new main
                  if (
                    newImages.length > 0 &&
                    !newImages.some((img) => img.isMain)
                  ) {
                    newImages[0].isMain = true;
                  }
                  return newImages;
                });
                resolve(true);
              } catch (error) {
                console.error("Error deleting photo:", error);
                Alert.alert(
                  "Error",
                  "Failed to delete photo. Please try again."
                );
                resolve(false);
              }
            },
          },
        ]
      );
    });
  }, []);

  // Reorder photos locally
  const reorderPhotos = useCallback(
    async (newOrder: LocalImageType[]): Promise<boolean> => {
      try {
        setImages(newOrder);
        return true;
      } catch (error) {
        console.error("Error reordering photos:", error);
        Alert.alert("Error", "Failed to reorder photos. Please try again.");
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
        Alert.alert("Error", "Failed to set main photo. Please try again.");
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
