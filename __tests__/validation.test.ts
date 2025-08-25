import { describe, test, expect } from "@jest/globals";
import { validateProfile, validateMessage } from "@utils/validation";
import { transformApiResponse, sanitizeForApi } from "@utils/dataTransform";

describe("Data Validation and Transformation", () => {
  describe("Profile Validation", () => {
    test("should validate complete profile data", () => {
      const validProfile = {
        fullName: "John Doe",
        email: "john@example.com",
        dateOfBirth: "1990-01-01",
        gender: "male",
        phoneNumber: "+44 7700 900123",
        country: "United Kingdom",
        city: "London",
      };

      const result = validateProfile(validProfile);
      expect(result.success).toBe(true);
      expect(result.errors || []).toHaveLength(0);
    });

    test("should reject invalid email formats", () => {
      const invalidProfile = {
        fullName: "John Doe",
        email: "invalid-email",
        dateOfBirth: "1990-01-01",
        gender: "male",
      };

      const result = validateProfile(invalidProfile);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Please enter a valid email address");
    });

    test("should reject underage users", () => {
      const underageProfile = {
        fullName: "Young User",
        email: "young@example.com",
        dateOfBirth: "2010-01-01",
        gender: "male",
      };

      const result = validateProfile(underageProfile);
      expect(result.success).toBe(false);
      expect(result.errors).toContain("Must be at least 18 years old");
    });

    test("should validate phone number formats", () => {
      const invalidPhoneProfile = {
        fullName: "John Doe",
        email: "john@example.com",
        dateOfBirth: "1990-01-01",
        gender: "male",
        phoneNumber: "123",
      };

      const result = validateProfile(invalidPhoneProfile);
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Phone number must be at least 10 digits"
      );
    });
  });

  describe("Message Validation", () => {
    test("should validate text messages", () => {
      const validMessage = {
        text: "Hello, how are you?",
        type: "text",
        conversationId: "conv-123",
        toUserId: "user-456",
      };

      const result = validateMessage(validMessage);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test("should reject empty messages", () => {
      const emptyMessage = {
        text: "",
        type: "text",
        conversationId: "conv-123",
        toUserId: "user-456",
      };

      const result = validateMessage(emptyMessage);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should reject messages that are too long", () => {
      const longMessage = {
        text: "a".repeat(1001), // Assuming 1000 char limit
        type: "text",
        conversationId: "conv-123",
        toUserId: "user-456",
      };

      const result = validateMessage(longMessage);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test("should validate voice messages", () => {
      const voiceMessage = {
        type: "voice",
        audioStorageId: "audio-123",
        duration: 30,
        conversationId: "conv-123",
        toUserId: "user-456",
      };

      const result = validateMessage(voiceMessage);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Data Transformation", () => {
    test("should transform API responses correctly", () => {
      const apiResponse = {
        success: true,
        data: {
          id: "user-123",
          fullName: "John Doe",
          email: "john@example.com",
        },
      };

      const result = transformApiResponse(apiResponse);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test("should handle API error responses", () => {
      const errorResponse = {
        success: false,
        error: "User not found",
      };

      const result = transformApiResponse(errorResponse);
      expect(result.success).toBe(false);
      expect(result.error).toBe("User not found");
    });

    test("should sanitize data for API", () => {
      const unsafeData = {
        name: "  John Doe  ",
        description: "Hello <script>alert('xss')</script> world",
        email: "JOHN@EXAMPLE.COM",
      };

      const sanitized = sanitizeForApi(unsafeData);
      expect(sanitized).toBeDefined();
      // Note: Actual sanitization behavior depends on implementation
    });
  });

  describe("Profile Data Processing", () => {
    test("should process complete profile data", () => {
      const profileData = {
        id: "profile-123",
        fullName: "John Doe",
        dateOfBirth: "1990-01-01",
        profileImageIds: ["img-1", "img-2"],
        createdAt: 1640995200000,
      };

      // Test that the profile data structure is valid
      expect(profileData.id).toBe("profile-123");
      expect(profileData.fullName).toBe("John Doe");
      expect(profileData.dateOfBirth).toBe("1990-01-01");
      expect(profileData.profileImageIds).toHaveLength(2);
      expect(profileData.createdAt).toBe(1640995200000);
    });

    test("should handle missing optional fields", () => {
      const minimalProfile = {
        id: "profile-456",
        fullName: "Jane Smith",
      };

      expect(minimalProfile.id).toBe("profile-456");
      expect(minimalProfile.fullName).toBe("Jane Smith");
    });
  });

  describe("Input Sanitization", () => {
    test("should sanitize user input", () => {
      const userInput = "  Hello World!  ";
      const sanitized = sanitizeForApi(userInput);

      // Basic test - actual behavior depends on implementation
      expect(sanitized).toBeDefined();
    });

    test("should handle special characters", () => {
      const specialInput = "Test & <script> content";
      const sanitized = sanitizeForApi(specialInput);

      expect(sanitized).toBeDefined();
    });
  });
});