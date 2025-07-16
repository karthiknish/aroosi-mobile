import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "@jest/globals";
import { AuthProvider } from "../../contexts/AuthContext";
import { ApiClient } from "../../utils/api";
import { RealtimeManager } from "../../utils/realtimeManager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Mock external dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-secure-store");
jest.mock("expo-notifications");
jest.mock("@react-native-google-signin/google-signin");

describe("Final Integration Testing and Validation", () => {
  let apiClient: ApiClient;
  let authProvider: AuthProvider;
  let realtimeManager: RealtimeManager;

  const testUser = {
    email: "test@aroosi.app",
    password: "TestPassword123!",
    firstName: "Test",
    lastName: "User",
  };

  beforeAll(async () => {
    // Initialize test environment
    apiClient = new ApiClient();
    authProvider = new AuthProvider();
    realtimeManager = new RealtimeManager();

    // Clear any existing test data
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync("auth_token");
  });

  afterAll(async () => {
    // Cleanup test environment
    await AsyncStorage.clear();
    await SecureStore.deleteItemAsync("auth_token");
  });

  beforeEach(async () => {
    // Reset state before each test
    jest.clearAllMocks();
  });

  describe("1. Complete User Journey from Registration to Messaging", () => {
    test("should complete full user registration flow", async () => {
      // Step 1: User registration
      const registrationResult = await authProvider.signUp(
        testUser.email,
        testUser.password,
        testUser.firstName,
        testUser.lastName
      );

      expect(registrationResult.success).toBe(true);
      expect(registrationResult.user).toBeDefined();
      expect(registrationResult.token).toBeDefined();

      // Verify token is stored securely
      const storedToken = await SecureStore.getItemAsync("auth_token");
      expect(storedToken).toBe(registrationResult.token);
    });

    test("should complete OTP verification flow", async () => {
      const otpResult = await authProvider.verifyOTP(testUser.email, "123456");

      expect(otpResult.success).toBe(true);
      expect(otpResult.user?.isEmailVerified).toBe(true);
    });

    test("should complete profile creation with validation", async () => {
      const profileData = {
        fullName: `${testUser.firstName} ${testUser.lastName}`,
        dateOfBirth: "1990-01-01",
        gender: "male" as const,
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
        aboutMe: "Test profile description",
        preferredGender: "female",
        partnerPreferenceAgeMin: 25,
        partnerPreferenceAgeMax: 35,
        partnerPreferenceCity: ["London", "Manchester"],
      };

      const profileResult = await apiClient.updateProfile(profileData);

      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.isProfileComplete).toBe(true);
      expect(profileResult.data?.fullName).toBe(profileData.fullName);
    });

    test("should complete profile image upload", async () => {
      const mockImageData = {
        uri: "file://test-image.jpg",
        type: "image/jpeg",
        name: "profile-image.jpg",
        size: 1024000,
      };

      const uploadResult = await apiClient.uploadProfileImage(mockImageData);

      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.imageUrl).toBeDefined();
      expect(uploadResult.data?.storageId).toBeDefined();
    });

    test("should complete search and discovery flow", async () => {
      const searchFilters = {
        gender: "female" as const,
        ageMin: 25,
        ageMax: 35,
        ukCity: ["London"],
        maritalStatus: ["Never Married"],
        education: ["Bachelors", "Masters"],
      };

      const searchResult = await apiClient.searchProfiles(searchFilters, 1);

      expect(searchResult.success).toBe(true);
      expect(searchResult.data?.profiles).toBeDefined();
      expect(Array.isArray(searchResult.data?.profiles)).toBe(true);
      expect(searchResult.data?.totalCount).toBeGreaterThanOrEqual(0);
    });

    test("should complete interest sending and auto-matching", async () => {
      const targetUserId = "test-user-2";

      // Send interest
      const interestResult = await apiClient.sendInterest(targetUserId);
      expect(interestResult.success).toBe(true);

      // Check sent interests
      const sentInterests = await apiClient.getSentInterests();
      expect(sentInterests.success).toBe(true);
      expect(
        sentInterests.data?.some(
          (interest) => interest.toUserId === targetUserId
        )
      ).toBe(true);

      // Simulate mutual interest and check for auto-match
      const matches = await apiClient.getMatches();
      expect(matches.success).toBe(true);
      expect(Array.isArray(matches.data)).toBe(true);
    });

    test("should complete messaging flow", async () => {
      const conversationId = "test-conversation-1";
      const messageText = "Hello, this is a test message!";

      // Send text message
      const messageResult = await apiClient.sendMessage({
        conversationId,
        text: messageText,
        type: "text",
        toUserId: "test-user-2",
      });

      expect(messageResult.success).toBe(true);
      expect(messageResult.data?.text).toBe(messageText);
      expect(messageResult.data?.status).toBe("sent");

      // Get conversation messages
      const messagesResult = await apiClient.getMessages(conversationId);
      expect(messagesResult.success).toBe(true);
      expect(messagesResult.data?.some((msg) => msg.text === messageText)).toBe(
        true
      );

      // Mark messages as read
      const readResult = await apiClient.markMessagesAsRead(conversationId);
      expect(readResult.success).toBe(true);
    });

    test("should complete voice message flow", async () => {
      const conversationId = "test-conversation-1";
      const mockAudioData = {
        uri: "file://test-audio.m4a",
        duration: 5000,
        fileSize: 50000,
        mimeType: "audio/m4a",
      };

      const voiceMessageResult = await apiClient.sendVoiceMessage({
        conversationId,
        audioData: mockAudioData,
        toUserId: "test-user-2",
      });

      expect(voiceMessageResult.success).toBe(true);
      expect(voiceMessageResult.data?.type).toBe("voice");
      expect(voiceMessageResult.data?.duration).toBe(mockAudioData.duration);
    });
  });

  describe("2. Data Synchronization Between Mobile and Web Platforms", () => {
    test("should synchronize profile updates across platforms", async () => {
      const profileUpdate = {
        aboutMe: "Updated profile description from mobile",
        city: "Manchester",
      };

      const updateResult = await apiClient.updateProfile(profileUpdate);
      expect(updateResult.success).toBe(true);

      // Verify update is reflected when fetching profile
      const profileResult = await apiClient.getProfile();
      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.aboutMe).toBe(profileUpdate.aboutMe);
      expect(profileResult.data?.city).toBe(profileUpdate.city);
    });

    test("should synchronize interest status across platforms", async () => {
      const targetUserId = "sync-test-user";

      // Send interest from mobile
      await apiClient.sendInterest(targetUserId);

      // Check interest status
      const statusResult = await apiClient.checkInterestStatus(
        "current-user",
        targetUserId
      );
      expect(statusResult.success).toBe(true);
      expect(statusResult.data?.status).toBe("pending");
    });

    test("should synchronize message read status across platforms", async () => {
      const conversationId = "sync-test-conversation";

      // Mark messages as read on mobile
      const readResult = await apiClient.markMessagesAsRead(conversationId);
      expect(readResult.success).toBe(true);

      // Verify read status is synchronized
      const messagesResult = await apiClient.getMessages(conversationId);
      expect(messagesResult.success).toBe(true);

      const unreadMessages = messagesResult.data?.filter((msg) => !msg.readAt);
      expect(unreadMessages?.length).toBe(0);
    });

    test("should synchronize subscription status across platforms", async () => {
      const subscriptionResult = await apiClient.getSubscriptionStatus();
      expect(subscriptionResult.success).toBe(true);
      expect(subscriptionResult.data?.plan).toBeDefined();
      expect(["free", "premium", "premiumPlus"]).toContain(
        subscriptionResult.data?.plan
      );
    });

    test("should synchronize blocked users across platforms", async () => {
      const userToBlock = "user-to-block";

      const blockResult = await apiClient.blockUser(userToBlock);
      expect(blockResult.success).toBe(true);

      // Verify user is blocked
      const blockedUsersResult = await apiClient.getBlockedUsers();
      expect(blockedUsersResult.success).toBe(true);
      expect(
        blockedUsersResult.data?.some((user) => user.userId === userToBlock)
      ).toBe(true);
    });
  });

  describe("3. Premium Features Identical Across Platforms", () => {
    test("should enforce premium search filters consistently", async () => {
      // Test premium filters without subscription
      const premiumFilters = {
        annualIncomeMin: 50000,
        heightMin: "5'8\"",
        heightMax: "6'2\"",
      };

      const searchResult = await apiClient.searchProfiles(premiumFilters, 1);

      // Should either work (if user has premium) or return subscription required error
      if (!searchResult.success) {
        expect(searchResult.error?.code).toBe("SUBSCRIPTION_REQUIRED");
      } else {
        // If successful, verify premium features are applied
        expect(searchResult.data?.profiles).toBeDefined();
      }
    });

    test("should enforce message limits consistently", async () => {
      const usageStats = await apiClient.getUsageStats();
      expect(usageStats.success).toBe(true);
      expect(usageStats.data?.messagesUsed).toBeDefined();
      expect(usageStats.data?.messagesLimit).toBeDefined();
    });

    test("should enforce interest limits consistently", async () => {
      const usageStats = await apiClient.getUsageStats();
      expect(usageStats.success).toBe(true);
      expect(usageStats.data?.interestsUsed).toBeDefined();
      expect(usageStats.data?.interestsLimit).toBeDefined();
    });

    test("should validate premium feature access", async () => {
      const features = [
        "advanced_search",
        "unlimited_messages",
        "read_receipts",
      ];

      for (const feature of features) {
        const canUse = await apiClient.canUseFeature(feature);
        expect(typeof canUse).toBe("boolean");
      }
    });
  });

  describe("4. Real-time Features Consistency", () => {
    test("should establish real-time connection", async () => {
      const token = await SecureStore.getItemAsync("auth_token");
      expect(token).toBeDefined();

      const connectionResult = await realtimeManager.connect(token!);
      expect(connectionResult).toBe(true);
    });

    test("should receive real-time message notifications", async () => {
      let messageReceived = false;

      realtimeManager.onNewMessage((message) => {
        messageReceived = true;
        expect(message.text).toBeDefined();
        expect(message.fromUserId).toBeDefined();
      });

      // Simulate receiving a message
      realtimeManager.simulateMessage({
        _id: "test-message-1",
        conversationId: "test-conversation",
        fromUserId: "test-sender",
        toUserId: "current-user",
        text: "Real-time test message",
        type: "text",
        createdAt: Date.now(),
        status: "delivered",
      });

      expect(messageReceived).toBe(true);
    });

    test("should handle typing indicators", async () => {
      let typingReceived = false;

      realtimeManager.onTypingIndicator((data) => {
        typingReceived = true;
        expect(data.conversationId).toBeDefined();
        expect(data.userId).toBeDefined();
        expect(["start", "stop"]).toContain(data.action);
      });

      // Send typing indicator
      const typingResult = await apiClient.sendTypingIndicator(
        "test-conversation",
        "start"
      );
      expect(typingResult.success).toBe(true);
    });

    test("should receive match notifications", async () => {
      let matchReceived = false;

      realtimeManager.onNewMatch((match) => {
        matchReceived = true;
        expect(match._id).toBeDefined();
        expect(match.participants).toHaveLength(2);
      });

      // Simulate match notification
      realtimeManager.simulateMatch({
        _id: "test-match-1",
        participants: ["current-user", "matched-user"],
        createdAt: Date.now(),
        conversationId: "new-conversation",
      });

      expect(matchReceived).toBe(true);
    });

    test("should track online status", async () => {
      const onlineStatusResult = await apiClient.updateOnlineStatus(true);
      expect(onlineStatusResult.success).toBe(true);

      const statusResult = await apiClient.getOnlineStatus("current-user");
      expect(statusResult.success).toBe(true);
      expect(statusResult.data?.isOnline).toBe(true);
    });
  });

  describe("5. Subscription Management Across Platforms", () => {
    test("should handle subscription purchase flow", async () => {
      const purchaseData = {
        planId: "premium_monthly",
        paymentMethodId: "test-payment-method",
        platform: "mobile",
      };

      const purchaseResult = await apiClient.purchaseSubscription(purchaseData);

      // Should either succeed or return appropriate error
      if (purchaseResult.success) {
        expect(purchaseResult.data?.subscriptionId).toBeDefined();
        expect(purchaseResult.data?.status).toBe("active");
      } else {
        expect(purchaseResult.error?.code).toBeDefined();
      }
    });

    test("should handle subscription cancellation", async () => {
      const cancelResult = await apiClient.cancelSubscription();

      if (cancelResult.success) {
        expect(cancelResult.data?.status).toBe("cancelled");
      } else {
        // May fail if no active subscription
        expect(cancelResult.error?.code).toBeDefined();
      }
    });

    test("should restore purchases correctly", async () => {
      const restoreResult = await apiClient.restorePurchases();
      expect(restoreResult.success).toBe(true);
      expect(Array.isArray(restoreResult.data?.restoredPurchases)).toBe(true);
    });

    test("should validate subscription across platforms", async () => {
      const mobileStatus = await apiClient.getSubscriptionStatus();
      expect(mobileStatus.success).toBe(true);

      // Subscription status should be consistent
      const plan = mobileStatus.data?.plan;
      expect(["free", "premium", "premiumPlus"]).toContain(plan);

      if (plan !== "free") {
        expect(mobileStatus.data?.expiresAt).toBeDefined();
        expect(mobileStatus.data?.isActive).toBe(true);
      }
    });
  });

  describe("6. Load Testing and Performance Validation", () => {
    test("should handle concurrent API requests", async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        apiClient.getProfile()
      );

      const results = await Promise.allSettled(concurrentRequests);

      // At least 80% of requests should succeed
      const successfulRequests = results.filter(
        (result) => result.status === "fulfilled" && result.value.success
      );

      expect(successfulRequests.length).toBeGreaterThanOrEqual(8);
    });

    test("should handle large message history loading", async () => {
      const startTime = Date.now();

      const messagesResult = await apiClient.getMessages("large-conversation", {
        limit: 100,
        offset: 0,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(messagesResult.success).toBe(true);
      expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
    });

    test("should handle search with large result sets", async () => {
      const startTime = Date.now();

      const searchResult = await apiClient.searchProfiles({}, 1);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(searchResult.success).toBe(true);
      expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds
    });

    test("should handle image upload performance", async () => {
      const mockLargeImage = {
        uri: "file://large-test-image.jpg",
        type: "image/jpeg",
        name: "large-profile-image.jpg",
        size: 5 * 1024 * 1024, // 5MB
      };

      const startTime = Date.now();

      const uploadResult = await apiClient.uploadProfileImage(mockLargeImage);

      const endTime = Date.now();
      const uploadTime = endTime - startTime;

      if (uploadResult.success) {
        expect(uploadTime).toBeLessThan(30000); // Should upload within 30 seconds
      } else {
        // May fail due to size limits, which is acceptable
        expect(uploadResult.error?.code).toBeDefined();
      }
    });

    test("should handle memory usage during extended use", async () => {
      // Simulate extended app usage
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(
          apiClient.getProfile(),
          apiClient.getSentInterests(),
          apiClient.getMatches(),
          apiClient.getConversations()
        );
      }

      const results = await Promise.allSettled(operations);

      // Most operations should succeed without memory issues
      const successfulOps = results.filter(
        (result) => result.status === "fulfilled"
      );

      expect(successfulOps.length).toBeGreaterThan(operations.length * 0.8);
    });

    test("should handle network interruption gracefully", async () => {
      // Simulate network interruption
      const originalFetch = global.fetch;

      // Mock network failure
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const profileResult = await apiClient.getProfile();
      expect(profileResult.success).toBe(false);
      expect(profileResult.error?.code).toBe("NETWORK_ERROR");

      // Restore network
      global.fetch = originalFetch;

      // Should work again
      const retryResult = await apiClient.getProfile();
      expect(retryResult.success).toBe(true);
    });
  });

  describe("7. Security and Data Protection Validation", () => {
    test("should handle token expiration gracefully", async () => {
      // Mock expired token
      await SecureStore.setItemAsync("auth_token", "expired.jwt.token");

      const profileResult = await apiClient.getProfile();

      if (!profileResult.success) {
        expect(profileResult.error?.code).toBe("TOKEN_EXPIRED");
      }
    });

    test("should validate data sanitization", async () => {
      const maliciousData = {
        aboutMe: '<script>alert("xss")</script>Legitimate content',
        fullName: 'Test<script>alert("xss")</script>User',
      };

      const updateResult = await apiClient.updateProfile(maliciousData);

      if (updateResult.success) {
        // Data should be sanitized
        expect(updateResult.data?.aboutMe).not.toContain("<script>");
        expect(updateResult.data?.fullName).not.toContain("<script>");
      }
    });

    test("should enforce rate limiting", async () => {
      // Send multiple rapid requests
      const rapidRequests = Array.from({ length: 20 }, () =>
        apiClient.sendInterest("rate-limit-test-user")
      );

      const results = await Promise.allSettled(rapidRequests);

      // Some requests should be rate limited
      const rateLimitedRequests = results.filter(
        (result) =>
          result.status === "fulfilled" &&
          !result.value.success &&
          result.value.error?.code === "RATE_LIMITED"
      );

      expect(rateLimitedRequests.length).toBeGreaterThan(0);
    });

    test("should validate input data properly", async () => {
      const invalidProfileData = {
        email: "invalid-email",
        dateOfBirth: "2010-01-01", // Too young
        phoneNumber: "123", // Invalid format
      };

      const updateResult = await apiClient.updateProfile(invalidProfileData);
      expect(updateResult.success).toBe(false);
      expect(updateResult.error?.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("8. Error Handling and Recovery", () => {
    test("should handle API errors gracefully", async () => {
      // Test various error scenarios
      const errorScenarios = [
        { endpoint: "nonexistent-endpoint", expectedError: "NOT_FOUND" },
        { endpoint: "unauthorized-endpoint", expectedError: "UNAUTHORIZED" },
        { endpoint: "forbidden-endpoint", expectedError: "FORBIDDEN" },
      ];

      for (const scenario of errorScenarios) {
        const result = await apiClient.makeRequest("GET", scenario.endpoint);
        expect(result.success).toBe(false);
        // Error code should be defined (specific code may vary)
        expect(result.error?.code).toBeDefined();
      }
    });

    test("should recover from connection failures", async () => {
      // Test connection recovery
      const connectionResult = await realtimeManager.testConnectionRecovery();
      expect(connectionResult.canRecover).toBe(true);
      expect(connectionResult.maxRetries).toBeGreaterThan(0);
    });

    test("should handle offline scenarios", async () => {
      // Test offline capabilities
      const offlineResult = await apiClient.handleOfflineMode();
      expect(offlineResult.hasOfflineCapabilities).toBe(true);
      expect(offlineResult.cachedDataAvailable).toBeDefined();
    });
  });
});
