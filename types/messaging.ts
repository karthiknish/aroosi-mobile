import { Message, Conversation, MessageStatus } from "./message";
import { ApiResponse } from "./profile";

// Re-export types for consistency
export { ApiResponse, Message, Conversation, MessageStatus };

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
  generateVoiceUploadUrl(): Promise<
    ApiResponse<{ uploadUrl: string; storageId: string }>
  >;
  getVoiceMessageUrl(storageId: string): Promise<ApiResponse<{ url: string }>>;

  // Real-time operations
  sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void>;
  sendDeliveryReceipt(messageId: string, status: string): Promise<void>;

  // Conversation operations
  getConversations(): Promise<ApiResponse<Conversation[]>>;
  createConversation(
    participantIds: string[]
  ): Promise<ApiResponse<Conversation>>;
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
  conversations: Record<string, Conversation>;
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

// Subscription-based messaging features
export interface MessagingFeatures {
  canInitiateChat: boolean;
  canSendUnlimitedMessages: boolean;
  canSendVoiceMessages: boolean;
  canSendImageMessages: boolean;
  dailyMessageLimit: number;
  voiceMessageDurationLimit: number; // in seconds
}

// Error handling types
export enum MessagingErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  PERMISSION_DENIED = "PERMISSION_DENIED",
  MESSAGE_TOO_LONG = "MESSAGE_TOO_LONG",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  USER_BLOCKED = "USER_BLOCKED",
  SUBSCRIPTION_REQUIRED = "SUBSCRIPTION_REQUIRED",
  VOICE_RECORDING_FAILED = "VOICE_RECORDING_FAILED",
  FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface MessagingError {
  type: MessagingErrorType;
  message: string;
  details?: any;
  recoverable: boolean;
  retryAction?: () => Promise<void>;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitizedText?: string;
}

// Retry strategy interface
export interface RetryStrategy {
  maxRetries: number;
  backoffMs: number;
}

// Message cache interface
export interface MessageCacheInterface {
  getMessages(conversationId: string): Message[] | null;
  setMessages(conversationId: string, messages: Message[]): void;
  addMessage(conversationId: string, message: Message): void;
  clearCache(conversationId?: string): void;
}

// Optimistic message manager interface
export interface OptimisticMessageManager {
  addOptimisticMessage(message: Omit<Message, "_id">): string;
  confirmMessage(tempId: string, actualMessage: Message): void;
  rejectMessage(tempId: string, error: MessagingError): void;
}
