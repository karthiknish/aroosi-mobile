// Mobile API utilities - simplified utility function pattern inspired by aroosi
// This provides a clean, consistent interface for common mobile API operations

import { apiClient } from "./api";
import { ApiResponse } from "../types/profile";
import { showErrorToast } from "./toast";

// Types for API responses
type MobileApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Toast function that accepts null
const safeShowErrorToast = (message: string | null, details?: string) => {
  if (message) {
    showErrorToast(message, details);
  }
};

// ============================================================================
// PROFILE OPERATIONS
// ============================================================================

/**
 * Fetch user profile with error handling
 */
export async function fetchUserProfile(userId: string): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.getProfileById(userId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to fetch profile" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch profile";
    safeShowErrorToast(errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(updates: any): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.updateProfile(updates);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to update profile" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
    safeShowErrorToast(errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Get current user profile
 */
export async function getCurrentUser(): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.getCurrentUser();
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get current user" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get current user";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// MESSAGING OPERATIONS
// ============================================================================

/**
 * Get messages for a conversation
 */
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; before?: number }
): Promise<MobileApiResponse<any[]>> {
  try {
    const result = await apiClient.getMessages(conversationId, options);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get messages" };
    }
    return { success: true, data: (result.data as any[]) || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get messages";
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a message
 */
export async function sendMessage(messageData: {
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  type?: "text" | "voice" | "image";
  audioStorageId?: string;
  imageStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
}): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.sendMessage(messageData);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to send message" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send message";
    safeShowErrorToast(errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Mark conversation as read
 */
export async function markConversationAsRead(conversationId: string): Promise<MobileApiResponse<void>> {
  try {
    const result = await apiClient.markConversationAsRead(conversationId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to mark as read" };
    }
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to mark as read";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// IMAGE OPERATIONS
// ============================================================================

/**
 * Get upload URL for images
 */
export async function getUploadUrl(): Promise<MobileApiResponse<{ uploadUrl: string }>> {
  try {
    const result = await apiClient.getUploadUrl();
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get upload URL" };
    }
    return { success: true, data: result.data as { uploadUrl: string } };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get upload URL";
    return { success: false, error: errorMessage };
  }
}

/**
 * Upload image to storage
 */
export async function uploadImageToStorage(
  uploadUrl: string,
  imageData: any,
  contentType: string
): Promise<MobileApiResponse<{ storageId: string }>> {
  try {
    const result = await apiClient.uploadImageToStorage(uploadUrl, imageData, contentType);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to upload image" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
    return { success: false, error: errorMessage };
  }
}

/**
 * Save image metadata
 */
export async function saveImageMetadata(data: {
  userId: string;
  storageId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
}): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.saveImageMetadata(data);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to save image metadata" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save image metadata";
    return { success: false, error: errorMessage };
  }
}

/**
 * Get profile images
 */
export async function getProfileImages(userId?: string): Promise<MobileApiResponse<any[]>> {
  try {
    const result = await apiClient.getProfileImages(userId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get profile images" };
    }
    return { success: true, data: (result.data as any[]) || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get profile images";
    return { success: false, error: errorMessage };
  }
}

/**
 * Delete profile image
 */
export async function deleteProfileImage(data: { userId: string; imageId: string }): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.deleteProfileImage(data);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to delete image" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete image";
    return { success: false, error: errorMessage };
  }
}

/**
 * Set main profile image
 */
export async function setMainProfileImage(imageId: string): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.setMainProfileImage(imageId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to set main image" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to set main image";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// AUTHENTICATION OPERATIONS
// ============================================================================

/**
 * Get subscription status
 */
export async function getSubscriptionStatus(): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.getSubscriptionStatus();
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get subscription status" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get subscription status";
    return { success: false, error: errorMessage };
  }
}

/**
 * Get usage stats
 */
export async function getUsageStats(): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.getUsageStats();
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get usage stats" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get usage stats";
    return { success: false, error: errorMessage };
  }
}

/**
 * Purchase subscription
 */
export async function purchaseSubscription(data: {
  platform: "ios" | "android";
  productId: string;
  purchaseToken: string;
  receiptData?: string;
}): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.purchaseSubscription(data);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Purchase failed" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Purchase failed";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// INTEREST OPERATIONS
// ============================================================================

/**
 * Send interest to user
 */
export async function sendInterest(toUserId: string): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.sendInterest(toUserId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to send interest" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to send interest";
    return { success: false, error: errorMessage };
  }
}

/**
 * Remove interest
 */
export async function removeInterest(toUserId: string): Promise<MobileApiResponse<any>> {
  try {
    const result = await apiClient.removeInterest(toUserId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to remove interest" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to remove interest";
    return { success: false, error: errorMessage };
  }
}

/**
 * Get sent interests
 */
export async function getSentInterests(userId?: string): Promise<MobileApiResponse<any[]>> {
  try {
    const result = await apiClient.getSentInterests(userId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get sent interests" };
    }
    return { success: true, data: (result.data as any[]) || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get sent interests";
    return { success: false, error: errorMessage };
  }
}

/**
 * Get received interests
 */
export async function getReceivedInterests(userId?: string): Promise<MobileApiResponse<any[]>> {
  try {
    const result = await apiClient.getReceivedInterests(userId);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Failed to get received interests" };
    }
    return { success: true, data: (result.data as any[]) || [] };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Failed to get received interests";
    return { success: false, error: errorMessage };
  }
}

// ============================================================================
// SEARCH OPERATIONS
// ============================================================================

/**
 * Search profiles
 */
export async function searchProfiles(
  filters: any,
  page: number = 0
): Promise<MobileApiResponse<{ profiles: any[]; total: number; hasMore: boolean }>> {
  try {
    const result = await apiClient.searchProfiles(filters, page);
    if (!result.success) {
      return { success: false, error: (result.error as any)?.message || (result.error as any)?.error || "Search failed" };
    }
    return { success: true, data: result.data };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Search failed";
    return { success: false, error: errorMessage };
  }
}
