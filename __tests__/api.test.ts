import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { ApiClient } from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-secure-store");

describe("API Client Integration Tests", () => {
  let apiClient: ApiClient;
  const mockToken = "mock.jwt.token.for.testing";

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient();

    // Mock SecureStore to return a valid token
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);
  });

  describe("Authentication API", () => {
    test("should sign in with valid credentials", async () => {
      const mockResponse = {
        success: true,
        token: mockToken,
        user: {
          id: "user-123",
          email: "test@aroosi.app",
          fullName: "Test User",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.signIn("test@aroosi.app", "password123");

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.user?.email).toBe("test@aroosi.app");
    });

    test("should handle invalid credentials", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.signIn("test@aroosi.app", "wrongpassword");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
    });

    test("should verify OTP correctly", async () => {
      const mockResponse = {
        success: true,
        user: {
          id: "user-123",
          email: "test@aroosi.app",
          isEmailVerified: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.verifyOTP("test@aroosi.app", "123456");

      expect(result.success).toBe(true);
      expect(result.user?.isEmailVerified).toBe(true);
    });

    test("should refresh token when expired", async () => {
      const mockRefreshResponse = {
        success: true,
        token: "new.jwt.token",
        refreshToken: "new.refresh.token",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      const result = await apiClient.refreshToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe("new.jwt.token");
    });
  });

  describe("Profile API", () => {
    test("should fetch user profile", async () => {
      const mockProfile = {
        success: true,
        data: {
          id: "profile-123",
          userId: "user-123",
          fullName: "Test User",
          email: "test@aroosi.app",
          dateOfBirth: "1990-01-01",
          gender: "male",
          city: "London",
          isProfileComplete: true,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProfile),
      });

      const result = await apiClient.getProfile();

      expect(result.success).toBe(true);
      expect(result.data?.fullName).toBe("Test User");
      expect(result.data?.isProfileComplete).toBe(true);
    });

    test("should update profile successfully", async () => {
      const updateData = {
        aboutMe: "Updated bio",
        city: "Manchester",
      };

      const mockResponse = {
        success: true,
        data: {
          ...updateData,
          id: "profile-123",
          updatedAt: Date.now(),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.updateProfile(updateData);

      expect(result.success).toBe(true);
      expect(result.data?.aboutMe).toBe("Updated bio");
      expect(result.data?.city).toBe("Manchester");
    });

    test("should upload profile image", async () => {
      const imageData = {
        uri: "file://test-image.jpg",
        type: "image/jpeg",
        name: "profile.jpg",
        size: 1024000,
      };

      const mockResponse = {
        success: true,
        data: {
          imageUrl: "https://storage.aroosi.app/images/profile-123.jpg",
          storageId: "img-storage-123",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.uploadProfileImage(imageData);

      expect(result.success).toBe(true);
      expect(result.data?.imageUrl).toContain("profile-123.jpg");
      expect(result.data?.storageId).toBe("img-storage-123");
    });
  });

  describe("Search API", () => {
    test("should search profiles with filters", async () => {
      const filters = {
        gender: "female",
        ageMin: 25,
        ageMax: 35,
        ukCity: ["London"],
      };

      const mockResponse = {
        success: true,
        data: {
          profiles: [
            {
              id: "profile-1",
              fullName: "Jane Doe",
              city: "London",
              age: 28,
            },
            {
              id: "profile-2",
              fullName: "Sarah Smith",
              city: "London",
              age: 32,
            },
          ],
          totalCount: 2,
          hasMore: false,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.searchProfiles(filters, 1);

      expect(result.success).toBe(true);
      expect(result.data?.profiles).toHaveLength(2);
      expect(result.data?.totalCount).toBe(2);
    });

    test("should handle premium filter restrictions", async () => {
      const premiumFilters = {
        annualIncomeMin: 50000,
        heightMin: "5'8\"",
      };

      const mockResponse = {
        success: false,
        error: {
          code: "SUBSCRIPTION_REQUIRED",
          message: "Premium subscription required for advanced filters",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.searchProfiles(premiumFilters, 1);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SUBSCRIPTION_REQUIRED");
    });
  });

  describe("Interest API", () => {
    test("should send interest successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          _id: "interest-123",
          fromUserId: "user-1",
          toUserId: "user-2",
          status: "pending",
          createdAt: Date.now(),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.sendInterest("user-2");

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("pending");
      expect(result.data?.toUserId).toBe("user-2");
    });

    test("should get sent interests", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            _id: "interest-1",
            toUserId: "user-2",
            status: "pending",
            toProfile: {
              fullName: "Jane Doe",
              city: "London",
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getSentInterests();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].toProfile?.fullName).toBe("Jane Doe");
    });

    test("should get matches", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            _id: "match-1",
            participants: ["user-1", "user-2"],
            conversationId: "conv-123",
            createdAt: Date.now(),
            profiles: [
              {
                fullName: "Jane Doe",
                city: "London",
              },
            ],
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getMatches();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].participants).toContain("user-2");
    });
  });

  describe("Messaging API", () => {
    test("should send text message", async () => {
      const messageData = {
        conversationId: "conv-123",
        text: "Hello there!",
        type: "text",
        toUserId: "user-2",
      };

      const mockResponse = {
        success: true,
        data: {
          _id: "msg-123",
          ...messageData,
          fromUserId: "user-1",
          createdAt: Date.now(),
          status: "sent",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.sendMessage(messageData);

      expect(result.success).toBe(true);
      expect(result.data?.text).toBe("Hello there!");
      expect(result.data?.status).toBe("sent");
    });

    test("should get conversation messages", async () => {
      const mockResponse = {
        success: true,
        data: [
          {
            _id: "msg-1",
            text: "Hello",
            fromUserId: "user-1",
            createdAt: Date.now() - 1000,
          },
          {
            _id: "msg-2",
            text: "Hi there!",
            fromUserId: "user-2",
            createdAt: Date.now(),
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getMessages("conv-123");

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].text).toBe("Hello");
    });

    test("should send voice message", async () => {
      const voiceData = {
        conversationId: "conv-123",
        audioData: {
          uri: "file://audio.m4a",
          duration: 5000,
          fileSize: 50000,
          mimeType: "audio/m4a",
        },
        toUserId: "user-2",
      };

      const mockResponse = {
        success: true,
        data: {
          _id: "msg-voice-123",
          conversationId: "conv-123",
          type: "voice",
          duration: 5000,
          audioStorageId: "audio-storage-123",
          status: "sent",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.sendVoiceMessage(voiceData);

      expect(result.success).toBe(true);
      expect(result.data?.type).toBe("voice");
      expect(result.data?.duration).toBe(5000);
    });

    test("should mark messages as read", async () => {
      const mockResponse = {
        success: true,
        data: {
          conversationId: "conv-123",
          readAt: Date.now(),
          messagesRead: 3,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.markMessagesAsRead("conv-123");

      expect(result.success).toBe(true);
      expect(result.data?.messagesRead).toBe(3);
    });
  });

  describe("Subscription API", () => {
    test("should get subscription status", async () => {
      const mockResponse = {
        success: true,
        data: {
          plan: "premium",
          isActive: true,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
          features: ["unlimited_messages", "advanced_search"],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getSubscriptionStatus();

      expect(result.success).toBe(true);
      expect(result.data?.plan).toBe("premium");
      expect(result.data?.isActive).toBe(true);
    });

    test("should get usage statistics", async () => {
      const mockResponse = {
        success: true,
        data: {
          messagesUsed: 15,
          messagesLimit: 50,
          interestsUsed: 8,
          interestsLimit: 20,
          searchesUsed: 25,
          searchesLimit: 100,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getUsageStats();

      expect(result.success).toBe(true);
      expect(result.data?.messagesUsed).toBe(15);
      expect(result.data?.interestsLimit).toBe(20);
    });

    test("should purchase subscription", async () => {
      const purchaseData = {
        planId: "premium_monthly",
        paymentMethodId: "pm_test_123",
        platform: "mobile",
      };

      const mockResponse = {
        success: true,
        data: {
          subscriptionId: "sub_123",
          status: "active",
          plan: "premium",
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.purchaseSubscription(purchaseData);

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe("active");
      expect(result.data?.plan).toBe("premium");
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await apiClient.getProfile();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });

    test("should handle unauthorized requests", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.getProfile();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
    });

    test("should handle rate limiting", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await apiClient.sendInterest("user-123");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("RATE_LIMITED");
    });

    test("should retry failed requests", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        });
      });

      const result = await apiClient.getProfile();

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // Should retry twice before succeeding
    });
  });

  describe("Token Management", () => {
    test("should include authorization header", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, data: {} }),
      });
      global.fetch = mockFetch;

      await apiClient.getProfile();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockToken}`,
          }),
        })
      );
    });

    test("should refresh token on expiration", async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation((url) => {
        callCount++;

        if (url.includes("/api/auth/refresh")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                token: "new.jwt.token",
              }),
          });
        }

        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: () =>
              Promise.resolve({
                success: false,
                error: { code: "TOKEN_EXPIRED" },
              }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: {} }),
        });
      });

      const result = await apiClient.getProfile();

      expect(result.success).toBe(true);
      expect(callCount).toBeGreaterThan(1); // Should make multiple calls for token refresh
    });
  });
});
