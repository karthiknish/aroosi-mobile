import { useAuth } from "../contexts/AuthContext";
import { ApiResponse } from "../types/profile";
import { networkManager } from "./NetworkManager";
import { AppError, errorHandler } from "./errorHandling";
import { errorReporter } from "./ErrorReporter";

// Base URL must be provided via environment
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL as string;
if (!API_BASE_URL) {
  throw new Error("EXPO_PUBLIC_API_URL is not set. Configure your API base URL in environment.");
}

interface RequestOptions extends RequestInit {
  skipErrorHandling?: boolean;
  priority?: any;
  retryConfig?: {
    maxRetries?: number;
    baseDelay?: number;
  };
}

class EnhancedApiClient {
  private baseUrl: string;
  private getToken: (() => Promise<string | null>) | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthProvider(getToken: () => Promise<string | null>) {
    this.getToken = getToken;
  }

  private async getAuthHeaders() {
    const token = await this.getToken?.();

    if (__DEV__) {
      if (token) {
        console.log(
          "🔑 Retrieved auth token prefix:",
          token.substring(0, 10) + "..."
        );
      } else {
        console.warn("🚫 No auth token available when building headers");
      }
    }

    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    if (__DEV__) {
      console.log(`➡️  API request to ${endpoint}`);
    }
    const {
      skipErrorHandling = false,
      // priority and retryConfig are retained for future adaptation, but transport is delegated
      priority = "medium",
      retryConfig,
      ...fetchOptions
    } = options;

    try {
      // Delegate to base ApiClient for actual HTTP (single transport semantics)
      const result = await ApiClient.request<any>(endpoint, {
        method: (fetchOptions.method as any) || "GET",
        headers: fetchOptions.headers as any,
        body: fetchOptions.body,
        signal: fetchOptions.signal as any,
      } as any);

      if (!result.success) {
        const appError = new AppError(
          result.error?.message || "API error",
          this.classifyHttpError(400),
          { metadata: { endpoint } },
          true,
          result.error?.message
        );

        if (!skipErrorHandling) {
          errorHandler.handle(appError, { metadata: { endpoint } });
          await errorReporter.reportError(appError, { metadata: { endpoint } });
        }

        return {
          success: false,
          error: {
            code: result.error?.code || "API_ERROR",
            message: result.error?.message || "Request failed",
          },
        };
      }

      errorReporter.addBreadcrumb(`API Success: ${endpoint}`, "api");
      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      const appError = errorHandler.handle(error as Error, {
        metadata: { endpoint },
      });

      if (!skipErrorHandling) {
        await errorReporter.reportError(appError, { metadata: { endpoint } });
      }

      return {
        success: false,
        error: {
          code: appError.type?.toUpperCase?.() || "API_ERROR",
          message: appError.userMessage || "Request failed",
        },
      };
    }
  }

  private classifyHttpError(status: number): AppError["type"] {
    if (status === 401) return "authentication";
    if (status === 403) return "authorization";
    if (status >= 400 && status < 500) return "validation";
    if (status >= 500) return "server";
    return "unknown";
  }

  // Profile APIs with enhanced error handling
  async getProfile() {
    return this.request("/profile", {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getProfileById(profileId: string) {
    return this.request(`/profile-detail/${profileId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async createProfile(profileData: any) {
    return this.request("/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
      priority: "high",
    });
  }

  async updateProfile(updates: any) {
    return this.request("/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
      priority: "high",
    });
  }

  // Search APIs
  async searchProfiles(filters: any) {
    const params = new URLSearchParams(filters);
    return this.request(`/search?${params}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  // Interest APIs - Updated to match available endpoints
  async sendInterest(toUserId: string, fromUserId: string) {
    return this.request("/interests", {
      method: "POST",
      body: JSON.stringify({ toUserId, fromUserId }),
      priority: "high",
    });
  }

  async removeInterest(toUserId: string, fromUserId: string) {
    return this.request("/interests", {
      method: "DELETE",
      body: JSON.stringify({ toUserId, fromUserId }),
      priority: "high",
    });
  }

  // Get sent interests - returns interests with profile enrichment
  async getSentInterests(userId: string) {
    return this.request(`/interests?userId=${userId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Get received interests - returns interests with profile enrichment
  async getReceivedInterests(userId: string) {
    return this.request(`/interests/received?userId=${userId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Interest response not available via API - auto-matching system
  // When both users send interests to each other, they automatically match
  async respondToInterest(interestId: string, response: "accept" | "reject") {
    console.warn(
      "respondToInterest: Auto-matching system - interests automatically match when mutual"
    );
    return {
      success: false,
      error:
        "Auto-matching system - interests automatically match when both users express interest",
    };
  }

  async getInterestStatus(fromUserId: string, toUserId: string) {
    return this.request(
      `/interests/status?fromUserId=${fromUserId}&toUserId=${toUserId}`
    );
  }

  // Safety APIs
  async reportUser(
    reportedUserId: string,
    reason: string,
    description?: string
  ) {
    return this.request("/safety/report", {
      method: "POST",
      body: JSON.stringify({ reportedUserId, reason, description }),
      priority: "high",
    });
  }

  async blockUser(blockedUserId: string) {
    return this.request("/safety/block", {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
      priority: "high",
    });
  }

  async unblockUser(blockedUserId: string) {
    return this.request("/safety/unblock", {
      method: "POST",
      body: JSON.stringify({ blockedUserId }),
      priority: "high",
    });
  }

  async getBlockedUsers() {
    return this.request("/safety/blocked");
  }

  async checkIfBlocked(userId: string) {
    return this.request(`/safety/blocked/check?userId=${userId}`);
  }

  // Match APIs
  async getMatches() {
    return this.request("/matches", {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getUnreadCounts() {
    return this.request("/matches/unread");
  }

  // Message APIs - Aligned with unified messaging endpoints
  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: number }
  ) {
    // Validate conversation ID
    const { MessageValidator } = await import("./messageValidation");
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid conversation ID",
      };
    }

    const params = new URLSearchParams({ conversationId });
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.before) params.append("before", options.before.toString());

    const response = await this.request(`/match-messages?${params}`, {
      retryConfig: { maxRetries: 2 },
    });

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
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }) {
    // Validate message data
    const { MessageValidator } = await import("./messageValidation");
    const validation = MessageValidator.validateMessageSendData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid message data",
      };
    }

    const response = await this.request("/match-messages", {
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
      }),
      priority: "high",
    });

    // Normalize message for backward compatibility
    if (response.success && response.data) {
      response.data = this.normalizeMessage(response.data);
    }

    return response;
  }

  async markMessagesAsRead(conversationId: string) {
    // Validate conversation ID
    const { MessageValidator } = await import("./messageValidation");
    const validation = MessageValidator.validateConversationId(conversationId);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid conversation ID",
      };
    }

    return this.request("/messages/read", {
      method: "POST",
      body: JSON.stringify({ conversationId }),
    });
  }

  // Image APIs - Updated to match basic API client
  async getUploadUrl() {
    return this.request("/profile-images/upload-url", {
      method: "GET",
      priority: "high",
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
        // Storage uploads typically do not use cookies; keep minimal headers
        headers: {
          "Content-Type": contentType,
        },
        body: imageData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      // Extract storageId from uploadUrl (matching basic API client)
      const storageId = this.extractStorageId(uploadUrl);
      return {
        success: true,
        data: { storageId },
      };
    } catch (error) {
      const appError = errorHandler.handle(error as Error, {
        action: "image_upload",
      });
      await errorReporter.reportError(appError, { action: "image_upload" });

      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  // Helper to extract storageId from uploadUrl
  private extractStorageId(uploadUrl: string): string {
    const match = uploadUrl.match(/profile-images\/([\\w-]+)/);
    return match ? match[1] : "";
  }

  // Message normalization for backward compatibility
  private normalizeMessage(rawMessage: any): any {
    return {
      _id: rawMessage._id || rawMessage.id,
      conversationId: rawMessage.conversationId,
      fromUserId: rawMessage.fromUserId || rawMessage.senderId,
      toUserId: rawMessage.toUserId || rawMessage.recipientId,
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
      senderId: rawMessage.senderId,
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
      priority: "high",
    });
  }

  async deleteProfileImage(data: { userId: string; imageId: string }) {
    return this.request("/profile-images", {
      method: "DELETE",
      body: JSON.stringify(data),
      priority: "high",
    });
  }

  async updateImageOrder(imageIds: string[]) {
    return this.request("/profile-images/order", {
      method: "POST",
      body: JSON.stringify({ imageIds }),
      priority: "high",
    });
  }

  async reorderProfileImages(data: { profileId: string; imageIds: string[] }) {
    return this.request("/profile-images/order", {
      method: "POST",
      body: JSON.stringify(data),
      priority: "high",
    });
  }

  async getProfileImages(userId?: string) {
    const params = userId ? `?userId=${userId}` : "";
    return this.request(`/profile-images${params}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getBatchProfileImages(userIds: string[]) {
    return this.request(`/profile-images/batch?userIds=${userIds.join(",")}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async setMainProfileImage(imageId: string) {
    return this.request("/profile-images/main", {
      method: "POST",
      body: JSON.stringify({ imageId }),
      priority: "high",
    });
  }

  // Subscription APIs - aligned with main project
  async createCheckoutSession(planId: "premium" | "premiumPlus") {
    return this.request("/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
      priority: "high",
    });
  }

  // Profile boost
  async boostProfile() {
    return this.request("/profile/boost", {
      method: "POST",
      priority: "high",
    });
  }

  // Profile view tracking
  async recordProfileView(viewedUserId: string) {
    return this.request("/profile/view", {
      method: "POST",
      body: JSON.stringify({ viewedUserId }),
      priority: "medium",
    });
  }

  async getProfileViewers() {
    return this.request("/profile/view", {
      retryConfig: { maxRetries: 2 },
    });
  }

  // User management
  async deleteProfile() {
    return this.request("/profile", {
      method: "DELETE",
      priority: "high",
    });
  }

  async getCurrentUser() {
    return this.request("/user/me", {
      retryConfig: { maxRetries: 2 },
    });
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
      priority: "high",
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
      priority: "medium",
    });
  }

  async saveChatbotMessage(messageData: any) {
    return this.request("/saveChatbotMessage", {
      method: "POST",
      body: JSON.stringify(messageData),
      priority: "low",
    });
  }

  async convertAITextToHTML(text: string) {
    return this.request("/convert-ai-text-to-html", {
      method: "POST",
      body: JSON.stringify({ text }),
      priority: "medium",
    });
  }

  // Push Notifications
  async registerForPushNotifications(playerId: string) {
    return this.request("/push/register", {
      method: "POST",
      body: JSON.stringify({ playerId }),
      priority: "high",
    });
  }

  // Interest Management - Extended
  async getInterests(params: { userId?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set("userId", params.userId);

    return this.request(`/interests?${searchParams}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Interest response by status not available via API - auto-matching system
  async respondToInterestByStatus(data: {
    interestId: string;
    status: "accepted" | "rejected";
  }) {
    console.warn(
      "respondToInterestByStatus: Auto-matching system - interests automatically match when mutual"
    );
    return {
      success: false,
      error:
        "Auto-matching system - interests automatically match when both users express interest",
    };
  }

  // Messaging - Extended
  async getConversationEvents(conversationId: string) {
    return this.request(`/conversations/${conversationId}/events`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Public APIs (no auth required)
  async getPublicProfile() {
    return this.request("/public-profile", {
      skipErrorHandling: false,
      retryConfig: { maxRetries: 2 },
    });
  }

  async getProfileDetailImages(profileId: string) {
    return this.request(`/profile-detail/${profileId}/images`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Search - Extended
  async searchImages(params: any) {
    const searchParams = new URLSearchParams(params);
    return this.request(`/search-images?${searchParams}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  // Profile Images - Extended
  async getProfileImageUploadUrl(data: { fileName: string; fileType: string }) {
    return this.request("/profile-images/upload-url", {
      method: "GET",
    });
  }

  async batchProfileImageOperations(operations: any[]) {
    return this.request("/profile-images/batch", {
      method: "POST",
      body: JSON.stringify({ operations }),
      priority: "high",
    });
  }

  async batchProfileOperations(operations: any[]) {
    return this.request("/profile/batch", {
      method: "POST",
      body: JSON.stringify({ operations }),
      priority: "high",
    });
  }

  // Admin APIs (require admin role)
  async adminListProfiles(
    params: {
      search?: string;
      page?: number;
      pageSize?: number;
    } = {}
  ) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.pageSize)
      searchParams.set("pageSize", params.pageSize.toString());

    return this.request(`/admin/profiles?${searchParams}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminUpdateProfile(profileData: any) {
    return this.request("/admin/profiles", {
      method: "PUT",
      body: JSON.stringify(profileData),
      priority: "high",
    });
  }

  async adminDeleteProfile(profileId: string) {
    return this.request("/admin/profiles", {
      method: "DELETE",
      body: JSON.stringify({ profileId }),
      priority: "high",
    });
  }

  async adminGetProfile(profileId: string) {
    return this.request(`/admin/profiles/${profileId}`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminUpdateSpecificProfile(profileId: string, updates: any) {
    return this.request(`/admin/profiles/${profileId}`, {
      method: "PUT",
      body: JSON.stringify(updates),
      priority: "high",
    });
  }

  async adminBanUser(profileId: string, reason?: string) {
    return this.request(`/admin/profiles/${profileId}/ban`, {
      method: "POST",
      body: JSON.stringify({ reason }),
      priority: "high",
    });
  }

  async adminToggleSpotlight(profileId: string, enabled: boolean) {
    return this.request(`/admin/profiles/${profileId}/spotlight`, {
      method: "POST",
      body: JSON.stringify({ enabled }),
      priority: "high",
    });
  }

  async adminReorderUserImages(profileId: string, imageIds: string[]) {
    return this.request(`/admin/profiles/${profileId}/images/order`, {
      method: "PUT",
      body: JSON.stringify({ imageIds }),
      priority: "high",
    });
  }

  async adminGetUserMatches(profileId: string) {
    return this.request(`/admin/profiles/${profileId}/matches`, {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminListMatches() {
    return this.request("/admin/matches", {
      retryConfig: { maxRetries: 2 },
    });
  }

  async adminCreateMatch(data: { userId1: string; userId2: string }) {
    return this.request("/admin/matches/create", {
      method: "POST",
      body: JSON.stringify(data),
      priority: "high",
    });
  }

  async adminListInterests() {
    return this.request("/admin/interests", {
      retryConfig: { maxRetries: 2 },
    });
  }

  // Subscription & Usage APIs
  async getSubscriptionStatus() {
    return this.request("/subscription/status", {
      retryConfig: { maxRetries: 2 },
    });
  }

  async getUsageStats() {
    return this.request("/subscription/usage", {
      retryConfig: { maxRetries: 2 },
    });
  }

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
      priority: "high",
    });
  }

  async cancelSubscription() {
    return this.request("/subscription/cancel", {
      method: "POST",
      priority: "high",
    });
  }

  async restorePurchases() {
    return this.request("/subscription/restore", {
      method: "POST",
      priority: "high",
    });
  }

  // Note: /subscription/upgrade endpoint not available
  async updateSubscriptionTier(tier: string) {
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
      priority: "low",
    });
  }

  async getUsageHistory() {
    return this.request("/subscription/usage-history", {
      retryConfig: { maxRetries: 2 },
    });
  }

  async canUseFeature(feature: string) {
    return this.request(`/subscription/can-use/${feature}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  async getSubscriptionFeatures() {
    return this.request("/subscription/features", {
      retryConfig: { maxRetries: 2 },
    });
  }

  async validatePurchase(
    validationRequest: {
      platform: "ios" | "android";
      productId: string;
      purchaseToken?: string;
      receiptData?: string;
    },
    authToken?: string
  ) {
    return this.request("/subscription/validate-purchase", {
      method: "POST",
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      body: JSON.stringify(validationRequest),
      priority: "high",
    });
  }

  // Enhanced Messaging Features
  async sendTypingIndicator(conversationId: string, action: "start" | "stop") {
    return this.request("/typing-indicators", {
      method: "POST",
      body: JSON.stringify({ conversationId, action }),
      priority: "low",
    });
  }

  async getTypingIndicators(conversationId: string) {
    return this.request(`/typing-indicators?conversationId=${conversationId}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  async sendDeliveryReceipt(messageId: string, status: string) {
    return this.request("/delivery-receipts", {
      method: "POST",
      body: JSON.stringify({ messageId, status }),
      priority: "low",
    });
  }

  async getDeliveryReceipts(conversationId: string) {
    return this.request(`/delivery-receipts?conversationId=${conversationId}`, {
      retryConfig: { maxRetries: 1 },
    });
  }

  async markConversationAsRead(conversationId: string) {
    return this.request(`/conversations/${conversationId}/mark-read`, {
      method: "POST",
      priority: "medium",
    });
  }

  // Voice Messages
  async uploadVoiceMessage(
    audioBlob: Blob,
    conversationId: string,
    duration: number
  ) {
    const formData = new FormData();
    formData.append("audio", audioBlob, "voice-message.m4a");
    formData.append("conversationId", conversationId);
    formData.append("duration", duration.toString());

    try {
      const authHeaders = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/voice-messages/upload`, {
        method: "POST",
        credentials: "include",
        headers: {
          ...authHeaders,
          // Don't set Content-Type for FormData
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      const appError = errorHandler.handle(error as Error, {
        action: "voice_upload",
      });
      await errorReporter.reportError(appError, { action: "voice_upload" });

      return {
        success: false,
        error: appError.userMessage,
      };
    }
  }

  async getVoiceMessageUrl(messageId: string) {
    return this.request(`/voice-messages/${messageId}/url`, {
      retryConfig: { maxRetries: 2 },
    });
  }
}

export const enhancedApiClient = new EnhancedApiClient(API_BASE_URL);

// Hook to initialize API client with auth
export function useEnhancedApiClient() {
  // Cookie-session model: no token; keep compatibility without using getToken
  const getToken = undefined as any;

  // Initialize auth provider once
  if (!enhancedApiClient["authInitialized"]) {
    enhancedApiClient.setAuthProvider(getToken);
    enhancedApiClient["authInitialized"] = true;
  }

  return enhancedApiClient;
}
