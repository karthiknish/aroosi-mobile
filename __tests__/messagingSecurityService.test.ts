import {
  MessagingSecurityService,
  SecurityConfig,
  AuthContext,
} from "../services/messagingSecurityService";
import {
  MessageValidator,
  UserRelationship,
  ClientRateLimit,
  MessageSecurity,
} from "../utils/messageValidation";
import { MessagingErrorType } from "../types/messaging";

describe("MessagingSecurityService", () => {
  let securityService: MessagingSecurityService;

  const mockAuthContext: AuthContext = {
    userId: "user-123",
    token: "mock-jwt-token",
    tokenExpiry: Date.now() + 3600000, // 1 hour from now
    permissions: ["send_text_message", "send_voice_message"],
  };

  const mockUserRelationships: UserRelationship[] = [
    {
      userId: "user-123",
      targetUserId: "user-456",
      isMatched: true,
      isBlocked: false,
      matchedAt: Date.now() - 86400000, // 1 day ago
    },
    {
      userId: "user-123",
      targetUserId: "user-789",
      isMatched: true,
      isBlocked: true,
      blockedBy: "user-789",
      blockedAt: Date.now() - 3600000, // 1 hour ago
    },
  ];

  beforeEach(() => {
    securityService = new MessagingSecurityService({
      enableRateLimit: true,
      rateLimitMessages: 5,
      rateLimitWindow: 60000,
      enableContentFiltering: true,
      enableRelationshipValidation: true,
      enableAuthValidation: true,
    });
  });

  afterEach(() => {
    securityService.destroy();
  });

  describe("Initialization", () => {
    it("should initialize with auth context", () => {
      const initSpy = jest.fn();
      securityService.on("initialized", initSpy);

      securityService.initialize(mockAuthContext);

      expect(initSpy).toHaveBeenCalledWith({ userId: "user-123" });
    });

    it("should update user relationships", () => {
      securityService.initialize(mockAuthContext);
      securityService.updateUserRelationships(
        "user-123",
        mockUserRelationships
      );

      const stats = securityService.getSecurityStats();
      expect(stats.blockedUsers).toBe(1); // user-789 is blocked
    });
  });

  describe("Authentication Validation", () => {
    it("should validate valid authentication", () => {
      securityService.initialize(mockAuthContext);

      const result = securityService.validateAuthentication();

      expect(result.valid).toBe(true);
    });

    it("should reject missing authentication", () => {
      const result = securityService.validateAuthentication();

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Authentication context not initialized");
    });

    it("should reject expired token", () => {
      const expiredAuthContext = {
        ...mockAuthContext,
        tokenExpiry: Date.now() - 1000, // 1 second ago
      };

      securityService.initialize(expiredAuthContext);

      const result = securityService.validateAuthentication();

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Authentication token expired");
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
    });

    it("should allow messages within rate limit", () => {
      const result = securityService.validateRateLimit();
      expect(result.valid).toBe(true);
    });

    it("should reject messages exceeding rate limit", async () => {
      // Send messages up to the limit
      for (let i = 0; i < 5; i++) {
        await securityService.validateMessageSecurity({
          conversationId: "conv-123",
          fromUserId: "user-123",
          toUserId: "user-456",
          text: `Message ${i}`,
          type: "text",
        });
      }

      // Next message should be rate limited
      const result = securityService.validateRateLimit();
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Rate limit exceeded");
    });
  });

  describe("Message Security Validation", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
      securityService.updateUserRelationships(
        "user-123",
        mockUserRelationships
      );
    });

    it("should validate secure message", async () => {
      const result = await securityService.validateMessageSecurity({
        conversationId: "conv-123",
        fromUserId: "user-123",
        toUserId: "user-456",
        text: "Hello, how are you?",
        type: "text",
      });

      expect(result.valid).toBe(true);
    });

    it("should reject message to blocked user", async () => {
      const result = await securityService.validateMessageSecurity({
        conversationId: "conv-789",
        fromUserId: "user-123",
        toUserId: "user-789",
        text: "Hello blocked user",
        type: "text",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should reject message with harmful content", async () => {
      const result = await securityService.validateMessageSecurity({
        conversationId: "conv-123",
        fromUserId: "user-123",
        toUserId: "user-456",
        text: '<script>alert("xss")</script>',
        type: "text",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("harmful content");
    });

    it("should validate voice message permissions", async () => {
      const result = await securityService.validateMessageSecurity({
        conversationId: "conv-123",
        fromUserId: "user-123",
        toUserId: "user-456",
        audioStorageId: "audio-123",
        duration: 30,
        type: "voice",
      });

      expect(result.valid).toBe(true);
    });

    it("should reject image message without permission", async () => {
      const result = await securityService.validateMessageSecurity({
        conversationId: "conv-123",
        fromUserId: "user-123",
        toUserId: "user-456",
        fileSize: 1024000,
        type: "image",
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Permission denied");
    });
  });

  describe("Content Validation", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
    });

    it("should validate clean content", () => {
      const result = securityService.validateContent(
        "Hello, how are you today?"
      );
      expect(result.valid).toBe(true);
    });

    it("should reject harmful content", () => {
      const result = securityService.validateContent(
        '<script>alert("xss")</script>'
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("harmful content");
    });

    it("should reject spam patterns", () => {
      const result = securityService.validateContent("AAAAAAAAAAAAAAAAAAAAAA");
      expect(result.valid).toBe(false);
    });
  });

  describe("File Upload Validation", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
    });

    it("should validate valid image file", () => {
      const mockFile = new Blob(["fake image data"], { type: "image/jpeg" });
      Object.defineProperty(mockFile, "size", { value: 1024000 }); // 1MB

      const result = securityService.validateFileUpload(
        mockFile,
        "image",
        "image/jpeg"
      );
      expect(result.valid).toBe(true);
    });

    it("should reject oversized file", () => {
      const mockFile = new Blob(["fake image data"], { type: "image/jpeg" });
      Object.defineProperty(mockFile, "size", { value: 10 * 1024 * 1024 }); // 10MB

      const result = securityService.validateFileUpload(
        mockFile,
        "image",
        "image/jpeg"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too large");
    });

    it("should reject invalid MIME type", () => {
      const mockFile = new Blob(["fake data"], { type: "application/exe" });
      Object.defineProperty(mockFile, "size", { value: 1024 });

      const result = securityService.validateFileUpload(
        mockFile,
        "image",
        "application/exe"
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("Security Statistics", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
      securityService.updateUserRelationships(
        "user-123",
        mockUserRelationships
      );
    });

    it("should provide accurate security stats", () => {
      const stats = securityService.getSecurityStats();

      expect(stats.authStatus.authenticated).toBe(true);
      expect(stats.authStatus.userId).toBe("user-123");
      expect(stats.blockedUsers).toBe(1);
      expect(stats.rateLimitStatus.enabled).toBe(true);
    });

    it("should track security violations", async () => {
      // Trigger a security violation
      await securityService.validateMessageSecurity({
        conversationId: "conv-789",
        fromUserId: "user-123",
        toUserId: "user-789", // blocked user
        text: "Hello",
        type: "text",
      });

      const violations = securityService.getRecentViolations(5);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("validation");
    });
  });

  describe("Permission System", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
    });

    it("should validate user permissions", () => {
      expect(securityService.hasPermission("send_text_message")).toBe(true);
      expect(securityService.hasPermission("send_voice_message")).toBe(true);
      expect(securityService.hasPermission("send_image_message")).toBe(false);
    });

    it("should validate message type permissions", () => {
      const textResult = securityService.validateMessagePermissions("text");
      expect(textResult.valid).toBe(true);

      const voiceResult = securityService.validateMessagePermissions("voice");
      expect(voiceResult.valid).toBe(true);

      const imageResult = securityService.validateMessagePermissions("image");
      expect(imageResult.valid).toBe(false);
    });
  });

  describe("Configuration Updates", () => {
    beforeEach(() => {
      securityService.initialize(mockAuthContext);
    });

    it("should update security configuration", () => {
      const configSpy = jest.fn();
      securityService.on("config_updated", configSpy);

      securityService.updateConfig({
        enableContentFiltering: false,
        rateLimitMessages: 10,
      });

      expect(configSpy).toHaveBeenCalled();
    });
  });
});

describe("MessageValidator", () => {
  describe("Text Message Validation", () => {
    it("should validate normal text", () => {
      const result = MessageValidator.validateTextMessage("Hello world!");
      expect(result.valid).toBe(true);
      expect(result.sanitizedText).toBe("Hello world!");
    });

    it("should reject empty text", () => {
      const result = MessageValidator.validateTextMessage("");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should reject text that is too long", () => {
      const longText = "a".repeat(1001);
      const result = MessageValidator.validateTextMessage(longText);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("too long");
    });

    it("should sanitize harmful content", () => {
      const result = MessageValidator.validateTextMessage(
        '<script>alert("xss")</script>Hello'
      );
      expect(result.valid).toBe(true);
      expect(result.sanitizedText).toBe("Hello");
    });
  });

  describe("User Relationship Validation", () => {
    const mockContext = {
      currentUserId: "user-123",
      targetUserId: "user-456",
      conversationId: "conv-123",
      userRelationships: [
        {
          userId: "user-123",
          targetUserId: "user-456",
          isMatched: true,
          isBlocked: false,
        },
      ] as UserRelationship[],
    };

    it("should validate matched users", async () => {
      const result = await MessageValidator.validateUserRelationship(
        mockContext
      );
      expect(result.valid).toBe(true);
    });

    it("should reject unmatched users", async () => {
      const unmatchedContext = {
        ...mockContext,
        userRelationships: [
          {
            ...mockContext.userRelationships[0],
            isMatched: false,
          },
        ],
      };

      const result = await MessageValidator.validateUserRelationship(
        unmatchedContext
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("matched");
    });

    it("should reject blocked users", async () => {
      const blockedContext = {
        ...mockContext,
        userRelationships: [
          {
            ...mockContext.userRelationships[0],
            isBlocked: true,
            blockedBy: "user-456",
          },
        ],
      };

      const result = await MessageValidator.validateUserRelationship(
        blockedContext
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("blocked");
    });

    it("should reject messaging yourself", async () => {
      const selfContext = {
        ...mockContext,
        targetUserId: "user-123", // same as currentUserId
      };

      const result = await MessageValidator.validateUserRelationship(
        selfContext
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("yourself");
    });
  });
});

describe("ClientRateLimit", () => {
  let rateLimit: ClientRateLimit;

  beforeEach(() => {
    rateLimit = new ClientRateLimit(3, 1000, 2, 500); // 3 per second, 2 burst per 0.5s
  });

  it("should allow messages within limit", () => {
    expect(rateLimit.canSendMessage()).toBe(true);
    rateLimit.recordMessage();
    expect(rateLimit.canSendMessage()).toBe(true);
  });

  it("should enforce rate limit", () => {
    // Send messages up to limit
    for (let i = 0; i < 3; i++) {
      expect(rateLimit.canSendMessage()).toBe(true);
      rateLimit.recordMessage();
    }

    // Next message should be blocked
    expect(rateLimit.canSendMessage()).toBe(false);
  });

  it("should enforce burst limit", () => {
    // Send burst messages quickly
    for (let i = 0; i < 2; i++) {
      expect(rateLimit.canSendMessage()).toBe(true);
      rateLimit.recordMessage();
    }

    // Next message should be blocked by burst limit
    expect(rateLimit.canSendMessage()).toBe(false);
  });

  it("should provide accurate statistics", () => {
    rateLimit.recordMessage();
    rateLimit.recordMessage();

    const stats = rateLimit.getStats();
    expect(stats.currentCount).toBe(2);
    expect(stats.remaining).toBe(1);
    expect(stats.limit).toBe(3);
  });

  it("should reset after window expires", (done) => {
    // Fill up the limit
    for (let i = 0; i < 3; i++) {
      rateLimit.recordMessage();
    }
    expect(rateLimit.canSendMessage()).toBe(false);

    // Wait for window to expire
    setTimeout(() => {
      expect(rateLimit.canSendMessage()).toBe(true);
      done();
    }, 1100); // Slightly longer than window
  });
});

describe("MessageSecurity", () => {
  describe("Harmful Content Detection", () => {
    it("should detect script tags", () => {
      expect(
        MessageSecurity.containsHarmfulContent('<script>alert("xss")</script>')
      ).toBe(true);
    });

    it("should detect javascript protocols", () => {
      expect(
        MessageSecurity.containsHarmfulContent('javascript:alert("xss")')
      ).toBe(true);
    });

    it("should detect event handlers", () => {
      expect(
        MessageSecurity.containsHarmfulContent(
          '<div onclick="alert()">test</div>'
        )
      ).toBe(true);
    });

    it("should allow safe content", () => {
      expect(
        MessageSecurity.containsHarmfulContent("Hello, how are you?")
      ).toBe(false);
    });
  });

  describe("Spam Pattern Detection", () => {
    it("should detect repeated characters", () => {
      expect(
        MessageSecurity.containsSpamPatterns("AAAAAAAAAAAAAAAAAAAAAA")
      ).toBe(true);
    });

    it("should detect all caps messages", () => {
      expect(
        MessageSecurity.containsSpamPatterns(
          "THIS IS A VERY LONG ALL CAPS MESSAGE!!!"
        )
      ).toBe(true);
    });

    it("should detect multiple URLs", () => {
      expect(
        MessageSecurity.containsSpamPatterns(
          "Check out http://site1.com and http://site2.com and http://site3.com"
        )
      ).toBe(true);
    });

    it("should allow normal content", () => {
      expect(
        MessageSecurity.containsSpamPatterns("Hello, how are you today?")
      ).toBe(false);
    });
  });

  describe("MIME Type Validation", () => {
    it("should validate allowed image types", () => {
      expect(MessageSecurity.isAllowedMimeType("image/jpeg", "image")).toBe(
        true
      );
      expect(MessageSecurity.isAllowedMimeType("image/png", "image")).toBe(
        true
      );
      expect(MessageSecurity.isAllowedMimeType("image/gif", "image")).toBe(
        true
      );
    });

    it("should validate allowed audio types", () => {
      expect(MessageSecurity.isAllowedMimeType("audio/webm", "voice")).toBe(
        true
      );
      expect(MessageSecurity.isAllowedMimeType("audio/mp4", "voice")).toBe(
        true
      );
      expect(MessageSecurity.isAllowedMimeType("audio/mpeg", "voice")).toBe(
        true
      );
    });

    it("should reject invalid types", () => {
      expect(
        MessageSecurity.isAllowedMimeType("application/exe", "image")
      ).toBe(false);
      expect(MessageSecurity.isAllowedMimeType("text/html", "voice")).toBe(
        false
      );
    });
  });

  describe("JWT Token Validation", () => {
    const validJWT =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    it("should validate JWT structure", () => {
      expect(MessageSecurity.validateJWTStructure(validJWT)).toBe(true);
    });

    it("should reject invalid JWT structure", () => {
      expect(MessageSecurity.validateJWTStructure("invalid.jwt")).toBe(false);
      expect(MessageSecurity.validateJWTStructure("not-a-jwt")).toBe(false);
    });

    it("should extract token expiry", () => {
      const tokenWithExp =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNjE2MjM5MDIyfQ.Lq-38fmfse_ggLYmDNmIl8urPXl7c5KhL7KKjJCCpzs";
      const expiry = MessageSecurity.extractTokenExpiry(tokenWithExp);
      expect(expiry).toBe(1616239022000); // exp * 1000
    });
  });

  describe("Content Complexity Validation", () => {
    it("should validate normal content", () => {
      const result = MessageSecurity.validateContentComplexity(
        "Hello, how are you today?"
      );
      expect(result.valid).toBe(true);
    });

    it("should reject excessive repetition", () => {
      const result = MessageSecurity.validateContentComplexity(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("repetition");
    });

    it("should reject too many URLs", () => {
      const result = MessageSecurity.validateContentComplexity(
        "Check http://1.com http://2.com http://3.com http://4.com"
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("URLs");
    });

    it("should reject excessive special characters", () => {
      const result = MessageSecurity.validateContentComplexity(
        "!@#$%^&*()!@#$%^&*()!@#$%^&*()"
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("special characters");
    });
  });

  describe("Spam Behavior Detection", () => {
    it("should detect rapid messaging", () => {
      const messageHistory = Array.from({ length: 15 }, (_, i) => ({
        timestamp: Date.now() - i * 1000,
        text: `Message ${i}`,
        fromUserId: "user-123",
      }));

      const result = MessageSecurity.detectSpamBehavior(messageHistory);
      expect(result.isSpam).toBe(true);
      expect(result.severity).toBe("high");
      expect(result.reason).toContain("Too many messages");
    });

    it("should detect repeated content", () => {
      const messageHistory = Array.from({ length: 5 }, (_, i) => ({
        timestamp: Date.now() - i * 5000,
        text: "Same message",
        fromUserId: "user-123",
      }));

      const result = MessageSecurity.detectSpamBehavior(messageHistory);
      expect(result.isSpam).toBe(true);
      expect(result.severity).toBe("high");
      expect(result.reason).toContain("identical messages");
    });

    it("should allow normal messaging patterns", () => {
      const messageHistory = [
        {
          timestamp: Date.now() - 10000,
          text: "Hello",
          fromUserId: "user-123",
        },
        {
          timestamp: Date.now() - 5000,
          text: "How are you?",
          fromUserId: "user-123",
        },
        {
          timestamp: Date.now() - 1000,
          text: "Great weather today!",
          fromUserId: "user-123",
        },
      ];

      const result = MessageSecurity.detectSpamBehavior(messageHistory);
      expect(result.isSpam).toBe(false);
      expect(result.severity).toBe("low");
    });
  });
});
