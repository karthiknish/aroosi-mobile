import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { MessageValidator } from "../../utils/messageValidation";
import {
  getMessagingFeatures,
  SubscriptionTier,
} from "../../utils/messagingFeatures";
import { VoiceMessageManager } from "../../services/voiceMessageManager";
import { MessagingService } from "../../services/messagingService";
import { RealtimeMessagingService } from "../../services/RealtimeMessagingService";
import { Message } from "../../types/message";
import { MessagingAPI } from "../../types/messaging";

// Mock dependencies
jest.mock("../../utils/api");
jest.mock("../../services/voiceMessageStorage");

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

      it("should reject voice messages that are too large", () => {
        const largeData = new Array(11 * 1024 * 1024).fill("a").join(""); // > 10MB
        const mockBlob = new Blob([largeData], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 30);
        expect(result.valid).toBe(false);
        expect(result.error).toBe("Voice message file too large (max 10MB)");
      });

      it("should accept voice messages at the limit", () => {
        const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });
        const result = MessageValidator.validateVoiceMessage(mockBlob, 300); // exactly 5 minutes
        expect(result.valid).toBe(true);
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
  });

  describe("Voice Message Upload and Playback", () => {
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

      it("should validate voice message before upload", async () => {
        const largeBlob = new Blob(
          [new Array(11 * 1024 * 1024).fill("a").join("")],
          {
            type: "audio/mp4",
          }
        );

        const result = await voiceMessageManager.uploadVoiceMessage(
          largeBlob,
          "conv1",
          "user1",
          "user2",
          30
        );

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain("too large");
      });
    });

    describe("Voice Message Playback", () => {
      it("should generate playback URL successfully", async () => {
        const result = await voiceMessageManager.getVoiceMessageUrl("audio123");

        expect(mockApiClient.getVoiceMessageUrl).toHaveBeenCalledWith(
          "audio123"
        );
        expect(result).toBe("https://storage.example.com/audio123");
      });

      it("should handle playback URL generation failures", async () => {
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
      jest.clearAllMocks();
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

      it("should send typing start indicator", () => {
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

      it("should send typing stop indicator", () => {
        realtimeService.sendTypingIndicator("conv1", false);

        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({
            type: "typing",
            conversationId: "conv1",
            userId: "user1",
            isTyping: false,
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
});
