import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useAuth } from "../../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "../../../utils/api";
import { Colors, Layout } from "../../../constants";
import { useTheme } from "../../../contexts/ThemeContext";
import { ChatListSkeleton } from "@/components/ui/LoadingStates";
import { NoMessages } from "@/components/ui/EmptyStates";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import { Conversation } from "../../../types/message";
import ScreenContainer from "@components/common/ScreenContainer";

interface ConversationListScreenProps {
  navigation: any;
}

export default function ConversationListScreen({
  navigation,
}: ConversationListScreenProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const apiClient = useApiClient();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await apiClient.getConversations();
      return response.success
        ? (response.data as { conversations: Conversation[] }).conversations ||
            response.data
        : [];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Unread counts are now included in conversations response
  const unreadCounts =
    (conversations as Conversation[])?.reduce(
      (acc: Record<string, number>, conv: Conversation) => {
        acc[conv._id || conv.id] = conv.unreadCount || 0;
        return acc;
      },
      {}
    ) || {};

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: Conversation) => {
    // Since participants is string[], find the participant that is not the current user
    const otherParticipantId = conversation.participants?.find(
      (p) => p !== userId
    );

    navigation.navigate("Chat", {
      conversationId: conversation._id || conversation.id,
      partnerName: otherParticipantId || "Unknown",
      partnerId: otherParticipantId,
    });
  };

  const formatLastMessageTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return "Now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return days === 1 ? "1d" : `${days}d`;
    }
  };

  const renderConversation = (conversation: Conversation) => {
    const otherParticipantId = conversation.participants?.find(
      (p) => p !== userId
    );

    const unreadCount = conversation.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    const lastMessage = conversation.lastMessage;
    const lastMessagePreview =
      lastMessage?.type === "voice"
        ? "🎵 Voice message"
        : lastMessage?.content || lastMessage?.text || "Say hello!";

    return (
      <TouchableOpacity
        key={conversation._id || conversation.id}
        style={[
          styles.conversationCard,
          hasUnread && styles.unreadConversationCard,
        ]}
        onPress={() => handleConversationPress(conversation)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {otherParticipantId?.charAt(0) || "?"}
            </Text>
          </View>
          {hasUnread && <View style={styles.onlineIndicator} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.participantName,
                hasUnread && styles.unreadParticipantName,
              ]}
            >
              {otherParticipantId || "Unknown User"}
            </Text>

            {lastMessage && (
              <Text style={styles.lastMessageTime}>
                {formatLastMessageTime(
                  lastMessage.timestamp ||
                    lastMessage.createdAt ||
                    lastMessage._creationTime
                )}
              </Text>
            )}
          </View>

          <View style={styles.messagePreviewContainer}>
            <Text
              style={[
                styles.lastMessage,
                hasUnread && styles.unreadLastMessage,
              ]}
              numberOfLines={1}
            >
              {(lastMessage?.senderId || lastMessage?.fromUserId) === userId &&
                "You: "}
              {lastMessagePreview}
            </Text>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.background.primary,
              borderBottomColor: theme.colors.border.primary,
            },
          ]}
        >
          <Text
            style={[styles.headerTitle, { color: theme.colors.text.primary }]}
          >
            Messages
          </Text>
          <TouchableOpacity
            style={[
              styles.newChatButton,
              { backgroundColor: theme.colors.primary[50] },
            ]}
            onPress={() => navigation.navigate("Search")}
          >
            <Text style={styles.newChatButtonText}>✏️</Text>
          </TouchableOpacity>
        </View>
        <ChatListSkeleton />
      </ScreenContainer>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.colors.background.primary,
              borderBottomColor: theme.colors.border.primary,
            },
          ]}
        >
          <Text
            style={[styles.headerTitle, { color: theme.colors.text.primary }]}
          >
            Messages
          </Text>
          <TouchableOpacity
            style={[
              styles.newChatButton,
              { backgroundColor: theme.colors.primary[50] },
            ]}
            onPress={() => navigation.navigate("Search")}
          >
            <Text style={styles.newChatButtonText}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Conversations List */}
        {error ? (
          <ApiErrorDisplay error={error} onRetry={refetch} />
        ) : !conversations || (conversations as Conversation[]).length === 0 ? (
          <NoMessages onActionPress={() => navigation.navigate("Search")} />
        ) : (
          <View style={styles.conversationsList}>
            {(conversations as Conversation[]).map(renderConversation)}
          </View>
        )}
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.secondary,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  headerTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  newChatButton: {
    padding: Layout.spacing.sm,
    backgroundColor: Colors.primary[50],
    borderRadius: Layout.radius.full,
  },
  newChatButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
  conversationsList: {
    paddingTop: Layout.spacing.sm,
  },
  conversationCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    backgroundColor: Colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.primary,
  },
  unreadConversationCard: {
    backgroundColor: Colors.primary[25],
  },
  avatarContainer: {
    position: "relative",
    marginRight: Layout.spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.primary[100],
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.primary[600],
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.success[500],
    borderWidth: 2,
    borderColor: Colors.background.primary,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Layout.spacing.xs,
  },
  participantName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
  },
  unreadParticipantName: {
    fontWeight: Layout.typography.fontWeight.bold,
  },
  lastMessageTime: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  messagePreviewContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    flex: 1,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginRight: Layout.spacing.sm,
  },
  unreadLastMessage: {
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  unreadBadge: {
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.full,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  unreadBadgeText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.inverse,
  },
  contentStyle: {
    flexGrow: 1,
  },
});
