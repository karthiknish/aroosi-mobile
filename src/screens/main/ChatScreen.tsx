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
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { FullScreenLoading } from "@/components/ui/LoadingStates";
import * as Haptics from "expo-haptics";
// import ScreenContainer from "@components/common/ScreenContainer";
import useResponsiveSpacing from "@/hooks/useResponsive";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useConversationMessaging } from "@/hooks/useOfflineMessaging";
import { Message } from "@/types/message";
import { OfflineMessageStatus } from "@components/messaging/OfflineMessageStatus";
import { useToast } from "@/providers/ToastContext";
import { VoiceMessageDisplay } from "@components/messaging/VoiceMessage";
import { VoiceRecorder } from "@components/messaging/VoiceRecorder";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import {
  useMessagingFeatures,
  useVoiceMessageLimits,
  useDailyMessageLimit,
} from "@/hooks/useMessagingFeatures";
import MessagesList from "@components/chat/MessagesList";
import { useApiClient } from "@/utils/api";
import { VoiceMessageManager } from "../../../services/voiceMessageManager";
import { computePeaksFromUri } from "@/utils/peaks";
import type { MessagingAPI } from "@/types/messaging";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  imageUploadQueue,
  type ImageUploadItem,
} from "@/utils/imageUploadQueue";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useSubscription } from "@/hooks/useSubscription";
import { validatePickedImage } from "@/utils/imageValidation";
import InlineUpgradeBanner from "@components/subscription/InlineUpgradeBanner";
import UpgradePrompt from "@components/subscription/UpgradePrompt";
import SafetyActionSheet from "@components/safety/SafetyActionSheet";
import ReportUserModal from "@components/safety/ReportUserModal";
import AppHeader from "@/components/common/AppHeader";
import { useFeatureGuard } from "@/hooks/useFeatureGuard";
import HintPopover from "@/components/ui/HintPopover";
// (Note: ChatScreenProps defined below)

type ChatRouteParams = {
  Chat: {
    conversationId: string;
    partnerName?: string;
    partnerId?: string;
  };
};

type ChatScreenRoute = RouteProp<ChatRouteParams, "Chat">;

interface ChatScreenProps {
  navigation: any;
}

export default function ChatScreen({ navigation }: ChatScreenProps) {
  const route = useRoute<ChatScreenRoute>();
  const { conversationId, partnerName, partnerId } = route.params;
  const { user } = useAuth();
  const userId = user?.id;
  const scrollViewRef = useRef<any>(null);
  const [inputText, setInputText] = useState("");
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showAttachmentTray, setShowAttachmentTray] = useState(false);
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
  const { theme } = useTheme();
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
    retryMessageById,
  } = useConversationMessaging(conversationId);

  const apiClient = useApiClient();
  // Adapter to make our existing apiClient conform to MessagingAPI expected by VoiceMessageManager
  class ApiClientAdapter implements MessagingAPI {
    constructor(private client: any) {}
    async getMessages(
      conversationId: string,
      options?: { limit?: number; before?: number }
    ) {
      return this.client.transportRequest(
        `/conversations/${conversationId}/messages`,
        { method: "GET" }
      );
    }
    async sendMessage(data: any) {
      return this.client.transportRequest("/messages", {
        method: "POST",
        body: data,
      });
    }
    async markConversationAsRead(conversationId: string) {
      return this.client.transportRequest(
        `/conversations/${conversationId}/read`,
        { method: "POST" }
      );
    }
    async generateVoiceUploadUrl() {
      return this.client.transportRequest("/voice/upload-url", {
        method: "POST",
      });
    }
    async getVoiceMessageUrl(storageId: string) {
      return this.client.transportRequest(`/voice/${storageId}/url`);
    }
    async sendTypingIndicator(
      _conversationId: string,
      _action: "start" | "stop"
    ) {
      // no-op here; handled elsewhere in app
      return { success: true } as any;
    }
    async sendDeliveryReceipt(_messageId: string, _status: string) {
      // no-op here; handled elsewhere in app
      return { success: true } as any;
    }
    async getConversations() {
      return this.client.transportRequest("/conversations");
    }
    async createConversation(participantIds: string[]) {
      return this.client.transportRequest("/conversations", {
        method: "POST",
        body: { participantIds },
      });
    }
    async deleteConversation(conversationId: string) {
      return this.client.transportRequest(`/conversations/${conversationId}`, {
        method: "DELETE",
      });
    }
  }
  const voiceManagerRef = useRef<VoiceMessageManager | null>(null);
  if (!voiceManagerRef.current) {
    voiceManagerRef.current = new VoiceMessageManager(
      new ApiClientAdapter(apiClient)
    );
  }
  // Presence state for partner
  const [partnerPresence, setPartnerPresence] = useState<{
    isOnline: boolean;
    lastSeen: number;
  }>({ isOnline: false, lastSeen: 0 });
  const presenceIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Compute last seen label similar to web
  const lastSeenLabel = useMemo(() => {
    if (partnerPresence.isOnline) return "Online";
    const ts = partnerPresence.lastSeen;
    if (!ts) return "Offline";
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMinutes < 1) return "Last seen just now";
    if (diffMinutes < 60) return `Last seen ${diffMinutes}m ago`;
    if (diffHours < 24) return `Last seen ${diffHours}h ago`;
    if (diffDays < 7) return `Last seen ${diffDays}d ago`;
    return `Last seen ${d.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    })}`;
  }, [partnerPresence.isOnline, partnerPresence.lastSeen]);

  // Draft persistence per conversation
  useEffect(() => {
    let mounted = true;
    const key = `chatDraft:${conversationId}`;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(key);
        if (mounted && typeof saved === "string") setInputText(saved);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    const key = `chatDraft:${conversationId}`;
    const t = setTimeout(() => {
      AsyncStorage.setItem(key, inputText).catch(() => undefined);
    }, 200);
    return () => clearTimeout(t);
  }, [inputText, conversationId]);

  // Presence polling + heartbeat
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        // Heartbeat current user
        await apiClient.heartbeat();
        if (partnerId) {
          const res = await apiClient.getPresence(partnerId);
          if (mounted && res.success) {
            const payload: any = (res.data as any)?.data ?? res.data;
            // web returns { data: { isOnline, lastSeen } } or direct shape depending on envelope
            const presence =
              payload?.isOnline !== undefined && payload?.lastSeen !== undefined
                ? payload
                : res.data;
            setPartnerPresence({
              isOnline: !!(presence as any).isOnline,
              lastSeen: Number((presence as any).lastSeen) || 0,
            });
          }
        }
      } catch {
        // ignore
      }
    };
    // initial fetch
    poll();
    // start interval every 10s (parity with web)
    presenceIntervalRef.current = setInterval(poll, 10000);
    return () => {
      mounted = false;
      if (presenceIntervalRef.current)
        clearInterval(presenceIntervalRef.current);
      presenceIntervalRef.current = null;
    };
  }, [apiClient, partnerId]);
  const { usage, subscription } = useSubscription();
  const { ensureAllowed } = useFeatureGuard();
  const subscriptionPlan = subscription?.plan || subscription?.tier || "free";
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
  const { canSendVoiceMessage, canSendTextMessage, canSendImageMessage } =
    useMessagingFeatures();
  const { canSendVoice } = useVoiceMessageLimits();
  const {
    remainingMessages,
    hasUnlimitedMessages,
    isNearLimit,
    hasReachedLimit,
    recordMessage,
  } = useDailyMessageLimit();

  // Upgrade prompt modal state
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [recommendedTier, setRecommendedTier] = useState<
    "premium" | "premiumPlus"
  >("premium");
  const [safetyVisible, setSafetyVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingAsset, setPendingAsset] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [localUploads, setLocalUploads] = useState<ImageUploadItem[]>([]);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  // Ephemeral voice uploads state: track by tempId
  const [pendingVoice, setPendingVoice] = useState<
    Record<
      string,
      {
        uri: string;
        progress: number; // 0..1
        duration: number; // seconds
        createdAt: number;
        error?: string;
        peaks?: number[];
        cancel?: () => void;
      }
    >
  >({});

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

        // Check text messaging permissions and daily limits
        const textPerm = canSendTextMessage();
        if (!textPerm.allowed) {
          setRecommendedTier("premium");
          setUpgradeVisible(true);
          return;
        }
        if (hasReachedLimit) {
          setRecommendedTier("premium");
          setUpgradeVisible(true);
          return;
        }
      }

      // Check subscription permissions for voice messages
      if (type === "voice") {
        const voicePermission = canSendVoiceMessage(metadata?.duration);
        if (!voicePermission.allowed) {
          setRecommendedTier(
            (voicePermission.reason || "").toLowerCase().includes("plus")
              ? "premiumPlus"
              : "premium"
          );
          setUpgradeVisible(true);
          return;
        }
        if (hasReachedLimit) {
          setRecommendedTier("premium");
          setUpgradeVisible(true);
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
        if (type === "text") {
          // Track usage for daily limit bookkeeping
          try {
            recordMessage();
          } catch {}
        } else if (type === "voice") {
          try {
            recordMessage();
          } catch {}
        }
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
    setShowVoiceRecorder(false);
    if (!conversationId || !userId || !partnerId) return;
    try {
      // Final gating before starting upload (plan + daily limit)
      const voicePermission = canSendVoiceMessage(Math.round(duration));
      if (!voicePermission.allowed) {
        setRecommendedTier(
          (voicePermission.reason || "").toLowerCase().includes("plus")
            ? "premiumPlus"
            : "premium"
        );
        setUpgradeVisible(true);
        return;
      }
      if (hasReachedLimit) {
        setRecommendedTier("premium");
        setUpgradeVisible(true);
        return;
      }
      const tempId = `v_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      // Seed an ephemeral pending bubble with progress
      setPendingVoice((prev) => ({
        ...prev,
        [tempId]: {
          uri: audioUri,
          progress: 0.05,
          duration: Math.round(duration),
          createdAt: Date.now(),
        },
      }));
      const mgr = voiceManagerRef.current!;
      // Compute lightweight peaks to send for consistent rendering
      let peaks: number[] | undefined = undefined;
      try {
        peaks = await computePeaksFromUri(audioUri, 28);
      } catch {}

      const handle = mgr.beginUploadVoiceMessage(
        audioUri,
        conversationId,
        userId,
        partnerId,
        Math.round(duration),
        {
          onProgress: (p) =>
            setPendingVoice((prev) =>
              prev[tempId]
                ? {
                    ...prev,
                    [tempId]: {
                      ...prev[tempId],
                      progress: Math.max(0, Math.min(1, p)),
                    },
                  }
                : prev
            ),
          peaks,
        }
      );
      // store cancel
      setPendingVoice((prev) =>
        prev[tempId]
          ? {
              ...prev,
              [tempId]: { ...prev[tempId], peaks, cancel: handle.cancel },
            }
          : prev
      );

      const res = await handle.promise;
      if (res?.success) {
        // Remove ephemeral and refresh to reflect server message
        setPendingVoice((prev) => {
          const { [tempId]: _omit, ...rest } = prev;
          return rest;
        });
        await loadMessages();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toast?.show?.("Voice message sent", "success");
      } else {
        const msg =
          (res as any)?.error?.message || "Failed to send voice message";
        setPendingVoice((prev) =>
          prev[tempId]
            ? { ...prev, [tempId]: { ...prev[tempId], error: msg } }
            : prev
        );
        toast?.show?.(msg, "error");
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to send voice message";
      // Mark ephemeral as failed for retry
      setPendingVoice((prev) => {
        const keys = Object.keys(prev);
        if (!keys.length) return prev;
        const lastKey = keys[keys.length - 1];
        return { ...prev, [lastKey]: { ...prev[lastKey], error: msg } };
      });
      toast?.show?.(msg, "error");
    }
  };

  // Actions for voice upload retries / cancel / dismiss
  const retryPendingVoice = async (tempId: string) => {
    const entry = pendingVoice[tempId];
    if (!entry) return;
    if (!conversationId || !userId || !partnerId) return;
    try {
      // reset error/progress
      setPendingVoice((prev) => ({
        ...prev,
        [tempId]: { ...prev[tempId], error: undefined, progress: 0 },
      }));
      const mgr = voiceManagerRef.current!;
      const handle = mgr.beginUploadVoiceMessage(
        entry.uri,
        conversationId,
        userId,
        partnerId,
        pendingVoice[tempId].duration,
        {
          onProgress: (p) =>
            setPendingVoice((prev) =>
              prev[tempId]
                ? { ...prev, [tempId]: { ...prev[tempId], progress: p } }
                : prev
            ),
          peaks: pendingVoice[tempId].peaks,
        }
      );
      setPendingVoice((prev) => ({
        ...prev,
        [tempId]: { ...prev[tempId], cancel: handle.cancel },
      }));
      const res = await handle.promise;
      if (res?.success) {
        setPendingVoice((prev) => {
          const { [tempId]: _omit, ...rest } = prev;
          return rest;
        });
        await loadMessages();
        toast?.show?.("Voice message sent", "success");
      } else {
        const msg = (res as any)?.error?.message || "Failed to send";
        setPendingVoice((prev) => ({
          ...prev,
          [tempId]: { ...prev[tempId], error: msg },
        }));
      }
    } catch {
      toast?.show?.("Retry failed", "error");
    }
  };

  const cancelPendingVoice = (tempId: string) => {
    const entry = pendingVoice[tempId];
    try {
      entry?.cancel?.();
    } catch {}
    setPendingVoice((prev) => {
      const next = { ...prev } as any;
      if (next[tempId]) next[tempId].error = "Canceled";
      return next;
    });
  };

  const dismissPendingVoice = (tempId: string) => {
    setPendingVoice((prev) => {
      const { [tempId]: _omit, ...rest } = prev;
      return rest;
    });
  };

  // Image attachments
  const requestCameraPermission = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  };

  const requestMediaLibraryPermission = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  };

  const assetToBlob = async (uri: string): Promise<Blob> => {
    const res = await fetch(uri);
    return await res.blob();
  };

  // Resize/compress large images to speed up upload and reduce data usage
  const prepareImageForUpload = async (
    asset: ImagePicker.ImagePickerAsset
  ): Promise<{
    uri: string;
    blob: Blob;
    fileName: string;
    contentType: string;
    width?: number;
    height?: number;
  }> => {
    // Target a reasonable long edge to keep quality but reduce size
    const maxEdge = 1440;
    const { width, height } = asset;
    let resizedUri = asset.uri;
    let outWidth = width;
    let outHeight = height;

    // Compute scale only if needed
    if (width && height && (width > maxEdge || height > maxEdge)) {
      const scale = Math.min(maxEdge / width, maxEdge / height);
      const targetW = Math.round(width * scale);
      const targetH = Math.round(height * scale);
      try {
        const result = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: targetW, height: targetH } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
        );
        resizedUri = result.uri;
        outWidth = result.width ?? targetW;
        outHeight = result.height ?? targetH;
      } catch {
        // If manipulation fails, fall back to original
      }
    }

    const fileName =
      asset.fileName ||
      resizedUri.split("/").pop() ||
      `photo_${Date.now()}.jpg`;
    const contentType =
      (asset as any).mimeType ||
      (asset.type === "image" ? "image/jpeg" : "application/octet-stream");
    const blob = await assetToBlob(resizedUri);

    return {
      uri: resizedUri,
      blob,
      fileName,
      contentType,
      width: outWidth,
      height: outHeight,
    };
  };

  const uploadImageAsset = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!userId || !partnerId) return;
    try {
      // Validate the selected image before uploading
      const validation = await validatePickedImage(
        {
          uri: asset.uri,
          type: (asset as any).mimeType || undefined,
          size: (asset as any).fileSize || undefined,
          name: asset.fileName || undefined,
        },
        {
          maxFileSizeBytes: 5 * 1024 * 1024, // 5MB limit
          minWidth: 200,
          minHeight: 200,
          allowedFormats: ["jpg", "jpeg", "png", "webp"],
        }
      );

      if (!validation.isValid) {
        const msg = validation.errors[0] || "Invalid image selected";
        setPendingAsset(asset);
        setUploadError(msg);
        if (toast?.show) toast.show(msg, "error");
        else Alert.alert("Invalid image", msg);
        return;
      }
      // Optionally surface non-blocking warnings
      if (validation.warnings.length && toast?.show) {
        toast.show(validation.warnings[0], "info");
      }

      // Resize/compress if needed before upload, then enqueue to upload queue
      const {
        uri: processedUri,
        fileName,
        contentType,
        width,
        height,
      } = await prepareImageForUpload(asset);

      await imageUploadQueue.enqueue({
        conversationId,
        fromUserId: userId,
        toUserId: partnerId,
        localUri: processedUri,
        fileName,
        contentType: contentType as string,
        width,
        height,
      });
      // Inform user
      toast?.show?.(
        isOnline ? "Uploading image…" : "Image queued for upload",
        "info"
      );
      setPendingAsset(null);
      setUploadError(null);
    } catch (e) {
      setPendingAsset(asset);
      setUploadError("Failed to upload image. Please try again.");
      toast?.show?.("Failed to upload image. Please try again.", "error");
    } finally {
      // Queue handles progress; no local spinner needed here
      setIsUploadingImage(false);
    }
  };

  const handlePickFromCamera = async () => {
    // Feature guard for image via camera
    const imgGuard = ensureAllowed("image");
    if (!imgGuard.allowed) {
      setRecommendedTier(imgGuard.recommendedTier || "premium");
      setUpgradeVisible(true);
      return;
    }
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert(
        "Camera permission required",
        "Please enable camera access in Settings."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) {
        setShowAttachmentTray(false);
        await uploadImageAsset(asset);
      }
    } catch (e) {
      toast?.show?.("Could not open camera.", "error");
    }
  };

  const handlePickFromLibrary = async () => {
    // Feature guard for image via library
    const imgGuard = ensureAllowed("image");
    if (!imgGuard.allowed) {
      setRecommendedTier(imgGuard.recommendedTier || "premium");
      setUpgradeVisible(true);
      return;
    }
    const granted = await requestMediaLibraryPermission();
    if (!granted) {
      Alert.alert(
        "Photos permission required",
        "Please allow photo library access in Settings."
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsMultipleSelection: false,
        selectionLimit: 1,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (asset) {
        setShowAttachmentTray(false);
        await uploadImageAsset(asset);
      }
    } catch (e) {
      toast?.show?.("Could not open photo library.", "error");
    }
  };

  // Typing dots component (inline)
  const TypingDots: React.FC = () => {
    const { theme } = useTheme();
    const [frame, setFrame] = useState(0);
    useEffect(() => {
      const id = setInterval(() => setFrame((f) => (f + 1) % 3), 400);
      return () => clearInterval(id);
    }, []);
    return (
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              marginHorizontal: 2,
              backgroundColor:
                i <= frame
                  ? theme.colors.primary[500]
                  : theme.colors.neutral[300],
              opacity: i <= frame ? 1 : 0.5,
            }}
          />
        ))}
      </View>
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
      backgroundColor: theme.colors.background.secondary,
    },
    contentStyle: {
      flexGrow: 1,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    // Header handled by AppHeader
    connectionStatus: {
      fontSize: fontSize.xs,
      color: theme.colors.success[500],
      fontWeight: "500" as any,
    },
    typingStatus: {
      fontSize: fontSize.sm,
      color: theme.colors.text.secondary,
      fontStyle: "italic",
    },
    typingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      marginTop: 2,
    },
    typingAvatarPlaceholder: {
      width: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.primary[500],
      alignItems: "center",
      justifyContent: "center",
      marginRight: spacing.xs,
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
      color: theme.colors.text.secondary,
      backgroundColor: theme.colors.background.primary,
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
      backgroundColor: theme.colors.primary[500],
      borderBottomRightRadius: Layout.radius.xs,
    },
    otherMessageBubble: {
      backgroundColor: theme.colors.background.primary,
      borderBottomLeftRadius: Layout.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    messageText: {
      fontSize: fontSize.base,
      lineHeight: fontSize.base * 1.4,
    },
    ownMessageText: {
      color: theme.colors.text.inverse,
    },
    otherMessageText: {
      color: theme.colors.text.primary,
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
      color: theme.colors.primary[100],
    },
    otherMessageTime: {
      color: theme.colors.text.tertiary,
    },
    messageStatus: {
      marginLeft: spacing.xs,
    },
    chatInputContainer: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
    },
    attachmentTray: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
    },
    attachmentChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: Layout.radius.full,
      borderWidth: 1,
    },
    chatInput: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: Layout.radius.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fontSize.base,
      maxHeight: 100,
      backgroundColor: theme.colors.background.secondary,
      marginRight: spacing.sm,
    },
    plusButton: {
      width: spacing.xl + spacing.sm + spacing.xs,
      height: spacing.xl + spacing.sm + spacing.xs,
      borderRadius: Layout.radius.full,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.sm,
      borderWidth: 1,
    },
    sendButton: {
      width: spacing.xl + spacing.sm + spacing.xs,
      height: spacing.xl + spacing.sm + spacing.xs,
      borderRadius: Layout.radius.full,
      justifyContent: "center",
      alignItems: "center",
    },
    sendButtonActive: {
      backgroundColor: theme.colors.primary[500],
    },
    sendButtonInactive: {
      backgroundColor: theme.colors.neutral[300],
    },
    sendButtonText: {
      fontSize: fontSize.lg,
      color: theme.colors.text.inverse,
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
      backgroundColor: theme.colors.primary[500],
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
      backgroundColor: theme.colors.neutral[100],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
      gap: spacing.sm,
    },
    replyBannerBar: {
      width: 3,
      alignSelf: "stretch",
      backgroundColor: theme.colors.primary[300],
      borderRadius: 2,
    },
    replyBannerContent: {
      flex: 1,
    },
    replyBannerTitle: {
      fontSize: fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: 2,
    },
    replyBannerText: {
      fontSize: fontSize.base,
      color: theme.colors.text.primary,
    },
    replyBannerClose: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: theme.colors.background.primary,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      justifyContent: "center",
      alignItems: "center",
    },
    replyBannerCloseText: {
      fontSize: fontSize.sm,
      color: theme.colors.text.secondary,
    },
    actionsContainer: {
      gap: spacing.sm,
    },
    actionItem: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: Layout.radius.lg,
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    actionLabel: {
      fontSize: fontSize.base,
      color: theme.colors.text.primary,
    },
    actionDisabled: {
      opacity: 0.5,
    },
    actionDestructive: {
      color: theme.colors.error[600],
    },
    // Search functionality styles
    headerActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    actionButton: {
      padding: spacing.sm,
      borderRadius: Layout.radius.md,
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    actionButtonText: {
      fontSize: fontSize.lg,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      gap: spacing.sm,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.base,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: Layout.radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    searchCloseButton: {
      padding: spacing.sm,
      borderRadius: Layout.radius.md,
      backgroundColor: theme.colors.background.secondary,
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    searchCloseText: {
      fontSize: fontSize.base,
      color: theme.colors.text.secondary,
    },
    searchResultsEmpty: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: spacing.xl,
    },
    searchResultsEmptyText: {
      fontSize: fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: "center",
    },
    offlineHint: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      backgroundColor: theme.colors.warning?.[50] || theme.colors.neutral[100],
      borderTopWidth: 1,
      borderTopColor: theme.colors.border.primary,
    },
    offlineHintText: {
      fontSize: fontSize.xs,
      color: theme.colors.text.secondary,
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

  // Initialize and bind to image upload queue
  useEffect(() => {
    let mounted = true;
    const ensureInit = async () => {
      try {
        await imageUploadQueue.initialize();
      } catch {}
    };
    ensureInit();

    const refresh = () => {
      const state = (imageUploadQueue as any).getState?.();
      if (!state) return;
      const list = (state.items as ImageUploadItem[]).filter(
        (i) => i.conversationId === conversationId
      );
      if (mounted) setLocalUploads(list);
    };

    const onAny = () => refresh();
    imageUploadQueue.on("initialized", onAny);
    imageUploadQueue.on("enqueued", onAny);
    imageUploadQueue.on("status", onAny);
    imageUploadQueue.on("removed", onAny);
    imageUploadQueue.on("done", ({ conversationId: cid }) => {
      if (cid === conversationId) {
        loadMessages();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      refresh();
    });
    imageUploadQueue.on("error", onAny);

    // Initial sync
    refresh();

    return () => {
      mounted = false;
      imageUploadQueue.off("initialized", onAny);
      imageUploadQueue.off("enqueued", onAny);
      imageUploadQueue.off("status", onAny);
      imageUploadQueue.off("removed", onAny);
      imageUploadQueue.off("done", onAny as any);
      imageUploadQueue.off("error", onAny);
    };
  }, [conversationId, loadMessages]);

  // Keep queue aware of connectivity
  useEffect(() => {
    try {
      imageUploadQueue.setOnlineStatus(!!isOnline);
    } catch {}
  }, [isOnline]);

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
        <AppHeader
          title={partnerName || "Chat"}
          subtitle={lastSeenLabel}
          onPressBack={() => navigation.goBack()}
          rightActions={
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={toggleSearchMode}
              >
                <Text style={styles.actionButtonText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setSafetyVisible(true)}
              >
                <Text style={styles.actionButtonText}>⚠️</Text>
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
          }
        />
        {isTyping && (
          <View
            style={[
              styles.typingRow,
              { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },
            ]}
          >
            <View style={styles.typingAvatarPlaceholder}>
              <Text style={{ color: theme.colors.text.inverse, fontSize: 10 }}>
                {(partnerName || "?").toString().charAt(0).toUpperCase()}
              </Text>
            </View>
            <TypingDots />
          </View>
        )}

        {/* Search Bar */}
        {isSearchMode && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search messages..."
              placeholderTextColor={theme.colors.text.secondary}
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

        {/* Near-limit inline upgrade banner */}
        {subscriptionPlan === "free" && (isNearLimit || hasReachedLimit) && (
          <View
            style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm }}
          >
            <InlineUpgradeBanner
              message={
                hasReachedLimit
                  ? "You've hit today's free message limit. Upgrade for unlimited messaging."
                  : `You're near today's free message limit (${remainingMessages} left). Upgrade for unlimited messaging.`
              }
              ctaLabel="Upgrade"
              onPress={() => setUpgradeVisible(true)}
            />
          </View>
        )}

        {/* Messages */}
        <View style={styles.messagesContainer}>
          <MessagesList
            messages={((): any => {
              const base = (
                isSearchMode && searchResults.length > 0
                  ? searchResults
                  : displayMessages
              ) as any[];
              const pending = Object.entries(pendingVoice).map(([id, v]) => ({
                _id: id,
                conversationId,
                fromUserId: userId!,
                toUserId: partnerId!,
                type: "voice",
                createdAt: v.createdAt,
                status: v.error ? ("failed" as const) : ("pending" as const),
                durationSeconds: v.duration,
                peaks: v.peaks,
                // special fields for UI rendering progress
                __uploading: !v.error,
                __progress: v.progress,
                __error: v.error,
              }));
              // Show pending at the end (most recent)
              return [...base, ...pending];
            })()}
            currentUserId={userId || ""}
            error={error}
            onRetry={() => loadMessages()}
            onRetryFailedMessage={async (m: any) => {
              try {
                if (m?._id?.startsWith("optimistic_") || m?._id?.startsWith("queue_")) {
                  const ok = await retryMessageById(m._id);
                  if (!ok) {
                    // If no mapping available, refresh so queue can reconcile
                    await loadMessages();
                  }
                } else if (m.type === "text") {
                  await sendMessage({
                    conversationId,
                    fromUserId: userId!,
                    toUserId: partnerId!,
                    text: m.text || "",
                    type: "text",
                    createdAt: Date.now(),
                  } as any);
                }
              } catch {}
            }}
            onDismissFailedMessage={(id: string) => {
              // Optimistically remove failed message from local array so it doesn't clutter UI
              try {
                const idx = messages.findIndex((mm: any) => mm._id === id);
                if (idx >= 0) {
                  const next = messages.slice();
                  next.splice(idx, 1);
                  // Not directly setting state here since messages come from hook; request a refresh instead
                  loadMessages();
                }
              } catch {}
            }}
            typingVisible={typingIndicator.isAnyoneElseTyping}
            typingText={typingIndicator.isAnyoneElseTyping ? "Typing..." : ""}
            showScrollToBottom={showScrollToBottom}
            onAtBottomChange={(atBottom: boolean) => {
              // Show FAB when not at bottom and there are messages
              setShowScrollToBottom(!atBottom && !!displayMessages?.length);
            }}
            onToggleReaction={handleToggleReaction}
            getReactionsForMessage={getReactionsForMessage}
            fetchImageUrl={async (messageId: string) => {
              try {
                const res = await apiClient.getMessageImageUrl(messageId);
                if (res.success && (res.data as any)?.imageUrl) {
                  return (res.data as any).imageUrl as string;
                }
              } catch {}
              return null;
            }}
            onReplyMessage={(m: any) => {
              setReplyContext({
                messageId: m._id,
                text: m.text,
                type: m.type,
                fromUserId: m.fromUserId,
              });
            }}
            onEditMessage={(m: any) => {
              if (!canEdit(m)) return;
              setEditingMessageId(m._id);
              setInputText(m.text || "");
            }}
            onDeleteMessage={(m: any) => {
              if (!canDelete(m)) return;
              const targetId = m._id;
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
                        setOptimisticDeleted((prev) => ({
                          ...prev,
                          [targetId]: true,
                        }));
                        const res = await apiClient.deleteMessage(targetId);
                        if (!res?.success) {
                          setOptimisticDeleted((prev) => {
                            const { [targetId]: _omit, ...rest } = prev;
                            return rest;
                          });
                          if (toast)
                            toast.show(
                              "Delete failed. Please try again.",
                              "error"
                            );
                        } else {
                          loadMessages();
                        }
                      } catch (e) {
                        setOptimisticDeleted((prev) => {
                          const { [targetId]: _omit, ...rest } = prev;
                          return rest;
                        });
                        if (toast)
                          toast.show(
                            "Delete failed. Please try again.",
                            "error"
                          );
                      }
                    },
                  },
                ]
              );
            }}
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
                (f: any) => f.name === "messagesSent" && f.percentageUsed >= 80
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
            onPressUpgrade={() => setUpgradeVisible(true)}
            // Provide voice upload retry/cancel actions via extra props if we add later
            onRetryVoice={(id) => retryPendingVoice(id)}
            onCancelVoice={(id) => cancelPendingVoice(id)}
            onDismissVoice={(id) => dismissPendingVoice(id)}
          />
          {isSearchMode && searchResults.length === 0 && searchQuery && (
            <View style={styles.searchResultsEmpty}>
              <Text style={styles.searchResultsEmptyText}>
                No messages found for "{searchQuery}"
              </Text>
            </View>
          )}
        </View>

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

        {/* Attachment Tray */}
        {showAttachmentTray && (
          <View style={styles.attachmentTray}>
            <TouchableOpacity
              style={[
                styles.attachmentChip,
                { borderColor: theme.colors.border.primary },
              ]}
              onPress={handlePickFromCamera}
            >
              <Text style={{ color: theme.colors.text.primary }}>📷 Photo</Text>
            </TouchableOpacity>
            {(() => {
              const guard = ensureAllowed("image");
              if (!guard.allowed) {
                return (
                  <Text
                    style={{
                      color: theme.colors.text.secondary,
                      fontSize: fontSize.xs,
                      marginLeft: spacing.xs,
                    }}
                    accessibilityLabel="image-gate-reason-camera"
                    numberOfLines={1}
                  >
                    {guard.reason || "Upgrade to share photos"}
                  </Text>
                );
              }
              return null;
            })()}
            <TouchableOpacity
              style={[
                styles.attachmentChip,
                { borderColor: theme.colors.border.primary },
              ]}
              onPress={handlePickFromLibrary}
            >
              <Text style={{ color: theme.colors.text.primary }}>
                🖼 Library
              </Text>
            </TouchableOpacity>
            {(() => {
              const guard = ensureAllowed("image");
              if (!guard.allowed) {
                return (
                  <Text
                    style={{
                      color: theme.colors.text.secondary,
                      fontSize: fontSize.xs,
                      marginLeft: spacing.xs,
                    }}
                    accessibilityLabel="image-gate-reason-library"
                    numberOfLines={1}
                  >
                    {guard.reason || "Upgrade to share photos"}
                  </Text>
                );
              }
              return null;
            })()}
            <TouchableOpacity
              style={[
                styles.attachmentChip,
                { borderColor: theme.colors.border.primary },
              ]}
              onPress={() =>
                toast?.show?.("Share location (coming soon)", "info")
              }
            >
              <Text style={{ color: theme.colors.text.primary }}>
                📍 Location
              </Text>
            </TouchableOpacity>
            {localUploads.length > 0 && (
              <View style={{ flex: 1, gap: spacing.xs }}>
                {localUploads.map((u) => (
                  <View
                    key={u.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: spacing.sm,
                      paddingVertical: 6,
                    }}
                  >
                    <Text
                      style={{ flex: 1, color: theme.colors.text.primary }}
                      numberOfLines={1}
                    >
                      {u.fileName} ·{" "}
                      {u.status === "queued"
                        ? "Queued"
                        : u.status === "error"
                        ? "Failed"
                        : `${Math.round((u.progress || 0) * 100)}%`}
                    </Text>
                    {u.status === "error" ? (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.attachmentChip,
                            { borderColor: theme.colors.error[400] },
                          ]}
                          onPress={() => imageUploadQueue.retry(u.id)}
                        >
                          <Text style={{ color: theme.colors.text.primary }}>
                            Retry
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.attachmentChip,
                            { borderColor: theme.colors.border.primary },
                          ]}
                          onPress={() => imageUploadQueue.remove(u.id)}
                        >
                          <Text style={{ color: theme.colors.text.primary }}>
                            Dismiss
                          </Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <Text style={{ color: theme.colors.text.secondary }}>
                        {u.status === "done"
                          ? "Done"
                          : u.status === "queued"
                          ? "Waiting"
                          : "Uploading"}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
            {!!uploadError && (
              <View
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.sm,
                  paddingVertical: 8,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: theme.colors.error[600],
                  }}
                  numberOfLines={2}
                >
                  {uploadError}
                </Text>
                {!!pendingAsset && (
                  <TouchableOpacity
                    style={[
                      styles.attachmentChip,
                      { borderColor: theme.colors.error[400] },
                    ]}
                    onPress={async () => {
                      const a = pendingAsset;
                      setUploadError(null);
                      setPendingAsset(null);
                      if (a) await uploadImageAsset(a);
                    }}
                  >
                    <Text style={{ color: theme.colors.text.primary }}>
                      Retry
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.attachmentChip,
                    { borderColor: theme.colors.border.primary },
                  ]}
                  onPress={() => {
                    setUploadError(null);
                    setPendingAsset(null);
                  }}
                >
                  <Text style={{ color: theme.colors.text.primary }}>
                    Dismiss
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Chat Input */}
        {/* Offline hint */}
        {!isOnline && (
          <View style={styles.offlineHint}>
            <Text style={styles.offlineHintText}>
              You’re offline. New messages will be queued and sent when you’re
              back online.
            </Text>
          </View>
        )}
        <View style={styles.chatInputContainer}>
          {showVoiceRecorder ? (
            <VoiceRecorder
              onRecordingComplete={handleVoiceMessage}
              onCancel={() => setShowVoiceRecorder(false)}
              style={styles.voiceRecorderContainer}
            />
          ) : (
            <>
              {/** Precompute guard states for UX hints */}
              {(() => {
                return null;
              })()}
              <TouchableOpacity
                style={[
                  styles.plusButton,
                  {
                    backgroundColor: theme.colors.background.secondary,
                    borderColor: theme.colors.border.primary,
                  },
                ]}
                onPress={() => setShowAttachmentTray((v) => !v)}
              >
                <Text
                  style={{
                    fontSize: fontSize.lg,
                    color: theme.colors.text.primary,
                  }}
                >
                  ＋
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={() => {
                  // Centralized feature guard for voice
                  const guard = ensureAllowed("voice");
                  if (!guard.allowed) {
                    setRecommendedTier(guard.recommendedTier || "premium");
                    setUpgradeVisible(true);
                    return;
                  }

                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowVoiceRecorder(true);
                }}
              >
                <Text style={styles.voiceButtonText}>🎤</Text>
              </TouchableOpacity>
              {(() => {
                const guard = ensureAllowed("voice");
                if (!guard.allowed) {
                  return (
                    <HintPopover
                      hint={
                        guard.reason ||
                        "Upgrade your plan or wait until tomorrow to send voice messages."
                      }
                      label="Why?"
                      title="Voice messages disabled"
                    />
                  );
                }
                return null;
              })()}

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
                    toast?.show?.(
                      "Messages are limited to 500 characters.",
                      "info"
                    );
                    return;
                  }
                  const guard = ensureAllowed("text");
                  if (!guard.allowed) {
                    setRecommendedTier(guard.recommendedTier || "premium");
                    setUpgradeVisible(true);
                    return;
                  }
                  if (editingMessageId) handleEditSubmit();
                  else handleSendMessage(trimmed);
                }}
                returnKeyType="send"
              />
              {(() => {
                const trimmed = inputText.trim();
                let reason: string | null = null;
                if (!trimmed) reason = "Type a message to enable send";
                else if (!canSend) reason = "You’re offline";
                else if (!ensureAllowed("text").allowed)
                  reason =
                    ensureAllowed("text").reason ||
                    "Upgrade to continue messaging";
                if (!reason) return null;
                return (
                  <HintPopover
                    hint={reason}
                    label="Why?"
                    title="Send disabled"
                  />
                );
              })()}
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

        {/* Upgrade Prompt Modal */}
        <UpgradePrompt
          visible={upgradeVisible}
          onClose={() => setUpgradeVisible(false)}
          onUpgrade={(tier) => {
            setUpgradeVisible(false);
            navigation.navigate("Subscription", {
              screen: "Subscription",
              params: { tier },
            } as any);
          }}
          currentTier={(subscriptionPlan as any) || "free"}
          recommendedTier={recommendedTier}
          title={
            recommendedTier === "premiumPlus"
              ? "Premium Plus required"
              : "Upgrade required"
          }
          message={
            recommendedTier === "premiumPlus"
              ? "This feature is part of Premium Plus. Upgrade to unlock it."
              : "Upgrade to Premium to unlock unlimited messaging and more."
          }
        />

        {/* Safety Action Sheet and Report Modal */}
        <SafetyActionSheet
          visible={safetyVisible}
          onClose={() => setSafetyVisible(false)}
          userId={partnerId || ""}
          userName={partnerName || "User"}
          onReport={() => {
            setSafetyVisible(false);
            setReportVisible(true);
          }}
        />
        <ReportUserModal
          visible={reportVisible}
          userId={partnerId || ""}
          userName={partnerName || "User"}
          onClose={() => setReportVisible(false)}
        />
      </KeyboardAvoidingView>
    </View>
  );
}
