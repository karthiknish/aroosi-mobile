import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { MessagingService } from "../../services/messagingService";
import { RealtimeMessagingService } from "../../services/RealtimeMessagingService";
import { VoiceMessageManager } from "../../services/voiceMessageManager";
import { MessageCache } from "../../utils/MessageCache";
import { Message, SubscriptionTier } from "../../types/messaging";

// Mock external dependencies
jest.mock("../../utils/api");
jest.mock("../../services/voiceMessageStorage");

describe("Messaging Integration Tests", () => {
  let messagingService: MessagingService;
  let realtimeService: RealtimeMessagingService;
  let voiceMessageManager: VoiceMessageManager;
  let messageCache: MessageCache;

  beforeEach(() => {
    messagingService = new MessagingService();
    realtimeService = new RealtimeMessagingService("test-token");
    voiceMessageManager = new VoiceMessageManager({
      generateVoiceUploadUrl: jest.fn(),
      sendMessage: jest.fn(),
      getVoiceMessageUrl: jest.fn(),
    });
    messageCache = new MessageCache();

    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("End-to-End Message Flow", () => {
    it("should handle complete message sending flow", async () => {
      const mockUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };
      const mockMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Hello world!",
        type: "text" as const,
      };

      // Mock API response
      const mockResponse = {
        _id: "msg1",
        ...mockMessage,
        createdAt: Date.now(),
        status: "sent",
      };

      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // Send message
      const result = await messagingService.sendMessage(mockUser, mockMessage);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/match-messages",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(mockMessage),
        })
      );
    });

    it("should handle voice message end-to-end flow", async () => {
      const mockUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };
      const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });
      const mockUploadResponse = {
        uploadUrl: "https://storage.example.com/upload",
        storageId: "audio123",
      };
      const mockMessage = {
        _id: "msg1",
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "voice" as const,
        audioStorageId: "audio123",
        duration: 30,
        createdAt: Date.now(),
      };

      // Mock API calls
      voiceMessageManager["apiClient"].generateVoiceUploadUrl.mockResolvedValue(
        mockUploadResponse
      );
      voiceMessageManager["apiClient"].sendMessage.mockResolvedValue(
        mockMessage
      );

      // Mock file upload
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await voiceMessageManager.uploadVoiceMessage(
        mockBlob,
        "conv1",
        "user1",
        "user2",
        30
      );

      expect(result).toEqual(mockMessage);
      expect(
        voiceMessageManager["apiClient"].generateVoiceUploadUrl
      ).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        mockUploadResponse.uploadUrl,
        expect.objectContaining({
          method: "PUT",
          body: mockBlob,
        })
      );
      expect(voiceMessageManager["apiClient"].sendMessage).toHaveBeenCalledWith(
        {
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          type: "voice",
          audioStorageId: "audio123",
          duration: 30,
          fileSize: mockBlob.size,
          mimeType: mockBlob.type,
        }
      );
    });

    it("should handle message with real-time updates", async () => {
      const mockMessage = {
        _id: "msg1",
        conversationId: "conv1",
        fromUserId: "user2",
        toUserId: "user1",
        text: "Real-time message",
        type: "text" as const,
        createdAt: Date.now(),
      };

      let messageReceived = false;
      realtimeService.on("message:new", (message) => {
        expect(message).toEqual(mockMessage);
        messageReceived = true;
      });

      realtimeService.connect("conv1");

      // Simulate receiving message via WebSocket
      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      messageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: mockMessage,
        }),
      });

      expect(messageReceived).toBe(true);
    });
  });

  describe("Cross-Platform Message Synchronization", () => {
    it("should sync messages between platforms", async () => {
      const conversationId = "conv1";
      const mockMessages = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Message from web",
          type: "text" as const,
          createdAt: Date.now() - 1000,
        },
        {
          _id: "msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Message from mobile",
          type: "text" as const,
          createdAt: Date.now(),
        },
      ];

      // Mock API response
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      } as Response);

      const messages = await messagingService.getMessages(conversationId);

      expect(messages).toEqual(mockMessages);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/match-messages?conversationId=${conversationId}`,
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("should maintain message order across platforms", async () => {
      const conversationId = "conv1";
      const mockMessages = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "First message",
          type: "text" as const,
          createdAt: 1000,
        },
        {
          _id: "msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Second message",
          type: "text" as const,
          createdAt: 2000,
        },
        {
          _id: "msg3",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Third message",
          type: "text" as const,
          createdAt: 3000,
        },
      ];

      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      } as Response);

      const messages = await messagingService.getMessages(conversationId);

      // Verify messages are in chronological order
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].createdAt).toBeGreaterThan(
          messages[i - 1].createdAt
        );
      }
    });

    it("should sync read status across platforms", async () => {
      const conversationId = "conv1";
      const messageId = "msg1";

      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      let readReceiptReceived = false;
      realtimeService.on("message:read", (msgId, userId) => {
        expect(msgId).toBe(messageId);
        expect(userId).toBe("user1");
        readReceiptReceived = true;
      });

      realtimeService.connect(conversationId);

      // Mark message as read
      await messagingService.markConversationAsRead(conversationId);

      // Simulate receiving read receipt
      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      messageHandler({
        data: JSON.stringify({
          type: "message:read",
          messageId,
          readByUserId: "user1",
        }),
      });

      expect(readReceiptReceived).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/messages/read",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ conversationId }),
        })
      );
    });
  });

  describe("Offline/Online Transition Scenarios", () => {
    it("should queue messages when offline", async () => {
      const mockUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };
      const mockMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Offline message",
        type: "text" as const,
      };

      // Simulate network error (offline)
      jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      // Message should be queued
      await expect(
        messagingService.sendMessage(mockUser, mockMessage)
      ).rejects.toThrow("Network error");

      // Verify message was added to offline queue
      const queuedMessages = messagingService.getOfflineQueue();
      expect(queuedMessages).toHaveLength(1);
      expect(queuedMessages[0]).toMatchObject(mockMessage);
    });

    it("should send queued messages when back online", async () => {
      const mockUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };
      const queuedMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Queued message",
        type: "text" as const,
      };

      // Add message to offline queue
      messagingService.addToOfflineQueue(queuedMessage);

      // Mock successful API response when back online
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            _id: "msg1",
            ...queuedMessage,
            createdAt: Date.now(),
          }),
      } as Response);

      // Process offline queue
      await messagingService.processOfflineQueue();

      // Verify queue is empty
      const queuedMessages = messagingService.getOfflineQueue();
      expect(queuedMessages).toHaveLength(0);

      // Verify API was called
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/match-messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(queuedMessage),
        })
      );
    });

    it("should sync missed messages when reconnecting", async () => {
      const conversationId = "conv1";
      const lastSyncTime = Date.now() - 60000; // 1 minute ago
      const missedMessages = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Missed message 1",
          type: "text" as const,
          createdAt: Date.now() - 30000,
        },
        {
          _id: "msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Missed message 2",
          type: "text" as const,
          createdAt: Date.now() - 15000,
        },
      ];

      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(missedMessages),
      } as Response);

      const syncedMessages = await messagingService.syncMissedMessages(
        conversationId,
        lastSyncTime
      );

      expect(syncedMessages).toEqual(missedMessages);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/match-messages?conversationId=${conversationId}&after=${lastSyncTime}`,
        expect.objectContaining({
          method: "GET",
        })
      );
    });
  });

  describe("Message Caching and Performance", () => {
    it("should cache messages for improved performance", async () => {
      const conversationId = "conv1";
      const mockMessages = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Cached message",
          type: "text" as const,
          createdAt: Date.now(),
        },
      ];

      // First call - should fetch from API
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMessages),
      } as Response);

      const messages1 = await messagingService.getMessages(conversationId);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const messages2 = await messagingService.getMessages(conversationId);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, not 2

      expect(messages1).toEqual(messages2);
    });

    it("should update cache when new messages arrive", () => {
      const conversationId = "conv1";
      const existingMessage = {
        _id: "msg1",
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "Existing message",
        type: "text" as const,
        createdAt: Date.now() - 1000,
      };

      const newMessage = {
        _id: "msg2",
        conversationId,
        fromUserId: "user2",
        toUserId: "user1",
        text: "New message",
        type: "text" as const,
        createdAt: Date.now(),
      };

      // Set initial cache
      messageCache.setMessages(conversationId, [existingMessage]);

      // Add new message
      messageCache.addMessage(conversationId, newMessage);

      const cachedMessages = messageCache.getMessages(conversationId);
      expect(cachedMessages).toHaveLength(2);
      expect(cachedMessages).toContain(existingMessage);
      expect(cachedMessages).toContain(newMessage);
    });

    it("should implement LRU eviction for cache", () => {
      const conversationId = "conv1";
      const maxCacheSize = 3;

      // Create cache with small size for testing
      const smallCache = new MessageCache(maxCacheSize);

      const messages = Array.from({ length: 5 }, (_, i) => ({
        _id: `msg${i + 1}`,
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: `Message ${i + 1}`,
        type: "text" as const,
        createdAt: Date.now() + i,
      }));

      // Add all messages
      messages.forEach((msg) => smallCache.addMessage(conversationId, msg));

      const cachedMessages = smallCache.getMessages(conversationId);

      // Should only keep the last 3 messages
      expect(cachedMessages).toHaveLength(maxCacheSize);
      expect(cachedMessages[0]._id).toBe("msg3");
      expect(cachedMessages[1]._id).toBe("msg4");
      expect(cachedMessages[2]._id).toBe("msg5");
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should retry failed requests with exponential backoff", async () => {
      const mockUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };
      const mockMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Retry message",
        type: "text" as const,
      };

      let callCount = 0;
      jest.spyOn(global, "fetch").mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              _id: "msg1",
              ...mockMessage,
              createdAt: Date.now(),
            }),
        } as Response);
      });

      const result = await messagingService.sendMessageWithRetry(
        mockUser,
        mockMessage,
        { maxRetries: 3, backoffMs: 100 }
      );

      expect(callCount).toBe(3);
      expect(result).toBeDefined();
    });

    it("should handle WebSocket reconnection", async () => {
      let connectionCount = 0;
      const mockWebSocketConstructor = jest.fn().mockImplementation(() => {
        connectionCount++;
        return {
          send: jest.fn(),
          close: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          readyState: WebSocket.OPEN,
        };
      });

      global.WebSocket = mockWebSocketConstructor;

      realtimeService.connect("conv1");
      expect(connectionCount).toBe(1);

      // Simulate connection loss and reconnection
      realtimeService.reconnect();
      expect(connectionCount).toBe(2);
    });

    it("should gracefully handle malformed WebSocket messages", () => {
      let errorHandled = false;
      realtimeService.on("error", () => {
        errorHandled = true;
      });

      realtimeService.connect("conv1");

      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Send malformed JSON
      messageHandler({
        data: "invalid json",
      });

      expect(errorHandled).toBe(true);
    });
  });

  describe("Subscription Integration", () => {
    it("should enforce feature gates during message flow", async () => {
      const freeUser = {
        id: "user1",
        subscriptionTier: "free" as SubscriptionTier,
      };
      const voiceMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "voice" as const,
        duration: 30,
      };

      await expect(
        messagingService.sendMessage(freeUser, voiceMessage)
      ).rejects.toThrow("Upgrade to Premium to send voice messages");
    });

    it("should allow premium users to send voice messages", async () => {
      const premiumUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };
      const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });

      const mockUploadResponse = {
        uploadUrl: "https://storage.example.com/upload",
        storageId: "audio123",
      };

      const mockMessage = {
        _id: "msg1",
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "voice" as const,
        audioStorageId: "audio123",
        duration: 30,
        createdAt: Date.now(),
      };

      voiceMessageManager["apiClient"].generateVoiceUploadUrl.mockResolvedValue(
        mockUploadResponse
      );
      voiceMessageManager["apiClient"].sendMessage.mockResolvedValue(
        mockMessage
      );

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const result = await voiceMessageManager.uploadVoiceMessage(
        mockBlob,
        "conv1",
        "user1",
        "user2",
        30
      );

      expect(result).toEqual(mockMessage);
    });
  });
});
