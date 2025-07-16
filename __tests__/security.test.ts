import { AuthManager } from "../utils/authManager";
import { sanitizeString, sanitizeProfile } from "../utils/validation";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

// Mock dependencies
jest.mock("@react-native-async-storage/async-storage");
jest.mock("expo-secure-store");

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe("Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Token Security", () => {
    it("should store sensitive tokens in secure storage", async () => {
      const authManager = AuthManager.getInstance();

      const tokens = {
        accessToken: "sensitive_access_token",
        refreshToken: "sensitive_refresh_token",
        expiresAt: Date.now() + 3600000,
      };

      await authManager.storeTokens(tokens);

      // Verify tokens are stored in SecureStore, not AsyncStorage
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "access_token",
        tokens.accessToken
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "refresh_token",
        tokens.refreshToken
      );

      // Verify sensitive data is not in AsyncStorage
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalledWith(
        expect.stringContaining("token"),
        expect.any(String)
      );
    });

    it("should clear all tokens on logout", async () => {
      const authManager = AuthManager.getInstance();

      await authManager.logout();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "access_token"
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "refresh_token"
      );
    });

    it("should validate token format before storage", async () => {
      const authManager = AuthManager.getInstance();

      // Invalid token format
      const invalidTokens = {
        accessToken: "", // Empty token
        refreshToken: "invalid-token-format",
        expiresAt: Date.now() - 1000, // Already expired
      };

      const result = await authManager.storeTokens(invalidTokens);
      expect(result).toBe(false);
    });

    it("should handle token expiration securely", async () => {
      const authManager = AuthManager.getInstance();

      // Mock expired token
      mockSecureStore.getItemAsync.mockResolvedValueOnce("expired_token");

      const isValid = await authManager.validateToken();
      expect(isValid).toBe(false);

      // Should clear expired token
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        "access_token"
      );
    });
  });

  describe("Input Sanitization", () => {
    it("should sanitize user input to prevent XSS", () => {
      const maliciousInput =
        '<script>alert("XSS")</script>Hello World<img src="x" onerror="alert(1)">';
      const sanitized = sanitizeString(maliciousInput);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("onerror");
      expect(sanitized).not.toContain("<img");
      expect(sanitized).toContain("Hello World");
    });

    it("should sanitize profile data", () => {
      const maliciousProfile = {
        fullName: '<script>alert("hack")</script>John Doe',
        bio: 'Hello <iframe src="evil.com"></iframe> World',
        education: "University<script>steal_data()</script>",
        occupation: "Developer",
        age: 25,
      };

      const sanitized = sanitizeProfile(maliciousProfile);

      expect(sanitized.fullName).not.toContain("<script>");
      expect(sanitized.bio).not.toContain("<iframe>");
      expect(sanitized.education).not.toContain("<script>");
      expect(sanitized.fullName).toContain("John Doe");
      expect(sanitized.age).toBe(25); // Non-string fields unchanged
    });

    it("should handle SQL injection attempts", () => {
      const sqlInjection = "'; DROP TABLE users; --";
      const sanitized = sanitizeString(sqlInjection);

      expect(sanitized).not.toContain("DROP TABLE");
      expect(sanitized).not.toContain("--");
    });

    it("should preserve safe HTML entities", () => {
      const safeInput = "Price: $100 &amp; free shipping";
      const sanitized = sanitizeString(safeInput);

      expect(sanitized).toContain("$100");
      expect(sanitized).toContain("&amp;");
    });
  });

  describe("Data Validation Security", () => {
    it("should reject oversized input data", () => {
      const oversizedBio = "a".repeat(10000); // 10KB bio
      const profile = {
        fullName: "John Doe",
        bio: oversizedBio,
      };

      const sanitized = sanitizeProfile(profile);
      expect(sanitized.bio.length).toBeLessThan(1000); // Should be truncated
    });

    it("should validate email format strictly", () => {
      const maliciousEmails = [
        "user@domain.com<script>alert(1)</script>",
        "user+<script>@domain.com",
        "user@domain.com\r\nBcc: attacker@evil.com",
        "user@domain.com\x00admin@domain.com",
      ];

      maliciousEmails.forEach((email) => {
        const sanitized = sanitizeString(email);
        expect(sanitized).not.toContain("<script>");
        expect(sanitized).not.toContain("\r\n");
        expect(sanitized).not.toContain("\x00");
      });
    });

    it("should validate phone number format", () => {
      const maliciousPhones = [
        "+1234567890<script>alert(1)</script>",
        "123-456-7890\r\nX-Forwarded-For: evil.com",
        "555-0123\x00admin",
      ];

      maliciousPhones.forEach((phone) => {
        const sanitized = sanitizeString(phone);
        expect(sanitized).not.toContain("<script>");
        expect(sanitized).not.toContain("\r\n");
        expect(sanitized).not.toContain("\x00");
      });
    });
  });

  describe("API Security", () => {
    it("should include proper headers for security", async () => {
      const authManager = AuthManager.getInstance();

      // Mock API request
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await authManager.makeSecureRequest("/api/profile", {
        method: "GET",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "Cache-Control": "no-cache",
          }),
        })
      );
    });

    it("should handle CSRF protection", async () => {
      const authManager = AuthManager.getInstance();

      // Mock CSRF token
      mockSecureStore.getItemAsync.mockResolvedValueOnce("csrf_token_123");

      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await authManager.makeSecureRequest("/api/profile", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-CSRF-Token": "csrf_token_123",
          }),
        })
      );
    });

    it("should validate SSL/TLS connections", async () => {
      const authManager = AuthManager.getInstance();

      // Should reject non-HTTPS URLs in production
      const insecureUrl = "http://api.example.com/data";

      await expect(
        authManager.makeSecureRequest(insecureUrl, { method: "GET" })
      ).rejects.toThrow("Insecure connection not allowed");
    });

    it("should handle rate limiting", async () => {
      const authManager = AuthManager.getInstance();

      // Mock rate limit response
      const mockFetch = jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: new Headers({
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        }),
        json: () =>
          Promise.resolve({
            error: {
              code: "RATE_LIMIT_EXCEEDED",
              message: "Too many requests",
            },
          }),
      } as Response);

      const result = await authManager.makeSecureRequest("/api/test", {
        method: "GET",
      });

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Biometric Security", () => {
    it("should validate biometric authentication", async () => {
      const authManager = AuthManager.getInstance();

      // Mock successful biometric authentication
      jest
        .spyOn(authManager, "authenticateWithBiometrics")
        .mockResolvedValueOnce(true);

      const result = await authManager.enableBiometricLogin();
      expect(result).toBe(true);
    });

    it("should handle biometric authentication failure", async () => {
      const authManager = AuthManager.getInstance();

      // Mock failed biometric authentication
      jest
        .spyOn(authManager, "authenticateWithBiometrics")
        .mockResolvedValueOnce(false);

      const result = await authManager.enableBiometricLogin();
      expect(result).toBe(false);
    });

    it("should fallback to password when biometrics fail", async () => {
      const authManager = AuthManager.getInstance();

      // Mock biometric failure, then password success
      jest
        .spyOn(authManager, "authenticateWithBiometrics")
        .mockResolvedValueOnce(false);
      jest
        .spyOn(authManager, "authenticateWithPassword")
        .mockResolvedValueOnce(true);

      const result = await authManager.authenticateUser();
      expect(result).toBe(true);
    });
  });

  describe("Session Security", () => {
    it("should implement session timeout", async () => {
      const authManager = AuthManager.getInstance();

      // Mock old session
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      mockAsyncStorage.getItem.mockResolvedValueOnce(oldTimestamp.toString());

      const isSessionValid = await authManager.validateSession();
      expect(isSessionValid).toBe(false);
    });

    it("should refresh session on activity", async () => {
      const authManager = AuthManager.getInstance();

      await authManager.refreshSession();

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        "last_activity",
        expect.any(String)
      );
    });

    it("should handle concurrent sessions", async () => {
      const authManager = AuthManager.getInstance();

      // Mock multiple device tokens
      const deviceTokens = ["device1_token", "device2_token", "device3_token"];
      mockSecureStore.getItemAsync.mockResolvedValueOnce(
        JSON.stringify(deviceTokens)
      );

      const isValidSession = await authManager.validateDeviceSession(
        "device1_token"
      );
      expect(isValidSession).toBe(true);

      const isInvalidSession = await authManager.validateDeviceSession(
        "unknown_device"
      );
      expect(isInvalidSession).toBe(false);
    });
  });

  describe("Privacy Protection", () => {
    it("should not log sensitive information", () => {
      const consoleSpy = jest.spyOn(console, "log");

      const sensitiveData = {
        password: "secret123",
        token: "bearer_token_xyz",
        ssn: "123-45-6789",
      };

      // Simulate logging (should be filtered)
      const authManager = AuthManager.getInstance();
      authManager.logSecurely("User data", sensitiveData);

      // Check that sensitive fields are not in logs
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("secret123")
      );
      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("bearer_token_xyz")
      );
    });

    it("should encrypt stored user data", async () => {
      const authManager = AuthManager.getInstance();

      const userData = {
        email: "user@example.com",
        profile: { name: "John Doe", phone: "555-0123" },
      };

      await authManager.storeUserData(userData);

      // Verify data is encrypted before storage
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        "user_data",
        expect.not.stringContaining("user@example.com") // Should be encrypted
      );
    });

    it("should implement data retention policies", async () => {
      const authManager = AuthManager.getInstance();

      // Mock old user data
      const oldData = {
        timestamp: Date.now() - 366 * 24 * 60 * 60 * 1000, // Over 1 year old
        userData: { email: "old@example.com" },
      };

      mockSecureStore.getItemAsync.mockResolvedValueOnce(
        JSON.stringify(oldData)
      );

      await authManager.cleanupOldData();

      // Should delete old data
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith("user_data");
    });
  });

  describe("Error Handling Security", () => {
    it("should not expose sensitive information in error messages", async () => {
      const authManager = AuthManager.getInstance();

      // Mock database error with sensitive info
      const mockError = new Error(
        "Database connection failed: password=secret123, host=internal.db.com"
      );

      const sanitizedError = authManager.sanitizeError(mockError);

      expect(sanitizedError.message).not.toContain("password=secret123");
      expect(sanitizedError.message).not.toContain("internal.db.com");
      expect(sanitizedError.message).toContain("Database connection failed");
    });

    it("should log security events", async () => {
      const authManager = AuthManager.getInstance();
      const securityLogger = jest.spyOn(authManager, "logSecurityEvent");

      // Simulate failed login attempts
      await authManager.login({ email: "test@example.com", password: "wrong" });
      await authManager.login({ email: "test@example.com", password: "wrong" });
      await authManager.login({ email: "test@example.com", password: "wrong" });

      expect(securityLogger).toHaveBeenCalledWith("MULTIPLE_FAILED_LOGINS", {
        email: "test@example.com",
        attempts: 3,
        timestamp: expect.any(Number),
      });
    });
  });
});
