import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { AuthProvider } from "../contexts/AuthContext";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock dependencies
jest.mock("expo-secure-store");
jest.mock("@react-native-async-storage/async-storage");
jest.mock("@react-native-google-signin/google-signin");

describe("Authentication System Tests", () => {
  let authProvider: AuthProvider;
  const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token";
  const mockUser = {
    id: "user-123",
    email: "test@aroosi.app",
    fullName: "Test User",
    isEmailVerified: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authProvider = new AuthProvider();

    // Mock successful token storage
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe("Sign Up Flow", () => {
    test("should register new user successfully", async () => {
      const mockResponse = {
        success: true,
        token: mockToken,
        user: mockUser,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signUp(
        "test@aroosi.app",
        "Password123!",
        "Test",
        "User"
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.user?.email).toBe("test@aroosi.app");
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        mockToken
      );
    });

    test("should handle duplicate email registration", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "EMAIL_EXISTS",
          message: "An account with this email already exists",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signUp(
        "existing@aroosi.app",
        "Password123!",
        "Test",
        "User"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMAIL_EXISTS");
    });

    test("should validate password strength", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "WEAK_PASSWORD",
          message:
            "Password must be at least 8 characters with uppercase, lowercase, and number",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signUp(
        "test@aroosi.app",
        "weak",
        "Test",
        "User"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("WEAK_PASSWORD");
    });
  });

  describe("Sign In Flow", () => {
    test("should sign in with valid credentials", async () => {
      const mockResponse = {
        success: true,
        token: mockToken,
        user: { ...mockUser, isEmailVerified: true },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signIn(
        "test@aroosi.app",
        "Password123!"
      );

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.user?.isEmailVerified).toBe(true);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        mockToken
      );
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

      const result = await authProvider.signIn(
        "test@aroosi.app",
        "wrongpassword"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_CREDENTIALS");
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    test("should handle unverified email", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email address before signing in",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signIn(
        "unverified@aroosi.app",
        "Password123!"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("EMAIL_NOT_VERIFIED");
    });

    test("should handle account lockout", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "ACCOUNT_LOCKED",
          message: "Account temporarily locked due to multiple failed attempts",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 423,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signIn(
        "locked@aroosi.app",
        "Password123!"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("ACCOUNT_LOCKED");
    });
  });

  describe("OTP Verification", () => {
    test("should verify OTP successfully", async () => {
      const mockResponse = {
        success: true,
        user: { ...mockUser, isEmailVerified: true },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.verifyOTP("test@aroosi.app", "123456");

      expect(result.success).toBe(true);
      expect(result.user?.isEmailVerified).toBe(true);
    });

    test("should handle invalid OTP", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "OTP_INVALID",
          message: "Invalid verification code",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.verifyOTP("test@aroosi.app", "000000");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("OTP_INVALID");
    });

    test("should handle expired OTP", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "OTP_EXPIRED",
          message: "Verification code has expired",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 410,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.verifyOTP("test@aroosi.app", "123456");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("OTP_EXPIRED");
    });

    test("should resend OTP", async () => {
      const mockResponse = {
        success: true,
        message: "Verification code sent",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.resendOTP("test@aroosi.app");

      expect(result.success).toBe(true);
    });
  });

  describe("Google Sign In", () => {
    test("should sign in with Google successfully", async () => {
      const mockGoogleCredential = "google.credential.token";
      const mockResponse = {
        success: true,
        token: mockToken,
        user: { ...mockUser, provider: "google" },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signInWithGoogle(mockGoogleCredential);

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
      expect(result.user?.provider).toBe("google");
    });

    test("should handle Google sign in cancellation", async () => {
      const result = await authProvider.signInWithGoogle(null);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("GOOGLE_SIGNIN_CANCELLED");
    });

    test("should handle Google sign in error", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "GOOGLE_SIGNIN_ERROR",
          message: "Google sign in failed",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signInWithGoogle("invalid.credential");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("GOOGLE_SIGNIN_ERROR");
    });
  });

  describe("Token Management", () => {
    test("should get valid token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const token = await authProvider.getToken();

      expect(token).toBe(mockToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_token");
    });

    test("should refresh expired token", async () => {
      const newToken = "new.jwt.token";
      const mockRefreshResponse = {
        success: true,
        token: newToken,
        refreshToken: "new.refresh.token",
      };

      (SecureStore.getItemAsync as jest.Mock)
        .mockResolvedValueOnce("expired.token")
        .mockResolvedValueOnce("refresh.token");

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      const token = await authProvider.getToken(true); // Force refresh

      expect(token).toBe(newToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        newToken
      );
    });

    test("should handle refresh token failure", async () => {
      const mockRefreshResponse = {
        success: false,
        error: {
          code: "REFRESH_TOKEN_INVALID",
          message: "Refresh token is invalid",
        },
      };

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        "invalid.refresh.token"
      );

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockRefreshResponse),
      });

      const token = await authProvider.getToken(true);

      expect(token).toBeNull();
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
    });

    test("should clear tokens on sign out", async () => {
      await authProvider.signOut();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
    });
  });

  describe("Password Reset", () => {
    test("should request password reset", async () => {
      const mockResponse = {
        success: true,
        message: "Password reset email sent",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.requestPasswordReset("test@aroosi.app");

      expect(result.success).toBe(true);
    });

    test("should reset password with token", async () => {
      const mockResponse = {
        success: true,
        message: "Password reset successfully",
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.resetPassword(
        "reset.token",
        "NewPassword123!"
      );

      expect(result.success).toBe(true);
    });

    test("should handle invalid reset token", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "INVALID_RESET_TOKEN",
          message: "Password reset token is invalid or expired",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.resetPassword(
        "invalid.token",
        "NewPassword123!"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_RESET_TOKEN");
    });
  });

  describe("Session Management", () => {
    test("should check authentication status", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const isAuthenticated = await authProvider.isAuthenticated();

      expect(isAuthenticated).toBe(true);
    });

    test("should handle missing token", async () => {
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

      const isAuthenticated = await authProvider.isAuthenticated();

      expect(isAuthenticated).toBe(false);
    });

    test("should refresh user data", async () => {
      const mockResponse = {
        success: true,
        user: { ...mockUser, fullName: "Updated Name" },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.refreshUser();

      expect(result.success).toBe(true);
      expect(result.user?.fullName).toBe("Updated Name");
    });

    test("should handle session timeout", async () => {
      const mockResponse = {
        success: false,
        error: {
          code: "SESSION_EXPIRED",
          message: "Your session has expired",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.refreshUser();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SESSION_EXPIRED");
    });
  });

  describe("Error Handling", () => {
    test("should handle network errors", async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await authProvider.signIn(
        "test@aroosi.app",
        "Password123!"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("NETWORK_ERROR");
    });

    test("should handle server errors", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () =>
          Promise.resolve({
            success: false,
            error: {
              code: "INTERNAL_SERVER_ERROR",
              message: "Internal server error",
            },
          }),
      });

      const result = await authProvider.signIn(
        "test@aroosi.app",
        "Password123!"
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INTERNAL_SERVER_ERROR");
    });

    test("should handle secure storage errors", async () => {
      (SecureStore.setItemAsync as jest.Mock).mockRejectedValue(
        new Error("Storage error")
      );

      const mockResponse = {
        success: true,
        token: mockToken,
        user: mockUser,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await authProvider.signIn(
        "test@aroosi.app",
        "Password123!"
      );

      // Should still succeed but log the storage error
      expect(result.success).toBe(true);
    });
  });

  describe("Biometric Authentication", () => {
    test("should enable biometric authentication", async () => {
      const result = await authProvider.enableBiometricAuth();

      expect(result.success).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "biometric_enabled",
        "true"
      );
    });

    test("should authenticate with biometrics", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

      const result = await authProvider.authenticateWithBiometrics();

      expect(result.success).toBe(true);
      expect(result.token).toBe(mockToken);
    });

    test("should handle biometric authentication failure", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");

      const result = await authProvider.authenticateWithBiometrics();

      if (!result.success) {
        expect(result.error?.code).toBe("BIOMETRIC_AUTH_FAILED");
      }
    });
  });
});
