import { AuthManager } from "../utils/authManager";
import { apiClient } from "../utils/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock dependencies
jest.mock("../utils/api");
jest.mock("@react-native-async-storage/async-storage");

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe("AuthManager", () => {
  let authManager: AuthManager;

  beforeEach(() => {
    authManager = AuthManager.getInstance();
    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: "user123",
            email: "test@example.com",
            fullName: "Test User",
          },
          tokens: {
            accessToken: "access_token_123",
            refreshToken: "refresh_token_123",
            expiresAt: Date.now() + 3600000,
          },
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockResponse);
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await authManager.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe("test@example.com");
      expect(mockApiClient.request).toHaveBeenCalledWith("/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      });
    });

    it("should handle login failure with invalid credentials", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockResponse);

      const result = await authManager.login({
        email: "test@example.com",
        password: "wrongpassword",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
    });

    it("should handle network errors during login", async () => {
      mockApiClient.request.mockRejectedValueOnce(new Error("Network error"));

      const result = await authManager.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });
  });

  describe("register", () => {
    it("should register successfully with valid data", async () => {
      const mockResponse = {
        success: true,
        data: {
          user: {
            id: "user123",
            email: "newuser@example.com",
            fullName: "New User",
          },
          requiresVerification: true,
          message: "Please verify your email",
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockResponse);

      const result = await authManager.register({
        email: "newuser@example.com",
        password: "password123",
        fullName: "New User",
        dateOfBirth: "1990-01-01",
        gender: "male",
        agreeToTerms: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.requiresVerification).toBe(true);
    });

    it("should handle registration with existing email", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "EMAIL_ALREADY_EXISTS",
          message: "Email already exists",
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockResponse);

      const result = await authManager.register({
        email: "existing@example.com",
        password: "password123",
        fullName: "Test User",
        dateOfBirth: "1990-01-01",
        gender: "male",
        agreeToTerms: true,
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMAIL_ALREADY_EXISTS");
    });
  });

  describe("token management", () => {
    it("should refresh tokens when they are about to expire", async () => {
      const mockRefreshResponse = {
        success: true,
        data: {
          tokens: {
            accessToken: "new_access_token",
            refreshToken: "new_refresh_token",
            expiresAt: Date.now() + 3600000,
          },
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockRefreshResponse);
      mockAsyncStorage.getItem.mockResolvedValueOnce("old_refresh_token");
      mockAsyncStorage.setItem.mockResolvedValue();

      const result = await authManager.refreshTokens();

      expect(result).toBe(true);
      expect(mockApiClient.request).toHaveBeenCalledWith("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({
          refreshToken: "old_refresh_token",
        }),
      });
    });

    it("should handle token refresh failure", async () => {
      const mockRefreshResponse = {
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid refresh token",
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockRefreshResponse);
      mockAsyncStorage.getItem.mockResolvedValueOnce("invalid_refresh_token");

      const result = await authManager.refreshTokens();

      expect(result).toBe(false);
    });
  });

  describe("logout", () => {
    it("should logout and clear stored data", async () => {
      mockAsyncStorage.multiRemove.mockResolvedValue();

      await authManager.logout();

      expect(mockAsyncStorage.multiRemove).toHaveBeenCalledWith([
        "access_token",
        "refresh_token",
        "user_data",
        "token_expires_at",
      ]);
    });
  });

  describe("OTP verification", () => {
    it("should verify OTP successfully", async () => {
      const mockResponse = {
        success: true,
        data: {
          message: "Email verified successfully",
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockResponse);

      const result = await authManager.verifyOTP({
        email: "test@example.com",
        code: "123456",
      });

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe("Email verified successfully");
    });

    it("should handle invalid OTP", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "INVALID_OTP",
          message: "Invalid verification code",
        },
      };

      mockApiClient.request.mockResolvedValueOnce(mockResponse);

      const result = await authManager.verifyOTP({
        email: "test@example.com",
        code: "000000",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_OTP");
    });
  });
});
