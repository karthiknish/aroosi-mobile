import React, { useMemo, useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ListRenderItemInfo,
  Animated,
  Modal,
  Pressable,
  Dimensions,
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
  edited?: boolean;
  editedAt?: number;
  deleted?: boolean;
  deletedAt?: number;
  replyToMessageId?: string;
  replyToText?: string;
  replyToType?: "text" | "voice" | "image";
  replyToFromUserId?: string;
  // voice fields (optional)
  voiceUrl?: string;
  voiceDuration?: number; // ms
  voiceWaveform?: number[]; // pixel heights or normalized mapped
  // server-aligned optional fields
  audioUrl?: string;
  durationSeconds?: number;
  peaks?: number[];
  // Align with core Message status (no 'sending'); treat local transient 'pending' as the only pre-send state
  status?: "pending" | "sent" | "delivered" | "read" | "failed";
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
  // Actions
  onLongPressMessage?: (message: BaseMessage) => void;
  // New explicit action callbacks to align with web: reply/edit/delete
  onReplyMessage?: (message: BaseMessage) => void;
  onEditMessage?: (message: BaseMessage) => void;
  onDeleteMessage?: (message: BaseMessage) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  // Get reactions for a message (returns reactions with user info)
  getReactionsForMessage?: (
    messageId: string
  ) => Array<{
    emoji: string;
    count: number;
    reactedByMe: boolean;
    userIds: string[];
  }>;
  // Upgrade chip props
  showUpgradeChip?: boolean;
  upgradeChipText?: string;
  onPressUpgrade?: () => void;
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
  onLongPressMessage,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onToggleReaction,
  getReactionsForMessage,
  showUpgradeChip = false,
  upgradeChipText = "Upgrade for unlimited messaging",
  onPressUpgrade,
}: MessagesListProps) {
  const listRef = useRef<FlatList<BaseMessage>>(null);
  const [quickReactionState, setQuickReactionState] = useState<{
    messageId: string;
    position: { x: number; y: number };
    visible: boolean;
  } | null>(null);
  const [contextMenuState, setContextMenuState] = useState<{
    messageId: string;
    position: { x: number; y: number };
    visible: boolean;
  } | null>(null);

  // Quick reaction emojis (same as web)
  const quickReactionEmojis = ["👍", "❤️", "😂", "😮", "🙏"];

  // Enhanced reaction toolbar component
  const QuickReactionToolbar = ({
    messageId,
    position,
    onClose,
  }: {
    messageId: string;
    position: { x: number; y: number };
    onClose: () => void;
  }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 150,
        friction: 8,
      }).start();
    }, []);

    const handleReaction = (emoji: string) => {
      onToggleReaction?.(messageId, emoji);
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(onClose);
    };

    return (
      <View style={styles.reactionOverlay}>
        <Pressable style={styles.reactionOverlayBackground} onPress={onClose} />
        <Animated.View
          style={[
            styles.quickReactionToolbar,
            {
              top: position.y - 60,
              left: Math.max(
                10,
                Math.min(position.x - 100, Dimensions.get("window").width - 210)
              ),
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {quickReactionEmojis.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.quickReactionButton}
              onPress={() => handleReaction(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.quickReactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </View>
    );
  };

  // Enhanced context menu component
  const ContextMenu = ({
    messageId,
    position,
    onClose,
  }: {
    messageId: string;
    position: { x: number; y: number };
    onClose: () => void;
  }) => {
    const message = messages.find((m) => m._id === messageId);
    const isMine = message?.fromUserId === currentUserId;
    const reactions = getReactionsForMessage?.(messageId) || [];
    const myReactions = reactions.filter((r) => r.reactedByMe);

    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }, []);

    const handleClose = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(onClose);
    };

    const handleReaction = (emoji: string) => {
      onToggleReaction?.(messageId, emoji);
      handleClose();
    };

    return (
      <View style={styles.reactionOverlay}>
        <Pressable
          style={styles.reactionOverlayBackground}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.contextMenu,
            {
              top: position.y,
              left: Math.max(
                10,
                Math.min(position.x, Dimensions.get("window").width - 180)
              ),
              opacity: fadeAnim,
            },
          ]}
        >
          {/* Quick reactions section */}
          <View style={styles.contextMenuSection}>
            <Text style={styles.contextMenuTitle}>React</Text>
            <View style={styles.contextMenuReactions}>
              {quickReactionEmojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.contextMenuReactionButton}
                  onPress={() => handleReaction(emoji)}
                >
                  <Text style={styles.contextMenuReactionEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* My reactions section */}
          {myReactions.length > 0 && (
            <View
              style={[
                styles.contextMenuSection,
                styles.contextMenuSectionBorder,
              ]}
            >
              <Text style={styles.contextMenuTitle}>Your reactions</Text>
              <View style={styles.contextMenuReactions}>
                {myReactions.map((reaction) => (
                  <TouchableOpacity
                    key={`remove-${reaction.emoji}`}
                    style={styles.contextMenuRemoveButton}
                    onPress={() => handleReaction(reaction.emoji)}
                  >
                    <Text style={styles.contextMenuReactionEmoji}>
                      {reaction.emoji}
                    </Text>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Message actions */}
          <View
            style={[styles.contextMenuSection, styles.contextMenuSectionBorder]}
          >
            {/* Reply is available for any message */}
            <TouchableOpacity
              style={styles.contextMenuAction}
              onPress={() => {
                if (message && onReplyMessage) onReplyMessage(message);
                handleClose();
              }}
            >
              <Text style={styles.contextMenuActionText}>Reply</Text>
            </TouchableOpacity>
            {/* Edit/Delete only for own, non-voice messages */}
            {isMine && message?.type !== "voice" && (
              <>
                <TouchableOpacity
                  style={styles.contextMenuAction}
                  onPress={() => {
                    if (message && onEditMessage) onEditMessage(message);
                    handleClose();
                  }}
                >
                  <Text style={styles.contextMenuActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.contextMenuAction}
                  onPress={() => {
                    if (message && onDeleteMessage) onDeleteMessage(message);
                    handleClose();
                  }}
                >
                  <Text style={styles.contextMenuActionText}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    );
  };

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
    const label = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
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
      item.type === "voice" &&
      (item.audioUrl || item.voiceUrl || (item as any).audioStorageId);

    const showDeleted = item.deleted === true;
    const showEdited = !!item.edited || !!item.editedAt;

    const effectiveStatus = (): Exclude<BaseMessage["status"], undefined> => {
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
      if (item.status === "read" || item.status === "delivered")
        return item.status;
      if (item.status === "pending") return item.status;
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
          <TouchableOpacity
            activeOpacity={0.9}
            delayLongPress={250}
            onLongPress={(event) => {
              const { pageX, pageY } = event.nativeEvent;
              // Align with web: long-press opens a context menu with React/Reply/Edit/Delete
              setContextMenuState({
                messageId: item._id,
                position: { x: pageX, y: pageY },
                visible: true,
              });
              // Still notify parent if provided
              if (onLongPressMessage) onLongPressMessage(item);
            }}
            onPress={(event) => {
              // Double tap to show quick reaction toolbar for speed
              const now = Date.now();
              const lastTap = (event.target as any).__lastTap || 0;
              if (now - lastTap < 300 && onToggleReaction) {
                const { pageX, pageY } = event.nativeEvent;
                setQuickReactionState({
                  messageId: item._id,
                  position: { x: pageX, y: pageY },
                  visible: true,
                });
              }
              (event.target as any).__lastTap = now;
            }}
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            {/* Reply preview (if this message replies to another) */}
            {item.replyToMessageId && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const targetIndex = messages.findIndex(
                    (m) => m._id === item.replyToMessageId
                  );
                  if (targetIndex >= 0) {
                    try {
                      listRef.current?.scrollToIndex({
                        index: targetIndex,
                        animated: true,
                      });
                    } catch {}
                  }
                }}
                style={[
                  styles.replyPreview,
                  isMine ? styles.replyMine : styles.replyTheirs,
                ]}
              >
                <View style={styles.replyBar} />
                <View style={styles.replyContent}>
                  <Text
                    style={[
                      styles.replyLabel,
                      isMine ? styles.replyLabelMine : styles.replyLabelTheirs,
                    ]}
                  >
                    Replying to
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.replyText,
                      isMine ? styles.replyTextMine : styles.replyTextTheirs,
                    ]}
                  >
                    {item.replyToType === "voice"
                      ? "Voice message"
                      : item.replyToText || "(no text)"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            {showDeleted ? (
              <Text style={[styles.deletedText]}>This message was deleted</Text>
            ) : isVoice ? (
              <VoiceMessage
                // VoiceMessage expects a Message type; provide the minimal required shape
                message={
                  {
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
                  } as any
                }
                peaks={item.peaks}
                durationSeconds={item.durationSeconds}
                isOwnMessage={isMine}
                showStatus={isMine}
              />
            ) : (
              <Text
                style={[
                  styles.text,
                  isMine ? styles.textMine : styles.textTheirs,
                ]}
              >
                {item.text}
              </Text>
            )}

            {/* Enhanced Reactions row */}
            {Array.isArray((item as any).reactions) &&
              (item as any).reactions.length > 0 && (
                <View style={styles.reactionsRow}>
                  {(item as any).reactions.map(
                    (r: { emoji: string; count: number }) => {
                      // Check if current user reacted with this emoji
                      const userReacted =
                        getReactionsForMessage?.(item._id)?.find(
                          (reaction) => reaction.emoji === r.emoji
                        )?.reactedByMe || false;

                      return (
                        <TouchableOpacity
                          key={`${item._id}_${r.emoji}`}
                          style={[
                            styles.enhancedReactionChip,
                            userReacted && styles.enhancedReactionChipActive,
                          ]}
                          onPress={() => onToggleReaction?.(item._id, r.emoji)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.enhancedReactionEmoji}>
                            {r.emoji}
                          </Text>
                          {r.count > 1 && (
                            <Text
                              style={[
                                styles.enhancedReactionCount,
                                userReacted &&
                                  styles.enhancedReactionCountActive,
                              ]}
                            >
                              {r.count}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>
              )}

            {/* Meta row: time + ticks */}
            <View
              style={[
                styles.metaRow,
                isMine ? styles.metaMine : styles.metaTheirs,
              ]}
            >
              <Text style={styles.metaTime}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
              {showEdited && <Text style={styles.editedDot}> • edited</Text>}
              {isMine && (
                <MessageStatusIndicator status={effectiveStatus()} size={12} />
              )}
            </View>
          </TouchableOpacity>
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

  const ListFooterComponent = () => (
    <>
      {typingVisible && <TypingIndicator text={typingText} visible={true} />}
      {showUpgradeChip && (
        <View style={styles.upgradeChipWrap}>
          <TouchableOpacity
            onPress={onPressUpgrade}
            activeOpacity={0.9}
            style={styles.upgradeChip}
          >
            <Text style={styles.upgradeChipText}>{upgradeChipText}</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {Array.from({ length: 6 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.loadingRow,
              i % 2 ? styles.rowMine : styles.rowTheirs,
            ]}
          >
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
              onRefresh ? (
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
              ) : undefined
            }
          />
          <ScrollToBottomFAB />

          {/* Quick Reaction Toolbar Modal */}
          {quickReactionState?.visible && (
            <Modal transparent visible animationType="none">
              <QuickReactionToolbar
                messageId={quickReactionState.messageId}
                position={quickReactionState.position}
                onClose={() => setQuickReactionState(null)}
              />
            </Modal>
          )}

          {/* Context Menu Modal */}
          {contextMenuState?.visible && (
            <Modal transparent visible animationType="none">
              <ContextMenu
                messageId={contextMenuState.messageId}
                position={contextMenuState.position}
                onClose={() => setContextMenuState(null)}
              />
            </Modal>
          )}
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
  reactionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  reactionChip: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  reactionText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.primary,
  },
  row: {
    flexDirection: "row",
    position: "relative",
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
  editedDot: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  messageBlock: {
    gap: Layout.spacing.xs,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
    padding: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    marginBottom: Layout.spacing.xs,
  },
  replyMine: {
    backgroundColor: Colors.primary[600] || Colors.primary[500],
  },
  replyTheirs: {
    backgroundColor: Colors.neutral[100],
  },
  replyBar: {
    width: 3,
    alignSelf: "stretch",
    backgroundColor: Colors.primary[300],
    borderRadius: 2,
  },
  replyContent: {
    flex: 1,
  },
  replyLabel: {
    fontSize: Layout.typography.fontSize.xs,
    marginBottom: 2,
  },
  replyLabelMine: {
    color: Colors.primary[100],
  },
  replyLabelTheirs: {
    color: Colors.text.secondary,
  },
  replyText: {
    fontSize: Layout.typography.fontSize.sm,
  },
  replyTextMine: {
    color: Colors.background.primary,
  },
  replyTextTheirs: {
    color: Colors.text.primary,
  },
  deletedText: {
    fontStyle: "italic",
    color: Colors.text.secondary,
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
  upgradeChipWrap: {
    alignItems: "center",
    paddingVertical: Layout.spacing.sm,
  },
  upgradeChip: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    borderRadius: 999,
    shadowColor: Colors.primary[500],
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6,
  },
  upgradeChipText: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.medium,
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
  // Enhanced Reaction UI Styles
  reactionOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  reactionOverlayBackground: {
    flex: 1,
    backgroundColor: "transparent",
  },
  quickReactionToolbar: {
    position: "absolute",
    flexDirection: "row",
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.xl,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: Layout.spacing.xs,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  quickReactionButton: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: Layout.radius.full,
    backgroundColor: "transparent",
  },
  quickReactionEmoji: {
    fontSize: 20,
  },
  contextMenu: {
    position: "absolute",
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    paddingVertical: Layout.spacing.xs,
    shadowColor: Colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    minWidth: 160,
    maxWidth: 200,
  },
  contextMenuSection: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
  },
  contextMenuSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border.primary,
    marginTop: Layout.spacing.xs,
    paddingTop: Layout.spacing.sm,
  },
  contextMenuTitle: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  contextMenuReactions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Layout.spacing.xs,
  },
  contextMenuReactionButton: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.neutral[50],
  },
  contextMenuReactionEmoji: {
    fontSize: 16,
  },
  contextMenuRemoveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.neutral[100],
  },
  removeText: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  contextMenuAction: {
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  contextMenuActionText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.primary,
  },
  // Enhanced reaction chips
  enhancedReactionChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[100],
    borderRadius: Layout.radius.full,
    paddingHorizontal: Layout.spacing.sm,
    paddingVertical: Layout.spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    gap: 2,
  },
  enhancedReactionChipActive: {
    backgroundColor: Colors.primary[100],
    borderColor: Colors.primary[300],
  },
  enhancedReactionEmoji: {
    fontSize: Layout.typography.fontSize.sm,
  },
  enhancedReactionCount: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.primary,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  enhancedReactionCountActive: {
    color: Colors.primary[700],
  },
});