import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { MessageCache } from "../../utils/MessageCache";
import { MessagingService } from "../../services/messagingService";
import { VoiceMessageManager } from "../../services/voiceMessageManager";
import { RealtimeMessagingService } from "../../services/RealtimeMessagingService";
import { Message, SubscriptionTier } from "../../types/messaging";

describe("Messaging Performance Tests", () => {
  let messageCache: MessageCache;
  let messagingService: MessagingService;
  let voiceMessageManager: VoiceMessageManager;
  let realtimeService: RealtimeMessagingService;

  beforeEach(() => {
    messageCache = new MessageCache();
    messagingService = new MessagingService();
    voiceMessageManager = new VoiceMessageManager({
      generateVoiceUploadUrl: jest.fn(),
      sendMessage: jest.fn(),
      getVoiceMessageUrl: jest.fn(),
    });
    realtimeService = new RealtimeMessagingService("test-token");

    // Mock WebSocket
    global.WebSocket = jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN,
    }));

    // Mock performance API
    global.performance = {
      now: jest.fn(() => Date.now()),
      mark: jest.fn(),
      measure: jest.fn(),
      getEntriesByName: jest.fn(() => []),
      getEntriesByType: jest.fn(() => []),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Message Cache Performance", () => {
    it("should handle large message sets efficiently", () => {
      const conversationId = "conv1";
      const messageCount = 10000;
      const messages: Message[] = [];

      // Generate large message set
      for (let i = 0; i < messageCount; i++) {
        messages.push({
          _id: `msg${i}`,
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: `Message ${i}`,
          type: "text",
          createdAt: Date.now() + i,
        });
      }

      const startTime = performance.now();
      messageCache.setMessages(conversationId, messages);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms

      const cachedMessages = messageCache.getMessages(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBeLessThanOrEqual(1000); // Cache limit
    });

    it("should efficiently add messages to existing cache", () => {
      const conversationId = "conv1";
      const initialMessages: Message[] = Array.from(
        { length: 500 },
        (_, i) => ({
          _id: `msg${i}`,
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: `Initial message ${i}`,
          type: "text",
          createdAt: Date.now() + i,
        })
      );

      messageCache.setMessages(conversationId, initialMessages);

      const newMessages: Message[] = Array.from({ length: 100 }, (_, i) => ({
        _id: `new_msg${i}`,
        conversationId,
        fromUserId: "user2",
        toUserId: "user1",
        text: `New message ${i}`,
        type: "text",
        createdAt: Date.now() + 1000 + i,
      }));

      const startTime = performance.now();
      newMessages.forEach((msg) =>
        messageCache.addMessage(conversationId, msg)
      );
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms

      const cachedMessages = messageCache.getMessages(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBeLessThanOrEqual(1000);
    });

    it("should handle concurrent cache operations", async () => {
      const conversationId = "conv1";
      const operationCount = 100;
      const operations: Promise<void>[] = [];

      for (let i = 0; i < operationCount; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              messageCache.addMessage(conversationId, {
                _id: `concurrent_msg${i}`,
                conversationId,
                fromUserId: "user1",
                toUserId: "user2",
                text: `Concurrent message ${i}`,
                type: "text",
                createdAt: Date.now() + i,
              });
              resolve();
            }, Math.random() * 10);
          })
        );
      }

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second

      const cachedMessages = messageCache.getMessages(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBeGreaterThan(0);
    });
  });

  describe("API Performance", () => {
    it("should handle rapid message sending efficiently", async () => {
      const mockUser = {
        id: "user1",
        subscriptionTier: "premium" as SubscriptionTier,
      };

      const messageCount = 50;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: `Rapid message ${i}`,
        type: "text" as const,
      }));

      // Mock API responses
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              _id: `msg${Math.random()}`,
              createdAt: Date.now(),
            }),
        } as Response)
      );

      const startTime = performance.now();
      const promises = messages.map((msg) =>
        messagingService.sendMessage(mockUser, msg)
      );
      await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / messageCount;

      expect(avgDuration).toBeLessThan(100); // Average under 100ms per message
      expect(global.fetch).toHaveBeenCalledTimes(messageCount);
    });

    it("should efficiently batch message retrieval", async () => {
      const conversationIds = Array.from({ length: 10 }, (_, i) => `conv${i}`);
      const messagesPerConversation = 100;

      // Mock API responses
      jest.spyOn(global, "fetch").mockImplementation((url) => {
        const conversationId = new URL(url as string).searchParams.get(
          "conversationId"
        );
        const messages = Array.from(
          { length: messagesPerConversation },
          (_, i) => ({
            _id: `msg${i}`,
            conversationId,
            fromUserId: "user1",
            toUserId: "user2",
            text: `Message ${i}`,
            type: "text",
            createdAt: Date.now() + i,
          })
        );
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(messages),
        } as Response);
      });

      const startTime = performance.now();
      const promises = conversationIds.map((id) =>
        messagingService.getMessages(id)
      );
      await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / conversationIds.length;

      expect(avgDuration).toBeLessThan(200); // Average under 200ms per conversation
      expect(global.fetch).toHaveBeenCalledTimes(conversationIds.length);
    });
  });

  describe("Voice Message Performance", () => {
    it("should handle voice message upload efficiently", async () => {
      const audioSizes = [
        1024, // 1KB
        10 * 1024, // 10KB
        100 * 1024, // 100KB
        1024 * 1024, // 1MB
        5 * 1024 * 1024, // 5MB
      ];

      const uploadTimes: number[] = [];

      for (const size of audioSizes) {
        const mockBlob = new Blob([new Array(size).fill("a").join("")], {
          type: "audio/mp4",
        });

        const mockUploadResponse = {
          uploadUrl: "https://storage.example.com/upload",
          storageId: `audio${size}`,
        };

        voiceMessageManager[
          "apiClient"
        ].generateVoiceUploadUrl.mockResolvedValue(mockUploadResponse);
        voiceMessageManager["apiClient"].sendMessage.mockResolvedValue({
          _id: `msg${size}`,
          conversationId: "conv1",
          fromUserId: "user1",
          toUserId: "user2",
          type: "voice",
          audioStorageId: mockUploadResponse.storageId,
          duration: 30,
          createdAt: Date.now(),
        });

        global.fetch = jest.fn().mockResolvedValue({
          ok: true,
          status: 200,
        });

        const startTime = performance.now();
        await voiceMessageManager.uploadVoiceMessage(
          mockBlob,
          "conv1",
          "user1",
          "user2",
          30
        );
        const endTime = performance.now();

        uploadTimes.push(endTime - startTime);
      }

      // Verify upload times scale reasonably with file size
      for (let i = 1; i < uploadTimes.length; i++) {
        const ratio = uploadTimes[i] / uploadTimes[i - 1];
        expect(ratio).toBeLessThan(10); // Should not increase by more than 10x
      }

      // Largest file should still complete in reasonable time
      expect(uploadTimes[uploadTimes.length - 1]).toBeLessThan(5000); // Under 5 seconds
    });

    it("should efficiently cache voice message URLs", async () => {
      const storageIds = Array.from({ length: 100 }, (_, i) => `audio${i}`);
      const mockUrl = "https://storage.example.com/audio";

      voiceMessageManager["apiClient"].getVoiceMessageUrl.mockResolvedValue({
        url: mockUrl,
      });

      // First batch - should make API calls
      const startTime1 = performance.now();
      const promises1 = storageIds.map((id) =>
        voiceMessageManager.getPlaybackUrl(id)
      );
      await Promise.all(promises1);
      const endTime1 = performance.now();

      const firstBatchDuration = endTime1 - startTime1;

      // Second batch - should use cache
      const startTime2 = performance.now();
      const promises2 = storageIds.map((id) =>
        voiceMessageManager.getPlaybackUrl(id)
      );
      await Promise.all(promises2);
      const endTime2 = performance.now();

      const secondBatchDuration = endTime2 - startTime2;

      // Cached calls should be significantly faster
      expect(secondBatchDuration).toBeLessThan(firstBatchDuration / 5);
      expect(
        voiceMessageManager["apiClient"].getVoiceMessageUrl
      ).toHaveBeenCalledTimes(storageIds.length); // Only called once per ID
    });
  });

  describe("Real-time Performance", () => {
    it("should handle high-frequency WebSocket messages", () => {
      const messageCount = 1000;
      const messages: Message[] = [];
      let receivedCount = 0;

      realtimeService.on("message:new", (message) => {
        receivedCount++;
        messages.push(message);
      });

      realtimeService.connect("conv1");

      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      const startTime = performance.now();

      // Simulate rapid message arrival
      for (let i = 0; i < messageCount; i++) {
        messageHandler({
          data: JSON.stringify({
            type: "message:new",
            message: {
              _id: `msg${i}`,
              conversationId: "conv1",
              fromUserId: "user2",
              toUserId: "user1",
              text: `High frequency message ${i}`,
              type: "text",
              createdAt: Date.now() + i,
            },
          }),
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(receivedCount).toBe(messageCount);
      expect(duration).toBeLessThan(1000); // Should process 1000 messages in under 1 second
      expect(duration / messageCount).toBeLessThan(1); // Under 1ms per message
    });

    it("should efficiently handle typing indicators", () => {
      const userCount = 50;
      const typingEvents: Array<{ userId: string; action: "start" | "stop" }> =
        [];

      realtimeService.on("typing:start", (conversationId, userId) => {
        typingEvents.push({ userId, action: "start" });
      });

      realtimeService.on("typing:stop", (conversationId, userId) => {
        typingEvents.push({ userId, action: "stop" });
      });

      realtimeService.connect("conv1");

      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;
      const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      const startTime = performance.now();

      // Simulate rapid typing events
      for (let i = 0; i < userCount; i++) {
        messageHandler({
          data: JSON.stringify({
            type: "typing:start",
            conversationId: "conv1",
            userId: `user${i}`,
          }),
        });

        messageHandler({
          data: JSON.stringify({
            type: "typing:stop",
            conversationId: "conv1",
            userId: `user${i}`,
          }),
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(typingEvents).toHaveLength(userCount * 2);
      expect(duration).toBeLessThan(100); // Should process all events in under 100ms
    });

    it("should maintain performance with multiple concurrent connections", () => {
      const connectionCount = 10;
      const services: RealtimeMessagingService[] = [];

      const startTime = performance.now();

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const service = new RealtimeMessagingService(`token${i}`);
        service.connect(`conv${i}`);
        services.push(service);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should establish all connections in under 500ms
      expect(global.WebSocket).toHaveBeenCalledTimes(connectionCount);

      // Cleanup
      services.forEach((service) => service.disconnect());
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory with repeated operations", () => {
      const conversationId = "conv1";
      const iterations = 1000;

      // Simulate repeated cache operations
      for (let i = 0; i < iterations; i++) {
        const message: Message = {
          _id: `msg${i}`,
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: `Memory test message ${i}`,
          type: "text",
          createdAt: Date.now() + i,
        };

        messageCache.addMessage(conversationId, message);

        // Periodically clear old messages to simulate real usage
        if (i % 100 === 0) {
          messageCache.clearOldMessages(conversationId, Date.now() - 60000);
        }
      }

      const cachedMessages = messageCache.getMessages(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBeLessThanOrEqual(1000); // Should respect cache limits
    });

    it("should efficiently clean up WebSocket resources", () => {
      const connectionCount = 20;
      const services: RealtimeMessagingService[] = [];

      // Create and immediately disconnect multiple services
      for (let i = 0; i < connectionCount; i++) {
        const service = new RealtimeMessagingService(`token${i}`);
        service.connect(`conv${i}`);
        services.push(service);
      }

      // Disconnect all services
      services.forEach((service) => service.disconnect());

      // Verify cleanup
      const mockWebSockets = (global.WebSocket as jest.Mock).mock.results;
      mockWebSockets.forEach((result) => {
        expect(result.value.close).toHaveBeenCalled();
      });
    });
  });

  describe("Stress Testing", () => {
    it("should handle extreme message volumes", async () => {
      const conversationCount = 100;
      const messagesPerConversation = 1000;
      const totalMessages = conversationCount * messagesPerConversation;

      const startTime = performance.now();

      // Generate and cache large number of messages
      for (let convId = 0; convId < conversationCount; convId++) {
        const messages: Message[] = [];
        for (let msgId = 0; msgId < messagesPerConversation; msgId++) {
          messages.push({
            _id: `msg${convId}_${msgId}`,
            conversationId: `conv${convId}`,
            fromUserId: "user1",
            toUserId: "user2",
            text: `Stress test message ${msgId}`,
            type: "text",
            createdAt: Date.now() + msgId,
          });
        }
        messageCache.setMessages(`conv${convId}`, messages);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should handle extreme load in under 5 seconds
      expect(duration / totalMessages).toBeLessThan(0.01); // Under 0.01ms per message

      // Verify cache integrity
      for (let convId = 0; convId < Math.min(conversationCount, 10); convId++) {
        const cachedMessages = messageCache.getMessages(`conv${convId}`);
        expect(cachedMessages).toBeDefined();
        expect(cachedMessages!.length).toBeGreaterThan(0);
      }
    });

    it("should maintain responsiveness under load", async () => {
      const operationCount = 10000;
      const operations: Promise<any>[] = [];

      // Mix of different operations
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 4;

        switch (operationType) {
          case 0: // Cache operation
            operations.push(
              Promise.resolve().then(() => {
                messageCache.addMessage(`conv${i % 10}`, {
                  _id: `stress_msg${i}`,
                  conversationId: `conv${i % 10}`,
                  fromUserId: "user1",
                  toUserId: "user2",
                  text: `Stress message ${i}`,
                  type: "text",
                  createdAt: Date.now() + i,
                });
              })
            );
            break;
          case 1: // API simulation
            operations.push(
              new Promise((resolve) => {
                setTimeout(
                  () => resolve(`api_result_${i}`),
                  Math.random() * 10
                );
              })
            );
            break;
          case 2: // WebSocket simulation
            operations.push(
              Promise.resolve().then(() => {
                realtimeService.sendTypingIndicator(
                  `conv${i % 10}`,
                  i % 2 === 0 ? "start" : "stop"
                );
              })
            );
            break;
          case 3: // Voice message simulation
            operations.push(
              Promise.resolve().then(() => {
                const mockBlob = new Blob([`audio${i}`], { type: "audio/mp4" });
                return mockBlob.size;
              })
            );
            break;
        }
      }

      const startTime = performance.now();
      await Promise.all(operations);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / operationCount;

      expect(avgDuration).toBeLessThan(1); // Average under 1ms per operation
      expect(duration).toBeLessThan(10000); // Total under 10 seconds
    });
  });
});
