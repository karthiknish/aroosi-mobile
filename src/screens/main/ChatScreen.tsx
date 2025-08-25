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
import { useAuth } from "@contexts/AuthProvider";
import { Colors, Layout } from "@constants";
import { FullScreenLoading } from "@/components/ui/LoadingStates";
import { EmptyState } from "@/components/ui/EmptyStates";
import * as Haptics from "expo-haptics";
// import ScreenContainer from "@components/common/ScreenContainer";
import useResponsiveSpacing from "@/hooks/useResponsive";

// Import our new messaging system
import { useConversationMessaging } from "@/hooks/useOfflineMessaging";
import { Message } from "@/types/message";
import { OfflineMessageStatus } from "@components/messaging/OfflineMessageStatus";
import { useToast } from "@/providers/ToastContext";
// Import voice messaging components
import { VoiceMessageDisplay } from "@components/messaging/VoiceMessage";
import { VoiceRecorder } from "@components/messaging/VoiceRecorder";

// Import real-time components
// Typing indicator is shown via MessagesList footer
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageSearch } from "@/hooks/useMessageSearch";

// Import messaging features for subscription gating
import {
  useMessagingFeatures,
  useVoiceMessageLimits,
} from "@/hooks/useMessagingFeatures";
import MessagesList from "@components/chat/MessagesList";
import { useApiClient } from "@/utils/api";
import { BottomSheet } from "@/components/ui/BottomSheet";
// useSubscription imported above
import { useSubscription } from "@/hooks/useSubscription";

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
  const { user } = useAuth();
  const userId = user?.id;
  const scrollViewRef = useRef<any>(null);
  const [inputText, setInputText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [replyContext, setReplyContext] = useState<{
    messageId: string;
    text?: string;
    type: "text" | "voice" | "image";
    fromUserId: string;
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [actionMessage, setActionMessage] = useState<any | null>(null);
  const [optimisticDeleted, setOptimisticDeleted] = useState<
    Record<string, boolean>
  >({});
  const [optimisticEdits, setOptimisticEdits] = useState<
    Record<string, string>
  >({});
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
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
  const { usage, subscription } = useSubscription();
  const [receiptMap, setReceiptMap] = useState<Record<string, any[]>>({});
  const [reactionMap, setReactionMap] = useState<
    Record<string, { emoji: string; count: number }[]>
  >({});
  const [rawReactionData, setRawReactionData] = useState<
    Array<{ messageId: string; emoji: string; userId: string }>
  >([]);
  // Store raw reaction data for user-specific checks
  const [rawReactions, setRawReactions] = useState<
    Array<{ messageId: string; emoji: string; userId: string }>
  >([]);

  // Messaging features for subscription checks
  const { canSendVoiceMessage } = useMessagingFeatures();
  const { canSendVoice } = useVoiceMessageLimits();

  // Real-time features
  const typingIndicator = useTypingIndicator({
    conversationId,
    userId: userId || "",
  });

  // Message search functionality
  const messageSearch = useMessageSearch();

  // Handle search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      messageSearch.search(query);
      const results = messageSearch.results;
      setSearchResults(results || []);
    } catch (error) {
      console.warn("Search failed:", error);
      toast?.show(
        "Search Failed: Unable to search messages. Please try again."
      );
    }
  };

  // Toggle search mode
  const toggleSearchMode = () => {
    setIsSearchMode(!isSearchMode);
    if (isSearchMode) {
      setSearchQuery("");
      setSearchResults([]);
    }
  };

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

  const loadReactions = async () => {
    try {
      const res = await (apiClient as any).getReactions(conversationId);
      if (res.success && Array.isArray((res.data as any)?.reactions)) {
        const reactions = (res.data as any).reactions as Array<{
          messageId: string;
          emoji: string;
          userId: string;
        }>;

        // Store raw reactions for user-specific checks
        setRawReactionData(reactions);

        // Process reactions for display
        const map: Record<string, { emoji: string; count: number }[]> = {};
        reactions.forEach((r: any) => {
          const key = r.messageId;
          if (!map[key]) map[key] = [];
          const exists = map[key].find((x) => x.emoji === r.emoji);
          if (exists) exists.count += 1;
          else map[key].push({ emoji: r.emoji, count: 1 });
        });
        setReactionMap(map);
      }
    } catch {}
  };

  // Get reactions for a specific message with user info
  const getReactionsForMessage = (messageId: string) => {
    const messageReactions = rawReactionData.filter(
      (r) => r.messageId === messageId
    );
    const groupedReactions: Record<
      string,
      { userIds: string[]; reactedByMe: boolean }
    > = {};

    messageReactions.forEach((reaction) => {
      if (!groupedReactions[reaction.emoji]) {
        groupedReactions[reaction.emoji] = { userIds: [], reactedByMe: false };
      }
      groupedReactions[reaction.emoji].userIds.push(reaction.userId);
      if (reaction.userId === userId) {
        groupedReactions[reaction.emoji].reactedByMe = true;
      }
    });

    return Object.entries(groupedReactions).map(([emoji, data]) => ({
      emoji,
      count: data.userIds.length,
      reactedByMe: data.reactedByMe,
      userIds: data.userIds,
    }));
  };

  // Enhanced reaction toggle handler
  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      // Optimistic update
      const currentReactions = rawReactions.filter(
        (r) =>
          !(
            r.messageId === messageId &&
            r.emoji === emoji &&
            r.userId === userId
          )
      );
      const hasReacted = rawReactions.some(
        (r) =>
          r.messageId === messageId && r.emoji === emoji && r.userId === userId
      );

      if (!hasReacted) {
        // Add reaction optimistically
        currentReactions.push({ messageId, emoji, userId: userId || "" });
      }

      setRawReactions(currentReactions);

      // Update display map
      const map: Record<string, { emoji: string; count: number }[]> = {};
      currentReactions.forEach((r: any) => {
        const key = r.messageId;
        if (!map[key]) map[key] = [];
        const exists = map[key].find((x) => x.emoji === r.emoji);
        if (exists) exists.count += 1;
        else map[key].push({ emoji: r.emoji, count: 1 });
      });
      setReactionMap(map);

      // Call API
      const res = await (apiClient as any).toggleReaction(messageId, emoji);
      if (!res.success) {
        // Revert on failure
        loadReactions();
      }
    } catch (error) {
      // Revert on error
      loadReactions();
    }
  };

  // Load messages on mount
  useEffect(() => {
    if (isInitialized && conversationId) {
      loadMessages();
      loadReceipts();
      loadReactions();
    }
  }, [isInitialized, conversationId, loadMessages]);

  const displayMessages = useMemo(() => {
    if (!messages || !messages.length) return messages as any;
    return messages.map((m: any) => {
      const overlayDeleted = optimisticDeleted[m._id];
      const overlayText = optimisticEdits[m._id];
      return {
        ...m,
        deleted: overlayDeleted ? true : m.deleted,
        text: typeof overlayText === "string" ? overlayText : m.text,
        edited: typeof overlayText === "string" ? true : m.edited,
        editedAt: typeof overlayText === "string" ? Date.now() : m.editedAt,
        deliveryReceipts:
          m.deliveryReceipts && m.deliveryReceipts.length > 0
            ? m.deliveryReceipts
            : receiptMap[m._id] || [],
        reactions: reactionMap[m._id] || [],
      };
    });
  }, [messages, receiptMap, reactionMap, optimisticDeleted, optimisticEdits]);

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

      // Attach reply context if present
      if (replyContext) {
        messageData.replyTo = {
          messageId: replyContext.messageId,
          text: replyContext.text,
          type: replyContext.type,
          fromUserId: replyContext.fromUserId,
        } as any;
      }

      const result = await sendMessage(messageData);

      if (result.success) {
        setInputText("");
        setIsTyping(false);
        if (replyContext) setReplyContext(null);
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

  const toggleReaction = async (messageId: string, emoji: string) => {
    try {
      const res = await (apiClient as any).toggleReaction(messageId, emoji);
      if (res.success) {
        await loadReactions();
      }
    } catch {}
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

  // Edit/Delete/Reply handlers
  const handleEditSubmit = async () => {
    if (!editingMessageId) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;
    try {
      // Optimistic overlay
      setOptimisticEdits((prev) => ({ ...prev, [editingMessageId]: trimmed }));
      setEditingMessageId(null);
      setInputText("");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const res = await apiClient.editMessage(editingMessageId, trimmed);
      if (!res?.success) {
        // Revert overlay on failure
        setOptimisticEdits((prev) => {
          const { [editingMessageId]: _omit, ...rest } = prev;
          return rest;
        });
        if (toast) toast.show("Edit failed. Please try again.", "error");
      } else {
        // Refresh to sync server-calculated fields
        loadMessages();
      }
    } catch (e) {
      setOptimisticEdits((prev) => {
        const { [editingMessageId!]: _omit, ...rest } = prev;
        return rest;
      });
      if (toast) toast.show("Edit failed. Please try again.", "error");
    }
  };

  const openMessageActions = (message: any) => {
    setActionMessage(message);
    setActionSheetVisible(true);
    Haptics.selectionAsync();
  };

  const canEdit = (m: any) =>
    m?.fromUserId === userId && m?.type === "text" && !m?.deleted;
  const canDelete = (m: any) => m?.fromUserId === userId && !m?.deleted;

  const handleReplyAction = () => {
    if (!actionMessage) return;
    setReplyContext({
      messageId: actionMessage._id,
      text: actionMessage.text,
      type: actionMessage.type,
      fromUserId: actionMessage.fromUserId,
    });
    setActionSheetVisible(false);
  };

  const handleEditAction = () => {
    if (!actionMessage || !canEdit(actionMessage)) return;
    setEditingMessageId(actionMessage._id);
    setInputText(actionMessage.text || "");
    setActionSheetVisible(false);
  };

  const handleDeleteAction = async () => {
    if (!actionMessage || !canDelete(actionMessage)) return;
    const targetId = actionMessage._id;
    setActionSheetVisible(false);
    Alert.alert(
      "Delete message?",
      "This will delete the message for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setOptimisticDeleted((prev) => ({ ...prev, [targetId]: true }));
              const res = await apiClient.deleteMessage(targetId);
              if (!res?.success) {
                setOptimisticDeleted((prev) => {
                  const { [targetId]: _omit, ...rest } = prev;
                  return rest;
                });
                if (toast)
                  toast.show("Delete failed. Please try again.", "error");
              } else {
                loadMessages();
              }
            } catch (e) {
              setOptimisticDeleted((prev) => {
                const { [targetId]: _omit, ...rest } = prev;
                return rest;
              });
              if (toast)
                toast.show("Delete failed. Please try again.", "error");
            }
          },
        },
      ]
    );
  };

  const renderMessage = ({ item }: { item: any; index: number }) => {
    const isOwnMessage = item.fromUserId === userId;
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
    replyBanner: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: Colors.neutral[100],
      borderTopWidth: 1,
      borderTopColor: Colors.border.primary,
      gap: spacing.sm,
    },
    replyBannerBar: {
      width: 3,
      alignSelf: "stretch",
      backgroundColor: Colors.primary[300],
      borderRadius: 2,
    },
    replyBannerContent: {
      flex: 1,
    },
    replyBannerTitle: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      marginBottom: 2,
    },
    replyBannerText: {
      fontSize: fontSize.base,
      color: Colors.text.primary,
    },
    replyBannerClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: Colors.background.primary,
      borderWidth: 1,
      borderColor: Colors.border.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    replyBannerCloseText: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
    },
    actionsContainer: {
      gap: spacing.sm,
    },
    actionItem: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: Layout.radius.lg,
      backgroundColor: Colors.background.secondary,
      borderWidth: 1,
      borderColor: Colors.border.primary,
    },
    actionLabel: {
      fontSize: fontSize.base,
      color: Colors.text.primary,
    },
    actionDisabled: {
      opacity: 0.5,
    },
    actionDestructive: {
      color: (Colors as any).error?.[600] || "#b00020",
    },
    // Search functionality styles
    headerActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    actionButton: {
      padding: spacing.sm,
      borderRadius: Layout.radius.md,
      backgroundColor: Colors.background.secondary,
      borderWidth: 1,
      borderColor: Colors.border.primary,
    },
    actionButtonText: {
      fontSize: fontSize.lg,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.base,
      color: Colors.text.primary,
      backgroundColor: Colors.background.secondary,
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: Layout.radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    searchCloseButton: {
      padding: spacing.sm,
      borderRadius: Layout.radius.md,
      backgroundColor: Colors.background.secondary,
      borderWidth: 1,
      borderColor: Colors.border.primary,
    },
    searchCloseText: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
    },
    searchResultsEmpty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    searchResultsEmptyText: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: "center",
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

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={toggleSearchMode}
            >
              <Text style={styles.actionButtonText}>🔍</Text>
            </TouchableOpacity>
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
        </View>

        {/* Search Bar */}
        {isSearchMode && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={Colors.text.secondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                handleSearch(text);
              }}
              autoFocus
            />
            <TouchableOpacity
              style={styles.searchCloseButton}
              onPress={toggleSearchMode}
            >
              <Text style={styles.searchCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

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
              messages={
                (isSearchMode && searchResults.length > 0
                  ? searchResults
                  : displayMessages) as any
              }
              currentUserId={userId || ""}
              typingVisible={typingIndicator.isAnyoneElseTyping}
              typingText={typingIndicator.isAnyoneElseTyping ? "Typing..." : ""}
              onLongPressMessage={openMessageActions}
              onToggleReaction={handleToggleReaction}
              getReactionsForMessage={getReactionsForMessage}
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
              showUpgradeChip={
                subscription?.plan === "free" &&
                !!usage?.features?.find(
                  (f: any) =>
                    f.name === "messagesSent" && f.percentageUsed >= 80
                )
              }
              upgradeChipText={(() => {
                const f = usage?.features?.find(
                  (x: any) => x.name === "messagesSent"
                );
                const pct = f?.percentageUsed ?? 0;
                return pct >= 100
                  ? "Limit reached — Upgrade for unlimited"
                  : `You're at ${pct}% — Upgrade for unlimited`;
              })()}
              onPressUpgrade={() => navigation.navigate("Subscription")}
            />
            {isSearchMode && searchResults.length === 0 && searchQuery && (
              <View style={styles.searchResultsEmpty}>
                <Text style={styles.searchResultsEmptyText}>
                  No messages found for "{searchQuery}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Reply/Edit Banner */}
        {(replyContext || editingMessageId) && (
          <View style={styles.replyBanner}>
            <View style={styles.replyBannerBar} />
            <View style={styles.replyBannerContent}>
              <Text style={styles.replyBannerTitle}>
                {editingMessageId ? "Editing message" : "Replying to"}
              </Text>
              {!editingMessageId && (
                <Text style={styles.replyBannerText} numberOfLines={1}>
                  {replyContext?.type === "voice"
                    ? "Voice message"
                    : replyContext?.text || "(no text)"}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                if (editingMessageId) {
                  setEditingMessageId(null);
                  setInputText("");
                } else {
                  setReplyContext(null);
                }
              }}
              style={styles.replyBannerClose}
            >
              <Text style={styles.replyBannerCloseText}>✕</Text>
            </TouchableOpacity>
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
                placeholder={
                  editingMessageId ? "Edit message..." : "Type a message..."
                }
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
                  if (editingMessageId) handleEditSubmit();
                  else handleSendMessage(trimmed);
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
                  if (editingMessageId) handleEditSubmit();
                  else handleSendMessage(trimmed);
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

        {/* Action Sheet for message actions */}
        <BottomSheet
          isVisible={actionSheetVisible}
          onClose={() => setActionSheetVisible(false)}
          title="Message actions"
          height={260}
        >
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleReplyAction}
            >
              <Text style={styles.actionLabel}>↩︎ Reply</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionItem,
                !canEdit(actionMessage) && styles.actionDisabled,
              ]}
              disabled={!canEdit(actionMessage)}
              onPress={handleEditAction}
            >
              <Text style={styles.actionLabel}>✎ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionItem,
                !canDelete(actionMessage) && styles.actionDisabled,
              ]}
              disabled={!canDelete(actionMessage)}
              onPress={handleDeleteAction}
            >
              <Text style={[styles.actionLabel, styles.actionDestructive]}>
                🗑 Delete
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheet>
      </KeyboardAvoidingView>
    </View>
  );
}
