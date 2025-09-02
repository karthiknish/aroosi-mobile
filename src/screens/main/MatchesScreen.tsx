import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  FlatList,
  Image,
  ListRenderItemInfo,
} from "react-native";
import {
  useQuery,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useApiClient } from "@/utils/api";
import { useAuth } from "@contexts/AuthProvider";
import { Colors, Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import {
  FullScreenLoading,
  ProfileCardSkeleton,
  SkeletonLoading,
} from "@/components/ui/LoadingStates";
import { NoMatches, NoInterests } from "@/components/ui/EmptyStates";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import {
  FadeInView,
  ScaleInView,
  SlideInView,
  AnimatedButton,
  StaggeredList,
} from "@/components/ui/AnimatedComponents";
import ScreenContainer from "@components/common/ScreenContainer";
import { Profile } from "@/types/profile";
import { useToast } from "@/providers/ToastContext";
import { useInterests } from "@/hooks/useInterests";
import { formatTimeAgo } from "@/utils/formatting";
import { useRealtime } from "@/hooks/useRealtime";
// Use lightweight in-memory profile image cache (NOT the persistent advanced cache in project root)
import { getProfileImages, setProfileImages } from "@/utils/imageCache";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { unifiedMessagingApi } from "@/utils/unifiedMessagingApi";
import { BottomSheet } from "@/components/ui/BottomSheet";
import InlineUpgradeBanner from "@components/subscription/InlineUpgradeBanner";
import UpgradePrompt from "@components/subscription/UpgradePrompt";
import { useSubscription } from "@/hooks/useSubscription";
import type { SubscriptionTier } from "@/types/subscription";

interface MatchesScreenProps {
  navigation: any;
}

// Local types for matches and interests
type UIMatch = {
  userId: string;
  fullName?: string | null;
  profileImageUrls?: string[] | null;
  conversationId: string;
  matchedAt?: number;
  lastActivity?: number;
  unreadCount?: number;
};

interface Interest {
  _id: string;
  fromUserId: string;
  fromProfile?: Profile;
  createdAt?: number;
}

export default function MatchesScreen({ navigation }: MatchesScreenProps) {
  const {
    user,
    needsEmailVerification,
    resendEmailVerification,
    verifyEmailCode,
    startEmailVerificationPolling,
    refreshUser,
  } = useAuth() as any;
  const userId = user?.id;
  const { theme } = useTheme();
  const apiClient = useApiClient();
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  // Long-press actions state
  const [archivedIds, setArchivedIds] = useState<Set<string>>(new Set());
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<UIMatch | null>(null);
  // Subscription & upgrade state
  const { subscription, usage, canUseFeatureNow, trackFeatureUsage } =
    useSubscription();
  const subscriptionPlan = subscription?.plan || ("free" as SubscriptionTier);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [recommendedTier, setRecommendedTier] =
    useState<SubscriptionTier>("premium");

  const { sentInterests, sendInterest, sending, isMutualInterest } =
    useInterests();
  // Fetch today's icebreakers to show unanswered badge on Quick Picks CTA
  const { data: iceQs } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: async () => {
      const res = await apiClient.fetchIcebreakers();
      if (res.success) return (res.data as any[]) || [];
      return [] as any[];
    },
    staleTime: 1000 * 60 * 10,
  });
  const iceTotal = Array.isArray(iceQs) ? iceQs.length : 0;
  const iceAnswered = Array.isArray(iceQs)
    ? iceQs.filter(
        (q: any) => !!(q?.answered && String(q?.answer || "").trim())
      ).length
    : 0;
  const iceUnanswered = Math.max(0, iceTotal - iceAnswered);
  const hasSentInterestTo = useMemo(
    () => (otherUserId: string) =>
      sentInterests.some((i: any) => i.toUserId === otherUserId),
    [sentInterests]
  );

  const PAGE_SIZE = 20;
  const fetchMatchesPage = useCallback(
    async ({ pageParam = 0 }) => {
      const response = await apiClient.getConversations(); // TODO: replace with paginated endpoint when backend supports
      if (!response.success) return { items: [], nextPage: undefined };
      const payload: any = response.data;
      const conversations: any[] = payload?.conversations || payload || [];
      const start = pageParam * PAGE_SIZE;
      const slice = conversations.slice(start, start + PAGE_SIZE);
      const uiMatches: UIMatch[] = slice.map((c: any) => {
        const other = (c.participants || []).find(
          (p: any) => p?.userId !== userId
        );
        return {
          userId: other?.userId || "",
          fullName: other?.firstName || other?.fullName || other?.userId || "",
          profileImageUrls: other?.profileImageUrls || [],
          conversationId: c.conversationId || c._id || c.id,
          matchedAt: c.createdAt,
          lastActivity: c.lastActivity || c.lastMessageAt,
          unreadCount: typeof c.unreadCount === "number" ? c.unreadCount : 0,
        };
      });
      // Filter archived
      const filtered = uiMatches.filter(
        (m) => !archivedIds.has(m.conversationId)
      );
      const nextPage =
        start + PAGE_SIZE < conversations.length ? pageParam + 1 : undefined;
      return { items: filtered, nextPage };
    },
    [apiClient, userId, archivedIds]
  );

  const {
    data: matchesPages,
    isLoading: matchesLoading,
    error: matchesError,
    refetch: refetchMatches,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["matches"],
    queryFn: fetchMatchesPage,
    getNextPageParam: (lastPage: any) => lastPage.nextPage,
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    retry: 2,
    initialPageParam: 0,
  });

  const matches = useMemo(
    () => (matchesPages?.pages || []).flatMap((p: any) => p.items),
    [matchesPages]
  );

  // ---------------- Prefetch Next Page Near List End ----------------
  const PREFETCH_THRESHOLD = 6; // items from end to trigger
  const lastPrefetchedPageRef = useRef<number | null>(null);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 40 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: any[] }) => {
      if (!hasNextPage || isFetchingNextPage) return;
      if (!matches || !matches.length) return;
      const maxVisibleIndex = viewableItems.reduce(
        (max, vi) => (vi.index > max ? vi.index : max),
        -1
      );
      if (maxVisibleIndex >= matches.length - PREFETCH_THRESHOLD) {
        // Determine upcoming page we would fetch
        const nextPage = (matchesPages?.pages || []).length; // zero-based pages loaded
        if (lastPrefetchedPageRef.current !== nextPage) {
          lastPrefetchedPageRef.current = nextPage;
          fetchNextPage();
        }
      }
    }
  ).current;

  // ---------------- Image Batch Fetch & Caching (debounced) ----------------
  const pendingIdsRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<boolean>(false);
  const processedIdsRef = useRef<Set<string>>(new Set()); // track already attempted
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const scheduleBatchFetch = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      if (inFlightRef.current) return; // guard
      const userIds = Array.from(pendingIdsRef.current);
      pendingIdsRef.current.clear();
      if (!userIds.length) return;
      inFlightRef.current = true;

      // Retry with exponential backoff
      const maxRetries = 3;
      let attempt = 0;
      let success = false;
      while (attempt < maxRetries && !success) {
        try {
          const response: any = await apiClient.getBatchProfileImages(userIds);
          if (response?.success) {
            const raw = response.data;
            // Possible shapes: { userId: string[] }, [{ userId, urls|profileImageUrls|imageUrls }], { data: mapping }
            let mapping: Record<string, string[]> = {};
            if (raw && !Array.isArray(raw) && typeof raw === "object") {
              // If nested data property (defensive)
              const maybeData = (raw as any).data;
              if (
                maybeData &&
                typeof maybeData === "object" &&
                !Array.isArray(maybeData)
              ) {
                mapping = maybeData as Record<string, string[]>;
              } else {
                mapping = raw as Record<string, string[]>;
              }
            } else if (Array.isArray(raw)) {
              raw.forEach((entry: any) => {
                const id = entry.userId || entry.id || entry.profileId;
                if (!id) return;
                const urls =
                  entry.urls || entry.profileImageUrls || entry.imageUrls || [];
                if (Array.isArray(urls) && urls.length) mapping[id] = urls;
              });
            }
            // Validate: ensure arrays
            Object.entries(mapping).forEach(([uid, arr]) => {
              if (!Array.isArray(arr)) delete mapping[uid];
            });
            // Store in cache
            Object.entries(mapping).forEach(([uid, urls]) => {
              if (urls && urls.length) setProfileImages(uid, urls);
              processedIdsRef.current.add(uid);
            });
            success = true;
          } else {
            throw new Error(
              response?.error?.message || "Batch profile images request failed"
            );
          }
        } catch (err) {
          attempt++;
          if (attempt >= maxRetries) {
            // Mark attempted to avoid tight loops; they will retry later via visibility triggers.
            userIds.forEach((id) => processedIdsRef.current.add(id));
            break;
          }
          // backoff
          const delay = 300 * Math.pow(2, attempt - 1); // 300,600,1200
          await new Promise((res) => setTimeout(res, delay));
        }
      }
      inFlightRef.current = false;
    }, 160); // debounce 160ms to batch quickly arriving IDs
  }, [apiClient]);

  // Collect userIds missing images (either no match.profileImageUrls or empty AND not in cache)
  useEffect(() => {
    if (!matches || !matches.length) return;
    matches.forEach((m: UIMatch) => {
      const hasUrls = m.profileImageUrls && m.profileImageUrls.length > 0;
      const cached = getProfileImages(m.userId);
      if (!hasUrls && !cached && !processedIdsRef.current.has(m.userId)) {
        pendingIdsRef.current.add(m.userId);
      }
    });
    if (pendingIdsRef.current.size) scheduleBatchFetch();
  }, [matches, scheduleBatchFetch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Load archived from storage at mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem("archivedConversations");
        if (raw) setArchivedIds(new Set(JSON.parse(raw)));
      } catch {}
    })();
  }, []);

  const persistArchived = useCallback(async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(
        "archivedConversations",
        JSON.stringify(Array.from(ids))
      );
    } catch {}
  }, []);

  const {
    data: receivedInterests,
    isLoading: interestsLoading,
    error: interestsError,
    refetch: refetchInterests,
  } = useQuery<Interest[]>({
    queryKey: ["receivedInterests"],
    queryFn: async () => {
      if (!userId) return [];
      const response = await apiClient.getReceivedInterests(userId);
      return response.success ? (response.data as Interest[]) : [];
    },
    enabled: !!userId,
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchMatches(), refetchInterests()]);
    setRefreshing(false);
  };

  // Realtime updates: invalidate matches to refresh unread counts and new matches
  useRealtime({
    autoConnect: true,
    onNewMessage: () =>
      queryClient.invalidateQueries({ queryKey: ["matches"] }),
    onNewMatch: () => queryClient.invalidateQueries({ queryKey: ["matches"] }),
  });

  // Prefetch next page if initial page small (heuristic)
  useEffect(() => {
    if (!matchesLoading && hasNextPage && matches.length < PAGE_SIZE) {
      fetchNextPage();
    }
  }, [matchesLoading, hasNextPage, matches.length, fetchNextPage]);

  const handleMatchPress = (match: UIMatch) => {
    navigation.navigate("Chat", {
      screen: "Chat",
      params: {
        conversationId: match.conversationId,
        partnerName: match.fullName || "Unknown",
        partnerId: match.userId,
      },
    });
  };

  const handleMatchLongPress = (match: UIMatch) => {
    setSelectedMatch(match);
    setActionSheetVisible(true);
  };

  // Navigate to the sender's profile from an interest card
  const handleInterestPress = (interest: Interest) => {
    const profileId = interest?.fromUserId || interest?.fromProfile?.userId;
    if (!profileId) return;
    // Keep navigation style consistent with other screens
    navigation.navigate("ProfileDetail", { profileId });
  };

  const archiveConversation = async (convId: string) => {
    const next = new Set(archivedIds);
    next.add(convId);
    setArchivedIds(next);
    await persistArchived(next);
    queryClient.invalidateQueries({ queryKey: ["matches"] });
    toast?.show?.("Conversation archived", "info");
  };

  const deleteConversation = async (convId: string) => {
    const res = await unifiedMessagingApi.deleteConversation(convId);
    if (res.success) {
      toast?.show?.("Conversation deleted", "success");
      const next = new Set(archivedIds);
      if (next.delete(convId)) await persistArchived(next);
      queryClient.invalidateQueries({ queryKey: ["matches"] });
    } else {
      toast?.show?.(res.error?.message || "Delete failed", "error");
    }
  };

  const renderMatch = ({ item, index }: ListRenderItemInfo<UIMatch>) => {
    const match = item;
    return (
      <FadeInView key={`${match.conversationId}-${index}`} delay={index * 60}>
        <AnimatedButton
          style={[
            styles.matchCard,
            {
              backgroundColor: theme.colors.background.primary,
              borderColor: theme.colors.border.primary,
            },
          ]}
          onPress={() => handleMatchPress(match)}
          onLongPress={() => handleMatchLongPress(match)}
          animationType="scale"
        >
          <ScaleInView delay={index * 50} fromScale={0.8}>
            <View style={styles.matchImageContainer}>
              {(() => {
                const cached = getProfileImages(match.userId);
                const urls =
                  match.profileImageUrls && match.profileImageUrls.length
                    ? match.profileImageUrls
                    : cached;
                if (urls && urls.length) {
                  return (
                    <Image
                      source={{ uri: urls[0] }}
                      style={styles.matchAvatar}
                      resizeMode="cover"
                      onError={() => setProfileImages(match.userId, [])}
                    />
                  );
                }
                return (
                  <View
                    style={[
                      styles.matchImagePlaceholder,
                      { backgroundColor: theme.colors.neutral[100] },
                    ]}
                  >
                    <Text style={styles.matchImageText}>👤</Text>
                  </View>
                );
              })()}
            </View>
          </ScaleInView>

          <View style={styles.matchInfo}>
            <SlideInView direction="left" delay={100 + index * 50}>
              <Text
                style={[styles.matchName, { color: theme.colors.text.primary }]}
              >
                {match.fullName || "Unknown"}
              </Text>
            </SlideInView>
            <SlideInView direction="left" delay={150 + index * 50}>
              <Text
                style={[
                  styles.matchStatus,
                  { color: theme.colors.text.secondary },
                ]}
              >
                {match.lastActivity
                  ? formatTimeAgo(String(match.lastActivity))
                  : "Say hello!"}
              </Text>
            </SlideInView>
            {Number.isFinite(match.matchedAt) && (
              <SlideInView direction="left" delay={200 + index * 50}>
                <Text
                  style={[
                    styles.matchTime,
                    { color: theme.colors.text.tertiary },
                  ]}
                >
                  Matched {formatTimeAgo(String(match.matchedAt))}
                </Text>
              </SlideInView>
            )}
          </View>

          <ScaleInView delay={250 + index * 50} fromScale={0.5}>
            <View style={styles.matchActions}>
              {match.unreadCount && match.unreadCount > 0 ? (
                <View
                  style={[
                    styles.unreadBadge,
                    {
                      backgroundColor: theme.colors.error[500],
                    },
                  ]}
                >
                  <Text
                    style={[styles.unreadText, { color: Colors.text.inverse }]}
                  >
                    {match.unreadCount > 99 ? "99+" : String(match.unreadCount)}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.unreadBadge,
                    { backgroundColor: theme.colors.neutral[200] },
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={18}
                    color={theme.colors.text.secondary}
                  />
                </View>
              )}

              {/* Express interest quick action */}
              {!isMutualInterest(match.userId) && (
                <TouchableOpacity
                  disabled={sending || hasSentInterestTo(match.userId)}
                  onPress={async () => {
                    // Gate by interests usage limits
                    try {
                      const availability = await canUseFeatureNow(
                        "interestsSent"
                      );
                      if (!availability.canUse) {
                        setRecommendedTier(
                          (availability.requiredPlan as SubscriptionTier) ||
                            "premium"
                        );
                        setUpgradeVisible(true);
                        return;
                      }
                    } catch {}

                    const ok = await sendInterest(match.userId);
                    if (ok) {
                      // Track usage for analytics/quota UI
                      try {
                        await trackFeatureUsage("interestsSent");
                      } catch {}
                      toast?.show?.("Interest sent", "success");
                    } else {
                      toast?.show?.("Could not send interest", "error");
                    }
                  }}
                  style={[
                    styles.interestQuickBtn,
                    {
                      borderColor: theme.colors.border.primary,
                      backgroundColor: hasSentInterestTo(match.userId)
                        ? theme.colors.primary[50]
                        : theme.colors.background.primary,
                      opacity: sending ? 0.6 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      hasSentInterestTo(match.userId)
                        ? "heart"
                        : "heart-outline"
                    }
                    size={18}
                    color={
                      hasSentInterestTo(match.userId)
                        ? theme.colors.primary[600]
                        : theme.colors.text.secondary
                    }
                  />
                </TouchableOpacity>
              )}
            </View>
          </ScaleInView>
        </AnimatedButton>
      </FadeInView>
    );
  };

  const renderInterest = (interest: Interest) => (
    <View key={interest._id} style={styles.interestCard}>
      <TouchableOpacity
        style={styles.interestProfile}
        onPress={() => handleInterestPress(interest)}
      >
        <View style={styles.interestImageContainer}>
          {interest.fromProfile?.profileImageUrls &&
          interest.fromProfile.profileImageUrls.length > 0 ? (
            <View style={styles.interestImagePlaceholder}>
              <Text style={styles.interestImageText}>�</Text>
            </View>
          ) : (
            <View style={styles.interestImagePlaceholder}>
              <Text style={styles.interestImageText}>�👤</Text>
            </View>
          )}
        </View>

        <View style={styles.interestInfo}>
          <Text style={styles.interestName}>
            {interest.fromProfile?.fullName || "Someone"} sent you an interest
          </Text>
          <Text style={styles.interestTime}>
            {interest.createdAt
              ? formatTimeAgo(String(interest.createdAt))
              : ""}
          </Text>
          <Text
            style={[
              styles.interestNote,
              { color: theme.colors.text.secondary },
            ]}
          >
            Auto-matching: If you also express interest, you'll match
            automatically
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  if (matchesLoading || interestsLoading) {
    return (
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={styles.contentStyle}
      >
        <View style={styles.header}>
          <Text
            style={[styles.headerTitle, { color: theme.colors.text.primary }]}
          >
            Matches
          </Text>
        </View>
        <ProfileCardSkeleton count={2} />
        <View style={{ paddingHorizontal: Layout.spacing.lg }}>
          <SkeletonLoading
            width="40%"
            height={24}
            style={{ marginBottom: 12 }}
          />
          {Array.from({ length: 2 }).map((_, i) => (
            <View key={i} style={[styles.interestCard, { opacity: 0.5 }]}>
              <View style={styles.interestProfile}>
                <View style={styles.interestImageContainer}>
                  <SkeletonLoading width={50} height={50} borderRadius={25} />
                </View>
                <View style={{ flex: 1 }}>
                  <SkeletonLoading
                    width="60%"
                    height={16}
                    style={{ marginBottom: 6 }}
                  />
                  <SkeletonLoading width="40%" height={12} />
                </View>
              </View>
            </View>
          ))}
        </View>
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
        <FadeInView>
          <View style={styles.header}>
            <SlideInView direction="left" delay={100}>
              <Text
                style={[
                  styles.headerTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                Matches
              </Text>
            </SlideInView>
            <TouchableOpacity
              onPress={() => navigation.navigate("QuickPicks" as never)}
              style={{
                position: "absolute",
                right: Layout.spacing.lg,
                top: Layout.spacing.md,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 14,
                backgroundColor: theme.colors.primary[50],
                borderWidth: 1,
                borderColor: theme.colors.primary[200],
              }}
              accessibilityLabel="Go to Daily Quick Picks"
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={{
                    color: theme.colors.primary[700],
                    fontWeight: "600",
                  }}
                >
                  Quick Picks →
                </Text>
                {iceUnanswered > 0 && (
                  <View
                    style={{
                      marginLeft: 6,
                      backgroundColor: theme.colors.primary[600],
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: Colors.text.inverse,
                        fontSize: 12,
                        fontWeight: "700",
                      }}
                    >
                      {iceUnanswered}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </FadeInView>

        {/* Inline upgrade banner for interests when near/at limit */}
        {(() => {
          const f = usage?.features?.find(
            (x: any) => x.name === "interestsSent"
          );
          const pct = f?.percentageUsed ?? 0;
          const remaining = f?.remaining ?? 0;
          const near = pct >= 80 && pct < 100;
          const reached = pct >= 100;
          if (subscriptionPlan === "free" && (near || reached)) {
            return (
              <View style={{ paddingHorizontal: Layout.spacing.lg }}>
                <InlineUpgradeBanner
                  message={
                    reached
                      ? "You've hit this month's free interest limit. Upgrade for unlimited interests."
                      : `You're near this month's free interest limit (${remaining} left). Upgrade for unlimited interests.`
                  }
                  ctaLabel="Upgrade"
                  onPress={() => {
                    setRecommendedTier("premium");
                    setUpgradeVisible(true);
                  }}
                  style={{ marginTop: Layout.spacing.sm }}
                />
              </View>
            );
          }
          return null;
        })()}

        {/* Pending Interests Section */}
        {interestsError ? (
          <View style={styles.section}>
            <ApiErrorDisplay
              error={interestsError}
              onRetry={refetchInterests}
            />
          </View>
        ) : (
          receivedInterests &&
          (receivedInterests as Interest[]).length > 0 && (
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.primary },
                ]}
              >
                New Interests
              </Text>
              <Text
                style={[
                  styles.sectionSubtitle,
                  { color: theme.colors.text.secondary },
                ]}
              >
                People who are interested in connecting with you
              </Text>
              {(receivedInterests as Interest[]).map(renderInterest)}
            </View>
          )
        )}

        {/* Matches Section */}
        <View style={styles.section}>
          <Text
            style={[styles.sectionTitle, { color: theme.colors.text.primary }]}
          >
            Your Matches
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              { color: theme.colors.text.secondary },
            ]}
          >
            Start conversations with your mutual matches
          </Text>

          {matchesError ? (
            <ApiErrorDisplay error={matchesError} onRetry={refetchMatches} />
          ) : !matches || (matches as UIMatch[]).length === 0 ? (
            <NoMatches onActionPress={() => navigation.navigate("Search")} />
          ) : (
            <View style={styles.matchesList}>
              <FlatList
                data={matches as UIMatch[]}
                keyExtractor={(m: UIMatch, i: number) =>
                  `${m.conversationId}-${i}`
                }
                renderItem={renderMatch}
                // Enable scrolling to allow onEndReached + prefetch
                scrollEnabled={true}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                onEndReachedThreshold={0.6}
                onEndReached={() => {
                  if (hasNextPage && !isFetchingNextPage) fetchNextPage();
                }}
                ListFooterComponent={
                  hasNextPage ? (
                    <View
                      style={{
                        padding: Layout.spacing.md,
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: theme.colors.primary[600] }}>
                        {isFetchingNextPage ? "Loading…" : "Loading more…"}
                      </Text>
                    </View>
                  ) : null
                }
              />
            </View>
          )}
        </View>

        {/* Show no interests state if no interests and no error */}
        {!interestsError &&
          (!receivedInterests ||
            (receivedInterests as Interest[]).length === 0) && (
            <View style={styles.section}>
              <NoInterests
                onActionPress={() => navigation.navigate("Search")}
              />
            </View>
          )}

        {/* Actions Bottom Sheet */}
        <BottomSheet
          isVisible={actionSheetVisible}
          onClose={() => setActionSheetVisible(false)}
          title="Conversation actions"
          height={220}
        >
          <View style={{ gap: Layout.spacing.sm }}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={async () => {
                if (selectedMatch)
                  await archiveConversation(selectedMatch.conversationId);
                setActionSheetVisible(false);
              }}
            >
              <Text style={styles.actionLabel}>Archive</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setActionSheetVisible(false)}
            >
              <Text style={styles.actionLabel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={async () => {
                if (selectedMatch)
                  await deleteConversation(selectedMatch.conversationId);
                setActionSheetVisible(false);
              }}
            >
              <Text style={[styles.actionLabel, styles.actionDestructive]}>
                Delete
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
          currentTier={subscriptionPlan}
          recommendedTier={recommendedTier}
          title={
            recommendedTier === "premiumPlus"
              ? "Premium Plus required"
              : "Upgrade required"
          }
          message={
            recommendedTier === "premiumPlus"
              ? "This feature is part of Premium Plus. Upgrade to unlock it."
              : "Upgrade to Premium to unlock unlimited interests and more."
          }
          feature="Interests"
        />
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    // Make header background transparent to avoid white box at top
    backgroundColor: "transparent",
    borderBottomWidth: 0,
  },
  headerTitle: {
    // Use Boldonse font for the title
    fontFamily: "Boldonse-Regular",
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
  },
  contentStyle: {
    flexGrow: 1,
  },
  section: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
  },
  sectionTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  sectionSubtitle: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.lg,
  },
  matchesList: {
    paddingBottom: Layout.spacing.lg,
  },
  matchCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  matchImageContainer: {
    marginRight: Layout.spacing.md,
  },
  matchImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  matchAvatar: {
    width: 60,
    height: 60,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.neutral[100],
  },
  matchImageText: {
    fontSize: Layout.typography.fontSize["2xl"],
  },
  matchInfo: {
    flex: 1,
  },
  matchName: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  matchStatus: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  matchTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  matchActions: {
    alignItems: "center",
  },
  unreadBadge: {
    width: 32,
    height: 32,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.primary[50],
    justifyContent: "center",
    alignItems: "center",
  },
  unreadText: {
    fontSize: Layout.typography.fontSize.base,
  },
  interestQuickBtn: {
    marginTop: Layout.spacing.sm,
    width: 36,
    height: 36,
    borderRadius: Layout.radius.full,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionItem: {
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.md,
    borderRadius: Layout.radius.lg,
    backgroundColor: Colors.background.secondary,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    marginBottom: Layout.spacing.sm,
  },
  actionLabel: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.primary,
  },
  actionDestructive: {
    color: Colors.error[600],
  },
  interestCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    padding: Layout.spacing.lg,
    marginBottom: Layout.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary[500],
  },
  interestProfile: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Layout.spacing.md,
  },
  interestImageContainer: {
    marginRight: Layout.spacing.md,
  },
  interestImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: Layout.radius.full,
    backgroundColor: Colors.neutral[100],
    justifyContent: "center",
    alignItems: "center",
  },
  interestImageText: {
    fontSize: Layout.typography.fontSize.lg,
  },
  interestInfo: {
    flex: 1,
  },
  interestName: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  interestTime: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.tertiary,
  },
  interestNote: {
    fontSize: Layout.typography.fontSize.xs,
    color: Colors.text.secondary,
    marginTop: Layout.spacing.xs,
  },
  interestActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Layout.spacing.lg,
  },
  interestButton: {
    width: 56,
    height: 56,
    borderRadius: Layout.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  acceptButton: {
    backgroundColor: Colors.success[50],
  },
  rejectButton: {
    backgroundColor: Colors.error[50],
  },
  acceptButtonText: {
    fontSize: Layout.typography.fontSize.xl,
  },
  rejectButtonText: {
    fontSize: Layout.typography.fontSize.lg,
  },
});
