import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../utils/api";
import {
  ImageType,
  ProfileImage,
  IMAGE_VALIDATION,
  ImagePickerResult,
} from "../types/image";
import { ApiResponse } from "../types/profile";

export interface UseImageUploadReturn {
  images: ProfileImage[];
  isLoading: boolean;
  isUploading: boolean;
  uploadProgress: number;
  uploadImage: (imageResult: ImagePickerResult) => Promise<void>;
  deleteImage: (imageId: string) => Promise<void>;
  reorderImages: (imageIds: string[]) => Promise<void>;
  refetchImages: () => void;
}

export function useImageUpload(): UseImageUploadReturn {
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch user's profile images
  const {
    data: images = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["profileImages", userId],
    queryFn: async () => {
      const response = await apiClient.getProfileImages(userId);
      return response.success ? response.data || [] : [];
    },
    enabled: !!userId,
  });

  // Upload image mutation
  const uploadMutation = useMutation({
    mutationFn: async (imageResult: ImagePickerResult) => {
      if (!userId) throw new Error("User not authenticated");

      // Unified validation
      const validationError = await validateImage(imageResult);
      if (validationError) {
        throw new Error(validationError);
      }

      // Check image count limit
      if (
        (images as ProfileImage[]).length >=
        IMAGE_VALIDATION.MAX_IMAGES_PER_USER
      ) {
        throw new Error(
          `You can only upload up to ${IMAGE_VALIDATION.MAX_IMAGES_PER_USER} images.`
        );
      }

      setUploadProgress(10);

      // Step 1: Get upload URL
      const uploadUrlResponse =
        (await apiClient.getUploadUrl()) as ApiResponse<{ uploadUrl: string }>;
      if (
        !uploadUrlResponse.success ||
        !uploadUrlResponse.data ||
        typeof uploadUrlResponse.data.uploadUrl !== "string"
      ) {
        throw new Error(
          typeof uploadUrlResponse.error === "string"
            ? uploadUrlResponse.error
            : "Failed to get upload URL"
        );
      }

      setUploadProgress(20);

      // Step 2: Prepare image data for upload
      const fileData = {
        uri: imageResult.uri,
        type: imageResult.type,
        name: imageResult.name,
      };

      setUploadProgress(40);

      // Step 3: Upload to storage
      const uploadResponse = (await apiClient.uploadImageToStorage(
        uploadUrlResponse.data.uploadUrl,
        fileData,
        imageResult.type
      )) as ApiResponse<{ storageId: string }>;

      if (
        !uploadResponse.success ||
        !uploadResponse.data ||
        typeof uploadResponse.data.storageId !== "string"
      ) {
        throw new Error(
          typeof uploadResponse.error === "string"
            ? uploadResponse.error
            : "Failed to upload image"
        );
      }

      setUploadProgress(70);

      // Step 4: Save metadata
      const metadataResponse = await apiClient.saveImageMetadata({
        userId,
        storageId: uploadResponse.data.storageId,
        fileName: imageResult.name,
        contentType: imageResult.type,
        fileSize: imageResult.size,
      });

      if (!metadataResponse.success) {
        throw new Error(
          typeof metadataResponse.error === "string"
            ? metadataResponse.error
            : "Failed to save image metadata"
        );
      }

      setUploadProgress(100);
      return metadataResponse.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileImages", userId] });
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
      setUploadProgress(0);
    },
    onError: (error: any) => {
      setUploadProgress(0);
      console.error("Upload Error:", error?.message || String(error));
    },
  });

  // Delete image mutation
  const deleteMutation = useMutation({
    mutationFn: async (imageId: string) => {
      if (!userId) throw new Error("User not authenticated");

      const response = await apiClient.deleteProfileImage({
        userId,
        imageId,
      });

      if (!response.success) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "Failed to delete image"
        );
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileImages", userId] });
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
    },
    onError: (error: any) => {
      console.error("Delete Error:", error?.message || String(error));
    },
  });

  // Reorder images mutation
  const reorderMutation = useMutation({
    mutationFn: async (imageIds: string[]) => {
      if (!userId) throw new Error("User not authenticated");

      const response = await apiClient.reorderProfileImages({
        profileId: userId,
        imageIds,
      });

      if (!response.success) {
        throw new Error(
          typeof response.error === "string"
            ? response.error
            : "Failed to reorder images"
        );
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profileImages", userId] });
      queryClient.invalidateQueries({ queryKey: ["currentProfile"] });
    },
    onError: (error: any) => {
      console.error("Reorder Error:", error?.message || String(error));
    },
  });

  return {
    images: (images as ProfileImage[]) || [],
    isLoading,
    isUploading: uploadMutation.isPending,
    uploadProgress,
    uploadImage: (imageResult: ImagePickerResult) =>
      uploadMutation.mutateAsync(imageResult).then(() => {}),
    deleteImage: (imageId: string) =>
      deleteMutation.mutateAsync(imageId).then(() => {}),
    reorderImages: (imageIds: string[]) =>
      reorderMutation.mutateAsync(imageIds).then(() => {}),
    refetchImages: refetch,
  };
}

// Utility function to validate image before upload
export async function validateImage(imageResult: ImagePickerResult): Promise<string | null> {
  try {
    const { validatePickedImage, DEFAULT_VALIDATION_OPTIONS } = await import("../utils/imageValidation");
    const unified = await validatePickedImage(
      {
        uri: imageResult.uri,
        type: imageResult.type,
        size: imageResult.size,
        name: imageResult.name,
      },
      {
        maxFileSizeBytes: DEFAULT_VALIDATION_OPTIONS.maxFileSizeBytes,
        minWidth: DEFAULT_VALIDATION_OPTIONS.minWidth,
        minHeight: DEFAULT_VALIDATION_OPTIONS.minHeight,
        allowedFormats: DEFAULT_VALIDATION_OPTIONS.allowedFormats,
      }
    );

    if (!unified.isValid) {
      // Return the first error as a user-friendly string
      return unified.errors[0] || "Invalid image.";
    }
    return null;
  } catch (e) {
    console.error("Unified image validation error:", e);
    return "Failed to validate image";
  }
}
