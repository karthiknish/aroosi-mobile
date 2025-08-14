import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import ScreenContainer from "@components/common/ScreenContainer";
import { Colors, Layout } from "../../../constants";
import { useTheme } from "../../../contexts/ThemeContext";
import { useInterests } from "../../../hooks/useInterests";
import { useToast } from "../../../providers/ToastContext";
import { Ionicons } from "@expo/vector-icons";
import { ErrorBoundary } from "../../components/ui/ErrorHandling";

export default function InterestsScreen() {
  const { theme } = useTheme();
  const toast = useToast();
  const {
    sentInterests,
    receivedInterests,
    loading,
    sending,
    loadSentInterests,
    loadReceivedInterests,
    sendInterest,
    removeInterest,
  } = useInterests();

  const [activeTab, setActiveTab] = useState<"received" | "sent">("received");
  const refreshing = loading;

  const received = receivedInterests;
  const sent = sentInterests;

  const onRefresh = async () => {
    await Promise.all([loadSentInterests(), loadReceivedInterests()]);
  };

  const renderInterestRow = (item: any, type: "received" | "sent") => {
    const name = type === "received" ? item.fromProfile?.fullName || "Someone" : item.toProfile?.fullName || "Someone";
    const otherUserId = type === "received" ? item.fromUserId : item.toUserId;
    return (
      <View key={item._id || item.id} style={[styles.row, { borderColor: theme.colors.border.primary, backgroundColor: theme.colors.background.primary }] }>
        <View style={styles.rowLeft}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.neutral[100] }]}>
            <Text style={{ fontSize: 20 }}>👤</Text>
          </View>
          <View>
            <Text style={[styles.name, { color: theme.colors.text.primary }]}>{name}</Text>
            <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
              {type === "received" ? "Sent you an interest" : "You expressed interest"}
            </Text>
          </View>
        </View>
        <View style={styles.rowRight}>
          {type === "received" ? (
            <TouchableOpacity
              disabled={sending}
              onPress={async () => {
                const ok = await sendInterest(otherUserId);
                if (ok) toast?.show?.("Interest sent back", "success");
                else toast?.show?.("Could not send interest", "error");
              }}
              style={[styles.actionBtn, { borderColor: theme.colors.border.primary }]}
            >
              <Ionicons name="heart" size={18} color={theme.colors.primary[600]} />
              <Text style={[styles.actionText, { color: theme.colors.primary[700] }]}>Express</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              disabled={sending}
              onPress={async () => {
                const ok = await removeInterest(otherUserId);
                if (ok) toast?.show?.("Interest removed", "success");
                else toast?.show?.("Could not remove interest", "error");
              }}
              style={[styles.actionBtn, { borderColor: theme.colors.border.primary }]}
            >
              <Ionicons name="close" size={18} color={theme.colors.text.secondary} />
              <Text style={[styles.actionText, { color: theme.colors.text.secondary }]}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ErrorBoundary>
      <ScreenContainer
        containerStyle={{ backgroundColor: theme.colors.background.secondary }}
        contentStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary[500]]}
            tintColor={theme.colors.primary[500]}
          />
        }
      >
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary, borderBottomColor: theme.colors.border.primary }]}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>Interests</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(["received", "sent"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t)}
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
                {t === "received" ? `Received (${received.length})` : `Sent (${sent.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: Layout.spacing.lg }}>
          {(activeTab === "received" ? received : sent).map((item) =>
            renderInterestRow(item, activeTab)
          )}
          {(activeTab === "received" ? received : sent).length === 0 && (
            <View style={{ padding: Layout.spacing.lg }}>
              <Text style={{ textAlign: "center", color: theme.colors.text.secondary }}>
                {activeTab === "received" ? "No received interests yet" : "No sent interests yet"}
              </Text>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  header: {
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
});


