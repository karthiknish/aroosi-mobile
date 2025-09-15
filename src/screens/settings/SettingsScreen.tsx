import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import HapticPressable from "@/components/ui/HapticPressable";
import { useAuth } from "@contexts/AuthProvider";
import { useState } from "react";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import { useNotifications } from "@/utils/notificationHandler";
import useResponsiveSpacing from "@/hooks/useResponsive";
import useResponsiveTypography from "@/hooks/useResponsive";
import ScreenContainer from "@components/common/ScreenContainer";
import { useToast } from "@providers/ToastContext";
import { useApiClient } from "@/utils/api";
import VerifyEmailInline from "@components/auth/VerifyEmailInline";
import * as Linking from "expo-linking";
import InlineUpgradeBanner from "@components/subscription/InlineUpgradeBanner";
import PremiumFeatureGuard from "@components/subscription/PremiumFeatureGuard";
import UpgradePrompt from "@components/subscription/UpgradePrompt";
import { useSubscription } from "@/hooks/useSubscription";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { SubscriptionTier } from "@/types/subscription";
import { getBillingPortalUrl } from "@services/subscriptions";
import HintPopover from "@/components/ui/HintPopover";
interface SettingsScreenProps {
  navigation: any;
}

interface SettingItem {
  title: string;
  subtitle?: string;
  type: "navigation" | "toggle" | "action";
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  icon?: string;
  destructive?: boolean;
}

export default function SettingsScreen({ navigation }: SettingsScreenProps) {
  const {
    signOut,
    user,
    needsEmailVerification,
    resendEmailVerification,
    verifyEmailCode,
    startEmailVerificationPolling,
    refreshUser,
  } = useAuth() as any;
  const { spacing } = useResponsiveSpacing();
  const rt = useResponsiveTypography();
  const font = (n: number) => (rt?.scale?.font ? rt.scale.font(n) : n);

  // Local state for toggles
  const { preferences: notifPrefs, updatePreferences: updateNotifPrefs } =
    useNotifications();
  const [pushNotifications, setPushNotifications] = useState(
    notifPrefs.enabled
  );
  const [emailNotifications, setEmailNotifications] = useState(
    notifPrefs.emailEnabled
  );

  // Sync local toggle state when preferences change externally
  React.useEffect(() => {
    setPushNotifications(notifPrefs.enabled);
    setEmailNotifications(notifPrefs.emailEnabled);
  }, [notifPrefs.enabled, notifPrefs.emailEnabled]);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [hideFromFreeUsers, setHideFromFreeUsers] = useState<boolean>(false);
  const toast = useToast();
  const apiClient = useApiClient();
  const [resendLoading, setResendLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const { subscription, canUseFeatureNow } = useSubscription();
  const { checkFeatureAccess } = useFeatureAccess();
  const currentTier = (subscription?.plan as SubscriptionTier) || "free";
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const { theme, isDark, setTheme } = useTheme();
  const [recommendedTier, setRecommendedTier] =
    useState<SubscriptionTier>("premium");
  const [lastUpgradeTap, setLastUpgradeTap] = useState<number>(0);
  const debouncedUpgrade = (tier?: SubscriptionTier) => {
    const now = Date.now();
    if (now - lastUpgradeTap < 600) return; // 600ms debounce
    setLastUpgradeTap(now);
    setUpgradeVisible(true);
    if (tier) setRecommendedTier(tier);
  };
  const [signingOut, setSigningOut] = useState(false);
  const handleSignOut = () => {
    Alert.alert(
      "Sign out?",
      "We'll stop notifications and clear your online status.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            if (signingOut) return;
            setSigningOut(true);
            try {
              await signOut();
              // Reset navigation so user can't go back into authed screens
              navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
            } catch (error) {
              toast.show("Failed to sign out. Please try again.", "error");
            } finally {
              setSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await apiClient.deleteProfile();
              if (res.success) {
                toast.show("Your account has been deleted.", "success");
                await signOut();
                navigation.navigate("Auth");
              } else {
                toast.show(
                  res.error?.message || "Failed to delete account.",
                  "error"
                );
              }
            } catch (e: any) {
              toast.show(e?.message || "Failed to delete account.", "error");
            }
          },
        },
      ]
    );
  };

  // Derived helpers for boost time remaining
  const formatTimeRemaining = (until?: number): string => {
    if (!until) return "";
    const now = Date.now();
    const timeLeft = until - now;
    if (timeLeft <= 0) return "";
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    return hours > 0
      ? `${hours}h ${minutes}m remaining`
      : `${minutes}m remaining`;
  };
  const nextMonthlyResetDate = React.useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 1, 0, 0, 0, 0);
  }, []);

  // Local derived state from profile for premium quick actions
  const [boostedUntil, setBoostedUntil] = useState<number | undefined>(
    undefined
  );
  const [boostsRemaining, setBoostsRemaining] = useState<number | undefined>(
    undefined
  );
  const [hasSpotlightBadge, setHasSpotlightBadge] = useState<boolean>(false);

  // Hydrate settings from server
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await apiClient.getUserProfile();
      if (!cancelled && res.success && (res.data as any)?.data) {
        const profile = (res.data as any).data;
        setHideFromFreeUsers(!!profile?.hideFromFreeUsers);
        setBoostedUntil(profile?.boostedUntil);
        setBoostsRemaining(profile?.boostsRemaining);
        setHasSpotlightBadge(!!profile?.hasSpotlightBadge);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiClient]);

  const settingSections = [
    {
      title: "Appearance",
      items: [
        {
          title: "Dark Mode",
          subtitle: "Use a dark theme across the app",
          type: "toggle" as const,
          value: isDark,
          onToggle: (val: boolean) => setTheme(val),
        },
      ],
    },
    {
      title: "Account",
      items: [
        {
          title: "Edit Profile",
          subtitle: "Update your personal information",
          type: "navigation" as const,
          onPress: () => navigation.navigate("EditProfile"),
        },
        {
          title: "Subscription",
          subtitle: "Manage your premium features",
          type: "navigation" as const,
          onPress: () => navigation.navigate("Subscription"),
        },
        // Hide Manage Billing for free users
        ...(currentTier === "free"
          ? []
          : [
              {
                title: "Manage Billing",
                subtitle: "Open the billing portal",
                type: "action" as const,
                onPress: async () => {
                  try {
                    const { url } = await getBillingPortalUrl();
                    if (url) await Linking.openURL(url);
                    else toast.show("Unable to open billing portal.", "error");
                  } catch (e) {
                    toast.show("Unable to open billing portal.", "error");
                  }
                },
              },
            ]),
        {
          title: "Notifications",
          subtitle: "Choose which alerts you receive",
          type: "navigation" as const,
          onPress: () => navigation.navigate("NotificationSettings" as any),
        },
        {
          title: "Privacy Settings",
          subtitle: "Control who can see your profile",
          type: "navigation" as const,
          onPress: () => navigation.navigate("Privacy"),
        },
      ],
    },
    {
      title: "Notifications",
      items: [
        {
          title: "Push Notifications",
          subtitle: "Receive notifications on your device",
          type: "toggle" as const,
          value: pushNotifications,
          onToggle: async (val: boolean) => {
            setPushNotifications(val);
            await updateNotifPrefs({ enabled: val });
          },
        },
        {
          title: "Email Notifications",
          subtitle: "Receive notifications via email",
          type: "toggle" as const,
          value: emailNotifications,
          onToggle: async (val: boolean) => {
            setEmailNotifications(val);
            await updateNotifPrefs({ emailEnabled: val });
            // Optionally call server to update email prefs here if available
          },
        },
      ],
    },
    {
      title: "Privacy",
      items: [
        {
          title: "Hide from free users",
          subtitle: "Only paid members can view your profile",
          type: "toggle" as const,
          value: hideFromFreeUsers,
          onToggle: async (val: boolean) => {
            const access = await checkFeatureAccess("canHideFromFreeUsers");
            if (!access.allowed) {
              setRecommendedTier("premium");
              setUpgradeVisible(true);
              return;
            }
            setHideFromFreeUsers(val);
            await apiClient.updateUserProfile({ hideFromFreeUsers: val });
          },
        },
        {
          title: "Show Online Status",
          subtitle: "Let others see when you're online",
          type: "toggle" as const,
          value: showOnlineStatus,
          onToggle: async (val: boolean) => {
            // Treat hiding online status as Premium Plus (incognito) on web parity
            const access = await checkFeatureAccess("canUseIncognitoMode");
            if (!access.allowed) {
              setRecommendedTier("premiumPlus");
              setUpgradeVisible(true);
              return;
            }
            setShowOnlineStatus(val);
          },
        },
        {
          title: "Read Receipts",
          subtitle: "Let others see when you've read their messages",
          type: "toggle" as const,
          value: readReceipts,
          onToggle: async (val: boolean) => {
            const access = await checkFeatureAccess("canSeeReadReceipts");
            if (!access.allowed) {
              setRecommendedTier("premium");
              setUpgradeVisible(true);
              return;
            }
            setReadReceipts(val);
          },
        },
        {
          title: "Blocked Users",
          subtitle: "Manage your blocked users list",
          type: "navigation" as const,
          onPress: () => navigation.navigate("BlockedUsers"),
        },
      ],
    },
    {
      title: "Premium Quick Actions",
      items: [
        {
          title: "Boost Profile",
          subtitle:
            boostedUntil && boostedUntil > Date.now()
              ? `Profile is boosted! (${formatTimeRemaining(boostedUntil)})`
              : typeof boostsRemaining === "number"
              ? boostsRemaining > 0
                ? `Boost your profile (${boostsRemaining} remaining this month)`
                : `No boosts left this month. Resets on ${nextMonthlyResetDate.toLocaleDateString()}`
              : "Get more visibility for 24 hours",
          type: "action" as const,
          onPress: async () => {
            // Plan gate first
            const access = await checkFeatureAccess("canBoostProfile");
            if (!access.allowed) {
              setRecommendedTier("premiumPlus");
              setUpgradeVisible(true);
              return;
            }
            // Server-side quota check
            const avail = await canUseFeatureNow("profileBoosts");
            if (!avail.canUse) {
              toast.show(
                avail.reason || "You've reached your boost quota for now.",
                "info"
              );
              return;
            }
            const res = await apiClient.boostProfile();
            if ((res as any)?.success === false) {
              toast.show((res as any)?.error || "Failed to boost", "error");
            } else {
              toast.show("Boost activated", "success");
              // Optimistically reflect updated state
              setBoostedUntil(Date.now() + 24 * 60 * 60 * 1000);
              if (typeof boostsRemaining === "number") {
                setBoostsRemaining(Math.max(0, boostsRemaining - 1));
              }
            }
          },
        },
        {
          title: "Profile Viewers",
          subtitle: "See who's viewed your profile",
          type: "action" as const,
          onPress: async () => {
            const access = await checkFeatureAccess("canViewProfileViewers");
            if (!access.allowed) {
              setRecommendedTier("premiumPlus");
              setUpgradeVisible(true);
              return;
            }
            toast.show("Opening your profile viewers…", "info");
            navigation.navigate("Profile", { focus: "viewers" } as any);
          },
        },
        {
          title: "Advanced Filters",
          subtitle: "Filter by income, education, and career",
          type: "action" as const,
          onPress: async () => {
            const access = await checkFeatureAccess("canUseAdvancedFilters");
            if (!access.allowed) {
              setRecommendedTier("premiumPlus");
              setUpgradeVisible(true);
              return;
            }
            navigation.navigate("Search", { openAdvancedFilters: true } as any);
          },
        },
        {
          title: "Activate Spotlight",
          subtitle: hasSpotlightBadge
            ? "Spotlight active"
            : "Show spotlight badge (Premium Plus)",
          type: "action" as const,
          onPress: async () => {
            const access = await checkFeatureAccess("canUseIncognitoMode");
            if (!access.allowed) {
              setRecommendedTier("premiumPlus");
              setUpgradeVisible(true);
              return;
            }
            if (hasSpotlightBadge) {
              toast.show("Spotlight already active", "info");
              return;
            }
            const res = await apiClient.activateSpotlight();
            if ((res as any)?.success === false) {
              toast.show((res as any)?.error || "Failed to activate", "error");
            } else {
              toast.show("Spotlight activated", "success");
              setHasSpotlightBadge(true);
            }
          },
        },
      ],
    },
    {
      title: "Safety & Support",
      items: [
        {
          title: "About Aroosi",
          subtitle: "Version, terms, privacy, and support",
          type: "navigation" as const,
          onPress: () => navigation.navigate("About" as any),
        },
        {
          title: "Safety Center",
          subtitle: "Report issues and safety concerns",
          type: "navigation" as const,
          onPress: () => navigation.navigate("Safety"),
        },
        {
          title: "Contact Support",
          subtitle: "Get help from our support team",
          type: "navigation" as const,
          onPress: () => navigation.navigate("Contact"),
        },
        {
          title: "AI Help Assistant",
          subtitle: "Chat with our help bot powered by AI",
          type: "navigation" as const,
          onPress: () => navigation.navigate("AIChatbot" as any),
        },
        {
          title: "Terms of Service",
          subtitle: "Read our terms and conditions",
          type: "action" as const,
          onPress: () => {
            try {
              const origin = new URL((apiClient as any).baseUrl || "").origin;
              Linking.openURL(`${origin}/terms`);
            } catch {
              Linking.openURL("/terms");
            }
          },
        },
        {
          title: "Privacy Policy",
          subtitle: "Learn how we protect your data",
          type: "action" as const,
          onPress: () => {
            try {
              const origin = new URL((apiClient as any).baseUrl || "").origin;
              Linking.openURL(`${origin}/privacy`);
            } catch {
              Linking.openURL("/privacy");
            }
          },
        },
      ],
    },
    {
      title: "Account Actions",
      items: [
        {
          title: "Sign Out",
          type: "action" as const,
          onPress: handleSignOut,
        },
        {
          title: "Delete Account",
          subtitle: "Permanently delete your account",
          type: "action" as const,
          onPress: handleDeleteAccount,
          destructive: true,
        },
      ],
    },
    {
      title: "Usage",
      items: [
        {
          title: "Usage Summary",
          subtitle: "View remaining boosts and daily limits",
          type: "action" as const,
          onPress: async () => {
            const res = await apiClient.getUsageStats();
            if (!res.success) {
              toast.show(
                res.error?.message || "Failed to fetch usage",
                "error"
              );
            } else {
              const u: any = res.data;
              const msg = `Likes today: ${u?.likesUsed ?? 0}/${
                u?.likesLimit ?? "-"
              }\nBoosts remaining: ${u?.boostsRemaining ?? 0}`;
              toast.show(msg, "info");
            }
          },
        },
      ],
    },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.secondary,
    },
    contentStyle: {
      flexGrow: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      backgroundColor: theme.colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    backButton: {
      padding: spacing.xs,
    },
    backButtonText: {
      fontSize: font(16),
      color: theme.colors.primary[500],
    },
    headerTitle: {
      fontSize: font(18),
      fontWeight: "bold",
      color: theme.colors.text.primary,
    },
    placeholder: {
      width: 50,
    },
    userInfo: {
      backgroundColor: theme.colors.background.primary,
      paddingVertical: spacing.xl,
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    userAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    userInitial: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: font(24),
      fontWeight: "bold",
      color: theme.colors.text.inverse,
    },
    userName: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: font(18),
      fontWeight: "bold",
      color: theme.colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    userEmail: {
      fontSize: font(14),
      color: theme.colors.text.secondary,
    },
    // Removed inline banner styles; using shared component
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: font(16),
      fontWeight: "600",
      color: theme.colors.text.primary,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.lg,
    },
    sectionContent: {
      backgroundColor: theme.colors.background.primary,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border.primary,
    },
    destructiveItem: {
      // Additional styling for destructive items if needed
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: font(16),
      color: theme.colors.text.primary,
      marginBottom: 2,
    },
    destructiveText: {
      color: theme.colors.error[500],
    },
    settingSubtitle: {
      fontSize: font(14),
      color: theme.colors.text.secondary,
    },
    chevron: {
      fontSize: font(18),
      color: theme.colors.neutral[400],
      marginLeft: spacing.xs,
    },
    versionContainer: {
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    versionText: {
      fontSize: font(14),
      color: theme.colors.text.secondary,
    },
  });

  const renderSettingItem = (item: SettingItem, index: number) => (
    <HapticPressable
      key={index}
      haptic={
        item.type !== "toggle" && !item.destructive ? "selection" : "light"
      }
      style={[styles.settingItem, item.destructive && styles.destructiveItem]}
      onPress={item.onPress}
      disabled={item.type === "toggle"}
    >
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingTitle,
            item.destructive && styles.destructiveText,
          ]}
        >
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>

      {item.type === "toggle" && (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{
            false: theme.colors.neutral[300],
            true: theme.colors.primary[500],
          }}
          thumbColor={
            item.value
              ? theme.colors.background.primary
              : theme.colors.neutral[100]
          }
        />
      )}

      {item.type === "navigation" && <Text style={styles.chevron}>›</Text>}
    </HapticPressable>
  );

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      {/* Header */}
      <View style={styles.header}>
        <HapticPressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </HapticPressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.headerTitle}>Settings</Text>
          <View
            style={{
              marginLeft: 8,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 999,
              backgroundColor:
                currentTier === "free"
                  ? theme.colors.neutral[200]
                  : theme.colors.primary[100],
            }}
          >
            <Text
              style={{
                fontSize: font(12),
                color:
                  currentTier === "free"
                    ? theme.colors.neutral[700]
                    : theme.colors.primary[700],
              }}
            >
              Plan: {currentTier}
            </Text>
          </View>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          <Text style={styles.userInitial}>
            {user?.profile?.fullName?.charAt(0) ||
              user?.email?.charAt(0) ||
              "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.profile?.fullName || "User"}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Email Verification Banner (Settings-specific) */}
      {needsEmailVerification && <VerifyEmailInline variant="banner" />}

      {/* Settings Sections */}
      {settingSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          {section.title === "Privacy" && currentTier === "free" && (
            <View
              style={{ marginHorizontal: spacing.lg, marginBottom: spacing.sm }}
            >
              <PremiumFeatureGuard
                feature="canSeeReadReceipts"
                mode="inline"
                message="Upgrade to unlock read receipts and incognito mode"
                onUpgrade={(tier) =>
                  navigation.navigate("Subscription", {
                    screen: "Subscription",
                    params: { tier },
                  } as any)
                }
              />
              <View style={{ marginTop: 6 }}>
                <HintPopover
                  label="Why?"
                  hint={
                    "Some privacy controls like Read Receipts and Incognito Mode are Premium features. Upgrade to enable them."
                  }
                />
              </View>
            </View>
          )}
          <View style={styles.sectionContent}>
            {section.items.map((item, itemIndex) =>
              renderSettingItem(item, itemIndex)
            )}
          </View>
        </View>
      ))}

      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Aroosi Mobile v1.0.0</Text>
      </View>

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
        currentTier={currentTier}
        recommendedTier={recommendedTier}
        title={
          recommendedTier === "premiumPlus"
            ? "Premium Plus required"
            : "Upgrade required"
        }
        message={
          recommendedTier === "premiumPlus"
            ? "Incognito mode is available on Premium Plus. Upgrade to unlock it."
            : "Read receipts and more are available on Premium. Upgrade to unlock."
        }
      />
    </ScreenContainer>
  );
}

