import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  ActionSheetIOS,
  Alert,
} from "react-native";
import ScreenContainer from "@components/common/ScreenContainer";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { useInterests } from "@/hooks/useInterests";
import { useToast } from "@/providers/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "@/components/ui/ErrorHandling";
import AppHeader from "@/components/common/AppHeader";
import Avatar from "@/components/common/Avatar";
import { ChatListSkeleton } from "@/components/ui/LoadingStates";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { Swipeable } from "react-native-gesture-handler";
import { useSubscription } from "@/hooks/useSubscription";
import HintPopover from "@/components/ui/HintPopover";

export default function InterestsScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const { canUseFeatureNow, trackFeatureUsage, features, usage } =
    useSubscription();
  const {
    sentInterests,
    receivedInterests,
    loading,
    sending,
    loadSentInterests,
    loadReceivedInterests,
    sendInterest,
    removeInterest,
    isMutualInterest,
  } = useInterests();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const refreshing = loading;

  const received = receivedInterests;
  const sent = sentInterests;

  const onRefresh = async () => {
    await Promise.all([loadSentInterests(), loadReceivedInterests()]);
  };

  const renderInterestRow = (item: any, type: "received" | "sent") => {
    const profile = type === "received" ? item.fromProfile : item.toProfile;
    const name = profile?.fullName || "Someone";
    const otherUserId = type === "received" ? item.fromUserId : item.toUserId;
    const avatarUri =
      profile?.profileImageUrls?.[0] ||
      profile?.imageUrl ||
      profile?.photoUrl ||
      profile?.avatarUrl ||
      null;
    const online = !!(
      profile?.isOnline ??
      profile?.online ??
      profile?.presence?.isOnline
    );

    const onViewProfile = () =>
      (navigation as any).navigate("ProfileDetail", {
        profileId: otherUserId,
      });

    const onExpress = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      try {
        const availability = await canUseFeatureNow("interestsSent");
        if (!availability.canUse) {
          toast?.show?.(
            availability.reason || "Interest limit reached",
            "info"
          );
          return;
        }
      } catch {}

      const ok = await sendInterest(otherUserId);
      if (ok) toast?.show?.("Interest sent back", "success");
      else toast?.show?.("Could not send interest", "error");
    };

    const onRemove = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const ok = await removeInterest(otherUserId);
      if (ok) toast?.show?.("Interest removed", "success");
      else toast?.show?.("Could not remove interest", "error");
    };

    const onReport = () => {
      Haptics.selectionAsync().catch(() => {});
      Alert.alert("Report", `Report ${name}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () => toast?.show?.("Reported", "success"),
        },
      ]);
    };

    const openActionSheet = () => {
      const options: string[] = [
        "View Profile",
        type === "received" ? "Express Interest" : "Remove Interest",
        "Report",
        "Cancel",
      ];
      const cancelButtonIndex = 3;
      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex, destructiveButtonIndex: 2 },
          (buttonIndex) => {
            if (buttonIndex === 0) onViewProfile();
            else if (buttonIndex === 1) {
              type === "received" ? onExpress() : onRemove();
            } else if (buttonIndex === 2) onReport();
          }
        );
      } else {
        // Simple cross-platform fallback
        Alert.alert(name, undefined, [
          { text: "View Profile", onPress: onViewProfile },
          {
            text: type === "received" ? "Express Interest" : "Remove Interest",
            onPress: () => (type === "received" ? onExpress() : onRemove()),
          },
          { text: "Report", style: "destructive", onPress: onReport },
          { text: "Cancel", style: "cancel" },
        ]);
      }
    };
    const renderLeftActions = () => {
      if (type === "received") {
        return (
          <View
            style={[
              styles.swipeAction,
              { backgroundColor: theme.colors.primary[100] },
            ]}
          >
            <Ionicons
              name="heart"
              size={20}
              color={theme.colors.primary[600]}
            />
            <Text
              style={[styles.swipeText, { color: theme.colors.primary[800] }]}
            >
              Express
            </Text>
          </View>
        );
      }
      return (
        <View
          style={[
            styles.swipeAction,
            { backgroundColor: theme.colors.neutral[100] },
          ]}
        >
          <Ionicons name="person" size={20} color={theme.colors.neutral[700]} />
          <Text
            style={[styles.swipeText, { color: theme.colors.neutral[800] }]}
          >
            View
          </Text>
        </View>
      );
    };

    const renderRightActions = () => {
      if (type === "sent") {
        return (
          <View
            style={[
              styles.swipeAction,
              {
                backgroundColor: theme.colors.error[100],
                alignItems: "flex-end",
              },
            ]}
          >
            <Text
              style={[
                styles.swipeText,
                { color: theme.colors.error[700], marginRight: 6 },
              ]}
            >
              Remove
            </Text>
            <Ionicons name="trash" size={20} color={theme.colors.error[600]} />
          </View>
        );
      }
      return (
        <View
          style={[
            styles.swipeAction,
            {
              backgroundColor: theme.colors.neutral[100],
              alignItems: "flex-end",
            },
          ]}
        >
          <Text
            style={[
              styles.swipeText,
              { color: theme.colors.neutral[800], marginRight: 6 },
            ]}
          >
            Report
          </Text>
          <Ionicons name="flag" size={18} color={theme.colors.neutral[700]} />
        </View>
      );
    };

    return (
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableLeftOpen={() => {
          if (type === "received") onExpress();
          else onViewProfile();
        }}
        onSwipeableRightOpen={() => {
          if (type === "sent") onRemove();
          else onReport();
        }}
      >
        <View
          key={item._id || item.id}
          style={[
            styles.row,
            {
              borderColor: theme.colors.border.primary,
              backgroundColor: theme.colors.background.primary,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.rowLeft}
            accessibilityRole="button"
            accessibilityLabel={`Open ${name}'s profile`}
            onLongPress={openActionSheet}
            onPress={() =>
              (navigation as any).navigate("ProfileDetail", {
                profileId: otherUserId,
              })
            }
            activeOpacity={0.7}
          >
            <Avatar
              uri={avatarUri}
              name={name}
              size="lg"
              showPresence={online}
              isOnline={online}
              imageStyle={{ width: 48, height: 48, borderRadius: 24 }}
              accessibilityLabel={`${name} avatar`}
            />
            <View>
              <Text style={[styles.name, { color: theme.colors.text.primary }]}>
                {name}
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.text.secondary },
                ]}
              >
                {type === "received"
                  ? "Sent you an interest"
                  : "You expressed interest"}
              </Text>
              {type === "received" && isMutualInterest(otherUserId) ? (
                <View
                  style={[
                    styles.mutualChip,
                    {
                      backgroundColor: theme.colors.success[100],
                      borderColor: theme.colors.success[200],
                    },
                  ]}
                  accessibilityLabel="Mutual interest"
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={theme.colors.success[600]}
                  />
                  <Text
                    style={[
                      styles.mutualText,
                      { color: theme.colors.success[700] },
                    ]}
                  >
                    Mutual
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          <View style={styles.rowRight}>
            {type === "received" ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Express interest to ${name}`}
                disabled={sending}
                onPress={onExpress}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: theme.colors.border.primary,
                    backgroundColor: sending
                      ? theme.colors.neutral[100]
                      : theme.colors.primary[50],
                  },
                ]}
              >
                <Ionicons
                  name="heart"
                  size={18}
                  color={theme.colors.primary[600]}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: theme.colors.primary[700] },
                  ]}
                >
                  Express
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Remove interest for ${name}`}
                disabled={sending}
                onPress={onRemove}
                style={[
                  styles.actionBtn,
                  {
                    borderColor: theme.colors.border.primary,
                    backgroundColor: sending
                      ? theme.colors.neutral[100]
                      : theme.colors.background.primary,
                  },
                ]}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={theme.colors.text.secondary}
                />
                <Text
                  style={[
                    styles.actionText,
                    { color: theme.colors.text.secondary },
                  ]}
                >
                  Remove
                </Text>
              </TouchableOpacity>
            )}
            {(() => {
              const f = usage?.features?.find(
                (x: any) => x.name === "interestsSent"
              );
              const reached = (f?.percentageUsed ?? 0) >= 100;
              if (type === "received" && reached) {
                return (
                  <HintPopover
                    label="Why?"
                    hint={
                      "You've reached this month's free interest limit. Upgrade to continue sending interests."
                    }
                  />
                );
              }
              return null;
            })()}
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <ErrorBoundary>
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={{ flexGrow: 1 }}
        useScrollView={false}
      >
        <AppHeader
          title="Interests"
          rightActions={
            <Text style={{ color: theme.colors.text.secondary, fontSize: 12 }}>
              R {received.length} • S {sent.length}
            </Text>
          }
        />

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["received", "sent"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => {
                if (activeTab !== t) {
                  Haptics.selectionAsync().catch(() => {});
                  setActiveTab(t);
                }
              }}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === t
                      ? theme.colors.primary[50]
                      : theme.colors.background.primary,
                  borderColor: theme.colors.border.primary,
                },
              ]}
            >
              <Text
                style={{
                  color:
                    activeTab === t
                      ? theme.colors.primary[700]
                      : theme.colors.text.secondary,
                  fontWeight: "600",
                }}
              >
                {t === "received"
                  ? `Received (${received.length})`
                  : `Sent (${sent.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Loading skeleton */}
        {refreshing && received.length === 0 && sent.length === 0 ? (
          <View style={{ paddingHorizontal: Layout.spacing.lg }}>
            <ChatListSkeleton />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: Layout.spacing.lg }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary[500]]}
                tintColor={theme.colors.primary[500]}
              />
            }
          >
            {(activeTab === "received" ? received : sent).map((item) =>
              renderInterestRow(item, activeTab)
            )}
            {(activeTab === "received" ? received : sent).length === 0 && (
              <View style={{ padding: Layout.spacing.lg }}>
                <Text
                  style={{
                    textAlign: "center",
                    color: theme.colors.text.secondary,
                  }}
                >
                  {activeTab === "received"
                    ? "No received interests yet"
                    : "No sent interests yet"}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize["2xl"],
    fontWeight: Layout.typography.fontWeight.bold,
  },
  tabs: {
    flexDirection: "row",
    gap: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.lg,
    paddingTop: Layout.spacing.md,
    paddingBottom: Layout.spacing.sm,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
  },
  row: {
    padding: Layout.spacing.md,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    marginBottom: Layout.spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.md,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Layout.radius.full,
    justifyContent: "center",
    alignItems: "center",
  },
  name: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  subtitle: {
    fontSize: Layout.typography.fontSize.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
  },
  actionText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  mutualChip: {
    marginTop: 4,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  mutualText: {
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
  swipeAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  swipeText: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.medium,
    marginLeft: 6,
  },
});


