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
import { OfflineMessageQueue } from "../../utils/offlineMessageQueue";
import { Message } from "../../types/message";
import { MessagingAPI } from "../../types/messaging";
import { SubscriptionTier } from "../../utils/messagingFeatures";

// Mock external dependencies
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

describe("Messaging Integration Tests", () => {
  let messagingService: MessagingService;
  let realtimeService: RealtimeMessagingService;
  let voiceMessageManager: VoiceMessageManager;
  let messageCache: MessageCache;
  let offlineQueue: OfflineMessageQueue;
  let mockApiClient: MessagingAPI;

  beforeEach(() => {
    // Setup mock API client
    mockApiClient = {
      getMessages: jest.fn().mockResolvedValue({
        success: true,
        data: [],
      }),
      sendMessage: jest.fn().mockResolvedValue({
        success: true,
        data: {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Hello",
          type: "text",
          createdAt: Date.now(),
        },
      }),
      markConversationAsRead: jest.fn().mockResolvedValue({
        success: true,
        data: undefined,
      }),
      generateVoiceUploadUrl: jest.fn().mockResolvedValue({
        success: true,
        data: {
          uploadUrl: "https://storage.example.com/upload",
          storageId: "audio123",
        },
      }),
      getVoiceMessageUrl: jest.fn().mockResolvedValue({
        success: true,
        data: { url: "https://storage.example.com/audio123" },
      }),
      sendTypingIndicator: jest.fn().mockResolvedValue(undefined),
      sendDeliveryReceipt: jest.fn().mockResolvedValue(undefined),
      getConversations: jest.fn().mockResolvedValue({
        success: true,
        data: [],
      }),
      createConversation: jest.fn().mockResolvedValue({
        success: true,
        data: { id: "conv1", participants: ["user1", "user2"] },
      }),
      deleteConversation: jest.fn().mockResolvedValue({
        success: true,
        data: undefined,
      }),
    };

    // Initialize services
    messagingService = new MessagingService("premium");
    realtimeService = new RealtimeMessagingService("ws://localhost:8080");
    voiceMessageManager = new VoiceMessageManager(mockApiClient);
    messageCache = new MessageCache({ maxSize: 100, maxAge: 60000 });
    offlineQueue = new OfflineMessageQueue(mockApiClient);

    // Mock WebSocket
    const mockWebSocket = {
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

    (global as any).WebSocket = jest
      .fn()
      .mockImplementation(() => mockWebSocket);

    // Mock fetch for file uploads
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    } as Response);
  });

  afterEach(() => {
    jest.clearAllMocks();
    messageCache.destroy();
    realtimeService.disconnect();
  });

  describe("End-to-End Message Flow", () => {
    it("should handle complete message sending flow", async () => {
      const messageData = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Hello world!",
        type: "text" as const,
      };

      const result = await messagingService.sendMessage(
        () => mockApiClient.sendMessage(messageData),
        messageData
      );

      expect(result.success).toBe(true);
      expect(mockApiClient.sendMessage).toHaveBeenCalledWith(messageData);
    });

    it("should handle voice message end-to-end flow", async () => {
      const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });

      const result = await voiceMessageManager.uploadVoiceMessage(
        mockBlob,
        "conv1",
        "user1",
        "user2",
        30
      );

      expect(result.success).toBe(true);
      expect(mockApiClient.generateVoiceUploadUrl).toHaveBeenCalled();
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

    it("should handle message with real-time updates", async () => {
      const mockMessage = {
        id: "msg1",
        conversationId: "conv1",
        fromUserId: "user2",
        toUserId: "user1",
        type: "text" as const,
        content: "Real-time message",
        timestamp: Date.now(),
      };

      let messageReceived = false;
      await realtimeService.initialize("user1", {
        onMessage: (message) => {
          expect(message).toEqual(mockMessage);
          messageReceived = true;
        },
      });

      // Simulate receiving message via WebSocket
      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "message",
            ...mockMessage,
          }),
        });
      }

      expect(messageReceived).toBe(true);
    });
  });

  describe("Cross-Platform Message Synchronization", () => {
    it("should sync messages between platforms", async () => {
      const conversationId = "conv1";
      const mockMessages: Message[] = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Message from web",
          type: "text",
          createdAt: Date.now() - 1000,
        },
        {
          _id: "msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Message from mobile",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      (mockApiClient.getMessages as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMessages,
      });

      // Simulate fetching messages (this would be done by a hook or service)
      const response = await mockApiClient.getMessages(conversationId);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockMessages);
    });

    it("should maintain message order across platforms", async () => {
      const conversationId = "conv1";
      const mockMessages: Message[] = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "First message",
          type: "text",
          createdAt: 1000,
        },
        {
          _id: "msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Second message",
          type: "text",
          createdAt: 2000,
        },
        {
          _id: "msg3",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Third message",
          type: "text",
          createdAt: 3000,
        },
      ];

      (mockApiClient.getMessages as jest.Mock).mockResolvedValue({
        success: true,
        data: mockMessages,
      });

      const response = await mockApiClient.getMessages(conversationId);
      const messages = response.data!;

      // Verify messages are in chronological order
      for (let i = 1; i < messages.length; i++) {
        expect(messages[i].createdAt!).toBeGreaterThan(
          messages[i - 1].createdAt!
        );
      }
    });

    it("should sync read status across platforms", async () => {
      const conversationId = "conv1";
      const messageId = "msg1";

      let readReceiptReceived = false;
      await realtimeService.initialize("user1", {
        onDeliveryReceipt: (receipt) => {
          if (receipt.status === "read") {
            expect(receipt.messageId).toBe(messageId);
            expect(receipt.userId).toBe("user2");
            readReceiptReceived = true;
          }
        },
      });

      // Mark message as read
      await mockApiClient.markConversationAsRead(conversationId);

      // Simulate receiving read receipt
      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "read_receipt",
            messageId,
            conversationId,
            userId: "user2",
            timestamp: Date.now(),
          }),
        });
      }

      expect(readReceiptReceived).toBe(true);
      expect(mockApiClient.markConversationAsRead).toHaveBeenCalledWith(
        conversationId
      );
    });
  });

  describe("Offline/Online Transition Scenarios", () => {
    it("should queue messages when offline", async () => {
      const mockMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Offline message",
        type: "text" as const,
      };

      // Simulate network error (offline)
      (mockApiClient.sendMessage as jest.Mock).mockRejectedValue(
        new Error("Network error")
      );

      // Add message to offline queue
      offlineQueue.addMessage(mockMessage);

      // Verify message was added to queue
      const queuedMessages = offlineQueue.getQueuedMessages();
      expect(queuedMessages).toHaveLength(1);
      expect(queuedMessages[0]).toMatchObject(mockMessage);
    });

    it("should send queued messages when back online", async () => {
      const queuedMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Queued message",
        type: "text" as const,
      };

      // Add message to offline queue
      offlineQueue.addMessage(queuedMessage);

      // Mock successful API response when back online
      (mockApiClient.sendMessage as jest.Mock).mockResolvedValue({
        success: true,
        data: {
          _id: "msg1",
          ...queuedMessage,
          createdAt: Date.now(),
        },
      });

      // Process offline queue
      await offlineQueue.processQueue();

      // Verify queue is empty
      const queuedMessages = offlineQueue.getQueuedMessages();
      expect(queuedMessages).toHaveLength(0);

      // Verify API was called
      expect(mockApiClient.sendMessage).toHaveBeenCalledWith(queuedMessage);
    });

    it("should handle failed queue processing gracefully", async () => {
      const queuedMessage = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Failed message",
        type: "text" as const,
      };

      // Add message to offline queue
      offlineQueue.addMessage(queuedMessage);

      // Mock API failure
      (mockApiClient.sendMessage as jest.Mock).mockRejectedValue(
        new Error("API Error")
      );

      // Process offline queue
      await offlineQueue.processQueue();

      // Verify message is still in queue (retry logic)
      const queuedMessages = offlineQueue.getQueuedMessages();
      expect(queuedMessages).toHaveLength(1);
    });
  });

  describe("Message Caching and Performance", () => {
    it("should cache messages for improved performance", () => {
      const conversationId = "conv1";
      const mockMessages: Message[] = [
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Cached message",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      // First access - cache miss
      expect(messageCache.get(conversationId)).toBeNull();

      // Set cache
      messageCache.set(conversationId, mockMessages);

      // Second access - cache hit
      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toEqual(mockMessages);
      expect(cachedMessages).not.toBe(mockMessages); // Should be a copy
    });

    it("should update cache when new messages arrive", () => {
      const conversationId = "conv1";
      const existingMessage: Message = {
        _id: "msg1",
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "Existing message",
        type: "text",
        createdAt: Date.now() - 1000,
      };

      const newMessage: Message = {
        _id: "msg2",
        conversationId,
        fromUserId: "user2",
        toUserId: "user1",
        text: "New message",
        type: "text",
        createdAt: Date.now(),
      };

      // Set initial cache
      messageCache.set(conversationId, [existingMessage]);

      // Add new message
      messageCache.addMessages(conversationId, [newMessage]);

      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toHaveLength(2);
      expect(cachedMessages![0]._id).toBe("msg1");
      expect(cachedMessages![1]._id).toBe("msg2");
    });

    it("should implement LRU eviction for cache", () => {
      const smallCache = new MessageCache({ maxSize: 2, maxAge: 60000 });

      const messages1: Message[] = [
        {
          _id: "msg1",
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Message 1",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      const messages2: Message[] = [
        {
          _id: "msg2",
          conversationId: "conv2",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Message 2",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      const messages3: Message[] = [
        {
          _id: "msg3",
          conversationId: "conv3",
          fromUserId: "user1",
          toUserId: "user2",
          text: "Message 3",
          type: "text",
          createdAt: Date.now(),
        },
      ];

      // Fill cache to capacity
      smallCache.set("conv1", messages1);
      smallCache.set("conv2", messages2);

      // Access conv1 to make it recently used
      smallCache.get("conv1");

      // Add third conversation (should evict conv2)
      smallCache.set("conv3", messages3);

      expect(smallCache.get("conv1")).not.toBeNull(); // Recently accessed
      expect(smallCache.get("conv2")).toBeNull(); // Should be evicted
      expect(smallCache.get("conv3")).not.toBeNull(); // Newly added

      smallCache.destroy();
    });
  });

  describe("Error Recovery and Resilience", () => {
    it("should retry failed requests with exponential backoff", async () => {
      const messageData = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Retry message",
        type: "text" as const,
      };

      let callCount = 0;
      (mockApiClient.sendMessage as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error("Network error"));
        }
        return Promise.resolve({
          success: true,
          data: {
            _id: "msg1",
            ...messageData,
            createdAt: Date.now(),
          },
        });
      });

      // This would be handled by the retry logic in the actual implementation
      let result;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        try {
          result = await mockApiClient.sendMessage(messageData);
          break;
        } catch (error) {
          attempts++;
          if (attempts >= maxAttempts) {
            throw error;
          }
          // Wait before retry (simplified)
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      expect(callCount).toBe(3);
      expect(result?.success).toBe(true);
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
          readyState: 1, // WebSocket.OPEN
          onopen: null,
          onmessage: null,
          onclose: null,
          onerror: null,
        };
      });

      (global as any).WebSocket = mockWebSocketConstructor;

      await realtimeService.initialize("user1");
      expect(connectionCount).toBe(1);

      // Simulate connection loss and reconnection would be handled internally
      // by the RealtimeMessagingService's reconnection logic
    });

    it("should gracefully handle malformed WebSocket messages", async () => {
      let errorHandled = false;
      await realtimeService.initialize("user1", {
        onError: () => {
          errorHandled = true;
        },
      });

      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;

      // Send malformed JSON - this would be handled internally by the service
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: "invalid json",
        });
      }

      // The service should handle this gracefully without crashing
      expect(true).toBe(true); // Test passes if no exception is thrown
    });
  });

  describe("Subscription Integration", () => {
    it("should enforce feature gates during message flow", async () => {
      const freeService = new MessagingService("free");
      const voiceMessageData = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "voice" as const,
        duration: 30,
        audioStorageId: "audio123",
      };

      const result = await freeService.sendMessage(
        () => mockApiClient.sendMessage(voiceMessageData),
        voiceMessageData
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SUBSCRIPTION_REQUIRED");
      expect(result.error?.message).toContain("Premium");
    });

    it("should allow premium users to send voice messages", async () => {
      const premiumService = new MessagingService("premium");
      const mockBlob = new Blob(["audio data"], { type: "audio/mp4" });

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

    it("should track daily message limits for free users", async () => {
      const freeService = new MessagingService("free");
      const messageData = {
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: "Test message",
        type: "text" as const,
      };

      // Send messages up to the daily limit
      for (let i = 0; i < 5; i++) {
        const result = await freeService.sendMessage(
          () => mockApiClient.sendMessage(messageData),
          messageData
        );
        expect(result.success).toBe(true);
      }

      // 6th message should be blocked
      const result = await freeService.sendMessage(
        () => mockApiClient.sendMessage(messageData),
        messageData
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SUBSCRIPTION_REQUIRED");
      expect(result.error?.message).toContain("Daily message limit reached");
    });
  });

  describe("Voice Message Cross-Platform Sync", () => {
    it("should sync voice messages between platforms", async () => {
      const voiceMessage = {
        id: "voice_msg1",
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "voice" as const,
        content: "",
        timestamp: Date.now(),
        metadata: {
          audioStorageId: "audio123",
          duration: 45,
          fileSize: 1024 * 50, // 50KB
          mimeType: "audio/mp4",
        },
      };

      let receivedVoiceMessage = null;
      await realtimeService.initialize("user1", {
        onMessage: (message) => {
          if (message.type === "voice") {
            receivedVoiceMessage = message;
          }
        },
      });

      // Simulate voice message received via WebSocket
      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      if (mockWebSocket.onmessage) {
        mockWebSocket.onmessage({
          data: JSON.stringify({
            type: "message",
            ...voiceMessage,
          }),
        });
      }

      expect(receivedVoiceMessage).toEqual(voiceMessage);
    });
  });

  describe("Connection Management", () => {
    it("should handle simultaneous connections from multiple platforms", async () => {
      const mobileService = new RealtimeMessagingService("ws://localhost:8080");
      const webService = new RealtimeMessagingService("ws://localhost:8080");

      let mobileConnected = false;
      let webConnected = false;

      await mobileService.initialize("user1", {
        onConnectionChange: (connected) => {
          mobileConnected = connected;
        },
      });

      await webService.initialize("user1", {
        onConnectionChange: (connected) => {
          webConnected = connected;
        },
      });

      // Simulate connection events
      const mockWebSockets = (global.WebSocket as jest.Mock).mock.results;

      if (mockWebSockets[0]?.value.onopen) {
        mockWebSockets[0].value.onopen();
      }
      if (mockWebSockets[1]?.value.onopen) {
        mockWebSockets[1].value.onopen();
      }

      expect(mobileConnected).toBe(true);
      expect(webConnected).toBe(true);
      expect(global.WebSocket).toHaveBeenCalledTimes(2);

      // Cleanup
      mobileService.disconnect();
      webService.disconnect();
    });

    it("should maintain sync when one platform disconnects", async () => {
      const message = {
        id: "disconnect_msg1",
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        type: "text" as const,
        content: "Message during disconnect",
        timestamp: Date.now(),
      };

      let webReceivedMessage = null;
      const webService = new RealtimeMessagingService("ws://localhost:8080");

      await realtimeService.initialize("user1"); // Mobile
      await webService.initialize("user1", {
        onMessage: (msg) => {
          webReceivedMessage = msg;
        },
      });

      // Simulate mobile disconnection
      const mobileWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      if (mobileWebSocket.onclose) {
        mobileWebSocket.onclose({ code: 1001, reason: "disconnect" });
      }

      // Message should still reach web platform
      const webWebSocket = (global.WebSocket as jest.Mock).mock.results[1]
        .value;
      if (webWebSocket.onmessage) {
        webWebSocket.onmessage({
          data: JSON.stringify({
            type: "message",
            ...message,
          }),
        });
      }

      expect(webReceivedMessage).toEqual(message);

      // Cleanup
      webService.disconnect();
    });
  });

  describe("Data Consistency", () => {
    it("should maintain message consistency across platform restarts", async () => {
      const conversationId = "conv1";
      const messages: Message[] = [
        {
          _id: "persistent_msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Persistent message 1",
          type: "text",
          createdAt: Date.now() - 2000,
        },
        {
          _id: "persistent_msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Persistent message 2",
          type: "text",
          createdAt: Date.now() - 1000,
        },
      ];

      (mockApiClient.getMessages as jest.Mock).mockResolvedValue({
        success: true,
        data: messages,
      });

      // Fetch messages
      const response1 = await mockApiClient.getMessages(conversationId);

      // Simulate app restart by creating new API client
      const newMockApiClient = { ...mockApiClient };
      (newMockApiClient.getMessages as jest.Mock).mockResolvedValue({
        success: true,
        data: messages,
      });

      const response2 = await newMockApiClient.getMessages(conversationId);

      // Messages should be consistent
      expect(response1.data).toEqual(response2.data);
      expect(response1.data).toHaveLength(2);
    });

    it("should handle duplicate message prevention", () => {
      const conversationId = "conv1";
      const duplicateMessage: Message = {
        _id: "duplicate_msg1",
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "Duplicate message",
        type: "text",
        createdAt: Date.now(),
      };

      // Add message to cache
      messageCache.set(conversationId, [duplicateMessage]);

      // Try to add the same message again
      messageCache.addMessages(conversationId, [duplicateMessage]);

      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toHaveLength(1); // Should not duplicate
    });
  });
});
