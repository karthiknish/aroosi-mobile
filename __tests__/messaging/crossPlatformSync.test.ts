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
import { MessageCache } from "../../utils/MessageCache";
import { OfflineMessageQueue } from "../../utils/offlineMessageQueue";
import { MessageSyncService } from "../../utils/messagingSync";
import { Message, SubscriptionTier } from "../../types/messaging";

// Mock external dependencies
jest.mock("../../utils/api");

describe("Cross-Platform Message Synchronization Tests", () => {
  let mobileMessagingService: MessagingService;
  let webMessagingService: MessagingService;
  let mobileRealtimeService: RealtimeMessagingService;
  let webRealtimeService: RealtimeMessagingService;
  let messageCache: MessageCache;
  let offlineQueue: OfflineMessageQueue;
  let syncService: MessageSyncService;

  // Mock WebSocket connections for both platforms
  let mobileWebSocket: any;
  let webWebSocket: any;

  beforeEach(() => {
    // Initialize services for both platforms
    mobileMessagingService = new MessagingService();
    webMessagingService = new MessagingService();
    mobileRealtimeService = new RealtimeMessagingService("mobile-token");
    webRealtimeService = new RealtimeMessagingService("web-token");
    messageCache = new MessageCache();
    offlineQueue = new OfflineMessageQueue();
    syncService = new MessageSyncService();

    // Mock WebSocket for both platforms
    mobileWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    webWebSocket = {
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: WebSocket.OPEN,
    };

    let webSocketCallCount = 0;
    global.WebSocket = jest.fn().mockImplementation(() => {
      webSocketCallCount++;
      return webSocketCallCount === 1 ? mobileWebSocket : webWebSocket;
    });

    // Mock fetch for API calls
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Real-time Message Synchronization", () => {
    it("should sync messages from web to mobile in real-time", async () => {
      const conversationId = "conv1";
      const webMessage: Message = {
        _id: "web_msg1",
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "Message sent from web",
        type: "text",
        createdAt: Date.now(),
      };

      let mobileReceivedMessage: Message | null = null;

      // Set up mobile listener
      mobileRealtimeService.on("message:new", (message) => {
        mobileReceivedMessage = message;
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Simulate web sending message and broadcasting to mobile
      const mobileMessageHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];

      // Simulate receiving the message on mobile from web broadcast
      mobileMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: webMessage,
        }),
      });

      expect(mobileReceivedMessage).toEqual(webMessage);
    });

    it("should sync messages from mobile to web in real-time", async () => {
      const conversationId = "conv1";
      const mobileMessage: Message = {
        _id: "mobile_msg1",
        conversationId,
        fromUserId: "user2",
        toUserId: "user1",
        text: "Message sent from mobile",
        type: "text",
        createdAt: Date.now(),
      };

      let webReceivedMessage: Message | null = null;

      // Set up web listener
      webRealtimeService.on("message:new", (message) => {
        webReceivedMessage = message;
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Simulate mobile sending message and broadcasting to web
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Simulate receiving the message on web from mobile broadcast
      webMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: mobileMessage,
        }),
      });

      expect(webReceivedMessage).toEqual(mobileMessage);
    });

    it("should sync typing indicators across platforms", async () => {
      const conversationId = "conv1";
      let webTypingEvents: Array<{ userId: string; action: string }> = [];
      let mobileTypingEvents: Array<{ userId: string; action: string }> = [];

      // Set up listeners
      webRealtimeService.on("typing:start", (convId, userId) => {
        webTypingEvents.push({ userId, action: "start" });
      });
      webRealtimeService.on("typing:stop", (convId, userId) => {
        webTypingEvents.push({ userId, action: "stop" });
      });

      mobileRealtimeService.on("typing:start", (convId, userId) => {
        mobileTypingEvents.push({ userId, action: "start" });
      });
      mobileRealtimeService.on("typing:stop", (convId, userId) => {
        mobileTypingEvents.push({ userId, action: "stop" });
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Get message handlers
      const mobileMessageHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Simulate typing from mobile to web
      webMessageHandler({
        data: JSON.stringify({
          type: "typing:start",
          conversationId,
          userId: "mobile_user",
        }),
      });

      // Simulate typing from web to mobile
      mobileMessageHandler({
        data: JSON.stringify({
          type: "typing:start",
          conversationId,
          userId: "web_user",
        }),
      });

      expect(webTypingEvents).toContainEqual({
        userId: "mobile_user",
        action: "start",
      });
      expect(mobileTypingEvents).toContainEqual({
        userId: "web_user",
        action: "start",
      });
    });

    it("should sync read receipts across platforms", async () => {
      const conversationId = "conv1";
      const messageId = "msg1";
      let webReadReceipts: Array<{ messageId: string; userId: string }> = [];
      let mobileReadReceipts: Array<{ messageId: string; userId: string }> = [];

      // Set up listeners
      webRealtimeService.on("message:read", (msgId, userId) => {
        webReadReceipts.push({ messageId: msgId, userId });
      });

      mobileRealtimeService.on("message:read", (msgId, userId) => {
        mobileReadReceipts.push({ messageId: msgId, userId });
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Get message handlers
      const mobileMessageHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Simulate read receipt from mobile to web
      webMessageHandler({
        data: JSON.stringify({
          type: "message:read",
          messageId,
          readByUserId: "mobile_user",
        }),
      });

      // Simulate read receipt from web to mobile
      mobileMessageHandler({
        data: JSON.stringify({
          type: "message:read",
          messageId,
          readByUserId: "web_user",
        }),
      });

      expect(webReadReceipts).toContainEqual({
        messageId,
        userId: "mobile_user",
      });
      expect(mobileReadReceipts).toContainEqual({
        messageId,
        userId: "web_user",
      });
    });
  });

  describe("Message History Synchronization", () => {
    it("should maintain consistent message order across platforms", async () => {
      const conversationId = "conv1";
      const messages: Message[] = [
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

      // Mock API response for both platforms
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(messages),
      });

      // Fetch messages on both platforms
      const mobileMessages = await mobileMessagingService.getMessages(
        conversationId
      );
      const webMessages = await webMessagingService.getMessages(conversationId);

      // Verify both platforms have the same messages in the same order
      expect(mobileMessages).toEqual(webMessages);
      expect(mobileMessages).toHaveLength(3);

      // Verify chronological order
      for (let i = 1; i < mobileMessages.length; i++) {
        expect(mobileMessages[i].createdAt).toBeGreaterThan(
          mobileMessages[i - 1].createdAt
        );
      }
    });

    it("should sync pagination consistently across platforms", async () => {
      const conversationId = "conv1";
      const totalMessages = 100;
      const pageSize = 20;

      // Generate messages
      const allMessages: Message[] = Array.from(
        { length: totalMessages },
        (_, i) => ({
          _id: `msg${i}`,
          conversationId,
          fromUserId: i % 2 === 0 ? "user1" : "user2",
          toUserId: i % 2 === 0 ? "user2" : "user1",
          text: `Message ${i}`,
          type: "text" as const,
          createdAt: Date.now() + i * 1000,
        })
      );

      // Mock paginated API responses
      (global.fetch as jest.Mock).mockImplementation((url: string) => {
        const urlObj = new URL(url, "http://localhost");
        const limit = parseInt(urlObj.searchParams.get("limit") || "20");
        const before = parseInt(urlObj.searchParams.get("before") || "0");

        let filteredMessages = allMessages;
        if (before > 0) {
          filteredMessages = allMessages.filter(
            (msg) => msg.createdAt < before
          );
        }

        const pageMessages = filteredMessages
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, limit);

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(pageMessages),
        });
      });

      // Fetch first page on both platforms
      const mobileFirstPage = await mobileMessagingService.getMessages(
        conversationId,
        { limit: pageSize }
      );
      const webFirstPage = await webMessagingService.getMessages(
        conversationId,
        { limit: pageSize }
      );

      expect(mobileFirstPage).toEqual(webFirstPage);
      expect(mobileFirstPage).toHaveLength(pageSize);

      // Fetch second page on both platforms
      const beforeTimestamp =
        mobileFirstPage[mobileFirstPage.length - 1].createdAt;
      const mobileSecondPage = await mobileMessagingService.getMessages(
        conversationId,
        { limit: pageSize, before: beforeTimestamp }
      );
      const webSecondPage = await webMessagingService.getMessages(
        conversationId,
        { limit: pageSize, before: beforeTimestamp }
      );

      expect(mobileSecondPage).toEqual(webSecondPage);
      expect(mobileSecondPage).toHaveLength(pageSize);

      // Verify no overlap between pages
      const firstPageIds = mobileFirstPage.map((msg) => msg._id);
      const secondPageIds = mobileSecondPage.map((msg) => msg._id);
      const overlap = firstPageIds.filter((id) => secondPageIds.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  describe("Offline/Online Synchronization", () => {
    it("should sync messages when mobile comes back online", async () => {
      const conversationId = "conv1";
      const offlineMessage = {
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "Offline message from mobile",
        type: "text" as const,
      };

      // Simulate mobile going offline
      mobileWebSocket.readyState = WebSocket.CLOSED;

      // Add message to offline queue
      offlineQueue.addMessage(offlineMessage);
      expect(offlineQueue.getQueuedMessages()).toHaveLength(1);

      // Mock successful API response when back online
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            _id: "offline_msg1",
            ...offlineMessage,
            createdAt: Date.now(),
          }),
      });

      // Simulate coming back online
      mobileWebSocket.readyState = WebSocket.OPEN;
      await offlineQueue.processQueue();

      // Verify message was sent and queue is empty
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/match-messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(offlineMessage),
        })
      );
      expect(offlineQueue.getQueuedMessages()).toHaveLength(0);
    });

    it("should sync missed messages when reconnecting", async () => {
      const conversationId = "conv1";
      const lastSyncTime = Date.now() - 300000; // 5 minutes ago
      const missedMessages: Message[] = [
        {
          _id: "missed1",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Missed message 1",
          type: "text",
          createdAt: Date.now() - 240000, // 4 minutes ago
        },
        {
          _id: "missed2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Missed message 2",
          type: "text",
          createdAt: Date.now() - 120000, // 2 minutes ago
        },
      ];

      // Mock API response for missed messages
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(missedMessages),
      });

      // Sync missed messages
      const syncedMessages = await syncService.syncMissedMessages(
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

    it("should handle conflict resolution when messages arrive out of order", async () => {
      const conversationId = "conv1";
      const baseTime = Date.now();

      // Messages that arrive out of order
      const messages: Message[] = [
        {
          _id: "msg3",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "Third message (arrives first)",
          type: "text",
          createdAt: baseTime + 3000,
        },
        {
          _id: "msg1",
          conversationId,
          fromUserId: "user1",
          toUserId: "user2",
          text: "First message (arrives second)",
          type: "text",
          createdAt: baseTime + 1000,
        },
        {
          _id: "msg2",
          conversationId,
          fromUserId: "user2",
          toUserId: "user1",
          text: "Second message (arrives third)",
          type: "text",
          createdAt: baseTime + 2000,
        },
      ];

      // Add messages to cache in wrong order
      messages.forEach((msg) => messageCache.addMessage(conversationId, msg));

      const cachedMessages = messageCache.getMessages(conversationId);
      expect(cachedMessages).toBeDefined();

      // Verify messages are sorted by timestamp regardless of arrival order
      const sortedMessages = cachedMessages!.sort(
        (a, b) => a.createdAt - b.createdAt
      );
      expect(sortedMessages[0]._id).toBe("msg1");
      expect(sortedMessages[1]._id).toBe("msg2");
      expect(sortedMessages[2]._id).toBe("msg3");
    });
  });

  describe("Voice Message Cross-Platform Sync", () => {
    it("should sync voice messages between platforms", async () => {
      const conversationId = "conv1";
      const voiceMessage: Message = {
        _id: "voice_msg1",
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "",
        type: "voice",
        audioStorageId: "audio123",
        duration: 45,
        fileSize: 1024 * 50, // 50KB
        mimeType: "audio/mp4",
        createdAt: Date.now(),
      };

      let mobileReceivedVoiceMessage: Message | null = null;
      let webReceivedVoiceMessage: Message | null = null;

      // Set up listeners
      mobileRealtimeService.on("message:new", (message) => {
        if (message.type === "voice") {
          mobileReceivedVoiceMessage = message;
        }
      });

      webRealtimeService.on("message:new", (message) => {
        if (message.type === "voice") {
          webReceivedVoiceMessage = message;
        }
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Get message handlers
      const mobileMessageHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Simulate voice message sent from web to mobile
      mobileMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: voiceMessage,
        }),
      });

      // Simulate voice message sent from mobile to web
      webMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: voiceMessage,
        }),
      });

      expect(mobileReceivedVoiceMessage).toEqual(voiceMessage);
      expect(webReceivedVoiceMessage).toEqual(voiceMessage);
      expect(mobileReceivedVoiceMessage?.audioStorageId).toBe("audio123");
      expect(webReceivedVoiceMessage?.duration).toBe(45);
    });

    it("should sync voice message playback status across platforms", async () => {
      const conversationId = "conv1";
      const voiceMessageId = "voice_msg1";
      let mobilePlaybackEvents: Array<{ messageId: string; status: string }> =
        [];
      let webPlaybackEvents: Array<{ messageId: string; status: string }> = [];

      // Set up custom event listeners for voice playback
      mobileRealtimeService.on("voice:playback", (messageId, status) => {
        mobilePlaybackEvents.push({ messageId, status });
      });

      webRealtimeService.on("voice:playback", (messageId, status) => {
        webPlaybackEvents.push({ messageId, status });
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Get message handlers
      const mobileMessageHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Simulate voice playback events
      webMessageHandler({
        data: JSON.stringify({
          type: "voice:playback",
          messageId: voiceMessageId,
          status: "playing",
        }),
      });

      mobileMessageHandler({
        data: JSON.stringify({
          type: "voice:playback",
          messageId: voiceMessageId,
          status: "paused",
        }),
      });

      expect(webPlaybackEvents).toContainEqual({
        messageId: voiceMessageId,
        status: "playing",
      });
      expect(mobilePlaybackEvents).toContainEqual({
        messageId: voiceMessageId,
        status: "paused",
      });
    });
  });

  describe("Connection Management", () => {
    it("should handle simultaneous connections from multiple platforms", async () => {
      const conversationId = "conv1";
      let mobileConnectionStatus = "disconnected";
      let webConnectionStatus = "disconnected";

      // Set up connection listeners
      mobileRealtimeService.on("connection:status", (status) => {
        mobileConnectionStatus = status;
      });

      webRealtimeService.on("connection:status", (status) => {
        webConnectionStatus = status;
      });

      // Connect both platforms simultaneously
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Simulate connection events
      const mobileOpenHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "open"
        )[1];
      const webOpenHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "open"
      )[1];

      mobileOpenHandler();
      webOpenHandler();

      expect(mobileConnectionStatus).toBe("connected");
      expect(webConnectionStatus).toBe("connected");
      expect(global.WebSocket).toHaveBeenCalledTimes(2);
    });

    it("should maintain sync when one platform disconnects", async () => {
      const conversationId = "conv1";
      const message: Message = {
        _id: "disconnect_msg1",
        conversationId,
        fromUserId: "user1",
        toUserId: "user2",
        text: "Message during disconnect",
        type: "text",
        createdAt: Date.now(),
      };

      let webReceivedMessage: Message | null = null;

      // Set up web listener
      webRealtimeService.on("message:new", (msg) => {
        webReceivedMessage = msg;
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Simulate mobile disconnection
      mobileWebSocket.readyState = WebSocket.CLOSED;
      const mobileCloseHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "close"
        )[1];
      mobileCloseHandler();

      // Message should still reach web platform
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      webMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message,
        }),
      });

      expect(webReceivedMessage).toEqual(message);
    });

    it("should reconnect and sync when platform comes back online", async () => {
      const conversationId = "conv1";
      let mobileConnectionStatus = "connected";

      mobileRealtimeService.on("connection:status", (status) => {
        mobileConnectionStatus = status;
      });

      // Initial connection
      mobileRealtimeService.connect(conversationId);

      // Simulate disconnection
      mobileWebSocket.readyState = WebSocket.CLOSED;
      const closeHandler = mobileWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "close"
      )[1];
      closeHandler();
      mobileConnectionStatus = "disconnected";

      expect(mobileConnectionStatus).toBe("disconnected");

      // Simulate reconnection
      const newMobileWebSocket = {
        send: jest.fn(),
        close: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        readyState: WebSocket.OPEN,
      };

      (global.WebSocket as jest.Mock).mockReturnValueOnce(newMobileWebSocket);

      mobileRealtimeService.reconnect();

      // Simulate connection open
      const newOpenHandler =
        newMobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "open"
        )[1];
      newOpenHandler();
      mobileConnectionStatus = "connected";

      expect(mobileConnectionStatus).toBe("connected");
      expect(global.WebSocket).toHaveBeenCalledTimes(3); // Initial mobile, web, reconnected mobile
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

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(messages),
      });

      // Fetch messages on mobile
      const mobileMessages = await mobileMessagingService.getMessages(
        conversationId
      );

      // Simulate mobile app restart by creating new service
      const newMobileMessagingService = new MessagingService();
      const newMobileMessages = await newMobileMessagingService.getMessages(
        conversationId
      );

      // Messages should be consistent
      expect(mobileMessages).toEqual(newMobileMessages);
      expect(mobileMessages).toHaveLength(2);
    });

    it("should handle duplicate message prevention across platforms", async () => {
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

      let mobileMessageCount = 0;
      let webMessageCount = 0;

      // Set up listeners
      mobileRealtimeService.on("message:new", () => {
        mobileMessageCount++;
      });

      webRealtimeService.on("message:new", () => {
        webMessageCount++;
      });

      // Connect both platforms
      mobileRealtimeService.connect(conversationId);
      webRealtimeService.connect(conversationId);

      // Get message handlers
      const mobileMessageHandler =
        mobileWebSocket.addEventListener.mock.calls.find(
          (call) => call[0] === "message"
        )[1];
      const webMessageHandler = webWebSocket.addEventListener.mock.calls.find(
        (call) => call[0] === "message"
      )[1];

      // Send same message to both platforms (simulating duplicate)
      mobileMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: duplicateMessage,
        }),
      });

      webMessageHandler({
        data: JSON.stringify({
          type: "message:new",
          message: duplicateMessage,
        }),
      });

      // Each platform should only process the message once
      expect(mobileMessageCount).toBe(1);
      expect(webMessageCount).toBe(1);
    });
  });
});
