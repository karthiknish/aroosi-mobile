import React, { useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
} from "react-native";
import { Colors, Layout } from "../../constants";
import TypingIndicator from "./TypingIndicator";
import VoiceMessage from "./VoiceMessage";
import MessageStatusIndicator from "./MessageStatusIndicator";
import { RefreshControl } from "react-native";

type BaseMessage = {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  type: "text" | "voice" | "image";
  text?: string;
  createdAt: number;
  readAt?: number;
  // voice fields (optional)
  voiceUrl?: string;
  voiceDuration?: number; // ms
  voiceWaveform?: number[]; // pixel heights or normalized mapped
  // server-aligned optional fields
  audioUrl?: string;
  durationSeconds?: number;
  peaks?: number[];
  status?: "pending" | "sending" | "sent" | "delivered" | "read" | "failed";
  deliveryReceipts?: any[];
};

interface MessagesListProps {
  messages: BaseMessage[];
  currentUserId: string;
  isBlocked?: boolean;
  lastReadAt?: number;
  typingVisible?: boolean;
  typingText?: string;
  onFetchOlder?: () => void | Promise<void>;
  hasMore?: boolean;
  loading?: boolean;
  loadingOlder?: boolean;
  showScrollToBottom?: boolean;
  onScrollToBottom?: (smooth?: boolean) => void;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

export default function MessagesList({
  messages,
  currentUserId,
  isBlocked = false,
  lastReadAt = 0,
  typingVisible = false,
  typingText = "Typing...",
  onFetchOlder,
  hasMore = false,
  loading = false,
  loadingOlder = false,
  showScrollToBottom = false,
  onScrollToBottom,
  onRefresh,
  refreshing = false,
}: MessagesListProps) {
  const listRef = useRef<FlatList<BaseMessage>>(null);

  // Compute first unread index similar to web
  const firstUnreadIndex = useMemo(() => {
    if (!messages || messages.length === 0) return -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].createdAt > lastReadAt) return i;
    }
    return -1;
  }, [messages, lastReadAt]);

  // Scroll-to-bottom FAB position and press
  const ScrollToBottomFAB = () =>
    showScrollToBottom ? (
      <View style={styles.fabContainer}>
        <TouchableOpacity
          onPress={() => {
            if (onScrollToBottom) onScrollToBottom(true);
            else listRef.current?.scrollToEnd({ animated: true });
          }}
          style={styles.fabButton}
          activeOpacity={0.9}
        >
          <Text style={styles.fabLabel}>New messages</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  // Separator rendering helpers
  const shouldShowTimeChip = (index: number) => {
    if (index === 0) return true;
    const prev = messages[index - 1];
    const cur = messages[index];
    return cur.createdAt - prev.createdAt > 7 * 60 * 1000; // > 7 min
  };

  const renderTimeChip = (ts: number) => {
    const d = new Date(ts);
    const label = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (
      <View style={styles.timeChipWrapper}>
        <Text style={styles.timeChip}>{label}</Text>
      </View>
    );
  };

  const renderUnreadSeparator = () => (
    <View style={styles.unreadWrapper}>
      <View style={styles.unreadLine} />
      <Text style={styles.unreadLabel}>Unread</Text>
      <View style={styles.unreadLine} />
    </View>
  );

  const renderItem = ({ item, index }: ListRenderItemInfo<BaseMessage>) => {
    const isMine = item.fromUserId === currentUserId;
    const showTime = shouldShowTimeChip(index);
    const isVoice =
      item.type === "voice" && (item.audioUrl || item.voiceUrl || item.audioStorageId);

    const effectiveStatus = (): Exclude<BaseMessage['status'], undefined> => {
      // Only show status ticks for my messages
      if (!isMine) return (item.status as any) || "sent";
      // Read via readAt or receipt
      if (item.readAt) return "read";
      const receipts = Array.isArray(item.deliveryReceipts)
        ? item.deliveryReceipts
        : [];
      const hasRead = receipts.some((r: any) => r?.status === "read");
      if (hasRead) return "read";
      const hasDelivered = receipts.some((r: any) => r?.status === "delivered");
      if (hasDelivered) return "delivered";
      if (item.status === "read" || item.status === "delivered") return item.status;
      if (item.status === "sending" || item.status === "pending") return item.status;
      if (item.status === "failed") return "failed";
      return "sent";
    };

    return (
      <View style={styles.messageBlock}>
        {/* Unread separator */}
        {index === firstUnreadIndex && renderUnreadSeparator()}

        {/* Time chip */}
        {showTime && renderTimeChip(item.createdAt)}

        {/* Bubble */}
        <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            {isVoice ? (
              <VoiceMessage
                // VoiceMessage expects a Message type; provide the minimal required shape
                message={{
                  _id: item._id,
                  conversationId: item.conversationId,
                  fromUserId: item.fromUserId,
                  toUserId: item.toUserId,
                  type: "voice",
                  text: item.text || "", // ensure non-undefined text for type safety
                  createdAt: item.createdAt,
                  voiceUrl: item.audioUrl || item.voiceUrl,
                  voiceDuration:
                    typeof item.durationSeconds === "number"
                      ? item.durationSeconds * 1000
                      : item.voiceDuration || 0,
                  voiceWaveform: item.voiceWaveform,
                  status: (item.status as any) || "sent",
                } as any}
                peaks={item.peaks}
                durationSeconds={item.durationSeconds}
                isOwnMessage={isMine}
                showStatus={isMine}
              />
            ) : (
              <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
                {item.text}
              </Text>
            )}

            {/* Meta row: time + ticks */}
            <View style={[styles.metaRow, isMine ? styles.metaMine : styles.metaTheirs]}>
              <Text style={styles.metaTime}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {isMine && (
                <MessageStatusIndicator status={effectiveStatus()} size={12} />
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const keyExtractor = (m: BaseMessage) => m._id;

  const ListHeaderComponent = () =>
    hasMore && !loading && messages.length > 0 ? (
      <View style={styles.loadOlderWrap}>
        <TouchableOpacity
          disabled={loadingOlder}
          onPress={() => onFetchOlder && onFetchOlder()}
          style={styles.loadOlderBtn}
        >
          <Text style={styles.loadOlderText}>
            {loadingOlder ? "Loading older..." : "Load older messages"}
          </Text>
        </TouchableOpacity>
      </View>
    ) : null;

  const ListFooterComponent = () =>
    typingVisible ? (
      <TypingIndicator text={typingText} visible={true} />
    ) : null;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View key={i} style={[styles.loadingRow, i % 2 ? styles.rowMine : styles.rowTheirs]}>
            <View
              style={[
                styles.loadingBubble,
                i % 2 ? styles.loadingBubbleMine : styles.loadingBubbleTheirs,
              ]}
            />
          </View>
        ))}
      </View>
    );
  }

  if (isBlocked) {
    return (
      <View style={styles.blockedContainer}>
        <View style={styles.blockedCard}>
          <Text style={styles.blockedTitle}>Chat Unavailable</Text>
          <Text style={styles.blockedText}>You cannot message this user</Text>
        </View>
      </View>
    );
  }

  const empty = !messages || messages.length === 0;

  return (
    <View style={styles.container}>
      {empty ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>Start the conversation!</Text>
          <Text style={styles.emptyText}>Send a message to break the ice</Text>
        </View>
      ) : (
        <>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            onEndReachedThreshold={0.1}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              onRefresh
                ? (
                    <RefreshControl
                      refreshing={!!refreshing}
                      onRefresh={() => {
                        const r = onRefresh();
                        if (r && typeof (r as any).then === "function") {
                          return r;
                        }
                      }}
                      colors={[Colors.primary[500]]}
                      tintColor={Colors.primary[500]}
                    />
                  )
                : undefined
            }
          />
          <ScrollToBottomFAB />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  listContent: {
    padding: Layout.spacing.md,
    gap: Layout.spacing.xs,
  },
  row: {
    flexDirection: "row",
  },
  rowMine: {
    justifyContent: "flex-end",
  },
  rowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.xl,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  bubbleMine: {
    backgroundColor: Colors.primary[500],
    borderBottomRightRadius: Layout.radius.sm,
  },
  bubbleTheirs: {
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderBottomLeftRadius: Layout.radius.sm,
  },
  text: {
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: 20,
  },
  textMine: {
    color: Colors.background.primary,
  },
  textTheirs: {
    color: Colors.text.primary,
  },
  metaRow: {
    marginTop: Layout.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
  metaMine: {
    justifyContent: "flex-end",
  },
  metaTheirs: {
    justifyContent: "flex-start",
  },
  metaTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  messageBlock: {
    gap: Layout.spacing.xs,
  },
  timeChipWrapper: {
    alignItems: "center",
    marginVertical: Layout.spacing.xs,
  },
  timeChip: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.radius.lg,
  },
  unreadWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    marginVertical: Layout.spacing.xs,
  },
  unreadLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border.primary,
  },
  unreadLabel: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
  },
  loadingContainer: {
    flex: 1,
    padding: Layout.spacing.md,
    gap: Layout.spacing.sm,
  },
  loadingRow: {
    flexDirection: "row",
  },
  loadingBubble: {
    width: 160,
    height: 24,
    borderRadius: Layout.radius.lg,
  },
  loadingBubbleMine: {
    alignSelf: "flex-end",
    backgroundColor: Colors.primary[100] || "rgba(168, 85, 247, 0.2)",
  },
  loadingBubbleTheirs: {
    alignSelf: "flex-start",
    backgroundColor: Colors.neutral[200],
  },
  blockedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Layout.spacing.lg,
  },
  blockedCard: {
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
  blockedTitle: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  blockedText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Layout.spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor:
      (Colors.primary && Colors.primary[100]) || "rgba(168,85,247,0.2)",
  },
  emptyTitle: {
    fontSize: Layout.typography.fontSize.lg,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  emptyText: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  fabContainer: {
    position: "absolute",
    bottom: Layout.spacing.lg,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fabButton: {
    backgroundColor: Colors.neutral[900],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: 999,
    shadowColor: Colors.neutral[900],
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  fabLabel: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  loadOlderWrap: {
    alignItems: "center",
    paddingVertical: Layout.spacing.sm,
  },
  loadOlderBtn: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background.primary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  loadOlderText: {
    color: Colors.text.primary,
    fontSize: Layout.typography.fontSize.sm,
  },
});