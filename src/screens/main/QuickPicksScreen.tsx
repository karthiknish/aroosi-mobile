import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, Dimensions, ActivityIndicator, TouchableOpacity, Image } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { useApiClient } from "@/utils/api";
import { Colors, Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { useSubscription } from "@/hooks/useSubscription";
import ScreenContainer from "@components/common/ScreenContainer";
import { ErrorBoundary, ApiErrorDisplay } from "@/components/ui/ErrorHandling";
import { SwipeableCard } from "@/components/ui/SwipeableCard";
import { rgbaHex } from "@/utils/color";
import type { QuickPickProfile } from "../../types/engagement";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

function todayKey(): string {
  const d = new Date();
  return (
    d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, "0") +
    String(d.getUTCDate()).padStart(2, "0")
  );
}

export default function QuickPicksScreen() {
  const api = useApiClient();
  const { theme } = useTheme();
  const { subscription } = useSubscription();
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const [dayKey] = useState<string>(todayKey());
  const [loadError, setLoadError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["quick-picks", { dayKey }],
    queryFn: async () => {
      const res = await api.getQuickPicks(dayKey);
      if (!res.success) throw new Error(res?.error?.message || "Failed to load quick picks");
      return res.data as { userIds: string[]; profiles: QuickPickProfile[] };
    },
  });

  // Fetch today's icebreakers to show as pills (parity with web)
  const { data: iceQs } = useQuery({
    queryKey: ["icebreakers", "today"],
    queryFn: async () => {
      const res = await api.fetchIcebreakers();
      if (res.success) return (res.data as any[]) || [];
      return [] as any[];
    },
  });

  const iceTotal = useMemo(() => (Array.isArray(iceQs) ? iceQs.length : 0), [iceQs]);
  const iceAnswered = useMemo(
    () =>
      Array.isArray(iceQs)
        ? iceQs.filter((q: any) => !!(q?.answered && String(q?.answer || "").trim()))
            .length
        : 0,
    [iceQs]
  );

  useEffect(() => {
    if (isError) setLoadError("Failed to load quick picks. Please try again.");
    else setLoadError(null);
  }, [isError]);

  const plan = subscription?.plan || "free";
  const dailyLimit = useMemo(() => (plan === "premiumPlus" ? 40 : plan === "premium" ? 20 : 5), [plan]);

  const ordered: QuickPickProfile[] = useMemo(() => {
    const profiles = data?.profiles || [];
    const coalesceViews = (p: any) => Number(p?.viewsToday ?? p?.profileViewsToday ?? (typeof p?.views === 'object' ? p?.views?.today : p?.views) ?? 0) || 0;
    return [...profiles].sort((a, b) => coalesceViews(b) - coalesceViews(a));
  }, [data?.profiles]);

  const userIds: string[] = useMemo(
    () => (data?.userIds || []).filter((id) => ordered.some((p) => p.userId === id)),
    [data?.userIds, ordered]
  );

  const nextCards = useMemo(() => {
    const remainingIds = userIds.slice(index);
    return remainingIds.slice(0, 3).map((id) => ordered.find((p) => p.userId === id));
  }, [ordered, userIds, index]);

  const onAction = useCallback(
    async (action: "like" | "skip") => {
      const currentId = userIds[index];
      if (!currentId) return;
      const res = await api.actOnQuickPick(currentId, action);
      if (!res.success) return;
      setIndex((i) => i + 1);
      if (action === "like") {
        try { await api.trackFeatureUsage("profile_view"); } catch {}
      }
    },
    [api, index, userIds]
  );

  const buildProfileForCard = (p?: QuickPickProfile) => {
    if (!p) return null;
    const topIceQs = Array.isArray(iceQs) ? iceQs.slice(0, 2).map((q: any) => q.text).filter(Boolean) : [];
    return {
      id: p.userId,
      fullName: p.fullName || "Member",
      city: p.city || undefined,
      images: p.imageUrl ? [{ url: p.imageUrl, isMain: true }] : [],
      interests: topIceQs,
    };
  };

  if (isLoading) {
    return (
      <ScreenContainer>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.colors.primary[600]} />
        </View>
      </ScreenContainer>
    );
  }

  if (isError) {
    return (
      <ScreenContainer>
        <View style={{ padding: Layout.spacing.lg }}>
          <ApiErrorDisplay error={new Error(loadError || 'Error')} onRetry={refetch} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ErrorBoundary>
      <ScreenContainer containerStyle={{ backgroundColor: theme.colors.background.secondary }}>
        <View style={styles.header}> 
          <Text style={[styles.title, { color: theme.colors.text.primary }]}>Daily Quick Picks</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}> 
            {Math.min(index + 1, userIds.length)} / {userIds.length} shown • Limit {dailyLimit} ({plan})
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate("ProfileTab", { screen: "Icebreakers" })}
            style={{
              alignSelf: "flex-start",
              marginTop: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: theme.colors.primary[50],
              borderWidth: 1,
              borderColor: theme.colors.primary[200],
            }}
            accessibilityLabel="Answer today's icebreakers"
          >
            <Text style={{ color: theme.colors.primary[700], fontWeight: "600", fontSize: 12 }}>
              Answer today’s icebreakers{iceTotal > 0 ? ` (${iceAnswered}/${iceTotal})` : ""}
            </Text>
          </TouchableOpacity>
          {loadError && (
            <View style={[styles.inlineError, { backgroundColor: theme.colors.error[50], borderColor: theme.colors.error[200] }]}> 
              <Text style={{ color: theme.colors.error[700], fontSize: 12 }}>{loadError}</Text>
            </View>
          )}
        </View>

        <View style={styles.deckArea}>
          {nextCards.map((p, i) => {
            const profile = buildProfileForCard(p);
            if (!profile) return null;
            const isTop = i === 0;
            return (
              <View key={profile.id} style={[styles.deckCard, { zIndex: 10 - i, transform: [{ translateY: i === 0 ? 0 : i === 1 ? 10 : 20 }, { scale: i === 0 ? 1 : i === 1 ? 0.96 : 0.92 }] }]}> 
                <SwipeableCard
                  profile={profile}
                  isTopCard={isTop}
                  onSwipeLeft={() => onAction("skip")}
                  onSwipeRight={() => onAction("like")}
                  onPress={() => {}}
                />
              </View>
            );
          })}
        </View>

        {userIds.length === 0 && (
          <View style={{ alignItems: "center", padding: Layout.spacing.lg }}>
            <Text style={{ color: theme.colors.text.secondary }}>You're all caught up!</Text>
          </View>
        )}
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.lg,
    paddingBottom: Layout.spacing.md,
  },
  title: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.bold,
  },
  subtitle: {
    marginTop: 4,
    fontSize: Layout.typography.fontSize.xs,
  },
  inlineError: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: Layout.radius.md,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  deckArea: {
    height: screenHeight * 0.72,
    alignItems: "center",
    justifyContent: "center",
  },
  deckCard: {
    position: "absolute",
  },
});
