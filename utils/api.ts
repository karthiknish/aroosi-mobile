// Import moved to avoid circular dependency
import {
  ApiResponse,
  Profile,
  CreateProfileData,
  UpdateProfileData,
  SearchFilters,
  SearchResponse,
  Interest,
  Message,
  SubscriptionStatus,
  UsageStats,
  BlockedUser,
  BlockStatus,
  ReportData,
  ReportResponse,
} from "../types/profile";
import type { Icebreaker } from "../src/types/engagement";
import {
  validateCreateProfile as validateFormData,
  validateUpdateProfile as validateProfileData,
} from "./profileValidation";
import { getAuthToken } from "../services/authToken";

// Base URL must be provided via environment
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL as string;
if (!API_BASE_URL) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Configure your API base URL in environment."
  );
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  // Public wrapper used by other modules as shared transport
  public async transportRequest<T = any>(
    endpoint: string,
    options: {
      method?: "GET" | "POST" | "PUT" | "DELETE";
      headers?: Record<string, string>;
      body?: any;
      signal?: AbortSignal;
    } = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: options.signal,
    } as any);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    // Normalize endpoint to include /api prefix expected by web backend
    const normalizeEndpoint = (ep: string) => {
      if (!ep.startsWith("/")) ep = "/" + ep;
      if (ep.startsWith("/api/")) return ep; // already normalized
      return "/api" + ep; // prefix missing
    };
    endpoint = normalizeEndpoint(endpoint);
    const maxRetries = 3;
    const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff

    try {
      const url = `${this.baseUrl}${endpoint}`;

      // Automatically attach Firebase ID token if not already provided
      let headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...((options.headers as Record<string, string>) || {}),
      };

      if (!headers["Authorization"]) {
        try {
          const token = await getAuthToken();
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        } catch (authError) {
          console.warn("Failed to get auth token:", authError);
        }
      }

      const response = await fetch(url, {
        ...options,
        credentials: "include",
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: this.getErrorCode(response.status, data),
            message: data?.error || data?.message || `HTTP ${response.status}`,
            details: data?.details || null,
          },
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      if (retryCount < maxRetries && this.isRetryableError(error)) {
        await this.delay(retryDelay);
        return this.request(endpoint, options, retryCount + 1);
      }

      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
          details: null,
        },
      };
    }
  }

  private getErrorCode(status: number, data: any): string {
    if (data.code) return data.code;

    switch (status) {
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 400:
        return "VALIDATION_ERROR";
      case 429:
        return "RATE_LIMITED";
      case 402:
        return "SUBSCRIPTION_REQUIRED";
      case 422:
        return "PROFILE_INCOMPLETE";
      default:
        return `HTTP_${status}`;
    }
  }

  private isRetryableError(error: any): boolean {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error instanceof TypeError ||
      error.message?.includes("fetch") ||
      error.message?.includes("network") ||
      error.message?.includes("timeout")
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Removed token refresh; relying solely on cookie-based session via credentials: "include"

  // Profile APIs
  async getProfile(): Promise<ApiResponse<Profile>> {
    return this.request<Profile>("/profile");
  }

  // Engagement: Icebreakers
  async fetchIcebreakers(): Promise<ApiResponse<Icebreaker[]>> {
    const res = await this.request<Icebreaker[]>("/icebreakers");
    if (!res.success) return res as ApiResponse<Icebreaker[]>;
    // Support enveloped responses { success, data }
    const payload: any = res.data as any;
    const list = Array.isArray(payload?.data) ? payload.data : payload;
    return { success: true, data: Array.isArray(list) ? list : [] };
  }

  async answerIcebreaker(
    questionId: string,
    answer: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    const res = await this.request<{ success: boolean }>(
      "/icebreakers/answer",
      {
        method: "POST",
        body: JSON.stringify({ questionId, answer }),
      }
    );
    return res as ApiResponse<{ success: boolean }>;
  }

  // Engagement: Shortlists
  async fetchShortlists(): Promise<
    ApiResponse<
      {
        userId: string;
        fullName?: string;
        profileImageUrls?: string[];
        createdAt: number;
      }[]
    >
  > {
    return this.request("/engagement/shortlist");
  }

  async toggleShortlist(
    toUserId: string
  ): Promise<
    ApiResponse<{ success: boolean; added?: boolean; removed?: boolean }>
  > {
    return this.request("/engagement/shortlist", {
      method: "POST",
      body: JSON.stringify({ toUserId }),
    });
  }

  async getProfileById(profileId: string): Promise<ApiResponse<Profile>> {
    return this.request<Profile>(`/profile-detail/${profileId}`);
  }

  async createProfile(
    profileData: CreateProfileData
  ): Promise<ApiResponse<Profile>> {
    // Validate form data before sending
    const errors = validateFormData(profileData);
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: Object.values(errors).join(", "),
          details: errors,
        },
      } as any;
    }

    return this.request<Profile>("/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(
    updates: UpdateProfileData
  ): Promise<ApiResponse<Profile>> {
    // Validate updates before sending (errors object when invalid)
    const errors = validateProfileData(updates);
    if (Object.keys(errors).length > 0) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: Object.values(errors).join(", "),
          details: errors,
        },
      } as any;
    }

    return this.request<Profile>("/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  // Search APIs
  async searchProfiles(
    filters: SearchFilters,
    page: number = 0
  ): Promise<ApiResponse<SearchResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: filters.pageSize?.toString() || "12",
    });

    // Basic filters
    if (filters.city && filters.city !== "any")
      params.append("city", filters.city);
    if (filters.country && filters.country !== "any")
      params.append("country", filters.country);
    if (filters.ageMin) params.append("ageMin", filters.ageMin.toString());
    if (filters.ageMax) params.append("ageMax", filters.ageMax.toString());

    // Premium filters (Premium Plus only)
    if (filters.ethnicity && filters.ethnicity !== "any")
      params.append("ethnicity", filters.ethnicity);
    if (filters.motherTongue && filters.motherTongue !== "any")
      params.append("motherTongue", filters.motherTongue);
    if (filters.language && filters.language !== "any")
      params.append("language", filters.language);

    // Additional filters
    if (filters.gender && filters.gender !== "any")
      params.append("preferredGender", filters.gender);
    if (filters.maritalStatus && filters.maritalStatus.length > 0) {
      filters.maritalStatus.forEach((status) =>
        params.append("maritalStatus", status)
      );
    }
    if (filters.education && filters.education.length > 0) {
      filters.education.forEach((edu) => params.append("education", edu));
    }
    if (filters.occupation && filters.occupation.length > 0) {
      filters.occupation.forEach((occ) => params.append("occupation", occ));
    }
    if (filters.diet && filters.diet.length > 0) {
      filters.diet.forEach((d) => params.append("diet", d));
    }
    if (filters.smoking && filters.smoking.length > 0) {
      filters.smoking.forEach((s) => params.append("smoking", s));
    }
    if (filters.drinking && filters.drinking.length > 0) {
      filters.drinking.forEach((d) => params.append("drinking", d));
    }

    // Premium filters (Premium Plus only)
    if (filters.annualIncomeMin)
      params.append("annualIncomeMin", filters.annualIncomeMin.toString());
    if (filters.heightMin) params.append("heightMin", filters.heightMin);
    if (filters.heightMax) params.append("heightMax", filters.heightMax);

    // Cursor-based pagination preferred by web API
    if (filters.cursor) params.append("cursor", String(filters.cursor));
    const response = await this.request(`/search?${params}`);

    if (response.success && response.data) {
      const base: any = response.data as any;
      const envelope = base?.data ?? base;
      const profiles = Array.isArray(envelope?.profiles)
        ? envelope.profiles
        : [];
      const total = typeof envelope?.total === "number" ? envelope.total : 0;
      const nextCursor = envelope?.nextCursor ?? null;
      const nextPage = envelope?.nextPage ?? null;
      const hasMore =
        typeof nextCursor === "string"
          ? nextCursor.length > 0
          : !!envelope?.hasMore;
      return {
        success: true,
        data: {
          profiles,
          total,
          hasMore,
          nextPage,
          nextCursor,
        },
      };
    }

    return response as ApiResponse<SearchResponse>;
  }

  // Interest APIs (Auto-matching system)
  async sendInterest(toUserId: string): Promise<ApiResponse<Interest>> {
    return this.request("/interests", {
      method: "POST",
      body: JSON.stringify({ toUserId }),
    });
  }

  async removeInterest(toUserId: string): Promise<ApiResponse<void>> {
    return this.request("/interests", {
      method: "DELETE",
      body: JSON.stringify({ toUserId }),
    });
  }

  // Get sent interests - returns interests with profile enrichment
  async getSentInterests(userId?: string): Promise<ApiResponse<Interest[]>> {
    const params = userId ? `?userId=${userId}` : "";
    return this.request(`/interests${params}`);
  }

  // Get received interests - returns interests with profile enrichment
  async getReceivedInterests(
    userId?: string
  ): Promise<ApiResponse<Interest[]>> {
    const params = userId ? `?userId=${userId}` : "";
    return this.request(`/interests/received${params}`);
  }

  // Interest response not available via API - auto-matching system
  // When both users send interests to each other, they automatically match
  async respondToInterest(): Promise<ApiResponse<never>> {
    console.warn(
      "respondToInterest: Auto-matching system - interests automatically match when mutual"
    );
    return {
      success: false,
      error: {
        code: "AUTO_MATCHING_SYSTEM",
        message:
          "Auto-matching system - interests automatically match when both users express interest",
        details:
          "Manual interest responses are not supported. Matches are created automatically when mutual interest is detected.",
      },
    };
  }

  // Messaging Image Upload (parity with web /api/messages/upload-image)
  async getMessageImageUploadUrl(
    conversationId: string
  ): Promise<ApiResponse<{ uploadUrl: string }>> {
    return this.request(`/messages/upload-image-url`, {
      method: "POST",
      body: JSON.stringify({ conversationId }),
    });
  }

  async saveMessageImageMetadata(params: {
    conversationId: string;
    storageId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
    width?: number;
    height?: number;
  }): Promise<ApiResponse<{ messageId: string; imageUrl: string }>> {
    return this.request(`/messages/image`, {
      method: "POST",
      body: JSON.stringify(params),
    });
  }

  async getInterestStatus(
    fromUserId: string,
    toUserId: string
  ): Promise<ApiResponse<{ status: string; hasInterest: boolean }>> {
    return this.request(
      `/interests/status?fromUserId=${fromUserId}&toUserId=${toUserId}`
    );
  }

  // Safety APIs
  async reportUser(request: ReportData): Promise<ApiResponse<ReportResponse>> {
    return this.request("/safety/report", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async blockUser(request: {
    blockedUserId: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request("/safety/block", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async unblockUser(request: {
    blockedUserId: string;
  }): Promise<ApiResponse<{ message: string }>> {
    return this.request("/safety/unblock", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getBlockedUsers(): Promise<
    ApiResponse<{ blockedUsers: BlockedUser[] }>
  > {
    return this.request("/safety/blocked");
  }

  async checkBlockStatus(userId: string): Promise<ApiResponse<BlockStatus>> {
    return this.request(`/safety/blocked/check?userId=${userId}`);
  }

  async getBlockStatus(userId: string): Promise<ApiResponse<BlockStatus>> {
    return this.request(`/safety/blocked/check?userId=${userId}`);
  }

  // Match APIs
  async getMatches() {
    return this.request("/matches");
  }

  async getUnreadCounts() {
    return this.request("/matches/unread");
  }

  // Conversation APIs
  async getConversations(options?: { page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.page !== undefined)
      params.append("page", String(options.page));
    if (options?.limit !== undefined)
      params.append("limit", String(options.limit));
    const qs = params.toString();
    const path = qs ? `/conversations?${qs}` : "/conversations";
    return this.request(path);
  }

  // Presence APIs (parity with web)
  async getPresence(
    userId: string
  ): Promise<ApiResponse<{ isOnline: boolean; lastSeen: number }>> {
    if (!userId) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "userId is required" },
      } as any;
    }
    return this.request(`/presence?userId=${encodeURIComponent(userId)}`);
  }

  async heartbeat(): Promise<ApiResponse<void>> {
    return this.request(`/presence`, {
      method: "POST",
      body: JSON.stringify({ status: "online" }),
    }) as unknown as ApiResponse<void>;
  }

  // Message Reactions
  /**
   * Toggle a reaction for a message (adds if not present by user, removes otherwise)
   * Mirrors web endpoint POST /api/reactions with body { messageId, emoji }
   */
  async toggleReaction(
    messageId: string,
    emoji: string
  ): Promise<ApiResponse<{ success?: boolean }>> {
    if (!messageId || !emoji) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "messageId and emoji are required",
          details: null,
        },
      } as any;
    }
    return this.request("/reactions", {
      method: "POST",
      body: JSON.stringify({ messageId, emoji }),
    });
  }

  /**
   * Get reactions for a conversation
   * GET /api/reactions?conversationId=...
   * Returns { reactions: Array<{ messageId: string; emoji: string; userId: string }> }
   */
  async getReactions(conversationId: string): Promise<
    ApiResponse<{
      reactions?: Array<{ messageId: string; emoji: string; userId: string }>;
    }>
  > {
    if (!conversationId) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "conversationId is required",
          details: null,
        },
      } as any;
    }
    const qs = `conversationId=${encodeURIComponent(conversationId)}`;
    return this.request(`/reactions?${qs}`);
  }

  // Message APIs - Aligned with unified messaging endpoints
  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: number }
  ): Promise<ApiResponse<Message[]>> {
    // Validate conversation ID
    const { MessageValidator } = await import("./messageValidation");
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error || "Invalid conversation ID",
          details: null,
        },
      };
    }

    const params = new URLSearchParams({ conversationId });
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.before) params.append("before", options.before.toString());

    const response = await this.request<Message[]>(`/match-messages?${params}`);

    // Normalize messages for backward compatibility
    if (response.success && response.data) {
      response.data = response.data.map(this.normalizeMessage);
    }

    return response;
  }

  async sendMessage(data: {
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
    replyTo?: {
      messageId: string;
      text?: string;
      type?: "text" | "voice" | "image";
      fromUserId?: string;
    };
  }): Promise<ApiResponse<Message>> {
    // Validate message data
    const { MessageValidator } = await import("./messageValidation");
    const validation = MessageValidator.validateMessageSendData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error || "Invalid message data",
          details: null,
        },
      };
    }

    const response = await this.request<Message>("/match-messages", {
      method: "POST",
      body: JSON.stringify({
        conversationId: data.conversationId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        text: data.text || "",
        type: data.type || "text",
        audioStorageId: data.audioStorageId,
        duration: data.duration,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        replyToMessageId: data.replyTo?.messageId,
        replyToText: data.replyTo?.text,
        replyToType: data.replyTo?.type,
        replyToFromUserId: data.replyTo?.fromUserId,
      }),
    });

    // Normalize message for backward compatibility
    if (response.success && response.data) {
      response.data = this.normalizeMessage(response.data);
    }

    return response;
  }

  // Edit a message (text only)
  async editMessage(
    messageId: string,
    text: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/messages/${messageId}`, {
      method: "PATCH",
      body: JSON.stringify({ text }),
    });
  }

  // Soft-delete a message
  async deleteMessage(
    messageId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request(`/messages/${messageId}`, {
      method: "DELETE",
    });
  }

  async markMessagesAsRead(messageIds: string[]) {
    return this.request("/messages/mark-read", {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    });
  }

  async markConversationAsRead(
    conversationId: string
  ): Promise<ApiResponse<void>> {
    // Validate conversation ID
    const { MessageValidator } = await import("./messageValidation");
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error || "Invalid conversation ID",
          details: null,
        },
      };
    }

    return this.request("/messages/read", {
      method: "POST",
      body: JSON.stringify({ conversationId }),
    });
  }

  // Delivery receipts
  async sendDeliveryReceipt(messageId: string, status: string) {
    // No dedicated REST endpoint on web; treat as no-op success.
    if (!messageId) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "messageId required" },
      } as any;
    }
    return { success: true } as any;
  }

  async getDeliveryReceipts(conversationId: string) {
    // Not supported – return empty list
    return { success: true, data: [] } as any;
  }

  // Typing indicators
  async sendTypingIndicator(conversationId: string, action: "start" | "stop") {
    if (!conversationId) {
      return {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "conversationId required" },
      } as any;
    }
    return { success: true } as any; // realtime only
  }

  async getTypingIndicators(conversationId: string) {
    // Not supported via REST
    return { success: true, data: [] } as any;
  }

  // Image APIs - Updated to match web implementation
  async getUploadUrl() {
    return this.request("/profile-images/upload-url", {
      method: "GET",
    });
  }

  async uploadImageToStorage(
    uploadUrl: string,
    imageData: any,
    contentType: string
  ) {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: imageData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      // Do NOT call response.json() here!
      // Instead, return the storageId (from the uploadUrl or metadata step)
      return {
        success: true,
        data: { storageId: this.extractStorageId(uploadUrl) },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  // Helper to extract storageId from uploadUrl (if needed)
  private extractStorageId(uploadUrl: string): string {
    // Example: .../profile-images/{storageId}?...
    const match = uploadUrl.match(/profile-images\/([\w-]+)/);
    return match ? match[1] : "";
  }

  // Message normalization for backward compatibility
  private normalizeMessage(
    rawMessage: any
  ): import("../types/message").Message {
    return {
      _id: rawMessage._id || rawMessage.id,
      conversationId: rawMessage.conversationId,
      fromUserId: rawMessage.fromUserId,
      toUserId: rawMessage.toUserId,
      text: rawMessage.text || rawMessage.content || "",
      type: rawMessage.type || "text",
      createdAt: rawMessage.createdAt || rawMessage.timestamp || Date.now(),
      readAt: rawMessage.readAt,

      // Voice message fields
      audioStorageId: rawMessage.audioStorageId,
      duration: rawMessage.duration || rawMessage.voiceDuration,

      // Image message fields
      imageStorageId: rawMessage.imageStorageId,

      // Common metadata
      fileSize: rawMessage.fileSize,
      mimeType: rawMessage.mimeType,

      // Client-side fields
      status: this.normalizeMessageStatus(rawMessage.status),
      isOptimistic: rawMessage.isOptimistic || false,
      deliveryReceipts: rawMessage.deliveryReceipts || [],

      // Backward compatibility fields
      id: rawMessage.id,
      content: rawMessage.content,
      _creationTime: rawMessage._creationTime,
      timestamp: rawMessage.timestamp,
      isRead: rawMessage.isRead,
      voiceUrl: rawMessage.voiceUrl,
      voiceDuration: rawMessage.voiceDuration,
      voiceWaveform: rawMessage.voiceWaveform,
      fileUrl: rawMessage.fileUrl,
      fileName: rawMessage.fileName,
      thumbnailUrl: rawMessage.thumbnailUrl,
      editedAt: rawMessage.editedAt,
      replyToId: rawMessage.replyToId,
      isSystemMessage: rawMessage.isSystemMessage,
    };
  }

  // Normalize message status for consistency
  private normalizeMessageStatus(
    status: any
  ): "pending" | "sent" | "delivered" | "read" | "failed" | undefined {
    if (!status) return undefined;

    // Map legacy statuses to new ones
    switch (status) {
      case "sending":
        return "pending";
      case "queued":
      case "uploading":
        return "pending";
      case "sent":
      case "delivered":
      case "read":
      case "failed":
        return status;
      default:
        return "sent"; // Default fallback
    }
  }

  async saveImageMetadata(data: {
    userId: string;
    storageId: string;
    fileName: string;
    contentType: string;
    fileSize: number;
  }) {
    return this.request("/profile-images", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async deleteProfileImage(data: { userId: string; imageId: string }) {
    return this.request("/profile-images", {
      method: "DELETE",
      body: JSON.stringify(data),
    });
  }

  async reorderProfileImages(data: { profileId: string; imageIds: string[] }) {
    return this.request("/profile-images/order", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getProfileImages(userId?: string) {
    const params = userId ? `?userId=${userId}` : "";
    return this.request(`/profile-images${params}`);
  }

  async getBatchProfileImages(userIds: string[]) {
    return this.request(`/profile-images/batch?userIds=${userIds.join(",")}`);
  }

  async setMainProfileImage(imageId: string) {
    return this.request("/profile-images/main", {
      method: "POST",
      body: JSON.stringify({ imageId }),
    });
  }

  async updateImageOrder(imageIds: string[]) {
    return this.request("/profile-images/order", {
      method: "POST",
      body: JSON.stringify({ imageIds }),
    });
  }

  async batchProfileImageOperations(operations: any) {
    return this.request("/profile-images/batch", {
      method: "POST",
      body: JSON.stringify(operations),
    });
  }

  // Subscription APIs - aligned with main project
  async createCheckoutSession(
    planId: "premium" | "premiumPlus"
  ): Promise<ApiResponse<any>> {
    return this.request("/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
  }

  async getSubscriptionStatus(): Promise<ApiResponse<SubscriptionStatus>> {
    return this.request("/subscription/status");
  }

  async getUsageStats(): Promise<ApiResponse<UsageStats>> {
    return this.request("/subscription/usage");
  }

  async getSubscriptionFeatures(): Promise<ApiResponse<any>> {
    return this.request("/subscription/features");
  }

  /**
   * Purchase a subscription (in-app purchase) - aligned with main project
   * @param {Object} params
   * @param {'ios'|'android'} params.platform - The platform (ios or android)
   * @param {string} params.productId - The product ID for the subscription
   * @param {string} params.purchaseToken - The purchase token (Android) or receipt data (iOS)
   * @param {string} [params.receiptData] - The base64 receipt data (iOS)
   */
  async purchaseSubscription({
    platform,
    productId,
    purchaseToken,
    receiptData,
  }: {
    platform: "ios" | "android";
    productId: string;
    purchaseToken: string;
    receiptData?: string;
  }) {
    return this.request("/subscription/purchase", {
      method: "POST",
      body: JSON.stringify({
        platform,
        productId,
        purchaseToken: platform === "ios" ? receiptData : purchaseToken,
        receiptData: platform === "ios" ? receiptData : undefined,
      }),
    });
  }

  async cancelSubscription() {
    return this.request("/subscription/cancel", {
      method: "POST",
    });
  }

  async restorePurchases() {
    return this.request("/subscription/restore", {
      method: "POST",
    });
  }

  // Note: /subscription/upgrade endpoint not available
  async updateSubscriptionTier() {
    console.warn("updateSubscriptionTier: Endpoint not available");
    return {
      success: false,
      error: "Subscription upgrade endpoint not available",
    };
  }

  async trackFeatureUsage(feature: string) {
    return this.request("/subscription/track-usage", {
      method: "POST",
      body: JSON.stringify({ feature }),
    });
  }

  async getUsageHistory() {
    return this.request("/subscription/usage-history");
  }

  async canUseFeature(feature: string) {
    return this.request(`/subscription/can-use/${feature}`);
  }

  // Profile boost
  async boostProfile() {
    return this.request("/profile/boost", {
      method: "POST",
    });
  }

  // Message Delivery Receipts
  async markSpecificMessagesAsRead(messageIds: string[]) {
    return this.request("/messages/mark-read", {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    });
  }

  // Voice Messages - Aligned with unified messaging API
  async generateVoiceUploadUrl(): Promise<
    ApiResponse<{ uploadUrl: string; storageId: string }>
  > {
    const storageId = `voice_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return {
      success: true,
      data: { uploadUrl: `${this.baseUrl}/voice-messages/upload`, storageId },
    };
  }

  async uploadVoiceMessage(
    audioBlob: Blob,
    conversationId: string,
    duration: number
  ) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-message.m4a");
    formData.append("conversationId", conversationId);
    formData.append("duration", duration.toString());

    return this.request("/voice-messages/upload", {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
  }

  async getVoiceMessageUrl(
    storageId: string
  ): Promise<ApiResponse<{ url: string }>> {
    if (!storageId) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Storage ID is required",
          details: null,
        },
      };
    }

    return this.request(`/voice-messages/${storageId}/url`);
  }

  // Profile view tracking (align with web: body { profileId }, GET requires ?profileId=)
  async recordProfileView(profileId: string) {
    return this.request("/profile/view", {
      method: "POST",
      body: JSON.stringify({ profileId }),
    });
  }

  async getProfileViewers(
    profileId: string,
    opts: { limit?: number; offset?: number } = {}
  ) {
    const params = new URLSearchParams();
    if (profileId) params.set("profileId", profileId);
    if (typeof opts.limit === "number") params.set("limit", String(opts.limit));
    if (typeof opts.offset === "number")
      params.set("offset", String(opts.offset));
    return this.request(`/profile/view?${params.toString()}`);
  }

  // User management
  async deleteProfile() {
    return this.request("/profile", {
      method: "DELETE",
    });
  }

  async getCurrentUser() {
    return this.request("/user/me");
  }

  // Contact & Support
  async submitContactForm(contactData: {
    email: string;
    name: string;
    subject: string;
    message: string;
  }) {
    return this.request("/contact", {
      method: "POST",
      body: JSON.stringify(contactData),
    });
  }

  async getContactSubmissions() {
    return this.request("/contact");
  }

  // AI Chat
  async sendChatMessage(data: { messages: any[]; email: string }) {
    return this.request("/gemini-chat", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async saveChatbotMessage(messageData: any) {
    return this.request("/saveChatbotMessage", {
      method: "POST",
      body: JSON.stringify(messageData),
    });
  }

  async convertAITextToHTML(text: string) {
    return this.request("/convert-ai-text-to-html", {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  }

  // Push Notifications (aligned with main project API)
  async registerForPushNotifications(registrationData: {
    playerId: string;
    deviceType?: string;
    deviceToken?: string;
  }) {
    return this.request("/push/register", {
      method: "POST",
      body: JSON.stringify(registrationData),
    });
  }

  async unregisterFromPushNotifications(unregistrationData: {
    playerId: string;
  }) {
    return this.request("/push/register", {
      method: "DELETE",
      body: JSON.stringify(unregistrationData),
    });
  }

  /**
   * Validate a purchase (in-app purchase)
   * @param {Object} validationRequest
   * @param {'ios'|'android'} validationRequest.platform
   * @param {string} validationRequest.productId
   * @param {string} [validationRequest.purchaseToken]
   * @param {string} [validationRequest.receiptData]
   */
  async validatePurchase(validationRequest: {
    platform: "ios" | "android";
    productId: string;
    purchaseToken?: string;
    receiptData?: string;
  }) {
    return this.request("/subscription/validate-purchase", {
      method: "POST",
      body: JSON.stringify(validationRequest),
    });
  }

  // Interest Management - Extended
  async getInterests(params: { userId?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set("userId", params.userId);

    return this.request(`/interests?${searchParams}`);
  }

  // DEPRECATED: Manual interest responses are not supported in auto-matching system
  // This method is kept for backward compatibility but will always return an error
  async respondToInterestByStatus(data: {
    interestId: string;
    status: "accepted" | "rejected";
  }): Promise<ApiResponse<never>> {
    console.warn(
      "respondToInterestByStatus: DEPRECATED - Auto-matching system handles interest responses automatically"
    );
    return {
      success: false,
      error: {
        code: "DEPRECATED_ENDPOINT",
        message:
          "Manual interest responses are deprecated. Matches are created automatically when mutual interest is detected.",
        details:
          "This endpoint is deprecated. Use sendInterest() to express interest, and matches will be created automatically when mutual.",
      },
    };
  }

  // Messaging - Extended
  async getConversationEvents(conversationId: string) {
    return this.request(`/conversations/${conversationId}/events`);
  }

  // Public APIs (no auth required)
  async getPublicProfile() {
    return this.request("/public-profile");
  }

  async getProfileDetailImages(profileId: string) {
    return this.request(`/profile-detail/${profileId}/images`);
  }

  // Search - Extended
  async searchImages(params: any) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/search-images?${searchParams}`);
  }

  // Engagement: Quick Picks (parity with web)
  async getQuickPicks(dayKey?: string): Promise<
    ApiResponse<{
      userIds: string[];
      profiles: import("../src/types/engagement").QuickPickProfile[];
    }>
  > {
    const url = dayKey
      ? `/engagement/quick-picks?day=${encodeURIComponent(dayKey)}`
      : "/engagement/quick-picks";
    return this.request(url);
  }

  async actOnQuickPick(
    toUserId: string,
    action: "like" | "skip"
  ): Promise<ApiResponse<{ success: boolean }>> {
    return this.request("/engagement/quick-picks", {
      method: "POST",
      body: JSON.stringify({ toUserId, action }),
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Export a shared named transport request for other modules
export function request<T = any>(
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    body?: any;
    signal?: AbortSignal;
  } = {}
) {
  return apiClient.transportRequest<T>(endpoint, options);
}

// Retain hook for parity; now simply returns the singleton client
export function useApiClient() {
  return apiClient;
}
