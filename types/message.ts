export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageDeliveryReceipt {
  messageId: string;
  userId: string;
  status: MessageStatus;
  timestamp: number;
}

export interface Message {
  _id: string;
  id?: string; // For backward compatibility
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  senderId?: string; // For backward compatibility
  text: string;
  content?: string; // For backward compatibility
  type?: 'text' | 'voice' | 'image'; // Made optional to match main project
  _creationTime?: number;
  createdAt: number; // Main timestamp field to match main project
  timestamp?: number; // For backward compatibility
  readAt?: number;
  isRead?: boolean;
  status?: MessageStatus;
  deliveryReceipts?: MessageDeliveryReceipt[];
  
  // Voice message specific - aligned with main project schema
  audioStorageId?: string;
  duration?: number;
  voiceUrl?: string; // For backward compatibility
  voiceDuration?: number; // For backward compatibility
  voiceWaveform?: number[];
  
  // File/image specific - aligned with main project schema
  fileSize?: number;
  mimeType?: string;
  fileUrl?: string;
  fileName?: string;
  thumbnailUrl?: string;
  
  // Metadata
  editedAt?: number;
  replyToId?: string;
  isSystemMessage?: boolean;
}

export interface Conversation {
  _id: string;
  id?: string; // For backward compatibility
  conversationId?: string;
  participants: string[];
  lastMessage?: Message;
  lastActivity: number;
  lastMessageAt?: number;
  unreadCount: number;
  isTyping?: string[]; // User IDs currently typing
  
  // Metadata
  title?: string;
  description?: string;
  isGroup?: boolean;
  createdAt: number;
  updatedAt: number;
}