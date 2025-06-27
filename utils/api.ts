import { useAuth } from "@clerk/clerk-expo";
import { ApiResponse } from "../types/profile";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api";

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
  async getProfile() {
    return this.request("/profile");
  }

  async getProfileById(profileId: string) {
    return this.request(`/profile-detail/${profileId}`);
  }

  async createProfile(profileData: any) {
    return this.request("/profile", {
      method: "POST",
      body: JSON.stringify(profileData),
    });
  }

  async updateProfile(updates: any) {
    return this.request("/profile", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
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

  async getSentInterests(userId: string) {
    return this.request(`/interests/sent?userId=${userId}`);
  }

  async getReceivedInterests(userId: string) {
    return this.request(`/interests/received?userId=${userId}`);
  }

  async respondToInterest(interestId: string, response: "accept" | "reject") {
    return this.request(`/interests/${interestId}/respond`, {
      method: "POST",
      body: JSON.stringify({ response }),
    });
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

  // Message APIs
  async getMessages(conversationId: string, limit?: number, before?: number) {
    const params = new URLSearchParams({ conversationId });
    if (limit) params.append("limit", limit.toString());
    if (before) params.append("before", before.toString());
    return this.request(`/match-messages?${params}`);
  }

  async sendMessage(
    conversationId: string,
    text: string,
    toUserId: string,
    fromUserId: string
  ) {
    return this.request("/match-messages", {
      method: "POST",
      body: JSON.stringify({
        conversationId,
        text,
        toUserId,
        fromUserId,
      }),
    });
  }

  async markMessagesAsRead(messageIds: string[]) {
    return this.request("/messages/mark-read", {
      method: "POST",
      body: JSON.stringify({ messageIds }),
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

  // Subscription APIs
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

  /**
   * Purchase a subscription (in-app purchase)
   * @param {Object} params
   * @param {'ios'|'android'} params.platform - The platform (ios or android)
   * @param {string} params.productId - The product ID for the subscription
   * @param {string} [params.purchaseToken] - The purchase token (Android)
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
    purchaseToken?: string;
    receiptData?: string;
  }) {
    return this.request("/subscription/purchase", {
      method: "POST",
      body: JSON.stringify({ platform, productId, purchaseToken, receiptData }),
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

  async updateSubscriptionTier(tier: string) {
    return this.request("/subscription/upgrade", {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
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

  async getSubscriptionFeatures() {
    return this.request("/subscription/features");
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

    return this.request("/voice-messages/upload", {
      method: "POST",
      headers: {
        // Don't set Content-Type for FormData
      },
      body: formData,
    });
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

  // Blog APIs
  async getBlogPosts(
    params: { page?: number; pageSize?: number; category?: string } = {}
  ) {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set("page", params.page.toString());
    if (params.pageSize)
      searchParams.set("pageSize", params.pageSize.toString());
    if (params.category) searchParams.set("category", params.category);

    return this.request(`/blog?${searchParams}`);
  }

  async getBlogPost(slug: string) {
    return this.request(`/blog/${slug}`);
  }

  async createBlogPost(blogData: {
    title: string;
    slug: string;
    excerpt: string;
    content: string;
    imageUrl?: string;
    categories: string[];
  }) {
    return this.request("/blog", {
      method: "POST",
      body: JSON.stringify(blogData),
    });
  }

  async deleteBlogPost(id: string) {
    return this.request("/blog", {
      method: "DELETE",
      body: JSON.stringify({ _id: id }),
    });
  }

  async getBlogImages() {
    return this.request("/images/blog");
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

  // Push Notifications
  async registerForPushNotifications(
    registrationData: any,
    authToken?: string
  ) {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    return this.request("/push/register", {
      method: "POST",
      headers,
      body: JSON.stringify(registrationData),
    });
  }

  async unregisterFromPushNotifications(authToken?: string) {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    return this.request("/push/register", {
      method: "DELETE",
      headers,
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

  async respondToInterestByStatus(data: {
    interestId: string;
    status: "accepted" | "rejected";
  }) {
    return this.request("/interests/respond", {
      method: "POST",
      body: JSON.stringify(data),
    });
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

  async markConversationAsRead(conversationId: string) {
    return this.request(`/conversations/${conversationId}/read`, {
      method: "POST",
    });
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
