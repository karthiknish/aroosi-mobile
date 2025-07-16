import { describe, test, expect } from "@jest/globals";
import {
  validateProfile,
  validateMessage,
  validateSearchFilters,
} from "../utils/validation";
import {
  transformApiResponse,
  sanitizeUserInput,
} from "../utils/dataTransform";

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
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject invalid email formats", () => {
      const invalidProfile = {
        fullName: "John Doe",
        email: "invalid-email",
        dateOfBirth: "1990-01-01",
        gender: "male",
      };

      const result = validateProfile(invalidProfile);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valid email address is required");
    });

    test("should reject underage users", () => {
      const underageProfile = {
        fullName: "Young User",
        email: "young@example.com",
        dateOfBirth: "2010-01-01",
        gender: "male",
      };

      const result = validateProfile(underageProfile);
      expect(result.isValid).toBe(false);
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
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Valid phone number is required");
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
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject empty messages", () => {
      const emptyMessage = {
        text: "",
        type: "text",
        conversationId: "conv-123",
        toUserId: "user-456",
      };

      const result = validateMessage(emptyMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Message text cannot be empty");
    });

    test("should validate message length limits", () => {
      const longMessage = {
        text: "a".repeat(5001), // Exceeds 5000 character limit
        type: "text",
        conversationId: "conv-123",
        toUserId: "user-456",
      };

      const result = validateMessage(longMessage);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Message exceeds maximum length");
    });

    test("should validate voice message data", () => {
      const voiceMessage = {
        type: "voice",
        conversationId: "conv-123",
        toUserId: "user-456",
        audioData: {
          uri: "file://audio.m4a",
          duration: 30000,
          fileSize: 500000,
          mimeType: "audio/m4a",
        },
      };

      const result = validateMessage(voiceMessage);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Search Filter Validation", () => {
    test("should validate basic search filters", () => {
      const validFilters = {
        gender: "female",
        ageMin: 25,
        ageMax: 35,
        ukCity: ["London", "Manchester"],
      };

      const result = validateSearchFilters(validFilters);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("should reject invalid age ranges", () => {
      const invalidFilters = {
        ageMin: 35,
        ageMax: 25, // Max less than min
      };

      const result = validateSearchFilters(invalidFilters);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Maximum age must be greater than minimum age"
      );
    });

    test("should validate premium filter access", () => {
      const premiumFilters = {
        annualIncomeMin: 50000,
        heightMin: "5'8\"",
      };

      const result = validateSearchFilters(premiumFilters, false); // User doesn't have premium
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Premium subscription required for advanced filters"
      );
    });
  });

  describe("Data Transformation", () => {
    test("should transform API response to match mobile format", () => {
      const apiResponse = {
        _id: "profile-123",
        fullName: "John Doe",
        dateOfBirth: "1990-01-01T00:00:00.000Z",
        profileImageIds: ["img-1", "img-2"],
        createdAt: 1640995200000,
      };

      const transformed = transformApiResponse(apiResponse);

      expect(transformed.id).toBe("profile-123");
      expect(transformed.fullName).toBe("John Doe");
      expect(transformed.dateOfBirth).toBe("1990-01-01");
      expect(transformed.profileImageIds).toEqual(["img-1", "img-2"]);
      expect(transformed.createdAt).toBe(1640995200000);
    });

    test("should sanitize user input", () => {
      const maliciousInput = {
        aboutMe: '<script>alert("xss")</script>I am a good person',
        fullName: 'John<script>alert("xss")</script>Doe',
      };

      const sanitized = sanitizeUserInput(maliciousInput);

      expect(sanitized.aboutMe).toBe("I am a good person");
      expect(sanitized.fullName).toBe("JohnDoe");
      expect(sanitized.aboutMe).not.toContain("<script>");
      expect(sanitized.fullName).not.toContain("<script>");
    });

    test("should handle null and undefined values", () => {
      const inputWithNulls = {
        fullName: "John Doe",
        aboutMe: null,
        city: undefined,
        age: 0,
      };

      const sanitized = sanitizeUserInput(inputWithNulls);

      expect(sanitized.fullName).toBe("John Doe");
      expect(sanitized.aboutMe).toBe("");
      expect(sanitized.city).toBe("");
      expect(sanitized.age).toBe(0);
    });
  });

  describe("Schema Validation", () => {
    test("should validate profile schema compliance", () => {
      const profileData = {
        id: "profile-123",
        userId: "user-456",
        fullName: "John Doe",
        email: "john@example.com",
        dateOfBirth: "1990-01-01",
        gender: "male",
        isProfileComplete: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const isValid = validateProfileSchema(profileData);
      expect(isValid).toBe(true);
    });

    test("should validate message schema compliance", () => {
      const messageData = {
        _id: "msg-123",
        conversationId: "conv-456",
        fromUserId: "user-1",
        toUserId: "user-2",
        text: "Hello world",
        type: "text",
        createdAt: Date.now(),
        status: "sent",
      };

      const isValid = validateMessageSchema(messageData);
      expect(isValid).toBe(true);
    });

    test("should validate interest schema compliance", () => {
      const interestData = {
        _id: "interest-123",
        fromUserId: "user-1",
        toUserId: "user-2",
        status: "pending",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const isValid = validateInterestSchema(interestData);
      expect(isValid).toBe(true);
    });
  });
});

// Helper functions for schema validation
function validateProfileSchema(data: any): boolean {
  const requiredFields = [
    "id",
    "userId",
    "fullName",
    "email",
    "dateOfBirth",
    "gender",
  ];
  return requiredFields.every(
    (field) => data.hasOwnProperty(field) && data[field] !== null
  );
}

function validateMessageSchema(data: any): boolean {
  const requiredFields = [
    "_id",
    "conversationId",
    "fromUserId",
    "toUserId",
    "type",
    "createdAt",
    "status",
  ];
  return requiredFields.every(
    (field) => data.hasOwnProperty(field) && data[field] !== null
  );
}

function validateInterestSchema(data: any): boolean {
  const requiredFields = [
    "_id",
    "fromUserId",
    "toUserId",
    "status",
    "createdAt",
  ];
  return requiredFields.every(
    (field) => data.hasOwnProperty(field) && data[field] !== null
  );
}
