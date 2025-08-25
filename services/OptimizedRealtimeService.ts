import { EventEmitter } from "events";
import {
  RealtimeMessage,
  TypingIndicator,
  DeliveryReceipt,
  RealtimeEventHandlers,
} from "./RealtimeMessagingService";

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  enableConnectionPooling: boolean;
  enableMessageBatching: boolean;
  batchSize: number;
  batchTimeout: number;
}

export interface ConnectionMetrics {
  connectionCount: number;
  activeConnections: number;
  totalMessagesReceived: number;
  totalMessagesSent: number;
  averageLatency: number;
  reconnectCount: number;
  lastConnectedAt: number;
  uptime: number;
  errorCount: number;
  messageQueueSize: number;
}

export interface ConnectionHealth {
  score: number; // 0-100
  status: "excellent" | "good" | "fair" | "poor" | "disconnected";
  issues: string[];
  recommendations: string[];
}

export class OptimizedRealtimeService extends EventEmitter {
  private userId: string;
  private tokenProvider?: () => Promise<string | null>;
  private config: ConnectionPoolConfig;
  private eventHandlers: RealtimeEventHandlers;
  private connections: Map<string, WebSocket> = new Map();
  private metrics: ConnectionMetrics;
  private messageQueue: RealtimeMessage[] = [];
  private typingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;

  constructor(
    userId: string,
    eventHandlers: RealtimeEventHandlers,
    config: Partial<ConnectionPoolConfig> = {},
    tokenProvider?: () => Promise<string | null>
  ) {
    super();
    this.userId = userId;
    this.eventHandlers = eventHandlers;
    this.config = {
      maxConnections: 3,
      connectionTimeout: 10000,
      reconnectInterval: 5000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      enableConnectionPooling: true,
      enableMessageBatching: true,
      batchSize: 10,
      batchTimeout: 100,
      ...config,
    };

    this.metrics = {
      connectionCount: 0,
      activeConnections: 0,
      totalMessagesReceived: 0,
      totalMessagesSent: 0,
      averageLatency: 0,
      reconnectCount: 0,
      lastConnectedAt: 0,
      uptime: 0,
      errorCount: 0,
      messageQueueSize: 0,
    };
    this.tokenProvider = tokenProvider;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected) return;

    this.isConnecting = true;

    try {
      // Create primary connection
      await this.createConnection("primary");

      // Create backup connections if pooling is enabled
      if (this.config.enableConnectionPooling) {
        for (let i = 1; i < this.config.maxConnections; i++) {
          this.createConnection(`backup-${i}`).catch(console.warn);
        }
      }

      this.isConnected = true;
      this.isConnecting = false;
      this.metrics.lastConnectedAt = Date.now();

      // Start heartbeat
      this.startHeartbeat();

      this.eventHandlers.onConnectionChange?.(true);
    } catch (error) {
      this.isConnecting = false;
      this.eventHandlers.onError?.(error as Error);
      throw error;
    }
  }

  disconnect(): void {
    this.isConnected = false;
    this.isConnecting = false;

    // Close all connections
    for (const [key, ws] of this.connections.entries()) {
      ws.close();
      this.connections.delete(key);
    }

    // Clear timeouts
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const timeout of this.reconnectTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.reconnectTimeouts.clear();

    for (const timeout of this.typingTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.typingTimeouts.clear();

    this.eventHandlers.onConnectionChange?.(false);
  }

  async sendMessage(
    message: Omit<RealtimeMessage, "id" | "timestamp">
  ): Promise<void> {
    if (!this.isConnected) {
      throw new Error("Not connected to realtime service");
    }

    const fullMessage: RealtimeMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    if (this.config.enableMessageBatching) {
      this.messageQueue.push(fullMessage);
      this.processBatchedMessages();
    } else {
      await this.sendMessageDirect(fullMessage);
    }
  }

  sendTypingIndicator(conversationId: string, action: "start" | "stop"): void {
    if (!this.isConnected) return;

    const indicator: TypingIndicator = {
      conversationId,
      userId: this.userId,
      isTyping: action === "start",
      timestamp: Date.now(),
    };

    // Clear existing timeout for this conversation
    const existingTimeout = this.typingTimeouts.get(conversationId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Send indicator
    this.sendTypingIndicatorDirect(indicator);

    // Auto-stop typing after 3 seconds
    if (action === "start") {
      const timeout = setTimeout(() => {
        this.sendTypingIndicator(conversationId, "stop");
      }, 3000);
      this.typingTimeouts.set(conversationId, timeout);
    }
  }

  optimizeConnection(): void {
    // Implement connection optimization logic
    console.log("Optimizing connection...");
  }

  optimizeForBackground(): void {
    // Reduce connection frequency for background mode
    console.log("Optimizing for background...");
  }

  getConnectionHealth(): number {
    if (!this.isConnected) return 0;

    const latencyScore = Math.max(0, 100 - this.metrics.averageLatency / 10);
    const errorScore = Math.max(0, 100 - this.metrics.errorCount * 10);
    const uptimeScore = Math.min(100, (this.metrics.uptime / 3600000) * 10); // Hours to score

    return Math.round((latencyScore + errorScore + uptimeScore) / 3);
  }

  getConnectionMetrics(): ConnectionMetrics {
    return { ...this.metrics };
  }

  subscribeToConversation(conversationId: string): void {
    // Implement conversation subscription logic
    console.log(`Subscribing to conversation: ${conversationId}`);
  }

  unsubscribeFromConversation(conversationId: string): void {
    // Implement conversation unsubscription logic
    console.log(`Unsubscribing from conversation: ${conversationId}`);
  }

  private async createConnection(key: string): Promise<void> {
    const token = this.tokenProvider ? await this.tokenProvider() : null;
    const baseUrl = "wss://your-websocket-url.com"; // TODO: replace with env/config constant
    const url = new URL(baseUrl);
    url.searchParams.set("uid", this.userId);
    if (token) url.searchParams.set("token", token);

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url.toString());

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("Connection timeout"));
      }, this.config.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(timeout);
        this.connections.set(key, ws);
        this.metrics.connectionCount++;
        this.metrics.activeConnections++;
        // Send initial auth message if token not passed as query or needs verification handshake
        if (token) {
          try {
            ws.send(
              JSON.stringify({
                type: "auth",
                token,
                userId: this.userId,
                ts: Date.now(),
              })
            );
          } catch (e) {
            console.warn("Failed to send initial auth message", e);
          }
        }
        resolve();
      };

      ws.onclose = () => {
        this.connections.delete(key);
        this.metrics.activeConnections--;
        this.handleConnectionLoss(key);
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        this.metrics.errorCount++;
        reject(error);
      };

      ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    });
  }

  private handleConnectionLoss(key: string): void {
    if (key === "primary" && this.isConnected) {
      // Primary connection lost - attempt reconnect
      this.attemptReconnect(key);
    }
  }

  private attemptReconnect(key: string): void {
    const timeout = setTimeout(async () => {
      try {
        await this.createConnection(key);
        this.metrics.reconnectCount++;
      } catch (error) {
        console.warn(`Failed to reconnect ${key}:`, error);
        // Try again if we haven't exceeded max attempts
        if (this.metrics.reconnectCount < this.config.maxReconnectAttempts) {
          this.attemptReconnect(key);
        }
      }
    }, this.config.reconnectInterval);

    this.reconnectTimeouts.set(key, timeout);
  }

  /**
   * Refresh authentication token for all active connections by sending an auth_refresh
   */
  async refreshAuth(): Promise<void> {
    if (!this.tokenProvider) return;
    const token = await this.tokenProvider();
    if (!token) return;
    for (const ws of this.connections.values()) {
      try {
        ws.send(
          JSON.stringify({
            type: "auth_refresh",
            token,
            userId: this.userId,
            ts: Date.now(),
          })
        );
      } catch (e) {
        console.warn("Failed to send auth_refresh", e);
      }
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      this.metrics.totalMessagesReceived++;

      // Route message to appropriate handler
      if (message.type === "message") {
        this.eventHandlers.onMessage?.(message as RealtimeMessage);
      } else if (message.type === "typing") {
        this.eventHandlers.onTypingIndicator?.(message as TypingIndicator);
      } else if (message.type === "receipt") {
        this.eventHandlers.onDeliveryReceipt?.(message as DeliveryReceipt);
      }
    } catch (error) {
      console.error("Failed to parse message:", error);
      this.metrics.errorCount++;
    }
  }

  private async sendMessageDirect(message: RealtimeMessage): Promise<void> {
    const primaryConnection = this.connections.get("primary");
    if (!primaryConnection) {
      throw new Error("No primary connection available");
    }

    primaryConnection.send(JSON.stringify(message));
    this.metrics.totalMessagesSent++;
  }

  private sendTypingIndicatorDirect(indicator: TypingIndicator): void {
    const primaryConnection = this.connections.get("primary");
    if (!primaryConnection) return;

    primaryConnection.send(
      JSON.stringify({
        type: "typing",
        ...indicator,
      })
    );
  }

  private processBatchedMessages(): void {
    if (this.messageQueue.length === 0) return;

    const timeout = setTimeout(() => {
      this.flushMessageQueue();
    }, this.config.batchTimeout);

    if (this.messageQueue.length >= this.config.batchSize) {
      clearTimeout(timeout);
      this.flushMessageQueue();
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    const messages = [...this.messageQueue];
    this.messageQueue = [];

    const primaryConnection = this.connections.get("primary");
    if (!primaryConnection) return;

    primaryConnection.send(
      JSON.stringify({
        type: "batch",
        messages,
      })
    );

    this.metrics.totalMessagesSent += messages.length;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const primaryConnection = this.connections.get("primary");
      if (primaryConnection) {
        primaryConnection.send(JSON.stringify({ type: "ping" }));
      }
    }, this.config.heartbeatInterval);
  }
}
