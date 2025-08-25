import EventEmitter from "eventemitter3";

export interface RealtimeMessage {
  id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  type:
    | "text"
    | "voice"
    | "image"
    | "typing"
    | "delivery_receipt"
    | "read_receipt";
  content?: string;
  timestamp: number;
  metadata?: any;
}

export interface TypingIndicator {
  conversationId: string;
  userId: string;
  isTyping: boolean;
  timestamp: number;
}

export interface DeliveryReceipt {
  messageId: string;
  conversationId: string;
  userId: string;
  status: "sent" | "delivered" | "read";
  timestamp: number;
}

export interface RealtimeEventHandlers {
  onMessage?: (message: RealtimeMessage) => void;
  onTypingIndicator?: (indicator: TypingIndicator) => void;
  onDeliveryReceipt?: (receipt: DeliveryReceipt) => void;
  onConnectionChange?: (connected: boolean) => void;
  onError?: (error: Error) => void;
}

/**
 * Real-time messaging service using WebSocket connection
 */
export class RealtimeMessagingService extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private userId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private isConnected = false;
  private handlers: RealtimeEventHandlers = {};
  private messageQueue: any[] = [];

  constructor(url: string) {
    super();
    this.url = url;
  }

  /**
   * Initialize the real-time connection
   */
  async initialize(
    userId: string,
    handlers: RealtimeEventHandlers = {}
  ): Promise<boolean> {
    this.userId = userId;
    this.handlers = handlers;

    try {
      await this.connect();
      return true;
    } catch (error) {
      console.error("Failed to initialize real-time messaging:", error);
      this.handlers.onError?.(
        error instanceof Error ? error : new Error("Connection failed")
      );
      return false;
    }
  }

  /**
   * Connect to WebSocket server
   */
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Close existing connection
        if (this.ws) {
          this.ws.close();
        }

        // Create WebSocket connection
        const wsUrl = `${this.url}?userId=${this.userId}`;
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log("WebSocket connected");
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;

          // Start heartbeat
          this.startHeartbeat();

          // Process queued messages
          this.processMessageQueue();

          // Notify handlers
          this.handlers.onConnectionChange?.(true);
          this.emit("connected");

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log("WebSocket disconnected:", event.code, event.reason);
          this.isConnected = false;
          this.stopHeartbeat();

          // Notify handlers
          this.handlers.onConnectionChange?.(false);
          this.emit("disconnected");

          // Attempt reconnection if not intentional
          if (event.code !== 1000) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.handlers.onError?.(new Error("WebSocket connection error"));
          reject(error);
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error("Connection timeout"));
          }
        }, 10000);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case "message":
          this.handleRealtimeMessage(message);
          break;
        case "typing":
          this.handleTypingIndicator(message);
          break;
        case "delivery_receipt":
          this.handleDeliveryReceipt(message);
          break;
        case "read_receipt":
          this.handleReadReceipt(message);
          break;
        case "pong":
          // Heartbeat response
          break;
        default:
          console.warn("Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("Failed to parse WebSocket message:", error);
    }
  }

  /**
   * Handle real-time message
   */
  private handleRealtimeMessage(message: RealtimeMessage): void {
    this.handlers.onMessage?.(message);
    this.emit("message", message);
  }

  /**
   * Handle typing indicator
   */
  private handleTypingIndicator(data: any): void {
    const indicator: TypingIndicator = {
      conversationId: data.conversationId,
      userId: data.userId,
      isTyping: data.isTyping,
      timestamp: data.timestamp || Date.now(),
    };

    this.handlers.onTypingIndicator?.(indicator);
    this.emit("typing", indicator);
  }

  /**
   * Handle delivery receipt
   */
  private handleDeliveryReceipt(data: any): void {
    const receipt: DeliveryReceipt = {
      messageId: data.messageId,
      conversationId: data.conversationId,
      userId: data.userId,
      status: data.status,
      timestamp: data.timestamp || Date.now(),
    };

    this.handlers.onDeliveryReceipt?.(receipt);
    this.emit("delivery_receipt", receipt);
  }

  /**
   * Handle read receipt
   */
  private handleReadReceipt(data: any): void {
    const receipt: DeliveryReceipt = {
      messageId: data.messageId,
      conversationId: data.conversationId,
      userId: data.userId,
      status: "read",
      timestamp: data.timestamp || Date.now(),
    };

    this.handlers.onDeliveryReceipt?.(receipt);
    this.emit("read_receipt", receipt);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    const message = {
      type: "typing",
      conversationId,
      userId: this.userId,
      isTyping,
      timestamp: Date.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Send delivery receipt
   */
  sendDeliveryReceipt(
    messageId: string,
    conversationId: string,
    status: "sent" | "delivered" | "read"
  ): void {
    const message = {
      type: "delivery_receipt",
      messageId,
      conversationId,
      userId: this.userId,
      status,
      timestamp: Date.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Send read receipt
   */
  sendReadReceipt(messageId: string, conversationId: string): void {
    const message = {
      type: "read_receipt",
      messageId,
      conversationId,
      userId: this.userId,
      timestamp: Date.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Send message through WebSocket
   */
  private sendMessage(message: any): void {
    if (this.isConnected && this.ws) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
        // Queue message for retry
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for when connection is restored
      this.messageQueue.push(message);
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.handlers.onError?.(
        new Error("Failed to reconnect after maximum attempts")
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      30000
    );

    console.log(
      `Scheduling reconnection attempt ${this.reconnectAttempts} in ${delay}ms`
    );

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("Reconnection failed:", error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Join a conversation room
   */
  joinConversation(conversationId: string): void {
    const message = {
      type: "join_conversation",
      conversationId,
      userId: this.userId,
    };

    this.sendMessage(message);
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string): void {
    const message = {
      type: "leave_conversation",
      conversationId,
      userId: this.userId,
    };

    this.sendMessage(message);
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.isConnected = false;

    // Clear timeouts
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Stop heartbeat
    this.stopHeartbeat();

    // Close WebSocket
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    // Clear message queue
    this.messageQueue = [];

    // Remove all listeners
    this.removeAllListeners();
  }

  /**
   * Update handlers
   */
  updateHandlers(handlers: RealtimeEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers };
  }
}
