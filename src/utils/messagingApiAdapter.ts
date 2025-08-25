import { apiClient } from "../../utils/api";
import { MessagingAPI } from "@/types/messaging";
import { Message } from "@/types/message";
import { ApiResponse } from "../../types/profile";

export class MessagingApiAdapter implements MessagingAPI {
  private client = apiClient;

  async getMessages(conversationId: string, options?: { limit?: number; before?: number }): Promise<ApiResponse<Message[]>> {
    return await this.client.getMessages(conversationId, options);
  }

  async sendMessage(data: {
    conversationId: string;
    fromUserId: string;
    toUserId: string;
    text?: string;
    type?: "text" | "voice" | "image";
    audioStorageId?: string;
    duration?: number;
    fileSize?: number;
    mimeType?: string;
  }): Promise<ApiResponse<Message>> {
    return await this.client.sendMessage(data);
  }

  async markConversationAsRead(conversationId: string): Promise<ApiResponse<void>> {
    return await this.client.markConversationAsRead(conversationId);
  }

  async generateVoiceUploadUrl(): Promise<ApiResponse<{ uploadUrl: string; storageId: string }>> {
    return await this.client.generateVoiceUploadUrl();
  }

  async getVoiceMessageUrl(storageId: string): Promise<ApiResponse<{ url: string }>> {
    return await this.client.getVoiceMessageUrl(storageId);
  }

  async sendTypingIndicator(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<void> {
    await (this.client as any).sendTypingIndicator(conversationId, action);
  }

  async sendDeliveryReceipt(messageId: string, status: string): Promise<void> {
    await (this.client as any).sendDeliveryReceipt(messageId, status);
  }

  /**
   * Compatibility helpers returning ApiResponse envelope (used by some tests/services)
   */
  async sendTypingIndicatorResponse(
    conversationId: string,
    action: "start" | "stop"
  ): Promise<ApiResponse<void>> {
    try {
      await this.sendTypingIndicator(conversationId, action);
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "TYPING_ERROR", message: e?.message || "Failed" },
      };
    }
  }

  async sendDeliveryReceiptResponse(
    messageId: string,
    status: string
  ): Promise<ApiResponse<void>> {
    try {
      await this.sendDeliveryReceipt(messageId, status);
      return { success: true };
    } catch (e: any) {
      return {
        success: false,
        error: { code: "DELIVERY_ERROR", message: e?.message || "Failed" },
      };
    }
  }

  async getConversations(): Promise<ApiResponse<any[]>> {
  return await this.client.getConversations() as ApiResponse<any[]>;
  }

  async createConversation(participantIds: string[]): Promise<ApiResponse<any>> {
    // Not implemented in ApiClient
    throw new Error("createConversation not implemented");
  }

  async deleteConversation(conversationId: string): Promise<ApiResponse<void>> {
    // Not implemented in ApiClient
    throw new Error("deleteConversation not implemented");
  }

  // Extra methods used by chat UI (not in MessagingAPI interface yet)
  async editMessage(
    messageId: string,
    text: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return await this.client.editMessage(messageId, text);
  }

  async deleteMessage(
    messageId: string
  ): Promise<ApiResponse<{ success: boolean }>> {
    return await this.client.deleteMessage(messageId);
  }
}
