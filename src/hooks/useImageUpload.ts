import { useState } from "react";
import { useAuth } from "@contexts/AuthProvider"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@utils/api";
import {
  ImageType,
  ProfileImage,
  IMAGE_VALIDATION,
  ImagePickerResult,
} from "../../types/image";
import { ApiResponse } from "../../types/profile";
import { validateImageUpload } from "../../utils/imageValidationWebParity";
import { getFriendlyImageValidationMessage } from "../../utils/imageToastMessages";
import { useSubscription } from "./useSubscription";
import { showErrorToast } from "@utils/toast";

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
  const { user } = useAuth();
  const userId = user?.id;
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const { subscription } = useSubscription();

  // Fetch user's profile images
  const {
    data: images = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["profileImages", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User not authenticated");
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
  const currentPlan = (subscription as any)?.plan || (subscription as any)?.tier || "free";
  const validationError = await validateImage(imageResult, currentPlan);
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
      const msg = error?.message || String(error) || "Image upload failed";
      console.error("Upload Error:", msg);
  showErrorToast(msg);
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
      const msg = error?.message || String(error) || "Failed to delete image";
      console.error("Delete Error:", msg);
  showErrorToast(msg);
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
      const msg = error?.message || String(error) || "Failed to reorder images";
      console.error("Reorder Error:", msg);
  showErrorToast(msg);
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
export async function validateImage(imageResult: ImagePickerResult, plan: string = "free"): Promise<string | null> {
  try {
    // Basic head bytes fetch for signature (best effort; may fail silently on some URIs)
    let headBytes: Uint8Array | undefined;
    try {
      const res = await fetch(imageResult.uri);
      const blob = await res.blob();
      const slice = blob.slice(0, 64);
      const arrBuf = await slice.arrayBuffer();
      headBytes = new Uint8Array(arrBuf);
    } catch {}

    const result = await validateImageUpload({
      fileSize: imageResult.size,
      providedMime: imageResult.type,
      plan,
      headBytes,
    });

    if (!result.ok) {
      return (
        getFriendlyImageValidationMessage(result, plan) ||
        result.message ||
        result.errorCode ||
        "Invalid image"
      );
    }
    return null;
  } catch (e) {
    console.error("Parity image validation error:", e);
    return "Failed to validate image";
  }
}
