import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { ClerkAuthProvider } from "../contexts/ClerkAuthContext"
import { ApiClient } from "../../utils/api";
import { RealtimeManager } from "../../utils/realtimeManager";
import * as SecureStore from "expo-secure-store";

// Mock dependencies
jest.mock("expo-secure-store");
jest.mock("expo-notifications");
jest.mock("@react-native-google-signin/google-signin");

describe("Complete User Journey Integration Tests", () => {
  let authProvider: AuthProvider;
  let apiClient: ApiClient;
  let realtimeManager: RealtimeManager;

  const testUsers = {
    newUser: {
      email: "newuser@aroosi.app",
      password: "NewUser123!",
      firstName: "New",
      lastName: "User",
    },
    existingUser: {
      email: "existing@aroosi.app",
      password: "Existing123!",
      token: "existing.user.token",
    },
  };

  beforeAll(async () => {
    authProvider = new AuthProvider();
    apiClient = new ApiClient();
    realtimeManager = new RealtimeManager();
  });

  afterAll(async () => {
    // Cleanup
    await SecureStore.deleteItemAsync("auth_token");
    await SecureStore.deleteItemAsync("refresh_token");
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("New User Complete Journey", () => {
    test("should complete full new user onboarding flow", async () => {
      // Step 1: User Registration
      const mockRegistrationResponse = {
        success: true,
        token: "new.user.token",
        user: {
          id: "new-user-123",
          email: testUsers.newUser.email,
          fullName: `${testUsers.newUser.firstName} ${testUsers.newUser.lastName}`,
          isEmailVerified: false,
          isProfileComplete: false,
          isOnboardingComplete: false,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRegistrationResponse),
      });

      const registrationResult = await authProvider.signUp(
        testUsers.newUser.email,
        testUsers.newUser.password,
        testUsers.newUser.firstName,
        testUsers.newUser.lastName
      );

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.user?.isEmailVerified).toBe(false);
      expect(registrationResult.user?.isProfileComplete).toBe(false);

      // Step 2: Email Verification
      const mockOTPResponse = {
        success: true,
        user: {
          ...mockRegistrationResponse.user,
          isEmailVerified: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOTPResponse),
      });

      const otpResult = await authProvider.verifyOTP(
        testUsers.newUser.email,
        "123456"
      );
      expect(otpResult.success).toBe(true);
      expect(otpResult.user?.isEmailVerified).toBe(true);

      // Step 3: Profile Creation
      const profileData = {
        fullName: `${testUsers.newUser.firstName} ${testUsers.newUser.lastName}`,
        dateOfBirth: "1990-01-01",
        gender: "male",
        profileFor: "self",
        phoneNumber: "+44 7700 900123",
        country: "United Kingdom",
        city: "London",
        height: "5'10\"",
        maritalStatus: "Never Married",
        physicalStatus: "Normal",
        motherTongue: "English",
        religion: "Islam",
        ethnicity: "Asian",
        diet: "Vegetarian",
        smoking: "No",
        drinking: "No",
        education: "Masters",
        occupation: "Software Engineer",
        annualIncome: "£50,000 - £75,000",
        aboutMe: "Looking for a life partner who shares similar values.",
        preferredGender: "female",
        partnerPreferenceAgeMin: 25,
        partnerPreferenceAgeMax: 35,
        partnerPreferenceCity: ["London", "Manchester"],
      };

      const mockProfileResponse = {
        success: true,
        data: {
          ...profileData,
          id: "profile-new-user",
          userId: "new-user-123",
          isProfileComplete: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfileResponse),
      });

      const profileResult = await apiClient.updateProfile(profileData);
      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.isProfileComplete).toBe(true);

      // Step 4: Profile Image Upload
      const mockImageData = {
        uri: "file://profile-image.jpg",
        type: "image/jpeg",
        name: "profile.jpg",
        size: 1024000,
      };

      const mockImageResponse = {
        success: true,
        data: {
          imageUrl: "https://storage.aroosi.app/images/new-user-profile.jpg",
          storageId: "img-new-user-123",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockImageResponse),
      });

      const imageResult = await apiClient.uploadProfileImage(mockImageData);
      expect(imageResult.success).toBe(true);
      expect(imageResult.data?.imageUrl).toBeDefined();

      // Step 5: Complete Onboarding
      const mockOnboardingResponse = {
        success: true,
        user: {
          ...mockOTPResponse.user,
          isOnboardingComplete: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOnboardingResponse),
      });

      const onboardingResult = await authProvider.completeOnboarding();
      expect(onboardingResult.success).toBe(true);
      expect(onboardingResult.user?.isOnboardingComplete).toBe(true);
    });

    test("should handle onboarding interruption and resume", async () => {
      // Simulate user starting profile creation but not completing
      const partialProfileData = {
        fullName: "Partial User",
        dateOfBirth: "1990-01-01",
        gender: "female",
        // Missing required fields
      };

      const mockPartialResponse = {
        success: true,
        data: {
          ...partialProfileData,
          id: "profile-partial",
          isProfileComplete: false,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPartialResponse),
      });

      const partialResult = await apiClient.updateProfile(partialProfileData);
      expect(partialResult.success).toBe(true);
      expect(partialResult.data?.isProfileComplete).toBe(false);

      // User returns later to complete profile
      const completeProfileData = {
        ...partialProfileData,
        phoneNumber: "+44 7700 900456",
        country: "United Kingdom",
        city: "Birmingham",
        maritalStatus: "Never Married",
        education: "Bachelors",
        occupation: "Teacher",
        preferredGender: "male",
        partnerPreferenceAgeMin: 28,
        partnerPreferenceAgeMax: 40,
        partnerPreferenceCity: ["Birmingham", "Coventry"],
      };

      const mockCompleteResponse = {
        success: true,
        data: {
          ...completeProfileData,
          id: "profile-partial",
          isProfileComplete: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockCompleteResponse),
      });

      const completeResult = await apiClient.updateProfile(completeProfileData);
      expect(completeResult.success).toBe(true);
      expect(completeResult.data?.isProfileComplete).toBe(true);
    });
  });

  describe("Existing User Return Journey", () => {
    test("should handle returning user login and sync", async () => {
      // Step 1: User Login
      const mockLoginResponse = {
        success: true,
        token: testUsers.existingUser.token,
        user: {
          id: "existing-user-456",
          email: testUsers.existingUser.email,
          fullName: "Existing User",
          isEmailVerified: true,
          isProfileComplete: true,
          isOnboardingComplete: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockLoginResponse),
      });

      const loginResult = await authProvider.signIn(
        testUsers.existingUser.email,
        testUsers.existingUser.password
      );

      expect(loginResult.success).toBe(true);
      expect(loginResult.user?.isOnboardingComplete).toBe(true);

      // Step 2: Data Sync
      const mockSyncData = {
        profile: {
          id: "profile-existing",
          fullName: "Existing User",
          lastUpdated: Date.now(),
        },
        interests: [
          { _id: "interest-1", toUserId: "user-789", status: "pending" },
        ],
        matches: [
          { _id: "match-1", participants: ["existing-user-456", "user-abc"] },
        ],
        conversations: [
          { id: "conv-1", partnerId: "user-abc", lastMessage: "Hello!" },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockSyncData }),
      });

      const syncResult = await apiClient.syncUserData();
      expect(syncResult.success).toBe(true);
      expect(syncResult.data?.profile).toBeDefined();
      expect(syncResult.data?.interests).toHaveLength(1);
      expect(syncResult.data?.matches).toHaveLength(1);

      // Step 3: Real-time Connection
      const connectionResult = await realtimeManager.connect(
        testUsers.existingUser.token
      );
      expect(connectionResult).toBe(true);
    });

    test("should handle offline data sync when user returns online", async () => {
      // Simulate offline changes
      const offlineChanges = [
        {
          type: "profile_update",
          data: { aboutMe: "Updated while offline" },
          timestamp: Date.now() - 3600000, // 1 hour ago
        },
        {
          type: "interest_sent",
          data: { toUserId: "user-offline-123" },
          timestamp: Date.now() - 1800000, // 30 minutes ago
        },
      ];

      // Mock successful sync
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              synced: offlineChanges.length,
              conflicts: 0,
            },
          }),
      });

      const syncResult = await apiClient.syncOfflineChanges(offlineChanges);
      expect(syncResult.success).toBe(true);
      expect(syncResult.data?.synced).toBe(2);
      expect(syncResult.data?.conflicts).toBe(0);
    });
  });

  describe("Profile Discovery and Interaction Journey", () => {
    test("should complete profile search and interaction flow", async () => {
      // Step 1: Search for profiles
      const searchFilters = {
        gender: "female",
        ageMin: 25,
        ageMax: 35,
        ukCity: ["London", "Manchester"],
        maritalStatus: ["Never Married"],
        education: ["Bachelors", "Masters"],
      };

      const mockSearchResponse = {
        success: true,
        data: {
          profiles: [
            {
              id: "profile-search-1",
              fullName: "Sarah Johnson",
              age: 28,
              city: "London",
              occupation: "Doctor",
              profileImageUrls: [
                "https://storage.aroosi.app/images/sarah-1.jpg",
              ],
            },
            {
              id: "profile-search-2",
              fullName: "Emma Wilson",
              age: 32,
              city: "Manchester",
              occupation: "Engineer",
              profileImageUrls: [
                "https://storage.aroosi.app/images/emma-1.jpg",
              ],
            },
          ],
          totalCount: 2,
          hasMore: false,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSearchResponse),
      });

      const searchResult = await apiClient.searchProfiles(searchFilters, 1);
      expect(searchResult.success).toBe(true);
      expect(searchResult.data?.profiles).toHaveLength(2);

      // Step 2: View profile details
      const mockProfileResponse = {
        success: true,
        data: {
          id: "profile-search-1",
          fullName: "Sarah Johnson",
          age: 28,
          city: "London",
          occupation: "Doctor",
          aboutMe: "Passionate about helping others and traveling.",
          profileImageUrls: [
            "https://storage.aroosi.app/images/sarah-1.jpg",
            "https://storage.aroosi.app/images/sarah-2.jpg",
          ],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfileResponse),
      });

      const profileResult = await apiClient.getProfileById("profile-search-1");
      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.fullName).toBe("Sarah Johnson");

      // Step 3: Send interest
      const mockInterestResponse = {
        success: true,
        data: {
          _id: "interest-new-123",
          fromUserId: "current-user",
          toUserId: "profile-search-1",
          status: "pending",
          createdAt: Date.now(),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockInterestResponse),
      });

      const interestResult = await apiClient.sendInterest("profile-search-1");
      expect(interestResult.success).toBe(true);
      expect(interestResult.data?.status).toBe("pending");

      // Step 4: Check for mutual interest (auto-match)
      const mockMatchResponse = {
        success: true,
        data: [
          {
            _id: "match-new-123",
            participants: ["current-user", "profile-search-1"],
            createdAt: Date.now(),
            conversationId: "conv-new-123",
            profiles: [
              {
                fullName: "Sarah Johnson",
                city: "London",
                profileImageUrls: [
                  "https://storage.aroosi.app/images/sarah-1.jpg",
                ],
              },
            ],
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMatchResponse),
      });

      const matchesResult = await apiClient.getMatches();
      expect(matchesResult.success).toBe(true);
      expect(matchesResult.data).toHaveLength(1);
      expect(matchesResult.data?.[0].participants).toContain(
        "profile-search-1"
      );
    });

    test("should handle interest limits and premium features", async () => {
      // Test free user hitting interest limit
      const mockLimitResponse = {
        success: false,
        error: {
          code: "INTEREST_LIMIT_REACHED",
          message: "You have reached your daily interest limit",
          upgradeRequired: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve(mockLimitResponse),
      });

      const limitResult = await apiClient.sendInterest("user-limit-test");
      expect(limitResult.success).toBe(false);
      expect(limitResult.error?.code).toBe("INTEREST_LIMIT_REACHED");

      // Test premium search filters
      const premiumFilters = {
        gender: "female",
        annualIncomeMin: 50000,
        heightMin: "5'6\"",
      };

      const mockPremiumResponse = {
        success: false,
        error: {
          code: "SUBSCRIPTION_REQUIRED",
          message: "Premium subscription required for advanced filters",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve(mockPremiumResponse),
      });

      const premiumResult = await apiClient.searchProfiles(premiumFilters, 1);
      expect(premiumResult.success).toBe(false);
      expect(premiumResult.error?.code).toBe("SUBSCRIPTION_REQUIRED");
    });
  });

  describe("Messaging Journey", () => {
    test("should complete full messaging flow", async () => {
      // Step 1: Start conversation from match
      const conversationId = "conv-messaging-test";
      const partnerId = "partner-user-123";

      // Step 2: Send first message
      const firstMessage = {
        conversationId,
        text: "Hi! Nice to meet you through Aroosi.",
        type: "text",
        toUserId: partnerId,
      };

      const mockMessageResponse = {
        success: true,
        data: {
          _id: "msg-first-123",
          ...firstMessage,
          fromUserId: "current-user",
          createdAt: Date.now(),
          status: "sent",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessageResponse),
      });

      const messageResult = await apiClient.sendMessage(firstMessage);
      expect(messageResult.success).toBe(true);
      expect(messageResult.data?.text).toBe(firstMessage.text);

      // Step 3: Receive real-time response
      let receivedMessage = null;
      realtimeManager.onNewMessage((message) => {
        receivedMessage = message;
      });

      // Simulate incoming message
      const incomingMessage = {
        _id: "msg-response-123",
        conversationId,
        fromUserId: partnerId,
        toUserId: "current-user",
        text: "Hello! Great to connect with you too.",
        type: "text",
        createdAt: Date.now(),
        status: "delivered",
      };

      realtimeManager.simulateMessage(incomingMessage);
      expect(receivedMessage).toEqual(incomingMessage);

      // Step 4: Send voice message
      const voiceMessageData = {
        conversationId,
        audioData: {
          uri: "file://voice-message.m4a",
          duration: 15000, // 15 seconds
          fileSize: 150000,
          mimeType: "audio/m4a",
        },
        toUserId: partnerId,
      };

      const mockVoiceResponse = {
        success: true,
        data: {
          _id: "msg-voice-123",
          conversationId,
          type: "voice",
          duration: 15000,
          audioStorageId: "audio-storage-123",
          fromUserId: "current-user",
          toUserId: partnerId,
          createdAt: Date.now(),
          status: "sent",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVoiceResponse),
      });

      const voiceResult = await apiClient.sendVoiceMessage(voiceMessageData);
      expect(voiceResult.success).toBe(true);
      expect(voiceResult.data?.type).toBe("voice");
      expect(voiceResult.data?.duration).toBe(15000);

      // Step 5: Mark messages as read
      const mockReadResponse = {
        success: true,
        data: {
          conversationId,
          messagesRead: 2,
          readAt: Date.now(),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockReadResponse),
      });

      const readResult = await apiClient.markMessagesAsRead(conversationId);
      expect(readResult.success).toBe(true);
      expect(readResult.data?.messagesRead).toBe(2);

      // Step 6: Get conversation history
      const mockHistoryResponse = {
        success: true,
        data: [
          {
            _id: "msg-first-123",
            text: "Hi! Nice to meet you through Aroosi.",
            fromUserId: "current-user",
            createdAt: Date.now() - 3600000,
            readAt: Date.now() - 1800000,
          },
          {
            _id: "msg-response-123",
            text: "Hello! Great to connect with you too.",
            fromUserId: partnerId,
            createdAt: Date.now() - 1800000,
            readAt: Date.now(),
          },
          {
            _id: "msg-voice-123",
            type: "voice",
            duration: 15000,
            fromUserId: "current-user",
            createdAt: Date.now() - 900000,
            readAt: null,
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      });

      const historyResult = await apiClient.getMessages(conversationId);
      expect(historyResult.success).toBe(true);
      expect(historyResult.data).toHaveLength(3);
      expect(historyResult.data?.[2].type).toBe("voice");
    });

    test("should handle message delivery and read receipts", async () => {
      const conversationId = "conv-receipts-test";

      // Send message and track delivery
      const messageData = {
        conversationId,
        text: "Testing delivery receipts",
        type: "text",
        toUserId: "receipt-test-user",
      };

      const mockSendResponse = {
        success: true,
        data: {
          _id: "msg-receipt-test",
          ...messageData,
          fromUserId: "current-user",
          createdAt: Date.now(),
          status: "sent",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSendResponse),
      });

      const sendResult = await apiClient.sendMessage(messageData);
      expect(sendResult.success).toBe(true);
      expect(sendResult.data?.status).toBe("sent");

      // Simulate delivery receipt
      let deliveryUpdate = null;
      realtimeManager.onMessageStatusUpdate((update) => {
        deliveryUpdate = update;
      });

      realtimeManager.simulateDeliveryReceipt({
        messageId: "msg-receipt-test",
        status: "delivered",
        deliveredAt: Date.now(),
      });

      expect(deliveryUpdate?.status).toBe("delivered");

      // Simulate read receipt
      realtimeManager.simulateReadReceipt({
        messageId: "msg-receipt-test",
        status: "read",
        readAt: Date.now(),
      });

      expect(deliveryUpdate?.status).toBe("read");
    });
  });

  describe("Subscription and Premium Features Journey", () => {
    test("should complete subscription purchase flow", async () => {
      // Step 1: Check current subscription status
      const mockStatusResponse = {
        success: true,
        data: {
          plan: "free",
          isActive: false,
          features: ["basic_search", "limited_messages"],
          usage: {
            messagesUsed: 8,
            messagesLimit: 10,
            interestsUsed: 15,
            interestsLimit: 20,
          },
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockStatusResponse),
      });

      const statusResult = await apiClient.getSubscriptionStatus();
      expect(statusResult.success).toBe(true);
      expect(statusResult.data?.plan).toBe("free");

      // Step 2: Purchase premium subscription
      const purchaseData = {
        planId: "premium_monthly",
        paymentMethodId: "pm_test_card",
        platform: "mobile",
      };

      const mockPurchaseResponse = {
        success: true,
        data: {
          subscriptionId: "sub_premium_123",
          plan: "premium",
          status: "active",
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          features: ["unlimited_messages", "advanced_search", "read_receipts"],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPurchaseResponse),
      });

      const purchaseResult = await apiClient.purchaseSubscription(purchaseData);
      expect(purchaseResult.success).toBe(true);
      expect(purchaseResult.data?.plan).toBe("premium");
      expect(purchaseResult.data?.status).toBe("active");

      // Step 3: Verify premium features are unlocked
      const mockUpdatedStatusResponse = {
        success: true,
        data: {
          plan: "premium",
          isActive: true,
          features: ["unlimited_messages", "advanced_search", "read_receipts"],
          usage: {
            messagesUsed: 8,
            messagesLimit: -1, // Unlimited
            interestsUsed: 15,
            interestsLimit: 100,
          },
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUpdatedStatusResponse),
      });

      const updatedStatusResult = await apiClient.getSubscriptionStatus();
      expect(updatedStatusResult.success).toBe(true);
      expect(updatedStatusResult.data?.plan).toBe("premium");
      expect(updatedStatusResult.data?.usage.messagesLimit).toBe(-1);

      // Step 4: Use premium search features
      const premiumSearchFilters = {
        gender: "female",
        ageMin: 25,
        ageMax: 35,
        annualIncomeMin: 40000,
        heightMin: "5'4\"",
        heightMax: "5'10\"",
      };

      const mockPremiumSearchResponse = {
        success: true,
        data: {
          profiles: [
            {
              id: "premium-profile-1",
              fullName: "Premium User",
              annualIncome: "£45,000 - £60,000",
              height: "5'6\"",
            },
          ],
          totalCount: 1,
          hasMore: false,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPremiumSearchResponse),
      });

      const premiumSearchResult = await apiClient.searchProfiles(
        premiumSearchFilters,
        1
      );
      expect(premiumSearchResult.success).toBe(true);
      expect(premiumSearchResult.data?.profiles).toHaveLength(1);
    });

    test("should handle subscription expiration and renewal", async () => {
      // Simulate subscription expiring
      const mockExpiredStatusResponse = {
        success: true,
        data: {
          plan: "premium",
          isActive: false,
          expiresAt: Date.now() - 86400000, // Expired yesterday
          features: ["basic_search", "limited_messages"],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockExpiredStatusResponse),
      });

      const expiredStatusResult = await apiClient.getSubscriptionStatus();
      expect(expiredStatusResult.success).toBe(true);
      expect(expiredStatusResult.data?.isActive).toBe(false);

      // Try to use premium feature - should fail
      const premiumFilters = { annualIncomeMin: 50000 };
      const mockRestrictedResponse = {
        success: false,
        error: {
          code: "SUBSCRIPTION_EXPIRED",
          message: "Your premium subscription has expired",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve(mockRestrictedResponse),
      });

      const restrictedResult = await apiClient.searchProfiles(
        premiumFilters,
        1
      );
      expect(restrictedResult.success).toBe(false);
      expect(restrictedResult.error?.code).toBe("SUBSCRIPTION_EXPIRED");

      // Renew subscription
      const renewalData = {
        subscriptionId: "sub_premium_123",
        planId: "premium_monthly",
      };

      const mockRenewalResponse = {
        success: true,
        data: {
          subscriptionId: "sub_premium_123",
          plan: "premium",
          status: "active",
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRenewalResponse),
      });

      const renewalResult = await apiClient.renewSubscription(renewalData);
      expect(renewalResult.success).toBe(true);
      expect(renewalResult.data?.status).toBe("active");
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    test("should handle network interruptions gracefully", async () => {
      // Simulate network failure during profile update
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const profileUpdate = { aboutMe: "Updated description" };
      const failedResult = await apiClient.updateProfile(profileUpdate);

      expect(failedResult.success).toBe(false);
      expect(failedResult.error?.code).toBe("NETWORK_ERROR");

      // Simulate network recovery
      const mockRecoveryResponse = {
        success: true,
        data: { ...profileUpdate, id: "profile-123" },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRecoveryResponse),
      });

      const recoveryResult = await apiClient.updateProfile(profileUpdate);
      expect(recoveryResult.success).toBe(true);
    });

    test("should handle concurrent user actions", async () => {
      // Simulate user performing multiple actions simultaneously
      const concurrentActions = [
        apiClient.getProfile(),
        apiClient.getSentInterests(),
        apiClient.getMatches(),
        apiClient.getConversations(),
        apiClient.getSubscriptionStatus(),
      ];

      // Mock responses for all actions
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const results = await Promise.allSettled(concurrentActions);

      // All actions should complete successfully
      const successfulActions = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      );

      expect(successfulActions.length).toBe(5);
    });

    test("should handle session expiration during user journey", async () => {
      // Start with valid session
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("valid.token");

      // First request succeeds
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const firstResult = await apiClient.getProfile();
      expect(firstResult.success).toBe(true);

      // Session expires
      const mockExpiredResponse = {
        success: false,
        error: {
          code: "TOKEN_EXPIRED",
          message: "Your session has expired",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockExpiredResponse),
      });

      const expiredResult = await apiClient.getProfile();
      expect(expiredResult.success).toBe(false);
      expect(expiredResult.error?.code).toBe("TOKEN_EXPIRED");

      // Should trigger re-authentication
      const mockReauthResponse = {
        success: true,
        token: "new.valid.token",
        user: { id: "user-123" },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockReauthResponse),
      });

      const reauthResult = await authProvider.handleTokenExpiration();
      expect(reauthResult.success).toBe(true);
      expect(reauthResult.token).toBe("new.valid.token");
    });
  });
});
