import { AuthManager } from "../../utils/authManager";
import { apiClient } from "../../utils/api";
import { OfflineDataManager } from "../../utils/offlineCache";
import { NotificationManager } from "../../utils/notificationHandler";

// Mock dependencies
jest.mock("../../utils/api");
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-notifications");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe("User Journey Integration Tests", () => {
  let authManager: AuthManager;
  let offlineManager: OfflineDataManager;
  let notificationManager: NotificationManager;

  beforeEach(() => {
    authManager = AuthManager.getInstance();
    offlineManager = new OfflineDataManager();
    notificationManager = NotificationManager.getInstance();
    jest.clearAllMocks();
  });

  describe("Complete Registration Flow", () => {
    it("should complete full registration and onboarding flow", async () => {
      // Step 1: Register user
      const registrationData = {
        email: "newuser@example.com",
        password: "SecurePass123",
        fullName: "New User",
        dateOfBirth: "1990-01-01",
        gender: "male" as const,
        agreeToTerms: true,
      };

      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: "user123",
            email: registrationData.email,
            fullName: registrationData.fullName,
          },
          requiresVerification: true,
          message: "Please verify your email",
        },
      });

      const registerResult = await authManager.register(registrationData);
      expect(registerResult.success).toBe(true);
      expect(registerResult.data?.requiresVerification).toBe(true);

      // Step 2: Verify OTP
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: { message: "Email verified successfully" },
      });

      const otpResult = await authManager.verifyOTP({
        email: registrationData.email,
        code: "123456",
      });
      expect(otpResult.success).toBe(true);

      // Step 3: Login after verification
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          user: {
            id: "user123",
            email: registrationData.email,
            fullName: registrationData.fullName,
          },
          tokens: {
            accessToken: "access_token_123",
            refreshToken: "refresh_token_123",
            expiresAt: Date.now() + 3600000,
          },
          profile: null, // No profile yet
        },
      });

      const loginResult = await authManager.login({
        email: registrationData.email,
        password: registrationData.password,
      });
      expect(loginResult.success).toBe(true);
      expect(loginResult.data?.profile).toBeNull();

      // Step 4: Create profile
      const profileData = {
        fullName: registrationData.fullName,
        dateOfBirth: registrationData.dateOfBirth,
        gender: registrationData.gender,
        city: "New York",
        country: "USA",
        height: "180",
        maritalStatus: "single",
        education: "Bachelor's Degree",
        occupation: "Software Engineer",
        annualIncome: 75000,
        aboutMe: "Looking for a meaningful relationship",
        phoneNumber: "+1234567890",
        preferredGender: "female",
        partnerPreferenceAgeMin: 25,
        partnerPreferenceAgeMax: 35,
        partnerPreferenceCity: ["New York", "Boston"],
        profileFor: "self",
      };

      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          ...profileData,
          _id: "profile123",
          userId: "user123",
          isProfileComplete: true,
          isOnboardingComplete: true,
        },
      });

      const profileResult = await apiClient.createProfile(profileData);
      expect(profileResult.success).toBe(true);
      expect(profileResult.data?.isProfileComplete).toBe(true);
    });
  });

  describe("Messaging Flow", () => {
    it("should complete messaging flow from match to conversation", async () => {
      // Setup: User is logged in
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          user: { id: "user1", email: "user1@example.com" },
          tokens: {
            accessToken: "token123",
            refreshToken: "refresh123",
            expiresAt: Date.now() + 3600000,
          },
        },
      });

      await authManager.login({
        email: "user1@example.com",
        password: "password123",
      });

      // Step 1: Send interest
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          _id: "interest123",
          fromUserId: "user1",
          toUserId: "user2",
          status: "pending",
          createdAt: Date.now(),
        },
      });

      const interestResult = await apiClient.sendInterest("user2");
      expect(interestResult.success).toBe(true);

      // Step 2: Interest is auto-accepted (simulating match)
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          _id: "match123",
          participants: ["user1", "user2"],
          conversationId: "conv123",
          createdAt: Date.now(),
          profiles: [
            { fullName: "User One", city: "New York", profileImageUrls: [] },
            { fullName: "User Two", city: "Boston", profileImageUrls: [] },
          ],
        },
      });

      const matchResult = await apiClient.getMatches();
      expect(matchResult.success).toBe(true);

      // Step 3: Send first message
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          _id: "msg123",
          conversationId: "conv123",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello! Nice to meet you.",
          type: "text",
          createdAt: Date.now(),
          status: "sent",
        },
      });

      const messageResult = await apiClient.sendTextMessage(
        "conv123",
        "Hello! Nice to meet you.",
        "user2"
      );
      expect(messageResult.success).toBe(true);

      // Step 4: Get conversation messages
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          messages: [
            {
              _id: "msg123",
              conversationId: "conv123",
              fromUserId: "user1",
              toUserId: "user2",
              text: "Hello! Nice to meet you.",
              type: "text",
              createdAt: Date.now(),
              status: "delivered",
            },
          ],
          hasMore: false,
        },
      });

      const messagesResult = await apiClient.getMessages("conv123");
      expect(messagesResult.success).toBe(true);
      expect(messagesResult.data?.messages).toHaveLength(1);
    });
  });

  describe("Offline Functionality", () => {
    it("should handle offline data caching and sync", async () => {
      // Step 1: Cache data while online
      const profileData = {
        _id: "profile123",
        fullName: "John Doe",
        city: "New York",
      };

      await offlineManager.setData("profile_user123", profileData);

      // Step 2: Retrieve data while offline
      const cachedProfile = await offlineManager.getData(
        "profile_user123",
        () => Promise.reject(new Error("Network unavailable"))
      );

      expect(cachedProfile).toEqual(profileData);

      // Step 3: Update data while offline (queued for sync)
      const updatedProfile = {
        ...profileData,
        city: "Boston",
      };

      await offlineManager.setData("profile_user123", updatedProfile, "update");

      // Step 4: Sync when back online
      const syncPromises: Promise<void>[] = [];
      await offlineManager.syncPendingChanges(async (item) => {
        // Simulate API call
        mockApiClient.request.mockResolvedValueOnce({
          success: true,
          data: item.data,
        });

        syncPromises.push(apiClient.updateProfile(item.data).then(() => {}));
      });

      await Promise.all(syncPromises);
      expect(offlineManager.getSyncQueueSize()).toBe(0);
    });
  });

  describe("Subscription Flow", () => {
    it("should handle subscription upgrade and feature access", async () => {
      // Step 1: Check current subscription status
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          plan: "free",
          isActive: true,
          features: {
            unlimited_messages: false,
            premium_search: false,
            profile_boost: false,
          },
        },
      });

      const statusResult = await apiClient.getSubscriptionStatus();
      expect(statusResult.success).toBe(true);
      expect(statusResult.data?.plan).toBe("free");

      // Step 2: Attempt to use premium feature (should fail)
      mockApiClient.request.mockResolvedValueOnce({
        success: false,
        error: {
          code: "FEATURE_RESTRICTED",
          message: "Premium feature requires subscription",
        },
      });

      const featureResult = await apiClient.checkFeatureAccess(
        "premium_search"
      );
      expect(featureResult.success).toBe(false);

      // Step 3: Purchase subscription
      const purchaseData = {
        productId: "premium_monthly",
        purchaseToken: "purchase_token_123",
        platform: "ios" as const,
      };

      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          success: true,
          message: "Subscription activated",
          subscription: {
            plan: "premium",
            isActive: true,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          },
        },
      });

      const purchaseResult = await apiClient.purchaseSubscription(
        "premium",
        purchaseData
      );
      expect(purchaseResult.success).toBe(true);

      // Step 4: Verify premium feature access
      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          canUse: true,
          usageStats: {
            used: 0,
            limit: -1, // Unlimited
            remaining: -1,
          },
        },
      });

      const premiumFeatureResult = await apiClient.checkFeatureAccess(
        "premium_search"
      );
      expect(premiumFeatureResult.success).toBe(true);
      expect(premiumFeatureResult.data?.canUse).toBe(true);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle network errors gracefully", async () => {
      // Simulate network error
      mockApiClient.request.mockRejectedValueOnce(
        new Error("Network request failed")
      );

      const result = await authManager.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });

    it("should handle token expiration and refresh", async () => {
      // First request fails with expired token
      mockApiClient.request
        .mockRejectedValueOnce({
          response: { status: 401 },
          message: "Token expired",
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            tokens: {
              accessToken: "new_token",
              refreshToken: "new_refresh_token",
              expiresAt: Date.now() + 3600000,
            },
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { message: "Success after token refresh" },
        });

      // This should trigger token refresh and retry
      const result = await apiClient.getProfile();
      expect(result.success).toBe(true);
    });
  });

  describe("Performance and Memory", () => {
    it("should handle large data sets efficiently", async () => {
      // Simulate loading large profile list
      const largeProfileList = Array.from({ length: 1000 }, (_, i) => ({
        userId: `user${i}`,
        profile: {
          fullName: `User ${i}`,
          city: "Test City",
          profileImageUrls: [`image${i}.jpg`],
        },
      }));

      mockApiClient.request.mockResolvedValueOnce({
        success: true,
        data: {
          profiles: largeProfileList,
          total: 1000,
          hasMore: false,
        },
      });

      const startTime = Date.now();
      const result = await apiClient.searchProfiles({ city: "Test City" });
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(result.data?.profiles).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
