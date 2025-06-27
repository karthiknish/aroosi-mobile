import { EventEmitter } from "events";
import { Message, MessageStatus } from "../types/message";

export interface RealtimeEvent {
  type:
    | "message_received"
    | "message_read"
    | "typing_start"
    | "typing_stop"
    | "user_online"
    | "user_offline";
  conversationId: string;
  userId: string;
  data?: any;
  timestamp: number;
}

class RealtimeMessagingService extends EventEmitter {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private isConnected = false;
  private token: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string) {
    super();
    this.baseUrl = baseUrl;
  }

  // Connect to real-time events for a conversation
  connect(conversationId: string, token: string): void {
    this.token = token;
    this.disconnect(); // Close any existing connection

    try {
      const url = `${
        this.baseUrl
      }/conversations/${conversationId}/events?token=${encodeURIComponent(
        token
      )}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        console.log("Real-time connection established");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.emit("connected");
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeEvent(data);
        } catch (error) {
          console.error("Error parsing real-time event:", error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("Real-time connection error:", error);
        this.isConnected = false;
        this.emit("error", error);

        // Attempt to reconnect
        this.attemptReconnect(conversationId);
      };
    } catch (error) {
      console.error("Failed to establish real-time connection:", error);
      this.emit("error", error);
    }
  }

  // Disconnect from real-time events
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    this.emit("disconnected");
  }

  // Check if connected
  isConnectedToRealtime(): boolean {
    return this.isConnected;
  }

  // Handle incoming real-time events
  private handleRealtimeEvent(event: RealtimeEvent): void {
    switch (event.type) {
      case "message_received":
        this.emit("messageReceived", event.data);
        break;
      case "message_read":
        this.emit("messageRead", event.data);
        break;
      case "typing_start":
        this.emit("typingStart", {
          userId: event.userId,
          conversationId: event.conversationId,
        });
        break;
      case "typing_stop":
        this.emit("typingStop", {
          userId: event.userId,
          conversationId: event.conversationId,
        });
        break;
      case "user_online":
        this.emit("userOnline", { userId: event.userId });
        break;
      case "user_offline":
        this.emit("userOffline", { userId: event.userId });
        break;
      default:
        console.log("Unknown real-time event type:", event.type);
    }
  }

  // Attempt to reconnect with exponential backoff
  private attemptReconnect(conversationId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (this.token) {
        this.connect(conversationId, this.token);
      }
    }, delay);
  }

  // Send typing indicator
  async sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/typing-indicators`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ conversationId, action }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send typing indicator: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending typing indicator:", error);
      throw error;
    }
  }

  // Send delivery receipt
  async sendDeliveryReceipt(
    messageId: string,
    status: MessageStatus
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/delivery-receipts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ messageId, status }),
      });

      if (!response.ok) {
        throw new Error(`Failed to send delivery receipt: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending delivery receipt:", error);
      throw error;
    }
  }
}

// Singleton instance
const realtimeMessagingService = new RealtimeMessagingService(
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api"
);

export default realtimeMessagingService;
