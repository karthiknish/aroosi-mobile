import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useAuth } from "@contexts/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { Layout } from "@constants";
import type { Theme } from "@/../constants/Theme";
import { useTheme, useThemedStyles } from "@contexts/ThemeContext";
import { useOfflineMessaging } from "@/hooks/useOfflineMessaging";
import { ChatListSkeleton } from "@/components/ui/LoadingStates";
import { NoMessages } from "@/components/ui/EmptyStates";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import { Conversation } from "@/types/profile";
import ScreenContainer from "@components/common/ScreenContainer";
import AppHeader from "@/components/common/AppHeader";
import Avatar from "@/components/common/Avatar";
import SafetyActionSheet from "@components/safety/SafetyActionSheet";
import ReportUserModal from "@components/safety/ReportUserModal";
import { unifiedMessagingApi } from "@/utils/unifiedMessagingApi";
import HapticPressable from "@/components/ui/HapticPressable";

interface ConversationListScreenProps {
  navigation: any;
}

export default function ConversationListScreen({
  navigation,
}: ConversationListScreenProps) {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const apiClient = useApiClient();
  const { isOnline } = useOfflineMessaging();
  const [refreshing, setRefreshing] = useState(false);
  const [presenceMap, setPresenceMap] = useState<
    Record<string, { isOnline: boolean; lastSeen: number }>
  >({});
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [safetyVisible, setSafetyVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<{
    id: string;
    name?: string;
  } | null>(null);

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
  const _unreadCounts =
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

  // Derive unique partner IDs from conversations
  const partnerIds = useMemo(() => {
    if (!conversations) return [] as string[];
    const ids = new Set<string>();
    for (const conv of conversations as NormalizedConversation[]) {
      const info = getOtherParticipantInfo(conv as any, userId as any);
      if (info.id) ids.add(info.id);
    }
    return Array.from(ids);
  }, [conversations, userId]);

  // Fetch presence for partner IDs and keep polling
  useEffect(() => {
    let canceled = false;
    if (!partnerIds.length) return;

    const fetchPresence = async () => {
      if (!partnerIds.length) return;
      try {
        const results = await Promise.allSettled(
          partnerIds.map(async (pid) => ({
            pid,
            res: await apiClient.getPresence(pid),
          }))
        );
        if (canceled) return;
        const next: Record<string, { isOnline: boolean; lastSeen: number }> =
          {};
        for (const r of results) {
          if (r.status === "fulfilled") {
            const { pid, res } = r.value as any;
            if (res?.success && res.data) {
              next[pid] = {
                isOnline: !!res.data.isOnline,
                lastSeen: Number(res.data.lastSeen || 0),
              };
            }
          }
        }
        setPresenceMap((prev) => ({ ...prev, ...next }));
      } catch {
        // best-effort, ignore errors
      }
    };

    // Initial fetch and interval
    fetchPresence();
    if (presenceIntervalRef.current) clearInterval(presenceIntervalRef.current);
    presenceIntervalRef.current = setInterval(fetchPresence, 30000);

    return () => {
      canceled = true;
      if (presenceIntervalRef.current)
        clearInterval(presenceIntervalRef.current);
    };
  }, [apiClient, partnerIds.join("|")]);

  const handleConversationPress = (conversation: NormalizedConversation) => {
    const { id: otherParticipantId, name: otherParticipantName } =
      getOtherParticipantInfo(conversation, userId as any);

    navigation.navigate("Chat", {
      conversationId: (conversation as any)._id || (conversation as any).id,
      partnerName: otherParticipantName || otherParticipantId || "Unknown",
      partnerId: otherParticipantId,
    });
  };

  const archiveConversation = async (convId: string) => {
    try {
      // persist archived locally similar to MatchesScreen (optional enhancement)
      // For now, just show toast and refetch
      // If you want parity, we can share archive state via context
      await refetch();
    } catch {}
  };

  const deleteConversation = async (convId: string) => {
    const res = await unifiedMessagingApi.deleteConversation(convId);
    if (res.success) {
      await refetch();
    }
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

    const renderLeftActions = () => (
      <View
        style={{
          width: 100,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.primary[50],
        }}
      >
        <Text style={{ color: theme.colors.primary[700], fontWeight: "600" }}>
          Archive
        </Text>
      </View>
    );
    const renderRightActions = () => (
      <View
        style={{
          width: 100,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.colors.error[500],
        }}
      >
        <Text style={{ color: theme.colors.text.inverse, fontWeight: "700" }}>
          Delete
        </Text>
      </View>
    );

    return (
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableLeftOpen={async () => {
          const cid = (conversation as any)._id || (conversation as any).id;
          await archiveConversation(String(cid));
        }}
        onSwipeableRightOpen={async () => {
          const cid = (conversation as any)._id || (conversation as any).id;
          await deleteConversation(String(cid));
        }}
        overshootLeft={false}
        overshootRight={false}
      >
        <HapticPressable
          key={(conversation as any)._id || (conversation as any).id}
          style={[
            styles.conversationCard,
            hasUnread && styles.unreadConversationCard,
          ]}
          onPress={() => handleConversationPress(conversation)}
          onLongPress={() => {
            if (otherParticipantId) {
              setSelectedPartner({
                id: otherParticipantId,
                name: otherParticipantName,
              });
              setSafetyVisible(true);
            }
          }}
        >
          <View style={{ marginRight: Layout.spacing.md }}>
            <Avatar
              name={otherParticipantName}
              fallback={initial}
              size="lg"
              showPresence
              isOnline={
                !!(
                  otherParticipantId &&
                  presenceMap[otherParticipantId]?.isOnline
                )
              }
              accessibilityLabel={`${
                otherParticipantName || otherParticipantId || "Unknown"
              } avatar`}
            />
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
        </HapticPressable>
      </Swipeable>
    );
  };

  if (isLoading) {
    return (
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
        useScrollView={false}
      >
        <AppHeader
          title="Messages"
          rightActions={
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="Start new chat"
              style={[
                styles.newChatButton,
                { backgroundColor: theme.colors.primary[50] },
              ]}
              onPress={() => navigation.navigate("Search")}
            >
              <Text style={styles.newChatButtonText}>✏️</Text>
            </HapticPressable>
          }
        />

        {/* Offline hint */}
        {!isOnline && (
          <View style={styles.offlineHint}>
            <Text style={styles.offlineHintText}>
              You’re offline. New messages will be queued and sent when you’re
              back online.
            </Text>
          </View>
        )}
        <ChatListSkeleton />
      </ScreenContainer>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
        useScrollView={false}
      >
        <AppHeader
          title="Messages"
          rightActions={
            <HapticPressable
              accessibilityRole="button"
              accessibilityLabel="Start new chat"
              style={[
                styles.newChatButton,
                { backgroundColor: theme.colors.primary[50] },
              ]}
              onPress={() => navigation.navigate("Search")}
            >
              <Text style={styles.newChatButtonText}>✏️</Text>
            </HapticPressable>
          }
        />

        {/* Conversations List */}
        {error ? (
          <ApiErrorDisplay error={error} onRetry={refetch} />
        ) : !conversations ||
          (conversations as NormalizedConversation[]).length === 0 ? (
          <NoMessages onActionPress={() => navigation.navigate("Search")} />
        ) : (
          <FlatList
            data={conversations as NormalizedConversation[]}
            keyExtractor={(item) =>
              ((item as any)._id ||
                (item as any).id ||
                Math.random().toString(36)) as string
            }
            renderItem={({ item }) => renderConversation(item)}
            contentContainerStyle={styles.conversationsList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[theme.colors.primary[500]]}
                tintColor={theme.colors.primary[500]}
              />
            }
          />
        )}
      </ScreenContainer>
      {/* Safety Action Sheet and Report Modal */}
      <SafetyActionSheet
        visible={safetyVisible && !!selectedPartner}
        onClose={() => setSafetyVisible(false)}
        userId={selectedPartner?.id || ""}
        userName={selectedPartner?.name || "User"}
        onReport={() => {
          setSafetyVisible(false);
          setReportVisible(true);
        }}
      />
      <ReportUserModal
        visible={reportVisible && !!selectedPartner}
        userId={selectedPartner?.id || ""}
        userName={selectedPartner?.name || "User"}
        onClose={() => setReportVisible(false)}
      />
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    // Header handled by AppHeader
    newChatButton: {
      padding: Layout.spacing.sm,
      backgroundColor: theme.colors.primary[50],
      borderRadius: Layout.radius.full,
    },
    newChatButtonText: {
      fontSize: Layout.typography.fontSize.lg,
    },
    offlineHint: {
      paddingHorizontal: Layout.spacing.md,
      paddingVertical: Layout.spacing.xs,
      backgroundColor: theme.colors.warning?.[50] || theme.colors.neutral[100],
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    offlineHintText: {
      fontSize: Layout.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      textAlign: "center",
    },
    conversationsList: {
      paddingTop: Layout.spacing.sm,
    },
    conversationCard: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Layout.spacing.lg,
      paddingVertical: Layout.spacing.md,
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    unreadConversationCard: {
      backgroundColor: theme.colors.primary[50],
    },
    // Avatar handled by shared component; keep spacing via marginRight on wrapper
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
      color: theme.colors.text.primary,
    },
    unreadParticipantName: {
      fontWeight: Layout.typography.fontWeight.bold,
    },
    lastMessageTime: {
      fontSize: Layout.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
    },
    messagePreviewContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    lastMessage: {
      flex: 1,
      fontSize: Layout.typography.fontSize.base,
      color: theme.colors.text.secondary,
      marginRight: Layout.spacing.sm,
    },
    unreadLastMessage: {
      color: theme.colors.text.primary,
      fontWeight: Layout.typography.fontWeight.medium,
    },
    unreadBadge: {
      backgroundColor: theme.colors.primary[500],
      borderRadius: Layout.radius.full,
      paddingHorizontal: Layout.spacing.sm,
      paddingVertical: 2,
      minWidth: 20,
      alignItems: "center",
    },
    unreadBadgeText: {
      fontSize: Layout.typography.fontSize.xs,
      fontWeight: Layout.typography.fontWeight.bold,
      color: theme.colors.text.inverse,
    },
    contentStyle: {
      flexGrow: 1,
    },
  });
