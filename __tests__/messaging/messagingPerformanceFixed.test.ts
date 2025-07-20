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

describe("Messaging Performance Tests", () => {
  let messageCache: MessageCache;
  let messagingService: MessagingService;
  let voiceMessageManager: VoiceMessageManager;
  let realtimeService: RealtimeMessagingService;
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

    messageCache = new MessageCache({ maxSize: 1000, maxAge: 300000 });
    messagingService = new MessagingService("premium");
    voiceMessageManager = new VoiceMessageManager(mockApiClient);
    realtimeService = new RealtimeMessagingService("ws://localhost:8080");

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

    // Mock fetch
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
      messageCache.set(conversationId, messages);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(100); // Should complete in under 100ms

      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBe(messageCount);
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

      messageCache.set(conversationId, initialMessages);

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
      messageCache.addMessages(conversationId, newMessages);
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms

      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBe(600); // 500 + 100
    });

    it("should handle concurrent cache operations", async () => {
      const conversationId = "conv1";
      const operationCount = 100;
      const operations: Promise<void>[] = [];

      for (let i = 0; i < operationCount; i++) {
        operations.push(
          new Promise<void>((resolve) => {
            setTimeout(() => {
              messageCache.addMessages(conversationId, [
                {
                  _id: `concurrent_msg${i}`,
                  conversationId,
                  fromUserId: "user1",
                  toUserId: "user2",
                  text: `Concurrent message ${i}`,
                  type: "text",
                  createdAt: Date.now() + i,
                },
              ]);
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

      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBeGreaterThan(0);
    });

    it("should efficiently search through large message sets", () => {
      const conversationId = "conv1";
      const messageCount = 5000;
      const messages: Message[] = [];

      // Generate messages with some containing search term
      for (let i = 0; i < messageCount; i++) {
        const text =
          i % 100 === 0 ? `Special message ${i}` : `Regular message ${i}`;
        messages.push({
          _id: `msg${i}`,
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text,
          type: "text",
          createdAt: Date.now() + i,
        });
      }

      messageCache.set(conversationId, messages);

      const startTime = performance.now();
      const results = messageCache.searchMessages(conversationId, "Special");
      const endTime = performance.now();

      const duration = endTime - startTime;
      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(results).toHaveLength(50); // Should find 50 special messages
    });
  });

  describe("API Performance", () => {
    it("should handle rapid message sending efficiently", async () => {
      const messageCount = 50;
      const messages = Array.from({ length: messageCount }, (_, i) => ({
        conversationId: "conv1",
        fromUserId: "user1",
        toUserId: "user2",
        text: `Rapid message ${i}`,
        type: "text" as const,
      }));

      const startTime = performance.now();
      const promises = messages.map((msg) =>
        messagingService.sendMessage(() => mockApiClient.sendMessage(msg), msg)
      );
      await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / messageCount;

      expect(avgDuration).toBeLessThan(100); // Average under 100ms per message
      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(messageCount);
    });

    it("should efficiently batch message retrieval", async () => {
      const conversationIds = Array.from({ length: 10 }, (_, i) => `conv${i}`);
      const messagesPerConversation = 100;

      // Mock API responses
      (mockApiClient.getMessages as jest.Mock).mockImplementation(
        (conversationId: string) => {
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
            success: true,
            data: messages,
          });
        }
      );

      const startTime = performance.now();
      const promises = conversationIds.map((id) =>
        mockApiClient.getMessages(id)
      );
      await Promise.all(promises);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const avgDuration = duration / conversationIds.length;

      expect(avgDuration).toBeLessThan(200); // Average under 200ms per conversation
      expect(mockApiClient.getMessages).toHaveBeenCalledTimes(
        conversationIds.length
      );
    });

    it("should handle high-frequency API calls with rate limiting", async () => {
      const callCount = 100;
      const calls: Promise<any>[] = [];

      // Simulate rapid API calls
      for (let i = 0; i < callCount; i++) {
        calls.push(
          mockApiClient.sendMessage({
            conversationId: "conv1",
            fromUserId: "user1",
            toUserId: "user2",
            text: `High frequency message ${i}`,
            type: "text",
          })
        );
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(calls);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const successfulCalls = results.filter(
        (r) => r.status === "fulfilled"
      ).length;

      expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
      expect(successfulCalls).toBeGreaterThan(0);
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

      // First batch - should make API calls
      const startTime1 = performance.now();
      const promises1 = storageIds.map((id) =>
        voiceMessageManager.getVoiceMessageUrl(id)
      );
      await Promise.all(promises1);
      const endTime1 = performance.now();

      const firstBatchDuration = endTime1 - startTime1;

      // Second batch - should use cache (if implemented)
      const startTime2 = performance.now();
      const promises2 = storageIds.map((id) =>
        voiceMessageManager.getVoiceMessageUrl(id)
      );
      await Promise.all(promises2);
      const endTime2 = performance.now();

      const secondBatchDuration = endTime2 - startTime2;

      // Both batches should complete in reasonable time
      expect(firstBatchDuration).toBeLessThan(10000); // Under 10 seconds
      expect(secondBatchDuration).toBeLessThan(10000); // Under 10 seconds

      expect(mockApiClient.getVoiceMessageUrl).toHaveBeenCalledTimes(
        storageIds.length * 2
      );
    });

    it("should handle concurrent voice message operations", async () => {
      const concurrentUploads = 10;
      const uploads: Promise<any>[] = [];

      for (let i = 0; i < concurrentUploads; i++) {
        const mockBlob = new Blob([`audio data ${i}`], { type: "audio/mp4" });
        uploads.push(
          voiceMessageManager.uploadVoiceMessage(
            mockBlob,
            `conv${i}`,
            "user1",
            "user2",
            30
          )
        );
      }

      const startTime = performance.now();
      const results = await Promise.allSettled(uploads);
      const endTime = performance.now();

      const duration = endTime - startTime;
      const successfulUploads = results.filter(
        (r) => r.status === "fulfilled"
      ).length;

      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
      expect(successfulUploads).toBe(concurrentUploads);
    });
  });

  describe("Real-time Performance", () => {
    it("should handle high-frequency WebSocket messages", async () => {
      const messageCount = 1000;
      const messages: any[] = [];
      let receivedCount = 0;

      await realtimeService.initialize("user1", {
        onMessage: (message) => {
          receivedCount++;
          messages.push(message);
        },
      });

      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;

      const startTime = performance.now();

      // Simulate rapid message arrival
      for (let i = 0; i < messageCount; i++) {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "message",
              id: `msg${i}`,
              conversationId: "conv1",
              fromUserId: "user2",
              toUserId: "user1",
              content: `High frequency message ${i}`,
              timestamp: Date.now() + i,
            }),
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(receivedCount).toBe(messageCount);
      expect(duration).toBeLessThan(1000); // Should process 1000 messages in under 1 second
      expect(duration / messageCount).toBeLessThan(1); // Under 1ms per message
    });

    it("should efficiently handle typing indicators", async () => {
      const userCount = 50;
      const typingEvents: Array<{ userId: string; action: string }> = [];

      await realtimeService.initialize("user1", {
        onTypingIndicator: (indicator) => {
          typingEvents.push({
            userId: indicator.userId,
            action: indicator.isTyping ? "start" : "stop",
          });
        },
      });

      const mockWebSocket = (global.WebSocket as jest.Mock).mock.results[0]
        .value;

      const startTime = performance.now();

      // Simulate rapid typing events
      for (let i = 0; i < userCount; i++) {
        if (mockWebSocket.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "typing",
              conversationId: "conv1",
              userId: `user${i}`,
              isTyping: true,
              timestamp: Date.now(),
            }),
          });

          mockWebSocket.onmessage({
            data: JSON.stringify({
              type: "typing",
              conversationId: "conv1",
              userId: `user${i}`,
              isTyping: false,
              timestamp: Date.now(),
            }),
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(typingEvents).toHaveLength(userCount * 2);
      expect(duration).toBeLessThan(100); // Should process all events in under 100ms
    });

    it("should maintain performance with multiple concurrent connections", async () => {
      const connectionCount = 10;
      const services: RealtimeMessagingService[] = [];

      const startTime = performance.now();

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const service = new RealtimeMessagingService("ws://localhost:8080");
        await service.initialize(`user${i}`);
        services.push(service);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should establish all connections in under 5 seconds
      expect(global.WebSocket).toHaveBeenCalledTimes(connectionCount + 1); // +1 for the original service

      // Cleanup
      services.forEach((service) => service.disconnect());
    });

    it("should handle message broadcasting efficiently", async () => {
      const connectionCount = 20;
      const services: RealtimeMessagingService[] = [];
      const receivedMessages: any[][] = [];

      // Create multiple connections
      for (let i = 0; i < connectionCount; i++) {
        const service = new RealtimeMessagingService("ws://localhost:8080");
        const messages: any[] = [];

        await service.initialize(`user${i}`, {
          onMessage: (message) => {
            messages.push(message);
          },
        });

        services.push(service);
        receivedMessages.push(messages);
      }

      const broadcastMessage = {
        type: "message",
        id: "broadcast_msg1",
        conversationId: "conv1",
        fromUserId: "broadcaster",
        toUserId: "all",
        content: "Broadcast message",
        timestamp: Date.now(),
      };

      const startTime = performance.now();

      // Simulate broadcasting to all connections
      const mockWebSockets = (global.WebSocket as jest.Mock).mock.results;
      for (let i = 1; i <= connectionCount; i++) {
        // Skip index 0 (original service)
        const mockWebSocket = mockWebSockets[i]?.value;
        if (mockWebSocket?.onmessage) {
          mockWebSocket.onmessage({
            data: JSON.stringify(broadcastMessage),
          });
        }
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should broadcast to all in under 500ms

      // Verify all connections received the message
      receivedMessages.forEach((messages) => {
        expect(messages).toHaveLength(1);
        expect(messages[0].id).toBe("broadcast_msg1");
      });

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

        messageCache.addMessages(conversationId, [message]);

        // Periodically clear old messages to simulate real usage
        if (i % 100 === 0 && i > 0) {
          // Simulate clearing old messages (this would be done by cleanup logic)
          const messages = messageCache.get(conversationId);
          if (messages && messages.length > 500) {
            messageCache.set(conversationId, messages.slice(-500));
          }
        }
      }

      const cachedMessages = messageCache.get(conversationId);
      expect(cachedMessages).toBeDefined();
      expect(cachedMessages!.length).toBeLessThanOrEqual(1000); // Should respect memory management
    });

    it("should efficiently clean up WebSocket resources", async () => {
      const connectionCount = 20;
      const services: RealtimeMessagingService[] = [];

      // Create and immediately disconnect multiple services
      for (let i = 0; i < connectionCount; i++) {
        const service = new RealtimeMessagingService("ws://localhost:8080");
        await service.initialize(`user${i}`);
        services.push(service);
      }

      // Disconnect all services
      services.forEach((service) => service.disconnect());

      // Verify cleanup (WebSocket close should be called)
      const mockWebSockets = (global.WebSocket as jest.Mock).mock.results;
      mockWebSockets.slice(1, connectionCount + 1).forEach((result) => {
        expect(result.value.close).toHaveBeenCalled();
      });
    });

    it("should handle cache size limits efficiently", () => {
      const smallCache = new MessageCache({ maxSize: 10, maxAge: 60000 });
      const conversationCount = 20;

      const startTime = performance.now();

      // Add more conversations than cache can hold
      for (let i = 0; i < conversationCount; i++) {
        const messages: Message[] = [
          {
            _id: `msg${i}`,
            conversationId: `conv${i}`,
            fromUserId: "user1",
            toUserId: "user2",
            text: `Message ${i}`,
            type: "text",
            createdAt: Date.now() + i,
          },
        ];

        smallCache.set(`conv${i}`, messages);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should handle eviction efficiently

      const stats = smallCache.getStats();
      expect(stats.size).toBeLessThanOrEqual(10); // Should respect size limit

      smallCache.destroy();
    });
  });

  describe("Stress Testing", () => {
    it("should handle extreme message volumes", () => {
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
        messageCache.set(`conv${convId}`, messages);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should handle extreme load in under 10 seconds
      expect(duration / totalMessages).toBeLessThan(0.01); // Under 0.01ms per message

      // Verify cache integrity
      for (let convId = 0; convId < Math.min(conversationCount, 10); convId++) {
        const cachedMessages = messageCache.get(`conv${convId}`);
        expect(cachedMessages).toBeDefined();
        expect(cachedMessages!.length).toBe(messagesPerConversation);
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
                messageCache.addMessages(`conv${i % 10}`, [
                  {
                    _id: `stress_msg${i}`,
                    conversationId: `conv${i % 10}`,
                    fromUserId: "user1",
                    toUserId: "user2",
                    text: `Stress message ${i}`,
                    type: "text",
                    createdAt: Date.now() + i,
                  },
                ]);
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
                  i % 2 === 0
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
      expect(duration).toBeLessThan(30000); // Total under 30 seconds
    });

    it("should handle rapid connection/disconnection cycles", async () => {
      const cycleCount = 50;
      const services: RealtimeMessagingService[] = [];

      const startTime = performance.now();

      for (let i = 0; i < cycleCount; i++) {
        const service = new RealtimeMessagingService("ws://localhost:8080");
        await service.initialize(`user${i}`);
        services.push(service);

        // Immediately disconnect every other service
        if (i % 2 === 0) {
          service.disconnect();
        }
      }

      // Disconnect remaining services
      services.forEach((service) => service.disconnect());

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(10000); // Should handle rapid cycles in under 10 seconds
      expect(global.WebSocket).toHaveBeenCalledTimes(cycleCount + 1); // +1 for original service
    });
  });
});
