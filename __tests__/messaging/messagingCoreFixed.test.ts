import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  MessageValidator,
  ClientRateLimit,
  MessageSecurity,
} from "../../utils/messageValidation";
import {
  getMessagingFeatures,
  SubscriptionTier,
  MessagingPermissions,
} from "../../utils/messagingFeatures";
import { VoiceMessageManager } from "../../services/voiceMessageManager";
import { MessagingService } from "../../services/messagingService";
import { RealtimeMessagingService } from "../../services/RealtimeMessagingService";
import { MessageCache } from "../../utils/MessageCache";
import { Message } from "../../types/message";
import { MessagingAPI } from "../../types/messaging";

// Mock dependencies
jest.mock("../../utils/api");
jest.mock("../../services/voiceMessageStorage");
jest.mock("expo-av", () => ({
  Audio: {
    requestPermissionsAsync: jest.fn(() =>
      Promise.resolve({ status: "granted" })
    ),
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    Recording: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          recording: {
            stopAndUnloadAsync: jest.fn(() => Promise.resolve()),
            getURI: jest.fn(() => "file://test-audio.m4a"),
          },
        })
      ),
    },
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            playAsync: jest.fn(() => Promise.resolve()),
            pauseAsync: jest.fn(() => Promise.resolve()),
            stopAsync: jest.fn(() => Promise.resolve()),
          },
        })
      ),
    },
    RecordingOptionsPresets: {
      HIGH_QUALITY: {},
    },
    InterruptionModeIOS: {
      DoNotMix: 0,
    },
    InterruptionModeAndroid: {
      DoNotMix: 0,
    },
  },
}));

describe("Messaging Core Functionality", () => {
  describe("Message Validation and Sanitization", () => {
    describe("Text Message Validation", () => {
      it("should validate valid text messages", () => {
        const result = MessageValidator.validateTextMessage("Hello world!");
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).toBe("Hello world!");
      });

      it("should reject empty messages", () => {
        const result = MessageValidator.validateTextMessage("");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Message cannot be empty");
      });

      it("should reject whitespace-only messages", () => {
        const result = MessageValidator.validateTextMessage("   ");
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Message cannot be empty");
      });

      it("should reject messages that are too long", () => {
        const longMessage = "a".repeat(1001);
        const result = MessageValidator.validateTextMessage(longMessage);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Message too long (max 1000 characters)");
      });

      it("should sanitize HTML content", () => {
        const htmlMessage = '<script>alert("xss")</script>Hello <b>world</b>!';
        const result = MessageValidator.validateTextMessage(htmlMessage);
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).toBe("Hello world!");
      });

      it("should sanitize script tags", () => {
        const scriptMessage = '<script src="malicious.js"></script>Safe text';
        const result = MessageValidator.validateTextMessage(scriptMessage);
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).toBe("Safe text");
      });

      it("should preserve emoji and special characters", () => {
        const emojiMessage = "Hello 👋 world! 🌍 How are you? 😊";
        const result = MessageValidator.validateTextMessage(emojiMessage);
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).toBe(emojiMessage);
      });

      it("should handle unicode characters correctly", () => {
        const unicodeMessage = "مرحبا بالعالم! 你好世界! Здравствуй мир!";
        const result = MessageValidator.validateTextMessage(unicodeMessage);
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).toBe(unicodeMessage);
      });
    });

    describe("Voice Message Validation", () => {
      it("should validate valid voice messages", () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 30);
        expect(result.valid).toBe(true);
      });

      it("should reject voice messages that are too long", () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 301); // > 5 minutes
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Voice message too long (max 5 minutes)");
      });

      it("should reject voice messages that are too short", () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 0.5); // < 1 second
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Voice message too short (min 1 second)");
      });

      it("should reject voice messages that are too large", () => {
        const largeData = new Array(11 * 1024 * 1024).fill("a").join(""); // > 10MB
        const mockBlob = new Blob([largeData], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 30);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Voice message file too large (max 10MB)");
      });

      it("should reject empty voice messages", () => {
        const mockBlob = new Blob([], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 30);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Voice message file is empty");
      });

      it("should accept voice messages at the limit", () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 300); // exactly 5 minutes
        expect(result.valid).toBe(true);
      });
    });

    describe("Image Message Validation", () => {
      it("should validate valid image messages", () => {
        const mockFile = new File(["image data"], "test.jpg", {
          type: "image/jpeg",
        });
        const result = MessageValidator.validateImageMessage(mockFile);
        expect(result.valid).toBe(true);
      });

      it("should reject images that are too large", () => {
        const largeData = new Array(6 * 1024 * 1024).fill("a").join(""); // > 5MB
        const mockFile = new File([largeData], "large.jpg", {
          type: "image/jpeg",
        });
        const result = MessageValidator.validateImageMessage(mockFile);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Image file too large (max 5MB)");
      });

      it("should reject empty image files", () => {
        const mockFile = new File([], "empty.jpg", { type: "image/jpeg" });
        const result = MessageValidator.validateImageMessage(mockFile);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Image file is empty");
      });

      it("should reject invalid image formats", () => {
        const mockFile = new File(["data"], "test.txt", { type: "text/plain" });
        const result = MessageValidator.validateImageMessage(mockFile);
        expect(result.valid).toBe(false);
        expect(result.error).toBe(
          "Invalid image format. Supported: JPEG, PNG, GIF, WebP"
        );
      });
    });

    describe("Message Content Sanitization", () => {
      it("should remove potentially harmful URLs", () => {
        const maliciousMessage = 'Check this out: javascript:alert("xss")';
        const result = MessageValidator.validateTextMessage(maliciousMessage);
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).not.toContain("javascript:");
      });

      it("should preserve safe URLs", () => {
        const safeMessage = "Check this out: https://example.com";
        const result = MessageValidator.validateTextMessage(safeMessage);
        expect(result.valid).toBe(true);
        expect(result.sanitizedText).toBe(safeMessage);
      });
    });

    describe("Security Validation", () => {
      it("should detect harmful content patterns", () => {
        expect(
          MessageSecurity.containsHarmfulContent(
            '<script>alert("xss")</script>'
          )
        ).toBe(true);
        expect(
          MessageSecurity.containsHarmfulContent('javascript:alert("xss")')
        ).toBe(true);
        expect(
          MessageSecurity.containsHarmfulContent(
            '<iframe src="evil.com"></iframe>'
          )
        ).toBe(true);
        expect(MessageSecurity.containsHarmfulContent("Hello world!")).toBe(
          false
        );
      });

      it("should detect spam patterns", () => {
        expect(
          MessageSecurity.containsSpamPatterns("AAAAAAAAAAAAAAAAAAA")
        ).toBe(true); // Repeated chars
        expect(
          MessageSecurity.containsSpamPatterns("HELLO WORLD THIS IS SPAM!!!")
        ).toBe(true); // All caps
        expect(MessageSecurity.containsSpamPatterns("Hello world!")).toBe(
          false
        );
      });

      it("should validate MIME types", () => {
        expect(MessageSecurity.isAllowedMimeType("audio/mp4", "voice")).toBe(
          true
        );
        expect(MessageSecurity.isAllowedMimeType("image/jpeg", "image")).toBe(
          true
        );
        expect(MessageSecurity.isAllowedMimeType("text/plain", "voice")).toBe(
          false
        );
        expect(
          MessageSecurity.isAllowedMimeType("application/exe", "image")
        ).toBe(false);
      });
    });
  });

  describe("Subscription Feature Gating", () => {
    describe("Free Tier Features", () => {
      const freeFeatures = getMessagingFeatures("free");

      it("should not allow free users to initiate chats", () => {
        expect(freeFeatures.canInitiateChat).toBe(false);
      });

      it("should not allow unlimited messages for free users", () => {
        expect(freeFeatures.canSendUnlimitedMessages).toBe(false);
      });

      it("should not allow voice messages for free users", () => {
        expect(freeFeatures.canSendVoiceMessages).toBe(false);
      });

      it("should not allow image messages for free users", () => {
        expect(freeFeatures.canSendImageMessages).toBe(false);
      });

      it("should have daily message limit for free users", () => {
        expect(freeFeatures.dailyMessageLimit).toBe(5);
      });

      it("should have no voice message duration for free users", () => {
        expect(freeFeatures.voiceMessageDurationLimit).toBe(0);
      });
    });

    describe("Premium Tier Features", () => {
      const premiumFeatures = getMessagingFeatures("premium");

      it("should allow premium users to initiate chats", () => {
        expect(premiumFeatures.canInitiateChat).toBe(true);
      });

      it("should allow unlimited messages for premium users", () => {
        expect(premiumFeatures.canSendUnlimitedMessages).toBe(true);
      });

      it("should allow voice messages for premium users", () => {
        expect(premiumFeatures.canSendVoiceMessages).toBe(true);
      });

      it("should not allow image messages for premium users", () => {
        expect(premiumFeatures.canSendImageMessages).toBe(false);
      });

      it("should have unlimited daily messages for premium users", () => {
        expect(premiumFeatures.dailyMessageLimit).toBe(-1);
      });

      it("should have 1 minute voice message limit for premium users", () => {
        expect(premiumFeatures.voiceMessageDurationLimit).toBe(60);
      });
    });

    describe("Premium Plus Tier Features", () => {
      const premiumPlusFeatures = getMessagingFeatures("premiumPlus");

      it("should allow premium plus users to initiate chats", () => {
        expect(premiumPlusFeatures.canInitiateChat).toBe(true);
      });

      it("should allow unlimited messages for premium plus users", () => {
        expect(premiumPlusFeatures.canSendUnlimitedMessages).toBe(true);
      });

      it("should allow voice messages for premium plus users", () => {
        expect(premiumPlusFeatures.canSendVoiceMessages).toBe(true);
      });

      it("should allow image messages for premium plus users", () => {
        expect(premiumPlusFeatures.canSendImageMessages).toBe(true);
      });

      it("should have unlimited daily messages for premium plus users", () => {
        expect(premiumPlusFeatures.dailyMessageLimit).toBe(-1);
      });

      it("should have 5 minute voice message limit for premium plus users", () => {
        expect(premiumPlusFeatures.voiceMessageDurationLimit).toBe(300);
      });
    });

    describe("Messaging Permissions", () => {
      it("should enforce free tier limitations", () => {
        const permissions = new MessagingPermissions("free");

        expect(permissions.canInitiateChat().allowed).toBe(false);
        expect(permissions.canSendVoiceMessage().allowed).toBe(false);
        expect(permissions.canSendImageMessage().allowed).toBe(false);
        expect(permissions.getRemainingDailyMessages()).toBe(5);
      });

      it("should allow premium tier features", () => {
        const permissions = new MessagingPermissions("premium");

        expect(permissions.canInitiateChat().allowed).toBe(true);
        expect(permissions.canSendVoiceMessage(30).allowed).toBe(true);
        expect(permissions.canSendImageMessage().allowed).toBe(false);
        expect(permissions.getRemainingDailyMessages()).toBe(-1);
      });

      it("should track daily message usage for free users", () => {
        const permissions = new MessagingPermissions("free");

        expect(permissions.getRemainingDailyMessages()).toBe(5);

        permissions.recordMessageSent();
        expect(permissions.getRemainingDailyMessages()).toBe(4);

        permissions.recordMessageSent();
        permissions.recordMessageSent();
        permissions.recordMessageSent();
        permissions.recordMessageSent();
        expect(permissions.getRemainingDailyMessages()).toBe(0);

        expect(permissions.canSendTextMessage().allowed).toBe(false);
      });
    });
  });

  describe("Rate Limiting", () => {
    let rateLimit: ClientRateLimit;

    beforeEach(() => {
      rateLimit = new ClientRateLimit(5, 60000, 3, 10000); // 5 per minute, 3 burst per 10 seconds
    });

    it("should allow messages within rate limit", () => {
      expect(rateLimit.canSendMessage()).toBe(true);
      rateLimit.recordMessage();
      expect(rateLimit.canSendMessage()).toBe(true);
    });

    it("should block messages when rate limit exceeded", () => {
      // Send 5 messages (at limit)
      for (let i = 0; i < 5; i++) {
        expect(rateLimit.canSendMessage()).toBe(true);
        rateLimit.recordMessage();
      }

      // 6th message should be blocked
      expect(rateLimit.canSendMessage()).toBe(false);
    });

    it("should enforce burst limits", () => {
      // Send 3 messages quickly (burst limit)
      for (let i = 0; i < 3; i++) {
        expect(rateLimit.canSendMessage()).toBe(true);
        rateLimit.recordMessage();
      }

      // 4th message should be blocked due to burst limit
      expect(rateLimit.canSendMessage()).toBe(false);
    });

    it("should provide rate limit statistics", () => {
      rateLimit.recordMessage();
      rateLimit.recordMessage();

      const stats = rateLimit.getStats();
      expect(stats.currentCount).toBe(2);
      expect(stats.remaining).toBe(3);
      expect(stats.limit).toBe(5);
    });

    it("should reset rate limit after window", () => {
      // Fill up the rate limit
      for (let i = 0; i < 5; i++) {
        rateLimit.recordMessage();
      }
      expect(rateLimit.canSendMessage()).toBe(false);

      // Mock time passage
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 61000); // 61 seconds later

      expect(rateLimit.canSendMessage()).toBe(true);
    });
  });

  describe("Voice Message System", () => {
    let voiceMessageManager: VoiceMessageManager;
    let mockApiClient: MessagingAPI;

    beforeEach(() => {
      mockApiClient = {
        generateVoiceUploadUrl: jest.fn().mockResolvedValue({
          success: true,
          data: {
            uploadUrl: "https://storage.example.com/upload",
            storageId: "audio123",
          },
        }),
        sendMessage: jest.fn().mockResolvedValue({
          success: true,
          data: { _id: "msg1", type: "voice", audioStorageId: "audio123" },
        }),
        getVoiceMessageUrl: jest.fn().mockResolvedValue({
          success: true,
          data: { url: "https://storage.example.com/audio123" },
        }),
        getMessages: jest.fn(),
        markConversationAsRead: jest.fn(),
        sendTypingIndicator: jest.fn(),
        sendDeliveryReceipt: jest.fn(),
        getConversations: jest.fn(),
        createConversation: jest.fn(),
        deleteConversation: jest.fn(),
      } as MessagingAPI;

      voiceMessageManager = new VoiceMessageManager(mockApiClient);
    });

    describe("Voice Message Upload", () => {
      it("should upload voice message successfully", async () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });

        // Mock fetch for file upload
        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
        } as Response);

        const result = await voiceMessageManager.uploadVoiceMessage(
          mockBlob,
          "conv1",
          "user1",
          "user2",
          30
        );

        expect(result.success).toBe(true);
        expect(mockApiClient.sendMessage).toHaveBeenCalledWith({
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          type: "voice",
          audioStorageId: "audio123",
          duration: 30,
          fileSize: mockBlob.size,
          mimeType: mockBlob.type,
        });
      });

      it("should handle upload failures gracefully", async () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });

        // Mock failed upload
        global.fetch = jest.fn().mockResolvedValue({
          ok: false,
          status: 500,
        } as Response);

        const result = await voiceMessageManager.uploadVoiceMessage(
          mockBlob,
          "conv1",
          "user1",
          "user2",
          30
        );

        expect(result.success).toBe(false);
        expect(result.error?.code).toBe("UPLOAD_ERROR");
      });
    });

    describe("Voice Message Playback", () => {
      it("should get voice message URL successfully", async () => {
        const result = await voiceMessageManager.getVoiceMessageUrl("audio123");

        expect(mockApiClient.getVoiceMessageUrl).toHaveBeenCalledWith(
          "audio123"
        );
        expect(result).toBe("https://storage.example.com/audio123");
      });

      it("should handle URL generation failures", async () => {
        (mockApiClient.getVoiceMessageUrl as jest.Mock).mockResolvedValue({
          success: false,
          error: { message: "Storage not found" },
        });

        const result = await voiceMessageManager.getVoiceMessageUrl(
          "invalid-id"
        );
        expect(result).toBeNull();
      });
    });
  });

  describe("Real-time Messaging Features", () => {
    let realtimeService: RealtimeMessagingService;
    let mockWebSocket: any;

    beforeEach(() => {
      mockWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: 1, // WebSocket.OPEN
        onopen: null,
        onmessage: null,
        onclose: null,
        onerror: null,
      };

      // Mock WebSocket constructor
      (global as any).WebSocket = jest
        .fn()
        .mockImplementation(() => mockWebSocket);

      realtimeService = new RealtimeMessagingService("ws://localhost:8080");
    });

    afterEach(() => {
      realtimeService.disconnect();
    });

    describe("Connection Management", () => {
      it("should establish WebSocket connection", async () => {
        const result = await realtimeService.initialize("user1");

        expect(global.WebSocket).toHaveBeenCalledWith(
          expect.stringContaining("ws://localhost:8080?userId=user1")
        );
        expect(result).toBe(true);
      });

      it("should handle connection events", async () => {
        const onConnect = jest.fn();
        const onDisconnect = jest.fn();

        await realtimeService.initialize("user1", {
          onConnectionChange: (connected) => {
            if (connected) onConnect();
            else onDisconnect();
          },
        });

        // Simulate connection open
        if (mockWebSocket.onopen) {
          mockWebSocket.onopen();
        }
        expect(onConnect).toHaveBeenCalled();

        // Simulate connection close
        if (mockWebSocket.onclose) {
          mockWebSocket.onclose({ code: 1001, reason: "test" });
        }
        expect(onDisconnect).toHaveBeenCalled();
      });
    });

    describe("Typing Indicators", () => {
      beforeEach(async () => {
        await realtimeService.initialize("user1");
      });

      it("should send typing indicators", () => {
        realtimeService.sendTypingIndicator("conv1", true);

        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: "typing",
            conversationId: "conv1",
            userId: "user1",
            isTyping: true,
            timestamp: expect.any(Number),
          })
        );
      });

      it("should handle received typing indicators", async () => {
        const onTyping = jest.fn();

        await realtimeService.initialize("user1", {
          onTypingIndicator: onTyping,
        });

        // Simulate receiving typing message
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "typing",
              conversationId: "conv1",
              userId: "user2",
              isTyping: true,
              timestamp: Date.now(),
            }),
          });
        }

        expect(onTyping).toHaveBeenCalledWith({
          conversationId: "conv1",
          userId: "user2",
          isTyping: true,
          timestamp: expect.any(Number),
        });
      });
    });

    describe("Message Delivery Receipts", () => {
      beforeEach(async () => {
        await realtimeService.initialize("user1");
      });

      it("should send delivery receipts", () => {
        realtimeService.sendDeliveryReceipt("msg1", "conv1", "delivered");

        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: "delivery_receipt",
            messageId: "msg1",
            conversationId: "conv1",
            userId: "user1",
            status: "delivered",
            timestamp: expect.any(Number),
          })
        );
      });

      it("should handle received delivery receipts", async () => {
        const onDeliveryReceipt = jest.fn();

        await realtimeService.initialize("user1", {
          onDeliveryReceipt,
        });

        // Simulate receiving delivery receipt
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "delivery_receipt",
              messageId: "msg1",
              conversationId: "conv1",
              userId: "user2",
              status: "delivered",
              timestamp: Date.now(),
            }),
          });
        }

        expect(onDeliveryReceipt).toHaveBeenCalledWith({
          messageId: "msg1",
          conversationId: "conv1",
          userId: "user2",
          status: "delivered",
          timestamp: expect.any(Number),
        });
      });
    });

    describe("Real-time Message Sync", () => {
      it("should handle incoming messages", async () => {
        const onMessage = jest.fn();

        await realtimeService.initialize("user1", {
          onMessage,
        });

        const newMessage = {
          id: "msg1",
          conversationId: "conv1",
          fromUserId: "user2",
          toUserId: "user1",
          type: "text" as const,
          content: "Hello!",
          timestamp: Date.now(),
        };

        // Simulate receiving message
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "message",
              ...newMessage,
            }),
          });
        }

        expect(onMessage).toHaveBeenCalledWith(newMessage);
      });
    });
  });

  describe("Message Cache", () => {
    let messageCache: MessageCache;

    beforeEach(() => {
      messageCache = new MessageCache({ maxSize: 10, maxAge: 60000 });
    });

    afterEach(() => {
      messageCache.destroy();
    });

    it("should cache and retrieve messages", () => {
      const messages: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      messageCache.set("conv1", messages);
      const cached = messageCache.get("conv1");

      expect(cached).toEqual(messages);
      expect(cached).not.toBe(messages); // Should be a copy
    });

    it("should add messages to existing cache", () => {
      const initialMessages: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello",
          type: "text",
          createdAt: 1000,
        },
      ];

      const newMessages: Message[] = [
        {
          _id: "msg2",
          conversationId: "conv1",
          fromUserId: "user2",
          toUserId: "user1",
          text: "Hi",
          type: "text",
          createdAt: 2000,
        },
      ];

      messageCache.set("conv1", initialMessages);
      messageCache.addMessages("conv1", newMessages);

      const cached = messageCache.get("conv1");
      expect(cached).toHaveLength(2);
      expect(cached![0]._id).toBe("msg1");
      expect(cached![1]._id).toBe("msg2");
    });

    it("should update specific messages", () => {
      const messages: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      messageCache.set("conv1", messages);
      const updated = messageCache.updateMessage("conv1", "msg1", {
        readAt: Date.now(),
      });

      expect(updated).toBe(true);
      const cached = messageCache.get("conv1");
      expect(cached![0].readAt).toBeDefined();
    });

    it("should search messages", () => {
      const messages: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello world",
          type: "text",
          createdAt: Date.now(),
        },
        {
          _id: "msg2",
          conversationId: "conv1",
          fromUserId: "user2",
          toUserId: "user1",
          text: "Goodbye",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      messageCache.set("conv1", messages);
      const results = messageCache.searchMessages("conv1", "hello");

      expect(results).toHaveLength(1);
      expect(results![0]._id).toBe("msg1");
    });

    it("should handle cache expiration", () => {
      const messages: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      messageCache.set("conv1", messages);

      // Mock time passage beyond maxAge
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 70000); // 70 seconds later

      const cached = messageCache.get("conv1");
      expect(cached).toBeNull();
    });

    it("should provide cache statistics", () => {
      const messages: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      messageCache.set("conv1", messages);
      const stats = messageCache.getStats();

      expect(stats.size).toBe(1);
      expect(stats.totalMessages).toBe(1);
      expect(stats.conversations).toContain("conv1");
    });
  });

  describe("Messaging Service Integration", () => {
    let messagingService: MessagingService;

    beforeEach(() => {
      messagingService = new MessagingService("premium");
    });

    it("should validate message sending with subscription checks", async () => {
      const validation = await messagingService.validateMessageSend({
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Hello",
        type: "text",
      });

      expect(validation.allowed).toBe(true);
    });

    it("should reject voice messages for free users", async () => {
      const freeService = new MessagingService("free");

      const validation = await freeService.validateMessageSend({
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "voice",
        duration: 30,
        audioStorageId: "audio123",
      });

      expect(validation.allowed).toBe(false);
      expect(validation.reason).toContain("Premium");
      expect(validation.requiresUpgrade).toBe("premium");
    });

    it("should provide messaging status information", () => {
      const status = messagingService.getMessagingStatus();

      expect(status.tier).toBe("premium");
      expect(status.canInitiateChat).toBe(true);
      expect(status.canSendVoice).toBe(true);
      expect(status.canSendImages).toBe(false);
      expect(status.remainingMessages).toBe(-1); // unlimited
    });

    it("should check feature availability", () => {
      const voiceCheck = messagingService.checkFeatureAvailability("voice", {
        voiceDuration: 30,
      });
      expect(voiceCheck.available).toBe(true);

      const imageCheck = messagingService.checkFeatureAvailability("image");
      expect(imageCheck.available).toBe(false);
      expect(imageCheck.requiresUpgrade).toBe("premiumPlus");
    });

    it("should validate voice duration limits", () => {
      const validation = messagingService.validateVoiceDuration(30);
      expect(validation.valid).toBe(true);
      expect(validation.maxDuration).toBe(60);

      const longValidation = messagingService.validateVoiceDuration(90);
      expect(longValidation.valid).toBe(false);
    });

    it("should provide daily message statistics", () => {
      const stats = messagingService.getDailyMessageStats();
      expect(stats.unlimited).toBe(true);
      expect(stats.remaining).toBe(-1);
      expect(stats.limit).toBe(-1);
    });
  });
});
