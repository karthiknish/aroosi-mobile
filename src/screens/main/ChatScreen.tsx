import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useAuth } from "@clerk/clerk-expo";
import { Colors, Layout } from "../../../constants";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "../../../utils/api";
import LoadingState from "../../../components/ui/LoadingState";
import EmptyState from "../../../components/ui/EmptyState";
import { useRealtimeMessaging } from "../../../hooks/useRealtimeMessaging";
import { useTypingIndicator } from "../../../hooks/useTypingIndicator";
import { normalizeMessage } from "../../../utils/messageUtils";

interface ChatScreenProps {
  navigation: any;
}

type ChatRouteParams = {
  Chat: {
    conversationId: string;
    partnerName?: string;
    partnerId?: string;
  };
};

type ChatScreenRoute = RouteProp<ChatRouteParams, "Chat">;

export default function ChatScreen({ navigation }: ChatScreenProps) {
  const route = useRoute<ChatScreenRoute>();
  const { conversationId, partnerName, partnerId } = route.params;
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");

  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const response = await apiClient.getMessages(conversationId);
      const data = response.data as { messages?: any[] };
      let messagesList: any[] = [];
      if (response.success) {
        if (Array.isArray(data.messages)) {
          messagesList = data.messages;
        } else if (Array.isArray(data)) {
          messagesList = data;
        }
      }
      return messagesList.map(normalizeMessage);
    },
    enabled: !!conversationId,
    refetchInterval: 30000, // Reduced frequency since we have real-time updates
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      // Extract user IDs from conversationId (format: "userId1_userId2")
      const userIds = conversationId.split("_");
      const toUserId = userIds.find((id) => id !== userId) || partnerId;
      const fromUserId = userId;

      if (!toUserId || !fromUserId) {
        throw new Error("Invalid conversation participants");
      }

      return apiClient.sendMessage(conversationId, text, toUserId, fromUserId);
    },
    onSuccess: () => {
      // Stop typing indicator when message is sent
      typingIndicator.stopTyping();
      setInputText("");
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });

  // Real-time messaging
  const { isConnected, sendDeliveryReceipt } = useRealtimeMessaging({
    conversationId,
    onMessageReceived: (newMessage) => {
      // Add new message to the list and scroll to bottom
      queryClient.setQueryData(
        ["messages", conversationId],
        (oldMessages: any[]) => {
          const updatedMessages = [...(oldMessages || []), newMessage];
          return updatedMessages;
        }
      );

      // Send delivery receipt for received messages
      if (newMessage.fromUserId !== userId) {
        sendDeliveryReceipt(newMessage._id, "delivered");
      }
    },
    onMessageRead: (messageId, readByUserId) => {
      // Update message read status
      queryClient.setQueryData(
        ["messages", conversationId],
        (oldMessages: any[]) => {
          return (oldMessages || []).map((msg: any) =>
            msg._id === messageId
              ? { ...msg, readAt: Date.now(), isRead: true }
              : msg
          );
        }
      );
    },
    onTypingStart: (typingUserId) => {
      if (typingUserId !== userId) {
        // Handle typing indicator from other user
        console.log(`${typingUserId} started typing`);
      }
    },
    onTypingStop: (typingUserId) => {
      if (typingUserId !== userId) {
        // Handle typing indicator stop from other user
        console.log(`${typingUserId} stopped typing`);
      }
    },
  });

  // Typing indicator
  const typingIndicator = useTypingIndicator(conversationId, userId || "");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Mark messages as read when screen is focused
  useEffect(() => {
    const unreadMessages = messages.filter(
      (msg) => msg.toUserId === userId && !msg.readAt && !msg.isRead
    );

    if (unreadMessages.length > 0) {
      // Mark conversation as read
      apiClient.markConversationAsRead(conversationId);

      // Send read receipts for individual messages
      unreadMessages.forEach((msg) => {
        sendDeliveryReceipt(msg._id, "read");
      });
    }
  }, [messages, userId, conversationId, apiClient, sendDeliveryReceipt]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    try {
      await sendMessageMutation.mutateAsync(content);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);

    // Send typing indicator
    if (text.length > 0) {
      typingIndicator.startTyping();
    } else {
      typingIndicator.stopTyping();
    }
  };

  const formatMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatMessageDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessage = (message: any, index: number) => {
    const isOwnMessage = (message.senderId || message.fromUserId) === userId;
    const messageTime =
      message.timestamp ||
      message.createdAt ||
      message._creationTime ||
      Date.now();
    const prevMessageTime =
      index > 0
        ? messages[index - 1]?.timestamp ||
          messages[index - 1]?.createdAt ||
          messages[index - 1]?._creationTime ||
          0
        : 0;
    const showDate =
      index === 0 ||
      formatMessageDate(messageTime) !== formatMessageDate(prevMessageTime);

    return (
      <View key={message.id || message._id || index}>
        {/* Date separator */}
        {showDate && (
          <View style={styles.dateSeparator}>
            <Text style={styles.dateText}>
              {formatMessageDate(messageTime)}
            </Text>
          </View>
        )}

        {/* Message bubble */}
        <View
          style={[
            styles.messageContainer,
            isOwnMessage
              ? styles.ownMessageContainer
              : styles.otherMessageContainer,
          ]}
        >
          <View
            style={[
              styles.messageBubble,
              isOwnMessage
                ? styles.ownMessageBubble
                : styles.otherMessageBubble,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {message.content || message.text || "Message"}
            </Text>

            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isOwnMessage
                    ? styles.ownMessageTime
                    : styles.otherMessageTime,
                ]}
              >
                {formatMessageTime(messageTime)}
              </Text>

              {/* Message status indicator for sent messages */}
              {isOwnMessage && (
                <Text style={styles.messageStatus}>
                  {message.readAt
                    ? "✓✓"
                    : message.status === "delivered"
                    ? "✓"
                    : "⏳"}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingState message="Loading conversation..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{partnerName || "Chat"}</Text>
            {isConnected && <Text style={styles.connectionStatus}>Online</Text>}
            {typingIndicator.typingState.isTyping && (
              <Text style={styles.typingStatus}>
                {typingIndicator.getTypingText()}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.profileButton}
            onPress={() =>
              partnerId &&
              navigation.navigate("ProfileDetail", { profileId: partnerId })
            }
          >
            <Text style={styles.profileButtonText}>👤</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: false })
          }
        >
          {error ? (
            <EmptyState
              title="Unable to load messages"
              message="Please check your connection and try again."
              actionText="Retry"
              onAction={refetch}
            />
          ) : messages.length === 0 ? (
            <EmptyState
              title="Start the conversation"
              message="Send a message to break the ice!"
            />
          ) : (
            <>
              {messages.map((message: any, index: number) =>
                renderMessage(message, index)
              )}
            </>
          )}
        </ScrollView>

        {/* Chat Input */}
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            maxLength={500}
            onSubmitEditing={() => {
              if (inputText.trim()) {
                handleSendMessage(inputText);
              }
            }}
            returnKeyType="send"
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              inputText.trim()
                ? styles.sendButtonActive
                : styles.sendButtonInactive,
            ]}
            onPress={() => {
              if (inputText.trim()) {
                handleSendMessage(inputText);
              }
            }}
            disabled={!inputText.trim() || sendMessageMutation.isPending}
          >
            <Text style={styles.sendButtonText}>
              {sendMessageMutation.isPending ? "⏳" : "➤"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  backButton: {
    padding: Layout.spacing.sm,
    marginRight: Layout.spacing.sm,
  },
  backButtonText: {
    fontSize: Layout.typography.fontSize.xl,
    color: Colors.primary[500],
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600" as any,
    color: Colors.text.primary,
  },
  connectionStatus: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.success[500],
    fontWeight: "500" as any,
  },
  typingStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    fontStyle: "italic",
  },
  profileButton: {
    padding: Layout.spacing.sm,
    marginLeft: Layout.spacing.sm,
  },
  profileButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
  },
  dateSeparator: {
    alignItems: "center",
    marginVertical: Layout.spacing.lg,
  },
  dateText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    backgroundColor: Colors.background.primary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.full,
  },
  messageContainer: {
    marginVertical: Layout.spacing.xs,
  },
  ownMessageContainer: {
    alignItems: "flex-end",
  },
  otherMessageContainer: {
    alignItems: "flex-start",
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.lg,
  },
  ownMessageBubble: {
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: Layout.radius.xs,
  },
  otherMessageBubble: {
    backgroundColor: Colors.background.primary,
    borderBottomLeftRadius: Layout.radius.xs,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  messageText: {
    fontSize: Layout.typography.fontSize.base,
    lineHeight: 22,
  },
  ownMessageText: {
    color: Colors.text.inverse,
  },
  otherMessageText: {
    color: Colors.text.primary,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Layout.spacing.xs,
  },
  messageTime: {
    fontSize: Layout.typography.fontSize.xs,
  },
  ownMessageTime: {
    color: Colors.primary[100],
  },
  otherMessageTime: {
    color: Colors.text.tertiary,
  },
  messageStatus: {
    marginLeft: Layout.spacing.xs,
  },
  chatInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    backgroundColor: Colors.background.primary,
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.lg,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    maxHeight: 100,
    backgroundColor: Colors.background.secondary,
    marginRight: Layout.spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Layout.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  sendButtonInactive: {
    backgroundColor: Colors.gray[300],
  },
  sendButtonText: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.inverse,
    fontWeight: "bold" as any,
  },
});
