import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import * as SecureStore from "expo-secure-store";
import { ApiClient } from "../utils/api";
import { AuthProvider } from "../contexts/AuthContext";
import { sanitizeUserInput, validateInput } from "../utils/validation";

// Mock dependencies
jest.mock("expo-secure-store");
jest.mock("react-native-keychain");

describe("Security and Data Protection Tests", () => {
  let apiClient: ApiClient;
  let authProvider: AuthProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient();
    authProvider = new AuthProvider();
  });

  describe("Token Security", () => {
    test("should store tokens securely", async () => {
      const token = "mock.jwt.token.for.testing";
      const refreshToken = "refresh.token.value";

      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      await authProvider.storeTokens(token, refreshToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        token
      );
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        refreshToken
      );
    });

    test("should retrieve tokens securely", async () => {
      const storedToken = "stored.jwt.token";
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(storedToken);

      const token = await authProvider.getToken();

      expect(token).toBe(storedToken);
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_token");
    });

    test("should clear tokens on logout", async () => {
      (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

      await authProvider.signOut();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("refresh_token");
    });

    test("should validate token format", () => {
      const validToken = "mock.valid.jwt.token.format";
      const invalidToken = "invalid.token";

      expect(authProvider.isValidTokenFormat(validToken)).toBe(true);
      expect(authProvider.isValidTokenFormat(invalidToken)).toBe(false);
    });

    test("should detect token expiration", () => {
      const expiredToken = "mock.expired.jwt.token"; // Mock expired token
      const validToken = "mock.valid.jwt.token"; // Mock valid token

      expect(authProvider.isTokenExpired(expiredToken)).toBe(true);
      expect(authProvider.isTokenExpired(validToken)).toBe(false);
    });

    test("should handle token refresh securely", async () => {
      const newToken = "new.jwt.token";
      const newRefreshToken = "new.refresh.token";

      const mockResponse = {
        success: true,
        token: newToken,
        refreshToken: newRefreshToken,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(
        "old.refresh.token"
      );
      (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

      const result = await authProvider.refreshToken();

      expect(result.success).toBe(true);
      expect(result.token).toBe(newToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        "auth_token",
        newToken
      );
    });
  });

  describe("Input Validation and Sanitization", () => {
    test("should sanitize user input to prevent XSS", () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')" />',
        "<svg onload=\"alert('xss')\" />",
        '"><script>alert("xss")</script>',
      ];

      maliciousInputs.forEach((input) => {
        const sanitized = sanitizeUserInput(input);
        expect(sanitized).not.toContain("<script>");
        expect(sanitized).not.toContain("javascript:");
        expect(sanitized).not.toContain("onerror");
        expect(sanitized).not.toContain("onload");
      });
    });

    test("should validate email addresses properly", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.org",
      ];

      const invalidEmails = [
        "invalid-email",
        "@domain.com",
        "user@",
        "user..name@domain.com",
        "user@domain",
        '<script>alert("xss")</script>@domain.com',
      ];

      validEmails.forEach((email) => {
        expect(validateInput("email", email).isValid).toBe(true);
      });

      invalidEmails.forEach((email) => {
        expect(validateInput("email", email).isValid).toBe(false);
      });
    });

    test("should validate password strength", () => {
      const strongPasswords = [
        "StrongPass123!",
        "MySecure@Password2024",
        "Complex#Pass1",
      ];

      const weakPasswords = [
        "password",
        "123456",
        "abc123",
        "Password", // No special char or number
        "password123", // No uppercase or special char
        "PASSWORD123!", // No lowercase
      ];

      strongPasswords.forEach((password) => {
        expect(validateInput("password", password).isValid).toBe(true);
      });

      weakPasswords.forEach((password) => {
        expect(validateInput("password", password).isValid).toBe(false);
      });
    });

    test("should validate phone numbers", () => {
      const validPhones = [
        "+44 7700 900123",
        "+1 555 123 4567",
        "+91 98765 43210",
      ];

      const invalidPhones = [
        "123",
        "abc-def-ghij",
        "+44 abc def ghij",
        '<script>alert("xss")</script>',
      ];

      validPhones.forEach((phone) => {
        expect(validateInput("phone", phone).isValid).toBe(true);
      });

      invalidPhones.forEach((phone) => {
        expect(validateInput("phone", phone).isValid).toBe(false);
      });
    });

    test("should prevent SQL injection attempts", () => {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --",
        "1; DELETE FROM profiles WHERE 1=1 --",
      ];

      sqlInjectionAttempts.forEach((attempt) => {
        const sanitized = sanitizeUserInput(attempt);
        expect(sanitized).not.toContain("DROP TABLE");
        expect(sanitized).not.toContain("DELETE FROM");
        expect(sanitized).not.toContain("UNION SELECT");
        expect(sanitized).not.toContain("--");
      });
    });

    test("should validate file uploads", () => {
      const validImages = [
        { name: "profile.jpg", type: "image/jpeg", size: 1024000 },
        { name: "photo.png", type: "image/png", size: 2048000 },
        { name: "picture.webp", type: "image/webp", size: 1536000 },
      ];

      const invalidFiles = [
        { name: "script.js", type: "application/javascript", size: 1024 },
        { name: "virus.exe", type: "application/x-executable", size: 5120 },
        { name: "large.jpg", type: "image/jpeg", size: 10 * 1024 * 1024 }, // 10MB
        { name: "image.svg", type: "image/svg+xml", size: 1024 }, // SVG can contain scripts
      ];

      validImages.forEach((file) => {
        expect(validateInput("image", file).isValid).toBe(true);
      });

      invalidFiles.forEach((file) => {
        expect(validateInput("image", file).isValid).toBe(false);
      });
    });
  });

  describe("API Security", () => {
    test("should include proper authentication headers", async () => {
      const mockToken = "valid.jwt.token";
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(mockToken);

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
            "Content-Type": "application/json",
          }),
        })
      );
    });

    test("should handle unauthorized responses properly", async () => {
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

    test("should validate SSL/TLS connections", async () => {
      const httpUrl = "http://insecure.aroosi.app/api/profile";
      const httpsUrl = "https://secure.aroosi.app/api/profile";

      // Should reject HTTP URLs in production
      expect(() => apiClient.validateUrl(httpUrl)).toThrow(
        "Insecure connection not allowed"
      );
      expect(() => apiClient.validateUrl(httpsUrl)).not.toThrow();
    });

    test("should implement request signing for sensitive operations", async () => {
      const sensitiveData = {
        action: "delete_profile",
        userId: "user-123",
        timestamp: Date.now(),
      };

      const signature = apiClient.signRequest(sensitiveData, "secret-key");
      const isValid = apiClient.verifySignature(
        sensitiveData,
        signature,
        "secret-key"
      );

      expect(signature).toBeDefined();
      expect(isValid).toBe(true);
    });

    test("should prevent CSRF attacks", async () => {
      const csrfToken = "csrf-token-123";

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
      global.fetch = mockFetch;

      await apiClient.updateProfile({ aboutMe: "Updated" }, csrfToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-CSRF-Token": csrfToken,
          }),
        })
      );
    });

    test("should implement rate limiting protection", async () => {
      const rateLimitResponse = {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          retryAfter: 60,
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Map([["Retry-After", "60"]]),
        json: () => Promise.resolve(rateLimitResponse),
      });

      const result = await apiClient.sendInterest("user-123");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("RATE_LIMITED");
      expect(result.error?.retryAfter).toBe(60);
    });
  });

  describe("Data Encryption", () => {
    test("should encrypt sensitive data before storage", async () => {
      const sensitiveData = {
        phoneNumber: "+44 7700 900123",
        email: "user@example.com",
      };

      const encrypted = await authProvider.encryptSensitiveData(sensitiveData);
      const decrypted = await authProvider.decryptSensitiveData(encrypted);

      expect(encrypted).not.toEqual(sensitiveData);
      expect(decrypted).toEqual(sensitiveData);
    });

    test("should use different encryption keys for different data types", async () => {
      const profileData = { name: "John Doe" };
      const messageData = { text: "Hello" };

      const encryptedProfile = await authProvider.encryptData(
        profileData,
        "profile"
      );
      const encryptedMessage = await authProvider.encryptData(
        messageData,
        "message"
      );

      // Different data types should use different encryption patterns
      expect(encryptedProfile).not.toEqual(encryptedMessage);
    });

    test("should handle encryption key rotation", async () => {
      const data = { sensitive: "information" };

      // Encrypt with old key
      const encryptedOld = await authProvider.encryptData(
        data,
        "profile",
        "old-key"
      );

      // Rotate key
      await authProvider.rotateEncryptionKey("profile", "new-key");

      // Should still be able to decrypt old data
      const decryptedOld = await authProvider.decryptData(
        encryptedOld,
        "profile"
      );
      expect(decryptedOld).toEqual(data);

      // New encryptions should use new key
      const encryptedNew = await authProvider.encryptData(data, "profile");
      expect(encryptedNew).not.toEqual(encryptedOld);
    });
  });

  describe("Privacy Protection", () => {
    test("should mask sensitive information in logs", () => {
      const logData = {
        email: "user@example.com",
        phoneNumber: "+44 7700 900123",
        password: "secretpassword",
        token: "jwt.token.here",
        publicInfo: "This is public",
      };

      const maskedData = authProvider.maskSensitiveData(logData);

      expect(maskedData.email).toBe("u***@example.com");
      expect(maskedData.phoneNumber).toBe("+44 ***0123");
      expect(maskedData.password).toBe("***");
      expect(maskedData.token).toBe("jwt.***");
      expect(maskedData.publicInfo).toBe("This is public");
    });

    test("should implement data retention policies", async () => {
      const oldData = {
        id: "data-123",
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
        type: "temporary",
      };

      const recentData = {
        id: "data-456",
        createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
        type: "temporary",
      };

      const shouldDeleteOld = authProvider.shouldDeleteData(oldData);
      const shouldDeleteRecent = authProvider.shouldDeleteData(recentData);

      expect(shouldDeleteOld).toBe(true);
      expect(shouldDeleteRecent).toBe(false);
    });

    test("should anonymize user data on account deletion", async () => {
      const userData = {
        id: "user-123",
        email: "user@example.com",
        fullName: "John Doe",
        phoneNumber: "+44 7700 900123",
        messages: ["Hello", "How are you?"],
        profileViews: ["user-456", "user-789"],
      };

      const anonymizedData = await authProvider.anonymizeUserData(userData);

      expect(anonymizedData.id).toBe("user-123"); // Keep ID for referential integrity
      expect(anonymizedData.email).toBe("[DELETED]");
      expect(anonymizedData.fullName).toBe("[DELETED]");
      expect(anonymizedData.phoneNumber).toBe("[DELETED]");
      expect(anonymizedData.messages).toEqual(["[DELETED]", "[DELETED]"]);
      expect(anonymizedData.profileViews).toEqual([]);
    });

    test("should implement consent management", async () => {
      const consentData = {
        userId: "user-123",
        dataProcessing: true,
        marketing: false,
        analytics: true,
        timestamp: Date.now(),
      };

      await authProvider.recordConsent(consentData);
      const consent = await authProvider.getConsent("user-123");

      expect(consent.dataProcessing).toBe(true);
      expect(consent.marketing).toBe(false);
      expect(consent.analytics).toBe(true);
    });
  });

  describe("Security Headers and Policies", () => {
    test("should validate security headers in responses", async () => {
      const mockHeaders = new Map([
        ["Content-Security-Policy", "default-src 'self'"],
        ["X-Content-Type-Options", "nosniff"],
        ["X-Frame-Options", "DENY"],
        ["X-XSS-Protection", "1; mode=block"],
        ["Strict-Transport-Security", "max-age=31536000"],
      ]);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        headers: mockHeaders,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await apiClient.getProfile();
      const securityCheck = apiClient.validateSecurityHeaders(mockHeaders);

      expect(result.success).toBe(true);
      expect(securityCheck.isSecure).toBe(true);
      expect(securityCheck.missingHeaders).toHaveLength(0);
    });

    test("should detect missing security headers", async () => {
      const incompleteHeaders = new Map([
        ["Content-Type", "application/json"],
        // Missing security headers
      ]);

      const securityCheck =
        apiClient.validateSecurityHeaders(incompleteHeaders);

      expect(securityCheck.isSecure).toBe(false);
      expect(securityCheck.missingHeaders).toContain("Content-Security-Policy");
      expect(securityCheck.missingHeaders).toContain("X-Content-Type-Options");
    });
  });

  describe("Biometric Security", () => {
    test("should implement biometric authentication securely", async () => {
      const biometricResult = await authProvider.authenticateWithBiometrics();

      if (biometricResult.success) {
        expect(biometricResult.token).toBeDefined();
        expect(biometricResult.method).toBeOneOf([
          "fingerprint",
          "face",
          "voice",
        ]);
      } else {
        expect(biometricResult.error?.code).toBeOneOf([
          "BIOMETRIC_NOT_AVAILABLE",
          "BIOMETRIC_NOT_ENROLLED",
          "BIOMETRIC_AUTH_FAILED",
        ]);
      }
    });

    test("should fallback to password when biometrics fail", async () => {
      // Mock biometric failure
      const biometricResult = {
        success: false,
        error: { code: "BIOMETRIC_AUTH_FAILED" },
      };

      const fallbackResult = await authProvider.handleBiometricFallback(
        biometricResult
      );

      expect(fallbackResult.shouldShowPasswordPrompt).toBe(true);
      expect(fallbackResult.fallbackMethod).toBe("password");
    });

    test("should secure biometric templates", async () => {
      const biometricData = {
        template: "biometric.template.data",
        userId: "user-123",
      };

      const stored = await authProvider.storeBiometricTemplate(biometricData);
      const retrieved = await authProvider.getBiometricTemplate("user-123");

      expect(stored.success).toBe(true);
      expect(retrieved.template).not.toBe(biometricData.template); // Should be encrypted
    });
  });

  describe("Security Monitoring", () => {
    test("should detect suspicious login attempts", async () => {
      const loginAttempts = [
        { ip: "192.168.1.1", timestamp: Date.now() - 1000, success: false },
        { ip: "192.168.1.1", timestamp: Date.now() - 2000, success: false },
        { ip: "192.168.1.1", timestamp: Date.now() - 3000, success: false },
        { ip: "192.168.1.1", timestamp: Date.now() - 4000, success: false },
        { ip: "192.168.1.1", timestamp: Date.now() - 5000, success: false },
      ];

      const suspiciousActivity =
        authProvider.detectSuspiciousActivity(loginAttempts);

      expect(suspiciousActivity.isSuspicious).toBe(true);
      expect(suspiciousActivity.reason).toBe("Multiple failed login attempts");
      expect(suspiciousActivity.recommendedAction).toBe("TEMPORARY_LOCK");
    });

    test("should log security events", async () => {
      const securityEvent = {
        type: "LOGIN_ATTEMPT",
        userId: "user-123",
        ip: "192.168.1.1",
        userAgent: "Aroosi Mobile App",
        success: true,
        timestamp: Date.now(),
      };

      const logged = await authProvider.logSecurityEvent(securityEvent);

      expect(logged.success).toBe(true);
      expect(logged.eventId).toBeDefined();
    });

    test("should alert on security violations", async () => {
      const violation = {
        type: "UNAUTHORIZED_ACCESS_ATTEMPT",
        severity: "HIGH",
        userId: "user-123",
        details: "Attempt to access blocked user profile",
      };

      const alert = await authProvider.createSecurityAlert(violation);

      expect(alert.success).toBe(true);
      expect(alert.alertId).toBeDefined();
      expect(alert.notificationSent).toBe(true);
    });
  });
});
