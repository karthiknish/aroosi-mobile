import { APIClient } from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
global.fetch = jest.fn();

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("APIClient", () => {
  let apiClient: APIClient;

  beforeEach(() => {
    apiClient = new APIClient("https://api.example.com");
    jest.clearAllMocks();
  });

  describe("request", () => {
    it("should make successful GET request", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: "Success" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.request("/test");

      expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      expect(result.success).toBe(true);
      expect(result.data.message).toBe("Success");
    });

    it("should make successful POST request with body", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: "123" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.request("/test", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });

      expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Test" }),
      });
      expect(result.success).toBe(true);
    });

    it("should include authorization header when token is available", async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce("test_token");

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {},
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      await apiClient.request("/protected");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.example.com/protected",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test_token",
          },
        }
      );
    });

    it("should handle 401 unauthorized and attempt token refresh", async () => {
      mockAsyncStorage.getItem
        .mockResolvedValueOnce("expired_token") // First call for access token
        .mockResolvedValueOnce("refresh_token"); // Second call for refresh token

      // First request fails with 401
      const unauthorizedResponse = {
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          error: { code: "TOKEN_EXPIRED", message: "Token expired" },
        }),
      };

      // Token refresh succeeds
      const refreshResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            tokens: {
              accessToken: "new_token",
              refreshToken: "new_refresh_token",
              expiresAt: Date.now() + 3600000,
            },
          },
        }),
      };

      // Retry request succeeds
      const retryResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: "Success" },
        }),
      };

      mockFetch
        .mockResolvedValueOnce(unauthorizedResponse as any)
        .mockResolvedValueOnce(refreshResponse as any)
        .mockResolvedValueOnce(retryResponse as any);

      const result = await apiClient.request("/protected");

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await apiClient.request("/test");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });

    it("should handle server errors", async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: { code: "SERVER_ERROR", message: "Internal server error" },
        }),
      };

      mockFetch.mockResolvedValueOnce(errorResponse as any);

      const result = await apiClient.request("/test");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SERVER_ERROR");
    });

    it("should retry failed requests with exponential backoff", async () => {
      // First two requests fail
      const errorResponse = {
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          error: { code: "SERVER_ERROR", message: "Server error" },
        }),
      };

      // Third request succeeds
      const successResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: "Success" },
        }),
      };

      mockFetch
        .mockResolvedValueOnce(errorResponse as any)
        .mockResolvedValueOnce(errorResponse as any)
        .mockResolvedValueOnce(successResponse as any);

      const result = await apiClient.request("/test");

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });
  });

  describe("profile endpoints", () => {
    it("should get profile successfully", async () => {
      const mockProfile = {
        _id: "profile123",
        fullName: "Test User",
        email: "test@example.com",
        isProfileComplete: true,
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockProfile,
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.getProfile();

      expect(result.success).toBe(true);
      expect(result.data.fullName).toBe("Test User");
    });

    it("should update profile successfully", async () => {
      const updateData = {
        fullName: "Updated Name",
        city: "New City",
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { ...updateData, _id: "profile123" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.updateProfile(updateData);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/profile"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updateData),
        })
      );
    });
  });

  describe("messaging endpoints", () => {
    it("should send message successfully", async () => {
      const mockMessage = {
        _id: "msg123",
        text: "Hello world",
        fromUserId: "user1",
        toUserId: "user2",
        createdAt: Date.now(),
      };

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockMessage,
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.sendTextMessage(
        "conv123",
        "Hello world",
        "user2"
      );

      expect(result.success).toBe(true);
      expect(result.data.text).toBe("Hello world");
    });

    it("should get messages with pagination", async () => {
      const mockMessages = [
        { _id: "msg1", text: "Message 1", createdAt: Date.now() },
        { _id: "msg2", text: "Message 2", createdAt: Date.now() },
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            messages: mockMessages,
            hasMore: false,
          },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.getMessages("conv123", { limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(2);
    });
  });

  describe("search endpoints", () => {
    it("should search profiles with filters", async () => {
      const mockProfiles = [
        {
          userId: "user1",
          profile: {
            fullName: "John Doe",
            city: "New York",
            profileImageUrls: ["image1.jpg"],
          },
        },
      ];

      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            profiles: mockProfiles,
            total: 1,
            hasMore: false,
          },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse as any);

      const result = await apiClient.searchProfiles({
        city: "New York",
        ageMin: 25,
        ageMax: 35,
      });

      expect(result.success).toBe(true);
      expect(result.data.profiles).toHaveLength(1);
    });
  });
});
