import { EventEmitter } from "events";
import NetInfo from "@react-native-community/netinfo";

export interface WebSocketConnection {
  id: string;
  url: string;
  ws: WebSocket;
  state: "connecting" | "connected" | "disconnected" | "error";
  lastActivity: number;
  reconnectAttempts: number;
  metrics: {
    latency: number;
    messagesPerSecond: number;
    errorRate: number;
    uptime: number;
    bytesTransferred: number;
  };
}

export interface ConnectionManagerConfig {
  maxConnections: number;
  connectionTimeout: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  healthCheckInterval: number;
  loadBalancingStrategy: "round-robin" | "least-latency" | "least-load";
  enableFailover: boolean;
  compressionEnabled: boolean;
}

export interface LoadBalancingStrategy {
  selectConnection(
    connections: WebSocketConnection[]
  ): WebSocketConnection | null;
}

/**
 * Round-robin load balancing strategy
 */
class RoundRobinStrategy implements LoadBalancingStrategy {
  private currentIndex = 0;

  selectConnection(
    connections: WebSocketConnection[]
  ): WebSocketConnection | null {
    const activeConnections = connections.filter(
      (conn) => conn.state === "connected"
    );
    if (activeConnections.length === 0) return null;

    const connection =
      activeConnections[this.currentIndex % activeConnections.length];
    this.currentIndex = (this.currentIndex + 1) % activeConnections.length;

    return connection;
  }
}

/**
 * Least latency load balancing strategy
 */
class LeastLatencyStrategy implements LoadBalancingStrategy {
  selectConnection(
    connections: WebSocketConnection[]
  ): WebSocketConnection | null {
    const activeConnections = connections.filter(
      (conn) => conn.state === "connected"
    );
    if (activeConnections.length === 0) return null;

    return activeConnections.reduce((best, current) =>
      current.metrics.latency < best.metrics.latency ? current : best
    );
  }
}

/**
 * Least load balancing strategy
 */
class LeastLoadStrategy implements LoadBalancingStrategy {
  selectConnection(
    connections: WebSocketConnection[]
  ): WebSocketConnection | null {
    const activeConnections = connections.filter(
      (conn) => conn.state === "connected"
    );
    if (activeConnections.length === 0) return null;

    return activeConnections.reduce((best, current) =>
      current.metrics.messagesPerSecond < best.metrics.messagesPerSecond
        ? current
        : best
    );
  }
}

/**
 * WebSocket Connection Manager with pooling and load balancing
 */
export class WebSocketConnectionManager extends EventEmitter {
  private connections = new Map<string, WebSocketConnection>();
  private config: ConnectionManagerConfig;
  private loadBalancer: LoadBalancingStrategy;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimers = new Map<string, NodeJS.Timeout>();
  private isNetworkAvailable = true;
  private messageQueue: Array<{ message: any; priority: number }> = [];

  constructor(config: Partial<ConnectionManagerConfig> = {}) {
    super();

    this.config = {
      maxConnections: 3,
      connectionTimeout: 10000,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      healthCheckInterval: 30000,
      loadBalancingStrategy: "least-latency",
      enableFailover: true,
      compressionEnabled: true,
      ...config,
    };

    this.loadBalancer = this.createLoadBalancer(
      this.config.loadBalancingStrategy
    );
    this.setupNetworkMonitoring();
    this.startHealthCheck();
  }

  /**
   * Create load balancer based on strategy
   */
  private createLoadBalancer(strategy: string): LoadBalancingStrategy {
    switch (strategy) {
      case "round-robin":
        return new RoundRobinStrategy();
      case "least-latency":
        return new LeastLatencyStrategy();
      case "least-load":
        return new LeastLoadStrategy();
      default:
        return new LeastLatencyStrategy();
    }
  }

  /**
   * Add a WebSocket connection to the pool
   */
  async addConnection(id: string, url: string): Promise<boolean> {
    if (this.connections.size >= this.config.maxConnections) {
      console.warn("Maximum connections reached");
      return false;
    }

    if (this.connections.has(id)) {
      console.warn(`Connection ${id} already exists`);
      return false;
    }

    try {
      const connection = await this.createConnection(id, url);
      this.connections.set(id, connection);

      console.log(`Connection ${id} added successfully`);
      this.emit("connection_added", connection);

      return true;
    } catch (error) {
      console.error(`Failed to add connection ${id}:`, error);
      return false;
    }
  }

  /**
   * Create a WebSocket connection
   */
  private async createConnection(
    id: string,
    url: string
  ): Promise<WebSocketConnection> {
    return new Promise((resolve, reject) => {
      const wsUrl = this.config.compressionEnabled
        ? `${url}?compression=true`
        : url;

      const ws = new WebSocket(wsUrl);
      const startTime = Date.now();

      const connection: WebSocketConnection = {
        id,
        url,
        ws,
        state: "connecting",
        lastActivity: Date.now(),
        reconnectAttempts: 0,
        metrics: {
          latency: 0,
          messagesPerSecond: 0,
          errorRate: 0,
          uptime: 0,
          bytesTransferred: 0,
        },
      };

      // Connection timeout
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error(`Connection timeout for ${id}`));
      }, this.config.connectionTimeout);

      ws.onopen = () => {
        clearTimeout(timeout);
        connection.state = "connected";
        connection.metrics.uptime = Date.now();

        console.log(`WebSocket ${id} connected`);
        this.emit("connection_opened", connection);

        resolve(connection);
      };

      ws.onmessage = (event) => {
        connection.lastActivity = Date.now();
        connection.metrics.bytesTransferred += event.data.length;

        // Calculate latency if message has timestamp
        try {
          const data = JSON.parse(event.data);
          if (data.timestamp) {
            const latency = Date.now() - data.timestamp;
            connection.metrics.latency =
              connection.metrics.latency * 0.8 + latency * 0.2;
          }
        } catch (e) {
          // Ignore parsing errors for latency calculation
        }

        this.emit("message", { connectionId: id, data: event.data });
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        connection.state = "disconnected";

        console.log(`WebSocket ${id} disconnected:`, event.code, event.reason);
        this.emit("connection_closed", { connection, event });

        // Schedule reconnection if not intentional
        if (event.code !== 1000 && this.config.enableFailover) {
          this.scheduleReconnection(connection);
        }
      };

      ws.onerror = (error) => {
        clearTimeout(timeout);
        connection.state = "error";
        connection.metrics.errorRate += 1;

        console.error(`WebSocket ${id} error:`, error);
        this.emit("connection_error", { connection, error });

        reject(error);
      };
    });
  }

  /**
   * Remove a connection from the pool
   */
  removeConnection(id: string): boolean {
    const connection = this.connections.get(id);
    if (!connection) {
      return false;
    }

    // Clear reconnect timer if exists
    const timer = this.reconnectTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.reconnectTimers.delete(id);
    }

    // Close WebSocket
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.close(1000, "Connection removed");
    }

    this.connections.delete(id);
    this.emit("connection_removed", connection);

    console.log(`Connection ${id} removed`);
    return true;
  }

  /**
   * Send message using load balancing
   */
  sendMessage(message: any, priority: number = 1): boolean {
    if (!this.isNetworkAvailable) {
      this.queueMessage(message, priority);
      return false;
    }

    const connection = this.loadBalancer.selectConnection(
      Array.from(this.connections.values())
    );
    if (!connection) {
      this.queueMessage(message, priority);
      return false;
    }

    try {
      const messageStr = JSON.stringify({
        ...message,
        timestamp: Date.now(),
      });

      connection.ws.send(messageStr);
      connection.lastActivity = Date.now();
      connection.metrics.bytesTransferred += messageStr.length;
      connection.metrics.messagesPerSecond += 1;

      return true;
    } catch (error) {
      console.error("Failed to send message:", error);
      this.queueMessage(message, priority);
      return false;
    }
  }

  /**
   * Send message to specific connection
   */
  sendMessageToConnection(connectionId: string, message: any): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.state !== "connected") {
      return false;
    }

    try {
      const messageStr = JSON.stringify({
        ...message,
        timestamp: Date.now(),
      });

      connection.ws.send(messageStr);
      connection.lastActivity = Date.now();
      connection.metrics.bytesTransferred += messageStr.length;
      connection.metrics.messagesPerSecond += 1;

      return true;
    } catch (error) {
      console.error(`Failed to send message to ${connectionId}:`, error);
      return false;
    }
  }

  /**
   * Queue message for later sending
   */
  private queueMessage(message: any, priority: number): void {
    this.messageQueue.push({ message, priority });

    // Sort by priority (higher priority first)
    this.messageQueue.sort((a, b) => b.priority - a.priority);

    // Limit queue size
    if (this.messageQueue.length > 1000) {
      this.messageQueue = this.messageQueue.slice(0, 1000);
    }
  }

  /**
   * Process queued messages
   */
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const { message, priority } = this.messageQueue.shift()!;
      if (!this.sendMessage(message, priority)) {
        // If sending fails, put it back at the front
        this.messageQueue.unshift({ message, priority });
        break;
      }
    }
  }

  /**
   * Schedule reconnection for a connection
   */
  private scheduleReconnection(connection: WebSocketConnection): void {
    if (connection.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for ${connection.id}`);
      this.emit("connection_failed", connection);
      return;
    }

    connection.reconnectAttempts++;
    const delay =
      this.config.reconnectDelay *
      Math.pow(2, connection.reconnectAttempts - 1);

    console.log(`Scheduling reconnection for ${connection.id} in ${delay}ms`);

    const timer = setTimeout(async () => {
      try {
        const newConnection = await this.createConnection(
          connection.id,
          connection.url
        );
        this.connections.set(connection.id, newConnection);

        console.log(`Connection ${connection.id} reconnected successfully`);
        this.emit("connection_reconnected", newConnection);

        // Process queued messages
        this.processMessageQueue();
      } catch (error) {
        console.error(`Reconnection failed for ${connection.id}:`, error);
        this.scheduleReconnection(connection);
      }
    }, delay);

    this.reconnectTimers.set(connection.id, timer);
  }

  /**
   * Setup network monitoring
   */
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener((state) => {
      const wasAvailable = this.isNetworkAvailable;
      this.isNetworkAvailable = !!state.isConnected;

      if (!wasAvailable && this.isNetworkAvailable) {
        console.log("Network restored - processing queued messages");
        this.processMessageQueue();
        this.emit("network_restored");
      } else if (wasAvailable && !this.isNetworkAvailable) {
        console.log("Network lost - queuing messages");
        this.emit("network_lost");
      }
    });
  }

  /**
   * Start health check for all connections
   */
  private startHealthCheck(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform health check on all connections
   */
  private performHealthCheck(): void {
    const now = Date.now();

    for (const [id, connection] of this.connections.entries()) {
      // Update uptime
      if (connection.state === "connected") {
        connection.metrics.uptime = now - connection.metrics.uptime;
      }

      // Reset messages per second counter
      connection.metrics.messagesPerSecond = 0;

      // Check if connection is stale
      const timeSinceLastActivity = now - connection.lastActivity;
      if (timeSinceLastActivity > this.config.healthCheckInterval * 2) {
        console.warn(`Connection ${id} appears stale, sending ping`);
        this.sendPing(connection);
      }

      // Check connection state
      if (connection.ws.readyState === WebSocket.CLOSED) {
        console.warn(`Connection ${id} is closed, scheduling reconnection`);
        this.scheduleReconnection(connection);
      }
    }

    this.emit("health_check_completed", {
      totalConnections: this.connections.size,
      activeConnections: this.getActiveConnectionCount(),
      queuedMessages: this.messageQueue.length,
    });
  }

  /**
   * Send ping to connection
   */
  private sendPing(connection: WebSocketConnection): void {
    if (connection.state === "connected") {
      try {
        connection.ws.send(
          JSON.stringify({ type: "ping", timestamp: Date.now() })
        );
      } catch (error) {
        console.error(`Failed to send ping to ${connection.id}:`, error);
      }
    }
  }

  /**
   * Get number of active connections
   */
  getActiveConnectionCount(): number {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.state === "connected"
    ).length;
  }

  /**
   * Get connection by ID
   */
  getConnection(id: string): WebSocketConnection | undefined {
    return this.connections.get(id);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection metrics
   */
  getConnectionMetrics(): Map<string, WebSocketConnection["metrics"]> {
    const metrics = new Map<string, WebSocketConnection["metrics"]>();

    for (const [id, connection] of this.connections.entries()) {
      metrics.set(id, { ...connection.metrics });
    }

    return metrics;
  }

  /**
   * Get overall statistics
   */
  getStatistics(): {
    totalConnections: number;
    activeConnections: number;
    averageLatency: number;
    totalBytesTransferred: number;
    queuedMessages: number;
    networkAvailable: boolean;
  } {
    const connections = Array.from(this.connections.values());
    const activeConnections = connections.filter(
      (conn) => conn.state === "connected"
    );

    const averageLatency =
      activeConnections.length > 0
        ? activeConnections.reduce(
            (sum, conn) => sum + conn.metrics.latency,
            0
          ) / activeConnections.length
        : 0;

    const totalBytesTransferred = connections.reduce(
      (sum, conn) => sum + conn.metrics.bytesTransferred,
      0
    );

    return {
      totalConnections: connections.length,
      activeConnections: activeConnections.length,
      averageLatency,
      totalBytesTransferred,
      queuedMessages: this.messageQueue.length,
      networkAvailable: this.isNetworkAvailable,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ConnectionManagerConfig>): void {
    this.config = { ...this.config, ...config };

    // Update load balancer if strategy changed
    if (config.loadBalancingStrategy) {
      this.loadBalancer = this.createLoadBalancer(config.loadBalancingStrategy);
    }

    // Restart health check if interval changed
    if (config.healthCheckInterval && this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.startHealthCheck();
    }
  }

  /**
   * Disconnect all connections and cleanup
   */
  disconnect(): void {
    // Clear health check timer
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Clear all reconnect timers
    for (const timer of this.reconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.reconnectTimers.clear();

    // Close all connections
    for (const connection of this.connections.values()) {
      if (connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.close(1000, "Manager shutdown");
      }
    }

    this.connections.clear();
    this.messageQueue = [];

    // Remove all listeners
    this.removeAllListeners();

    console.log("WebSocket Connection Manager disconnected");
  }
}
