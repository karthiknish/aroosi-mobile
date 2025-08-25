import { Message } from "./message";
import { ApiResponse } from "../../types/profile";

// Re-export types for consistency
export { Message };

// Unified MessagingAPI interface aligned across platforms
export interface MessagingAPI {
  // Message operations
  getMessages(
    conversationId: string,
    options?: { limit?: number; before?: number }
  ): Promise<ApiResponse<Message[]>>;

  sendMessage(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }): Promise<ApiResponse<Message>>;

  markConversationAsRead(conversationId: string): Promise<ApiResponse<void>>;

  // Voice message operations
  generateVoiceUploadUrl(): Promise<ApiResponse<{ uploadUrl: string; storageId: string }>>;
  getVoiceMessageUrl(storageId: string): Promise<ApiResponse<{ url: string }>>;

  // Real-time operations (fire-and-forget)
  sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void>;
  sendDeliveryReceipt(messageId: string, status: string): Promise<void>;

  // Conversation operations
  getConversations(): Promise<ApiResponse<any[]>>;
  createConversation(
    participantIds: string[]
  ): Promise<ApiResponse<any>>;
  deleteConversation(conversationId: string): Promise<ApiResponse<void>>;
}

// Real-time event types
export interface RealtimeEvents {
  // Message events
  "message:new": (message: Message) => void;
  "message:read": (messageId: string, readByUserId: string) => void;
  "message:delivered": (messageId: string) => void;

  // Typing events
  "typing:start": (conversationId: string, userId: string) => void;
  "typing:stop": (conversationId: string, userId: string) => void;

  // Connection events
  "connection:status": (status: "connected" | "disconnected") => void;
}

// Voice recording and playback interfaces
export interface VoiceRecorder {
  startRecording(): Promise<void>;
  stopRecording(): Promise<Blob>;
  cancelRecording(): void;
  isRecording: boolean;
  duration: number;
}

export interface VoicePlayer {
  play(url: string): Promise<void>;
  pause(): void;
  stop(): void;
  seek(position: number): void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

// Message store interface for state management
export interface MessageStore {
  conversations: Record<string, any>;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  connectionStatus: "connected" | "connecting" | "disconnected";

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  markAsRead: (conversationId: string, messageIds: string[]) => void;
  setTyping: (
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) => void;
  setConnectionStatus: (
    status: "connected" | "connecting" | "disconnected"
  ) => void;
}
