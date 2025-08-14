/** @jsx React.createElement */
/** @jsxFrag React.Fragment */
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useClerkAuth } from "../contexts/ClerkAuthContext"
import { Colors, Layout } from "../../../constants";
import { FullScreenLoading } from "../../components/ui/LoadingStates";
import { EmptyState } from "../../components/ui/EmptyStates";
import * as Haptics from "expo-haptics";
// import ScreenContainer from "@components/common/ScreenContainer";
import useResponsiveSpacing from "../../../hooks/useResponsive";

// Import our new messaging system
import { useConversationMessaging } from "../../../hooks/useOfflineMessaging";
import { useSubscription } from "../../../hooks/useSubscription";
import { Message } from "../../../types/message";
import { OfflineMessageStatus } from "../../../components/messaging/OfflineMessageStatus";
import { useToast } from "../../../providers/ToastContext";
// Import voice messaging components
import { VoiceMessageDisplay } from "../../../components/messaging/VoiceMessage";
import { VoiceRecorder } from "../../../components/messaging/VoiceRecorder";

// Import real-time components
// Typing indicator is shown via MessagesList footer
import { useTypingIndicator } from "../../../hooks/useTypingIndicator";

// Import messaging features for subscription gating
import {
  useMessagingFeatures,
  useVoiceMessageLimits,
} from "../../../hooks/useMessagingFeatures";
import MessagesList from "../../../components/chat/MessagesList";
import { useApiClient } from "../../../utils/api";

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
  const { } = useClerkAuth();
  const scrollViewRef = useRef<any>(null);
  const [inputText, setInputText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { spacing } = useResponsiveSpacing();
  const fontSize = Layout.typography.fontSize;
  const toast = useToast();
  // Use our new unified messaging system
  const {
    messages,
    loading,
    error,
    sendMessage,
    loadMessages,
    isOnline,
    isInitialized,
    hasMessages,
    canSend,
  } = useConversationMessaging(conversationId);

  const apiClient = useApiClient();
  const [receiptMap, setReceiptMap] = useState<Record<string, any[]>>({});

  // Messaging features for subscription checks
  const { canSendVoiceMessage } = useMessagingFeatures();
  const { canSendVoice } = useVoiceMessageLimits();

  // Real-time features
  const typingIndicator = useTypingIndicator({
    conversationId,
    userId: userId || "",
  });

  // Mark conversation as read when messages load
  useEffect(() => {
    if (isInitialized && messages && messages.length > 0) {
      apiClient.markConversationAsRead(conversationId).catch(() => undefined);
    }
  }, [isInitialized, messages?.length]);

  // Haptics for new message received (from others)
  const lastMessageIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const last = messages[messages.length - 1];
    if (last && last._id !== lastMessageIdRef.current) {
      lastMessageIdRef.current = last._id;
      // Trigger only for messages from partner
      if (last.fromUserId !== userId) {
        Haptics.selectionAsync();
      }
    }
  }, [messages?.length]);

  // Load delivery/read receipts to enhance status indicators
  const loadReceipts = async () => {
    try {
      const res = await apiClient.getDeliveryReceipts(conversationId);
      if (res.success && Array.isArray(res.data as any)) {
        const map: Record<string, any[]> = {};
        (res.data as any[]).forEach((r: any) => {
          if (!r?.messageId) return;
          if (!map[r.messageId]) map[r.messageId] = [];
          map[r.messageId].push(r);
        });
        setReceiptMap(map);
      }
    } catch (e) {
      // ignore
    }
  };

  // Load messages on mount
  useEffect(() => {
    if (isInitialized && conversationId) {
      loadMessages();
      loadReceipts();
    }
  }, [isInitialized, conversationId, loadMessages]);

  const displayMessages = useMemo(() => {
    if (!messages || !messages.length) return messages as any;
    return messages.map((m: any) => ({
      ...m,
      deliveryReceipts:
        m.deliveryReceipts && m.deliveryReceipts.length > 0
          ? m.deliveryReceipts
          : receiptMap[m._id] || [],
    }));
  }, [messages, receiptMap]);

  const handleSendMessage = async (
    content: string,
    type: "text" | "voice" | "image" = "text",
    metadata?: { audioStorageId?: string; duration?: number; fileSize?: number }
  ) => {
    if (!content.trim() && type === "text") return;
    if (!userId || !partnerId) return;

    try {
      // Validate content first
      if (type === "text") {
        // Simple text validation
        if (content.length > 500) {
          Alert.alert(
            "Message Too Long",
            "Messages must be under 500 characters"
          );
          return;
        }
      }

      // Check subscription permissions for voice messages
      if (type === "voice") {
        const voicePermission = canSendVoiceMessage(metadata?.duration);
        if (!voicePermission.allowed) {
          Alert.alert(
            "Premium Feature",
            voicePermission.reason ||
              "Voice messages require a premium subscription",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Upgrade",
                onPress: () => navigation.navigate("Subscription"),
              },
            ]
          );
          return;
        }
      }

      // Send the message using our unified system
      const messageData: any = {
        conversationId,
        fromUserId: userId,
        toUserId: partnerId,
        text: type === "text" ? content : "",
        type,
        createdAt: Date.now(),
      };

      // Add voice message metadata if present
      if (type === "voice" && metadata) {
        messageData.audioStorageId = metadata.audioStorageId;
        messageData.duration = metadata.duration;
        messageData.fileSize = metadata.fileSize;
      }

      const result = await sendMessage(messageData);

      if (result.success) {
        setInputText("");
        setIsTyping(false);
        // Haptics on successful send
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        Alert.alert(
          "Send Failed",
          result.error?.message || "Failed to send message"
        );
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      if (toast) {
        toast.show("Failed to send message. Please try again.", "error");
      }
    }
  };

  const handleInputChange = (text: string) => {
    setInputText(text);
    setIsTyping(text.length > 0);

    // Update typing indicator
    typingIndicator.handleTextChange(text);
  };

  const handleVoiceMessage = async (audioUri: string, duration: number) => {
    console.log("Voice message:", audioUri, duration);
    setShowVoiceRecorder(false);

    // Send voice message with metadata
    await handleSendMessage(
      `Voice message (${Math.round(duration)}s)`,
      "voice",
      {
        audioStorageId: audioUri, // This would be the storage ID after upload
        duration: Math.round(duration),
        fileSize: 0, // Would be set by the voice message manager
      }
    );
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

  const renderMessage = ({ item }: { item: any; index: number }) => {
    const isOwnMessage = (item.senderId || item.fromUserId) === userId;
    const messageTime =
      item.timestamp || item.createdAt || item._creationTime || Date.now();
    return (
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
            isOwnMessage ? styles.ownMessageBubble : styles.otherMessageBubble,
          ]}
        >
          {item.type === "voice" ? (
            <VoiceMessageDisplay
              uri={item.audioUri}
              storageId={item.audioStorageId}
              duration={item.duration}
              style={{ backgroundColor: "transparent" }}
              small={false}
            />
          ) : (
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {item.content || item.text || "Message"}
            </Text>
          )}

          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime,
              ]}
            >
              {formatMessageTime(messageTime)}
            </Text>

            {/* Status ticks could be added here if needed to mirror web */}
          </View>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.secondary,
    },
    contentStyle: {
      flexGrow: 1,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.primary,
    },
    backButton: {
      padding: spacing.sm,
      marginRight: spacing.sm,
    },
    backButtonText: {
      fontSize: fontSize.xl,
      color: Colors.primary[500],
    },
    headerInfo: {
      flex: 1,
    },
    headerName: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize.lg,
      fontWeight: "600" as any,
      color: Colors.text.primary,
    },
    connectionStatus: {
      fontSize: fontSize.xs,
      color: Colors.success[500],
      fontWeight: "500" as any,
    },
    typingStatus: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      fontStyle: "italic",
    },
    profileButton: {
      padding: spacing.sm,
      marginLeft: spacing.sm,
    },
    profileButtonText: {
      fontSize: fontSize.lg,
    },
    messagesContainer: {
      flex: 1,
    },
    messagesContent: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
    },
    dateSeparator: {
      alignItems: "center",
      marginVertical: spacing.lg,
    },
    dateText: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      backgroundColor: Colors.background.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: Layout.radius.full,
    },
    messageContainer: {
      marginVertical: spacing.xs,
    },
    ownMessageContainer: {
      alignItems: "flex-end",
    },
    otherMessageContainer: {
      alignItems: "flex-start",
    },
    messageBubble: {
      maxWidth: "80%",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
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
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.4,
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
      marginTop: spacing.xs,
    },
    messageTime: {
      fontSize: fontSize.xs,
    },
    ownMessageTime: {
      color: Colors.primary[100],
    },
    otherMessageTime: {
      color: Colors.text.tertiary,
    },
    messageStatus: {
      marginLeft: spacing.xs,
    },
    chatInputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: Colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: Colors.border.primary,
    },
    chatInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: Layout.radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.base,
      maxHeight: 100,
      backgroundColor: Colors.background.secondary,
      marginRight: spacing.sm,
    },
    sendButton: {
      width: spacing.xl + spacing.sm + spacing.xs,
      height: spacing.xl + spacing.sm + spacing.xs,
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
      fontSize: fontSize.lg,
      color: Colors.text.inverse,
      fontWeight: "bold" as any,
    },
    voiceRecorderContainer: {
      flex: 1,
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    voiceButton: {
      width: spacing.xl + spacing.sm + spacing.xs,
      height: spacing.xl + spacing.sm + spacing.xs,
      borderRadius: Layout.radius.full,
      backgroundColor: Colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
    },
    voiceButtonText: {
      fontSize: fontSize.lg,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <FullScreenLoading message="Loading conversation..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        {/* Offline Message Status */}
        <OfflineMessageStatus showDetails={false} />

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
            {isOnline && <Text style={styles.connectionStatus}>Online</Text>}
            {isTyping && <Text style={styles.typingStatus}>Typing...</Text>}
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
        {error ? (
          <EmptyState
            title="Unable to load messages"
            message="Please check your connection and try again."
            actionText="Retry"
            onActionPress={() => loadMessages()}
          />
        ) : (
          <View style={styles.messagesContainer}>
            <MessagesList
              messages={displayMessages as any}
              currentUserId={userId || ""}
              typingVisible={typingIndicator.isAnyoneElseTyping}
              typingText={typingIndicator.isAnyoneElseTyping ? "Typing..." : ""}
              onFetchOlder={async () => {
                const beforeTs = messages?.[0]?.createdAt;
                if (beforeTs) await loadMessages({ before: beforeTs });
              }}
              hasMore={true}
              loading={loading}
              onRefresh={async () => {
                await Promise.all([loadMessages(), loadReceipts()]);
                await apiClient.markConversationAsRead(conversationId);
              }}
              refreshing={loading}
            />
          </View>
        )}

        {/* Chat Input */}
        <View style={styles.chatInputContainer}>
          {showVoiceRecorder ? (
            <VoiceRecorder
              onRecordingComplete={handleVoiceMessage}
              onCancel={() => setShowVoiceRecorder(false)}
              style={styles.voiceRecorderContainer}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={() => {
                  // Check voice message permission first
                  if (!canSendVoice) {
                    Alert.alert(
                      "Premium Feature",
                      "Voice messages require a premium subscription",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Upgrade",
                          onPress: () => navigation.navigate("Subscription"),
                        },
                      ]
                    );
                    return;
                  }

                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowVoiceRecorder(true);
                }}
              >
                <Text style={styles.voiceButtonText}>🎤</Text>
              </TouchableOpacity>

              <TextInput
                style={styles.chatInput}
                placeholder="Type a message..."
                value={inputText}
                onChangeText={handleInputChange}
                multiline
                maxLength={500}
                onSubmitEditing={() => {
                  const trimmed = inputText.trim();
                  if (!trimmed) return;
                  if (trimmed.length > 500) {
                    if (toast) {
                      toast.show(
                        "Messages are limited to 500 characters.",
                        "info"
                      );
                    }
                    return;
                  }
                  handleSendMessage(trimmed);
                }}
                returnKeyType="send"
              />

              <TouchableOpacity
                style={[
                  styles.sendButton,
                  inputText.trim()
                    ? styles.sendButtonActive
                    : styles.sendButtonInactive,
                ]}
                onPress={() => {
                  const trimmed = inputText.trim();
                  if (!trimmed) return;
                  if (trimmed.length > 500) {
                    if (toast) {
                      toast.show(
                        "Messages are limited to 500 characters.",
                        "info"
                      );
                    }
                    return;
                  }
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  handleSendMessage(trimmed);
                }}
                disabled={!inputText.trim() || !canSend}
              >
                <Text style={styles.sendButtonText}>
                  {loading ? "⏳" : "➤"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
