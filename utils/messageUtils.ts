import { Message, Conversation, MessageStatus } from '../types/message';

// Message formatting utilities
export function formatMessageTime(timestamp: number): string {
  const now = new Date();
  const messageDate = new Date(timestamp);
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays === 1) {
    return 'Yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    return messageDate.toLocaleDateString();
  }
}

export function formatVoiceDuration(durationInSeconds: number): string {
  const minutes = Math.floor(durationInSeconds / 60);
  const seconds = Math.floor(durationInSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function truncateMessage(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Conversation ID utilities
export function createConversationId(userId1: string, userId2: string): string {
  const sortedIds = [userId1, userId2].sort();
  return `${sortedIds[0]}_${sortedIds[1]}`;
}

export function parseConversationId(conversationId: string): { user1: string; user2: string } | null {
  const parts = conversationId.split('_');
  if (parts.length !== 2) return null;
  
  return {
    user1: parts[0],
    user2: parts[1]
  };
}

export function getOtherUserId(conversationId: string, currentUserId: string): string | null {
  const parsed = parseConversationId(conversationId);
  if (!parsed) return null;
  
  return parsed.user1 === currentUserId ? parsed.user2 : parsed.user1;
}

// Message grouping utilities
export function groupMessagesByDate(messages: Message[]): Record<string, Message[]> {
  const groups: Record<string, Message[]> = {};
  
  messages.forEach(message => {
    const timestamp = message.timestamp || message.createdAt || message._creationTime || Date.now();
    const date = new Date(timestamp);
    const dateKey = date.toDateString();
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(message);
  });
  
  return groups;
}

export function shouldShowTimestamp(currentMessage: Message, previousMessage?: Message): boolean {
  if (!previousMessage) return true;
  
  const currentTime = currentMessage.timestamp || currentMessage.createdAt || currentMessage._creationTime || 0;
  const previousTime = previousMessage.timestamp || previousMessage.createdAt || previousMessage._creationTime || 0;
  const timeDiff = currentTime - previousTime;
  const minutesDiff = timeDiff / (1000 * 60);
  
  // Show timestamp if more than 15 minutes apart or different sender
  const currentSender = currentMessage.senderId || currentMessage.fromUserId;
  const previousSender = previousMessage.senderId || previousMessage.fromUserId;
  
  return minutesDiff > 15 || currentSender !== previousSender;
}

// Message status utilities
export function getMessageStatus(message: Message): MessageStatus {
  if (message.status) return message.status;
  
  if (message.readAt) return 'read';
  if (message.isRead) return 'read';
  
  // Default to sent if we have the message
  return 'sent';
}

export function isMessageRead(message: Message, currentUserId: string): boolean {
  const sender = message.senderId || message.fromUserId;
  
  // Only check read status for sent messages
  if (sender === currentUserId) {
    return !!(message.readAt || message.isRead);
  }
  
  return false;
}

// Unread message utilities
export function calculateUnreadCount(messages: Message[], currentUserId: string): number {
  return messages.filter(message => {
    const recipient = message.toUserId;
    return recipient === currentUserId && !message.readAt && !message.isRead;
  }).length;
}

export function getLastMessage(messages: Message[]): Message | null {
  if (messages.length === 0) return null;
  return messages[messages.length - 1];
}

// Voice message utilities
export function isVoiceMessage(message: Message): boolean {
  return message.type === 'voice' && !!(message.audioStorageId || message.voiceUrl);
}

// Message preview utilities
export function getMessagePreview(message: Message): string {
  if (message.type === 'voice') {
    const duration = message.duration || message.voiceDuration || 0;
    return `🎤 Voice message (${formatVoiceDuration(duration)})`;
  } else if (message.type === 'image') {
    return '📷 Image';
  } else {
    const text = message.content || message.text || '';
    return truncateMessage(text, 40);
  }
}

// Data transformation utilities
export function normalizeMessage(message: any): Message {
  return {
    _id: message._id || message.id,
    id: message.id || message._id,
    conversationId: message.conversationId,
    fromUserId: message.fromUserId || message.senderId,
    toUserId: message.toUserId,
    senderId: message.senderId || message.fromUserId,
    text: message.text || message.content || '',
    content: message.content || message.text || '',
    type: message.type || 'text',
    _creationTime: message._creationTime || message.createdAt || message.timestamp || Date.now(),
    createdAt: message.createdAt || message._creationTime || message.timestamp,
    timestamp: message.timestamp || message.createdAt || message._creationTime,
    readAt: message.readAt,
    isRead: message.isRead || !!message.readAt,
    status: message.status || (message.readAt ? 'read' : 'sent'),
    deliveryReceipts: message.deliveryReceipts || [],
    audioStorageId: message.audioStorageId,
    duration: message.duration || message.voiceDuration,
    voiceUrl: message.voiceUrl,
    voiceDuration: message.voiceDuration || message.duration,
    voiceWaveform: message.voiceWaveform,
    fileSize: message.fileSize,
    mimeType: message.mimeType,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    thumbnailUrl: message.thumbnailUrl,
    editedAt: message.editedAt,
    replyToId: message.replyToId,
    isSystemMessage: message.isSystemMessage,
  };
}

export function normalizeConversation(conversation: any): Conversation {
  return {
    _id: conversation._id || conversation.id,
    id: conversation.id || conversation._id,
    conversationId: conversation.conversationId || conversation._id || conversation.id,
    participants: conversation.participants || [],
    lastMessage: conversation.lastMessage ? normalizeMessage(conversation.lastMessage) : undefined,
    lastActivity: conversation.lastActivity || conversation.lastMessageAt || Date.now(),
    lastMessageAt: conversation.lastMessageAt || conversation.lastActivity,
    unreadCount: conversation.unreadCount || 0,
    isTyping: conversation.isTyping || [],
    title: conversation.title,
    description: conversation.description,
    isGroup: conversation.isGroup || false,
    createdAt: conversation.createdAt || Date.now(),
    updatedAt: conversation.updatedAt || conversation.lastActivity || Date.now(),
  };
}

// Search and filter utilities
export function searchMessages(messages: Message[], query: string): Message[] {
  const lowercaseQuery = query.toLowerCase();
  return messages.filter(message => {
    const text = message.text || message.content || '';
    return text.toLowerCase().includes(lowercaseQuery);
  });
}

export function filterMessagesByType(messages: Message[], type: 'text' | 'voice' | 'image'): Message[] {
  return messages.filter(message => message.type === type);
}

// Conversation utilities
export function sortConversationsByActivity(conversations: Conversation[]): Conversation[] {
  return conversations.sort((a, b) => {
    const aTime = a.lastActivity || a.lastMessageAt || a.updatedAt || 0;
    const bTime = b.lastActivity || b.lastMessageAt || b.updatedAt || 0;
    return bTime - aTime;
  });
}

export function getTotalUnreadCount(conversations: Conversation[]): number {
  return conversations.reduce((total, conversation) => total + (conversation.unreadCount || 0), 0);
}