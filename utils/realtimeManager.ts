import { EventSourcePolyfill } from "event-source-polyfill";
import { Platform } from "react-native";

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: number;
}

export interface RealtimeOptions {
  token: string;
  baseUrl: string;
  onMessage?: (event: RealtimeEvent) => void;
  onNewMessage?: (message: any) => void;
  onNewMatch?: (match: any) => void;
  onTypingIndicator?: (data: any) => void;
  onProfileView?: (data: any) => void;
  onError?: (error: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class RealtimeManager {
  private eventSource: EventSourcePolyfill | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private options: RealtimeOptions;
  private isConnected = false;

  constructor(options: RealtimeOptions) {
    this.options = options;
  }

  public connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      const url = `${this.options.baseUrl}/realtime/events?token=${this.options.token}`;

      this.eventSource = new EventSourcePolyfill(url, {
        headers: {
          Authorization: `Bearer ${this.options.token}`,
        },
        withCredentials: true,
      });

      this.eventSource.onopen = () => {
        console.log("Realtime connection established");
        this.isConnected = true;
        this.reconnectAttempts = 0;
        if (this.options.onConnect) {
          this.options.onConnect();
        }
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleRealtimeEvent(data);
        } catch (error) {
          console.error("Error parsing realtime event:", error);
        }
      };

      this.eventSource.onerror = (error) => {
        console.error("Realtime connection error:", error);
        this.isConnected = false;
        this.handleConnectionError();
      };

      // Set up event listeners for specific event types
      this.eventSource.addEventListener("new_message", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.options.onNewMessage) {
            this.options.onNewMessage(data);
          }
        } catch (error) {
          console.error("Error parsing new_message event:", error);
        }
      });

      this.eventSource.addEventListener("new_match", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.options.onNewMatch) {
            this.options.onNewMatch(data);
          }
        } catch (error) {
          console.error("Error parsing new_match event:", error);
        }
      });

      this.eventSource.addEventListener("typing_indicator", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.options.onTypingIndicator) {
            this.options.onTypingIndicator(data);
          }
        } catch (error) {
          console.error("Error parsing typing_indicator event:", error);
        }
      });

      this.eventSource.addEventListener("profile_view", (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.options.onProfileView) {
            this.options.onProfileView(data);
          }
        } catch (error) {
          console.error("Error parsing profile_view event:", error);
        }
      });
    } catch (error) {
      console.error("Error creating EventSource:", error);
      this.handleConnectionError();
    }
  }

  public disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnected = false;

    if (this.options.onDisconnect) {
      this.options.onDisconnect();
    }
  }

  public isConnectedToRealtime(): boolean {
    return this.isConnected;
  }

  private handleRealtimeEvent(event: RealtimeEvent): void {
    if (this.options.onMessage) {
      this.options.onMessage(event);
    }

    switch (event.type) {
      case "new_message":
        if (this.options.onNewMessage) {
          this.options.onNewMessage(event.data);
        }
        break;
      case "new_match":
        if (this.options.onNewMatch) {
          this.options.onNewMatch(event.data);
        }
        break;
      case "typing_indicator":
        if (this.options.onTypingIndicator) {
          this.options.onTypingIndicator(event.data);
        }
        break;
      case "profile_view":
        if (this.options.onProfileView) {
          this.options.onProfileView(event.data);
        }
        break;
    }
  }

  private handleConnectionError(): void {
    if (this.options.onError) {
      this.options.onError("Realtime connection error");
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff

      console.log(
        `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
      );

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error(
        `Max reconnect attempts (${this.maxReconnectAttempts}) reached`
      );
      if (this.options.onError) {
        this.options.onError("Max reconnect attempts reached");
      }
    }
  }

  public updateToken(newToken: string): void {
    this.options.token = newToken;
    if (this.isConnected) {
      this.disconnect();
      this.connect();
    }
  }
}
