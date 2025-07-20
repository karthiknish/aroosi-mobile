// Core message status types aligned across platforms
export type MessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

// Legacy status support for backward compatibility
export type LegacyMessageStatus =
  | "sending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export interface MessageDeliveryReceipt {
  messageId: string;
  userId: string;
  status: MessageStatus;
  timestamp: number;
}

// Unified Message interface aligned with web platform
export interface Message {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: "text" | "voice" | "image";

  // Voice message fields
  audioStorageId?: string;
  duration?: number;

  // Image message fields
  imageStorageId?: string;

  // Common metadata
  fileSize?: number;
  mimeType?: string;
  createdAt: number;
  readAt?: number;

  // Client-side fields
  status?: MessageStatus;
  isOptimistic?: boolean;
  deliveryReceipts?: MessageDeliveryReceipt[];

  // Backward compatibility fields
  id?: string;
  senderId?: string;
  content?: string;
  _creationTime?: number;
  timestamp?: number;
  isRead?: boolean;
  voiceUrl?: string;
  voiceDuration?: number;
  voiceWaveform?: number[];
  fileUrl?: string;
  fileName?: string;
  thumbnailUrl?: string;
  editedAt?: number;
  replyToId?: string;
  isSystemMessage?: boolean;
}

// Unified Conversation interface aligned with web platform
export interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: number;
  unreadCount: number;
  isBlocked: boolean;

  // Backward compatibility fields
  _id?: string;
  conversationId?: string;
  lastMessageAt?: number;
  isTyping?: string[];
  title?: string;
  description?: string;
  isGroup?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
