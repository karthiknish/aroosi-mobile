export interface Message {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type: "text" | "voice" | "image";
  createdAt: number;
  readAt?: number;

  // Voice message fields
  audioStorageId?: string;
  duration?: number;

  // Image message fields
  imageStorageId?: string;

  // Common metadata
  fileSize?: number;
  mimeType?: string;

  // Client-side status lifecycle (broadened as requested)
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
  isOptimistic?: boolean;
  deliveryReceipts?: any[];

  // Backward compatibility fields (kept optional)
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
