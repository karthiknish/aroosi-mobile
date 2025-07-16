import {
  validateEmail,
  validatePassword,
  validateProfile,
  validateMessage,
  validateRegistration,
  validateLogin,
  transformProfileForApi,
  transformProfileFromApi,
  sanitizeString,
  sanitizeProfile,
} from "../utils/validation";

describe("Validation Utils", () => {
  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
      expect(validateEmail("user+tag@example.org")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("test.example.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should validate strong passwords", () => {
      expect(validatePassword("Password123")).toBe(true);
      expect(validatePassword("MySecure1Pass")).toBe(true);
      expect(validatePassword("Complex9Password")).toBe(true);
    });

    it("should reject weak passwords", () => {
      expect(validatePassword("password")).toBe(false); // No uppercase or number
      expect(validatePassword("PASSWORD")).toBe(false); // No lowercase or number
      expect(validatePassword("Password")).toBe(false); // No number
      expect(validatePassword("password123")).toBe(false); // No uppercase
      expect(validatePassword("Pass1")).toBe(false); // Too short
      expect(validatePassword("")).toBe(false); // Empty
    });
  });

  describe("validateProfile", () => {
    const validProfile = {
      fullName: "John Doe",
      dateOfBirth: "1990-01-01",
      gender: "male",
      location: {
        city: "New York",
        state: "NY",
        country: "USA",
      },
      bio: "This is a test bio",
    };

    it("should validate complete profile", () => {
      const result = validateProfile(validProfile);
      expect(result.success).toBe(true);
    });

    it("should reject profile with missing required fields", () => {
      const incompleteProfile = {
        fullName: "John Doe",
        // Missing dateOfBirth, gender, location
      };

      const result = validateProfile(incompleteProfile);
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it("should reject profile with invalid gender", () => {
      const invalidProfile = {
        ...validProfile,
        gender: "invalid",
      };

      const result = validateProfile(invalidProfile);
      expect(result.success).toBe(false);
    });

    it("should reject profile with bio too long", () => {
      const longBioProfile = {
        ...validProfile,
        bio: "a".repeat(501), // Exceeds 500 character limit
      };

      const result = validateProfile(longBioProfile);
      expect(result.success).toBe(false);
    });
  });

  describe("validateMessage", () => {
    it("should validate text message", () => {
      const result = validateMessage({
        text: "Hello, how are you?",
        type: "text",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty message", () => {
      const result = validateMessage({
        text: "",
        type: "text",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("cannot be empty");
    });

    it("should reject message that is too long", () => {
      const result = validateMessage({
        text: "a".repeat(1001), // Exceeds 1000 character limit
        type: "text",
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain("too long");
    });
  });

  describe("validateRegistration", () => {
    const validRegistration = {
      email: "test@example.com",
      password: "Password123",
      fullName: "John Doe",
      dateOfBirth: "1990-01-01",
      gender: "male",
      agreeToTerms: true,
    };

    it("should validate complete registration data", () => {
      const result = validateRegistration(validRegistration);
      expect(result.success).toBe(true);
    });

    it("should reject registration without agreeing to terms", () => {
      const result = validateRegistration({
        ...validRegistration,
        agreeToTerms: false,
      });
      expect(result.success).toBe(false);
      expect(result.errors?.agreeToTerms).toContain("agree to the terms");
    });

    it("should reject registration with invalid email", () => {
      const result = validateRegistration({
        ...validRegistration,
        email: "invalid-email",
      });
      expect(result.success).toBe(false);
      expect(result.errors?.email).toContain("valid email");
    });
  });

  describe("validateLogin", () => {
    it("should validate login credentials", () => {
      const result = validateLogin({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject login with invalid email", () => {
      const result = validateLogin({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
      expect(result.errors?.email).toContain("valid email");
    });

    it("should reject login with empty password", () => {
      const result = validateLogin({
        email: "test@example.com",
        password: "",
      });
      expect(result.success).toBe(false);
      expect(result.errors?.password).toContain("required");
    });
  });

  describe("transformProfileForApi", () => {
    it("should transform profile data for API", () => {
      const profileData = {
        fullName: "John Doe",
        dateOfBirth: "1990-01-01",
        partnerPreferenceAgeMin: "25",
        partnerPreferenceAgeMax: "35",
        annualIncome: "50000",
        height: "180",
      };

      const result = transformProfileForApi(profileData);

      expect(result.partnerPreferenceAgeMin).toBe(25);
      expect(result.partnerPreferenceAgeMax).toBe(35);
      expect(result.annualIncome).toBe(50000);
      expect(result.dateOfBirth).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });

    it("should handle array and string interests", () => {
      const profileWithStringInterests = {
        fullName: "John Doe",
        interests: "reading, swimming, cooking",
      };

      const result = transformProfileForApi(profileWithStringInterests);
      expect(result.interests).toEqual(["reading", "swimming", "cooking"]);
    });
  });

  describe("transformProfileFromApi", () => {
    it("should transform API profile data for client", () => {
      const apiProfile = {
        _id: "profile123",
        fullName: "John Doe",
        dateOfBirth: "1990-01-01T00:00:00.000Z",
        partnerPreferenceAgeMin: 25,
        partnerPreferenceAgeMax: 35,
        interests: ["reading", "swimming"],
        isProfileComplete: 1, // Truthy value
        banned: 0, // Falsy value
      };

      const result = transformProfileFromApi(apiProfile);

      expect(result.dateOfBirth).toBe("1990-01-01");
      expect(result.partnerPreferenceAgeMin).toBe(25);
      expect(result.partnerPreferenceAgeMax).toBe(35);
      expect(result.interests).toEqual(["reading", "swimming"]);
      expect(result.isProfileComplete).toBe(true);
      expect(result.banned).toBe(false);
    });
  });

  describe("sanitizeString", () => {
    it("should remove dangerous characters", () => {
      expect(sanitizeString('  Hello <script>alert("xss")</script>  ')).toBe(
        'Hello scriptalert("xss")/script'
      );
      expect(sanitizeString("Normal text")).toBe("Normal text");
      expect(sanitizeString("  Trimmed  ")).toBe("Trimmed");
    });
  });

  describe("sanitizeProfile", () => {
    it("should sanitize profile string fields", () => {
      const profile = {
        fullName: "  John <script>Doe  ",
        bio: "Hello <b>world</b>",
        education: "University",
        occupation: "  Software Engineer  ",
        age: 30, // Non-string field should remain unchanged
      };

      const result = sanitizeProfile(profile);

      expect(result.fullName).toBe("John scriptDoe");
      expect(result.bio).toBe("Hello bworld/b");
      expect(result.education).toBe("University");
      expect(result.occupation).toBe("Software Engineer");
      expect(result.age).toBe(30);
    });
  });
});
