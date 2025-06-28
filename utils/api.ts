import { useAuth } from "../contexts/AuthContext";
import {
  ApiResponse,
  Profile,
  CreateProfileData,
  UpdateProfileData,
} from "../types/profile";
import { validateProfileData, validateFormData } from "./typeValidation";

// Prefer env variable if defined; otherwise default to live API
const DEFAULT_API_BASE_URL = "https://www.aroosi.app/api";
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_BASE_URL;

class ApiClient {
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
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      const authHeaders = await this.getAuthHeaders();

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
          ...options.headers,
        },
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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Profile APIs
  async getProfile(): Promise<ApiResponse<Profile>> {
    const response = await this.request("/profile");
    if (response.success && response.data) {
      response.data = validateProfileData(response.data) as Profile;
    }
    return response as ApiResponse<Profile>;
  }

  async getProfileById(profileId: string): Promise<ApiResponse<Profile>> {
    const response = await this.request(`/profile-detail/${profileId}`);
    if (response.success && response.data) {
      response.data = validateProfileData(response.data) as Profile;
    }
    return response as ApiResponse<Profile>;
  }

  async createProfile(
    profileData: CreateProfileData
  ): Promise<ApiResponse<Profile>> {
    // Validate form data before sending
    const validation = validateFormData(profileData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(", "),
      };
    }

    const response = await this.request("/profile", {
      method: "POST",
      body: JSON.stringify(validation.data),
    });

    if (response.success && response.data) {
      response.data = validateProfileData(response.data) as Profile;
    }
    return response as ApiResponse<Profile>;
  }

  async updateProfile(
    updates: UpdateProfileData
  ): Promise<ApiResponse<Profile>> {
    // Validate updates before sending
    const validatedUpdates = validateProfileData(updates);

    const response = await this.request("/profile", {
      method: "PUT",
      body: JSON.stringify(validatedUpdates),
    });

    if (response.success && response.data) {
      response.data = validateProfileData(response.data) as Profile;
    }
    return response as ApiResponse<Profile>;
  }

  // Search APIs
  async searchProfiles(filters: any) {
    const params = new URLSearchParams(filters);
    return this.request(`/search?${params}`);
  }

  // Interest APIs
  async sendInterest(toUserId: string, fromUserId: string) {
    return this.request("/interests", {
      method: "POST",
      body: JSON.stringify({ toUserId, fromUserId }),
    });
  }

  async removeInterest(toUserId: string, fromUserId: string) {
    return this.request("/interests", {
      method: "DELETE",
      body: JSON.stringify({ toUserId, fromUserId }),
    });
  }

  // Get sent interests - returns interests with profile enrichment
  async getSentInterests(userId: string) {
    return this.request(`/interests?userId=${userId}`);
  }

  // Get received interests - returns interests with profile enrichment
  async getReceivedInterests(userId: string) {
    return this.request(`/interests/received?userId=${userId}`);
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
  async reportUser(request: {
    reportedUserId: string;
    reason: string;
    description?: string;
  }) {
    return this.request("/safety/report", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async blockUser(request: { blockedUserId: string }) {
    return this.request("/safety/block", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async unblockUser(request: { blockedUserId: string }) {
    return this.request("/safety/unblock", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getBlockedUsers() {
    return this.request("/safety/blocked");
  }

  async checkBlockStatus(userId: string) {
    return this.request(`/safety/blocked/check?userId=${userId}`);
  }

  async getBlockStatus(userId: string) {
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
  async getConversations() {
    return this.request("/conversations");
  }

  // Message APIs - Updated to match main project structure
  async getMessages(
    conversationId: string,
    options?: { limit?: number; before?: number }
  ) {
    const params = new URLSearchParams({ conversationId });
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.before) params.append("before", options.before.toString());
    return this.request(`/match-messages?${params}`);
  }

  async sendMessage(data: {
    conversationId: string;
    text: string;
    toUserId: string;
    fromUserId?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }) {
    return this.request("/match-messages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async markMessagesAsRead(messageIds: string[]) {
    return this.request("/messages/mark-read", {
      method: "POST",
      body: JSON.stringify({ messageIds }),
    });
  }

  async markConversationAsRead(conversationId: string) {
    return this.request(`/conversations/${conversationId}/mark-read`, {
      method: "POST",
    });
  }

  // Delivery receipts
  async sendDeliveryReceipt(messageId: string, status: string) {
    return this.request("/delivery-receipts", {
      method: "POST",
      body: JSON.stringify({ messageId, status }),
    });
  }

  async getDeliveryReceipts(conversationId: string) {
    return this.request(`/delivery-receipts?conversationId=${conversationId}`);
  }

  // Typing indicators
  async sendTypingIndicator(conversationId: string, action: "start" | "stop") {
    return this.request("/typing-indicators", {
      method: "POST",
      body: JSON.stringify({ conversationId, action }),
    });
  }

  async getTypingIndicators(conversationId: string) {
    return this.request(`/typing-indicators?conversationId=${conversationId}`);
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

  // Subscription APIs - aligned with main project
  async createCheckoutSession(planId: "premium" | "premiumPlus") {
    return this.request("/stripe/checkout", {
      method: "POST",
      body: JSON.stringify({ planId }),
    });
  }

  async getSubscriptionStatus() {
    return this.request("/subscription/status");
  }

  async getUsageStats() {
    return this.request("/subscription/usage");
  }

  async getSubscriptionFeatures() {
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

  // Voice Messages - Updated to match main project
  async generateVoiceUploadUrl() {
    return this.request("/voice-messages/upload-url", {
      method: "POST",
    });
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

  async getVoiceMessageUrl(storageId: string) {
    return this.request(`/voice-messages/${storageId}/url`);
  }

  // Profile view tracking
  async recordProfileView(viewedUserId: string) {
    return this.request("/profile/view", {
      method: "POST",
      body: JSON.stringify({ viewedUserId }),
    });
  }

  async getProfileViewers() {
    return this.request("/profile/view");
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
   * @param {string} [authToken]
   */
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
    });
  }

  // Interest Management - Extended
  async getInterests(params: { userId?: string } = {}) {
    const searchParams = new URLSearchParams();
    if (params.userId) searchParams.set("userId", params.userId);

    return this.request(`/interests?${searchParams}`);
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
}

export const apiClient = new ApiClient(API_BASE_URL);

// Hook to initialize API client with auth
export function useApiClient() {
  const { getToken } = useAuth();

  // Initialize auth provider once
  if (!apiClient["authInitialized"]) {
    apiClient.setAuthProvider(getToken);
    apiClient["authInitialized"] = true;
  }

  return apiClient;
}
