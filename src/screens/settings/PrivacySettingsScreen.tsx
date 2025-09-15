import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import ScreenContainer from "@components/common/ScreenContainer";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants/Layout";
import { useApiClient } from "@/utils/api";
import { useToast } from "@providers/ToastContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

export default function PrivacySettingsScreen() {
  const { theme } = useTheme();
  const api = useApiClient();
  const toast = useToast();
  const { checkFeatureAccess } = useFeatureAccess();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showLastSeen, setShowLastSeen] = useState(true);
  const [hideFromFreeUsers, setHideFromFreeUsers] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await api.getUserProfile();
      if (!cancelled) {
        if (res.success && (res.data as any)?.data) {
          const profile = (res.data as any).data;
          setShowOnlineStatus(
            profile?.privacySettings?.showOnlineStatus ?? true
          );
          setShowLastSeen(profile?.privacySettings?.showLastSeen ?? true);
          setHideFromFreeUsers(profile?.hideFromFreeUsers ?? false);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api]);

  const persist = async (updates: Record<string, any>) => {
    setSaving(true);
    const res = await api.updateUserProfile(updates);
    setSaving(false);
    if (!res.success) {
      toast.show(res.error?.message || "Failed to save", "error");
    } else {
      toast.show("Saved", "success");
    }
  };

  const onToggleOnline = async (val: boolean) => {
    // Treat online visibility as Premium Plus incognito if disabling
    if (val === false) {
      const access = await checkFeatureAccess("canUseIncognitoMode");
      if (!access.allowed) {
        toast.show("Premium Plus required for incognito mode.", "info");
        return;
      }
    }
    setShowOnlineStatus(val);
    await persist({ privacySettings: { showOnlineStatus: val, showLastSeen } });
  };

  const onToggleLastSeen = async (val: boolean) => {
    setShowLastSeen(val);
    await persist({ privacySettings: { showOnlineStatus, showLastSeen: val } });
  };

  const onToggleHideFromFree = async (val: boolean) => {
    const access = await checkFeatureAccess("canHideFromFreeUsers");
    if (!access.allowed) {
      toast.show("Premium required to hide from free users.", "info");
      return;
    }
    setHideFromFreeUsers(val);
    await persist({ hideFromFreeUsers: val });
  };

  return (
    <ScreenContainer
      containerStyle={{
        flex: 1,
        backgroundColor: theme.colors.background.secondary,
      }}
      contentStyle={{ padding: Layout.spacing.lg }}
    >
      <Text
        style={{
          fontSize: 20,
          fontWeight: "700",
          color: theme.colors.text.primary,
          marginBottom: Layout.spacing.md,
        }}
      >
        Privacy
      </Text>
      <View
        style={{
          backgroundColor: theme.colors.background.primary,
          borderRadius: Layout.radius.md,
          padding: Layout.spacing.md,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: Layout.spacing.sm,
          }}
        >
          <View style={styles.left}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text.primary,
                marginBottom: 4,
              }}
            >
              Show Online Status
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
              Let others see when you're online
            </Text>
          </View>
          <Switch value={showOnlineStatus} onValueChange={onToggleOnline} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: Layout.spacing.sm,
          }}
        >
          <View style={styles.left}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text.primary,
                marginBottom: 4,
              }}
            >
              Show Last Seen
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
              Display your last active time
            </Text>
          </View>
          <Switch value={showLastSeen} onValueChange={onToggleLastSeen} />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: Layout.spacing.sm,
          }}
        >
          <View style={styles.left}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.text.primary,
                marginBottom: 4,
              }}
            >
              Hide from free users
            </Text>
            <Text style={{ fontSize: 13, color: theme.colors.text.secondary }}>
              Only paid members can view your profile
            </Text>
          </View>
          <Switch
            value={hideFromFreeUsers}
            onValueChange={onToggleHideFromFree}
          />
        </View>
        {loading && (
          <Text
            style={{
              marginTop: Layout.spacing.sm,
              color: theme.colors.text.secondary,
            }}
          >
            Loading…
          </Text>
        )}
        {saving && (
          <Text
            style={{
              marginTop: Layout.spacing.sm,
              color: theme.colors.text.secondary,
            }}
          >
            Saving…
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}
const styles = StyleSheet.create({
  left: { flex: 1, paddingRight: Layout.spacing.md },
});
