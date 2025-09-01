import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useAuth } from "@contexts/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { Colors, Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { ChatListSkeleton } from "@/components/ui/LoadingStates";
import { NoMessages } from "@/components/ui/EmptyStates";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import { Conversation } from "@/types/profile";
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

  type NormalizedConversation = Conversation & {
    id?: string;
    unreadCount?: number;
    lastActivity?: number;
  };

  const {
    data: conversations,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const response = await apiClient.getConversations();
      if (!response.success) return [] as NormalizedConversation[];
      const raw =
        (response.data as any)?.conversations ?? (response.data as any);
      return (Array.isArray(raw) ? raw : []) as NormalizedConversation[];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Unread counts are now included in conversations response
  const unreadCounts =
    (conversations as NormalizedConversation[])?.reduce(
      (acc: Record<string, number>, conv: NormalizedConversation) => {
        const cid = (conv as any)._id || (conv as any).id;
        acc[cid] = (conv as any).unreadCount || 0;
        return acc;
      },
      {}
    ) || {};

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: NormalizedConversation) => {
    const { id: otherParticipantId, name: otherParticipantName } =
      getOtherParticipantInfo(conversation, userId as any);

    navigation.navigate("Chat", {
      conversationId: (conversation as any)._id || (conversation as any).id,
      partnerName: otherParticipantName || otherParticipantId || "Unknown",
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

  const renderConversation = (conversation: NormalizedConversation) => {
    const {
      id: otherParticipantId,
      name: otherParticipantName,
      initial,
    } = getOtherParticipantInfo(conversation, userId as any);

    const unreadCount = (conversation as any).unreadCount || 0;
    const hasUnread = unreadCount > 0;

    const lastMessage = conversation.lastMessage;
    const lastMessagePreview =
      lastMessage?.type === "voice"
        ? "🎵 Voice message"
        : lastMessage?.content || lastMessage?.text || "Say hello!";

    return (
      <TouchableOpacity
        key={(conversation as any)._id || (conversation as any).id}
        style={[
          styles.conversationCard,
          hasUnread && styles.unreadConversationCard,
        ]}
        onPress={() => handleConversationPress(conversation)}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {hasUnread && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text
              style={[
                styles.participantName,
                hasUnread && styles.unreadParticipantName,
              ]}
            >
              {otherParticipantName || otherParticipantId || "Unknown User"}
            </Text>

            {lastMessage && (
              <Text style={styles.lastMessageTime}>
                {formatLastMessageTime(
                  (lastMessage.timestamp ??
                    lastMessage.createdAt ??
                    lastMessage._creationTime ??
                    Date.now()) as number
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
              {lastMessage?.fromUserId === userId && "You: "}
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
        ) : !conversations ||
          (conversations as NormalizedConversation[]).length === 0 ? (
          <NoMessages onActionPress={() => navigation.navigate("Search")} />
        ) : (
          <View style={styles.conversationsList}>
            {(conversations as NormalizedConversation[]).map(
              renderConversation
            )}
          </View>
        )}
      </ScreenContainer>
    </ErrorBoundary>
  );
}

function getOtherParticipantInfo(
  conversation: any,
  currentUserId?: string
): { id?: string; name?: string; initial: string } {
  // Participants array may be string[] of userIds
  const participants: any[] = Array.isArray(conversation?.participants)
    ? conversation.participants
    : [];
  const otherId: any = participants.find((p) => p && p !== currentUserId);

  // Profiles array might carry names
  const profiles: any[] = Array.isArray(conversation?.profiles)
    ? conversation.profiles
    : [];
  const profileForOther = profiles.find(
    (p) => p?.userId === otherId || p?.id === otherId
  );
  const nameFromProfile = profileForOther?.fullName || profileForOther?.name;

  // Some APIs may embed a 'partner' object
  const partner = conversation?.partner || conversation?.otherParticipant;
  const partnerName =
    partner?.fullName || partner?.name || partner?.email?.split("@")[0];

  const name: string | undefined =
    typeof nameFromProfile === "string"
      ? nameFromProfile
      : typeof partnerName === "string"
      ? partnerName
      : typeof otherId === "string"
      ? otherId
      : undefined;

  const initial =
    typeof name === "string" && name.length > 0
      ? name.trim().charAt(0).toUpperCase()
      : typeof otherId === "string" && otherId.length > 0
      ? otherId.trim().charAt(0).toUpperCase()
      : "?";

  return {
    id: typeof otherId === "string" ? otherId : undefined,
    name,
    initial,
  };
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
    backgroundColor: Colors.primary[50],
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
  unreadDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary[500],
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
