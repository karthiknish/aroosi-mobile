import { OfflineMessageQueue } from "../utils/offlineMessageQueue";
import { MessagingAPI, MessagingErrorType } from "../types/messaging";
import { Message } from "../types/message";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock API client
const mockApiClient: jest.Mocked<MessagingAPI> = {
  sendMessage: jest.fn(),
  getMessages: jest.fn(),
  markConversationAsRead: jest.fn(),
  generateVoiceUploadUrl: jest.fn(),
  getVoiceMessageUrl: jest.fn(),
  sendTypingIndicator: jest.fn(),
  sendDeliveryReceipt: jest.fn(),
  getConversations: jest.fn(),
  createConversation: jest.fn(),
  deleteConversation: jest.fn(),
};

describe("OfflineMessageQueue", () => {
  let queue: OfflineMessageQueue;

  const mockMessage: Omit<Message, "_id"> = {
    conversationId: "conv-1",
    fromUserId: "user-1",
    toUserId: "user-2",
    text: "Hello world",
    type: "text",
    createdAt: Date.now(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    queue = new OfflineMessageQueue(mockApiClient, {
      maxRetries: 3,
      baseRetryDelay: 100, // Shorter delay for tests
      storageKey: `test_queue_${Date.now()}_${Math.random()}`, // Unique key per test
    });
  });

  afterEach(() => {
    queue.destroy();
  });

  describe("Initialization", () => {
    it("should initialize successfully", async () => {
      const initSpy = jest.fn();
      queue.on("initialized", initSpy);

      await queue.initialize();

      expect(initSpy).toHaveBeenCalledWith({ queueSize: 0 });
    });

    it("should load existing queue from storage", async () => {
      const storedData = {
        queue: [
          {
            id: "test-1",
            message: mockMessage,
            attempts: 1,
            maxAttempts: 3,
            lastAttempt: Date.now() - 1000,
            nextRetry: Date.now() + 1000,
            priority: "normal",
            createdAt: Date.now() - 2000,
          },
        ],
        stats: { totalProcessed: 5, totalSuccessful: 4, totalFailed: 1 },
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(storedData)
      );

      await queue.initialize();

      const stats = queue.getStats();
      expect(stats.totalQueued).toBe(1);
    });
  });

  describe("Message Queuing", () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it("should enqueue a message successfully", async () => {
      const queueSpy = jest.fn();
      queue.on("message_queued", queueSpy);

      const messageId = await queue.enqueue(mockMessage, "normal");

      expect(messageId).toBeTruthy();
      expect(queueSpy).toHaveBeenCalledWith({
        id: messageId,
        priority: "normal",
        queueSize: 1,
      });

      const stats = queue.getStats();
      expect(stats.totalQueued).toBe(1);
      expect(stats.pending).toBe(1);
    });

    it("should handle different priority levels", async () => {
      const highId = await queue.enqueue(mockMessage, "high");
      const normalId = await queue.enqueue(mockMessage, "normal");
      const lowId = await queue.enqueue(mockMessage, "low");

      const queuedMessages = queue.getQueuedMessages();
      expect(queuedMessages).toHaveLength(3);

      // High priority should be first
      expect(queuedMessages[0].priority).toBe("high");
      expect(queuedMessages[0].id).toBe(highId);
    });

    it("should dequeue a message successfully", async () => {
      const messageId = await queue.enqueue(mockMessage);

      const dequeueSpy = jest.fn();
      queue.on("message_dequeued", dequeueSpy);

      const removed = await queue.dequeue(messageId);

      expect(removed).toBe(true);
      expect(dequeueSpy).toHaveBeenCalledWith({
        id: messageId,
        queueSize: 0,
      });

      const stats = queue.getStats();
      expect(stats.totalQueued).toBe(0);
    });
  });

  describe("Message Processing", () => {
    beforeEach(async () => {
      await queue.initialize();
      queue.setOnlineStatus(true);
    });

    it("should process messages when online", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: true,
        data: { ...mockMessage, _id: "msg-1" } as Message,
      });

      const sentSpy = jest.fn();
      queue.on("message_sent", sentSpy);

      await queue.enqueue(mockMessage);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockApiClient.sendMessage).toHaveBeenCalledWith({
        conversationId: mockMessage.conversationId,
        fromUserId: mockMessage.fromUserId,
        toUserId: mockMessage.toUserId,
        text: mockMessage.text,
        type: mockMessage.type,
        audioStorageId: undefined,
        duration: undefined,
        fileSize: undefined,
        mimeType: undefined,
      });

      expect(sentSpy).toHaveBeenCalled();
    });

    it("should not process messages when offline", async () => {
      queue.setOnlineStatus(false);

      await queue.enqueue(mockMessage);

      // Wait a bit to ensure no processing happens
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockApiClient.sendMessage).not.toHaveBeenCalled();

      const stats = queue.getStats();
      expect(stats.pending).toBe(1);
    });

    it("should retry failed messages with exponential backoff", async () => {
      mockApiClient.sendMessage
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockMessage, _id: "msg-1" } as Message,
        });

      const retrySpy = jest.fn();
      queue.on("message_retry_scheduled", retrySpy);

      await queue.enqueue(mockMessage);

      // Wait for initial attempt and retry
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(2);
      expect(retrySpy).toHaveBeenCalled();
    });

    it("should handle non-recoverable errors", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: false,
        error: {
          code: "PERMISSION_DENIED",
          message: "User blocked",
        },
      });

      const failedSpy = jest.fn();
      queue.on("message_failed", failedSpy);

      await queue.enqueue(mockMessage);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(failedSpy).toHaveBeenCalled();

      const stats = queue.getStats();
      expect(stats.failed).toBe(1);
    });

    it("should respect max retry attempts", async () => {
      mockApiClient.sendMessage.mockRejectedValue(new Error("Network error"));

      const failedSpy = jest.fn();
      queue.on("message_failed", failedSpy);

      await queue.enqueue(mockMessage);

      // Wait for all retry attempts
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should be called maxRetries + 1 times (initial + retries)
      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(4);
      expect(failedSpy).toHaveBeenCalled();
    });
  });

  describe("Connection Status", () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it("should handle online/offline transitions", async () => {
      const statusSpy = jest.fn();
      queue.on("connection_status_changed", statusSpy);

      queue.setOnlineStatus(true);
      expect(statusSpy).toHaveBeenCalledWith({
        online: true,
        previousStatus: false,
      });

      queue.setOnlineStatus(false);
      expect(statusSpy).toHaveBeenCalledWith({
        online: false,
        previousStatus: true,
      });
    });

    it("should start processing when coming online", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: true,
        data: { ...mockMessage, _id: "msg-1" } as Message,
      });

      // Start offline
      queue.setOnlineStatus(false);
      await queue.enqueue(mockMessage);

      expect(mockApiClient.sendMessage).not.toHaveBeenCalled();

      // Come online
      queue.setOnlineStatus(true);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockApiClient.sendMessage).toHaveBeenCalled();
    });
  });

  describe("Queue Management", () => {
    beforeEach(async () => {
      await queue.initialize();
    });

    it("should get queue statistics", async () => {
      await queue.enqueue(mockMessage, "high");
      await queue.enqueue(mockMessage, "normal");

      const stats = queue.getStats();

      expect(stats.totalQueued).toBe(2);
      expect(stats.pending).toBe(2);
      expect(stats.failed).toBe(0);
      expect(stats.processing).toBe(0);
    });

    it("should get queued messages", async () => {
      const id1 = await queue.enqueue(mockMessage, "high");
      const id2 = await queue.enqueue(mockMessage, "normal");

      const queuedMessages = queue.getQueuedMessages();

      expect(queuedMessages).toHaveLength(2);
      expect(queuedMessages.map((m) => m.id)).toContain(id1);
      expect(queuedMessages.map((m) => m.id)).toContain(id2);
    });

    it("should get failed messages", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: false,
        error: { code: "PERMISSION_DENIED", message: "Blocked" },
      });

      queue.setOnlineStatus(true);
      await queue.enqueue(mockMessage);

      // Wait for processing and failure
      await new Promise((resolve) => setTimeout(resolve, 200));

      const failedMessages = queue.getFailedMessages();
      expect(failedMessages).toHaveLength(1);
    });

    it("should retry a specific message", async () => {
      mockApiClient.sendMessage
        .mockResolvedValueOnce({
          success: false,
          error: { code: "NETWORK_ERROR", message: "Network error" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { ...mockMessage, _id: "msg-1" } as Message,
        });

      queue.setOnlineStatus(true);
      const messageId = await queue.enqueue(mockMessage);

      // Wait for initial failure
      await new Promise((resolve) => setTimeout(resolve, 200));

      const retryResult = await queue.retryMessage(messageId);
      expect(retryResult).toBe(true);

      // Wait for retry processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(2);
    });

    it("should clear failed messages", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: false,
        error: { code: "PERMISSION_DENIED", message: "Blocked" },
      });

      queue.setOnlineStatus(true);
      await queue.enqueue(mockMessage);
      await queue.enqueue(mockMessage);

      // Wait for processing and failures
      await new Promise((resolve) => setTimeout(resolve, 200));

      const clearedCount = await queue.clearFailedMessages();
      expect(clearedCount).toBe(2);

      const stats = queue.getStats();
      expect(stats.totalQueued).toBe(0);
    });

    it("should clear all messages", async () => {
      await queue.enqueue(mockMessage);
      await queue.enqueue(mockMessage);

      const clearSpy = jest.fn();
      queue.on("queue_cleared", clearSpy);

      await queue.clearAll();

      expect(clearSpy).toHaveBeenCalled();

      const stats = queue.getStats();
      expect(stats.totalQueued).toBe(0);
    });
  });

  describe("Persistence", () => {
    it("should save queue to storage", async () => {
      await queue.initialize();
      await queue.enqueue(mockMessage);

      // Verify AsyncStorage.setItem was called
      expect(AsyncStorage.setItem).toHaveBeenCalled();

      const [key, value] = (AsyncStorage.setItem as jest.Mock).mock.calls[0];
      expect(key).toBe("test_queue");

      const data = JSON.parse(value);
      expect(data.queue).toHaveLength(1);
      expect(data.queue[0].message).toEqual(mockMessage);
    });

    it("should handle storage errors gracefully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(
        new Error("Storage error")
      );

      // Should not throw
      await expect(queue.initialize()).resolves.not.toThrow();
    });
  });

  describe("Error Classification", () => {
    beforeEach(async () => {
      await queue.initialize();
      queue.setOnlineStatus(true);
    });

    it("should classify authentication errors as non-recoverable", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: false,
        error: { code: "401", message: "Unauthorized" },
      });

      const failedSpy = jest.fn();
      queue.on("message_failed", failedSpy);

      await queue.enqueue(mockMessage);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(1); // No retries
      expect(failedSpy).toHaveBeenCalled();
    });

    it("should classify network errors as recoverable", async () => {
      mockApiClient.sendMessage.mockRejectedValue(new Error("Network error"));

      await queue.enqueue(mockMessage);

      // Wait for initial attempt and first retry
      await new Promise((resolve) => setTimeout(resolve, 300));

      expect(mockApiClient.sendMessage).toHaveBeenCalledTimes(2); // Initial + retry
    });

    it("should classify rate limit errors as recoverable", async () => {
      mockApiClient.sendMessage.mockResolvedValue({
        success: false,
        error: { code: "429", message: "Rate limited" },
      });

      const retrySpy = jest.fn();
      queue.on("message_retry_scheduled", retrySpy);

      await queue.enqueue(mockMessage);

      // Wait for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(retrySpy).toHaveBeenCalled();
    });
  });
});
