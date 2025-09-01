import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
} from "react-native";
import { useAuth } from "@contexts/AuthProvider";
import { useState } from "react";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing from "@/hooks/useResponsive";
import useResponsiveTypography from "@/hooks/useResponsive";
import ScreenContainer from "@components/common/ScreenContainer";
import { useToast } from "@providers/ToastContext";
import { useApiClient } from "@/utils/api";
import VerifyEmailInline from "@components/auth/VerifyEmailInline";
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
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const toast = useToast();
  const apiClient = useApiClient();
  const [resendLoading, setResendLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const handleSignOut = () => {
    // Immediate sign-out flow with toast feedback; replace with ConfirmModal if desired
    const doSignOut = async () => {
      try {
        await signOut();
        navigation.navigate("Auth");
      } catch (error) {
        toast.show("Failed to sign out. Please try again.", "error");
      }
    };
    doSignOut();
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

  // Email verification actions handled by VerifyEmailInline component

  const settingSections = [
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
          onToggle: setPushNotifications,
        },
        {
          title: "Email Notifications",
          subtitle: "Receive notifications via email",
          type: "toggle" as const,
          value: emailNotifications,
          onToggle: setEmailNotifications,
        },
      ],
    },
    {
      title: "Privacy",
      items: [
        {
          title: "Show Online Status",
          subtitle: "Let others see when you're online",
          type: "toggle" as const,
          value: showOnlineStatus,
          onToggle: setShowOnlineStatus,
        },
        {
          title: "Read Receipts",
          subtitle: "Let others see when you've read their messages",
          type: "toggle" as const,
          value: readReceipts,
          onToggle: setReadReceipts,
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
      title: "Safety & Support",
      items: [
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
          title: "Terms of Service",
          subtitle: "Read our terms and conditions",
          type: "action" as const,
          onPress: () => {
            toast.show("Opening Terms of Service in browser…", "info");
          },
        },
        {
          title: "Privacy Policy",
          subtitle: "Learn how we protect your data",
          type: "action" as const,
          onPress: () => {
            toast.show("Opening Privacy Policy in browser…", "info");
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
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.secondary,
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
      backgroundColor: Colors.background.primary,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.primary,
    },
    backButton: {
      padding: spacing.xs,
    },
    backButtonText: {
      fontSize: font(16),
      color: Colors.primary[500],
    },
    headerTitle: {
      fontSize: font(18),
      fontWeight: "bold",
      color: Colors.text.primary,
    },
    placeholder: {
      width: 50,
    },
    userInfo: {
      backgroundColor: Colors.background.primary,
      paddingVertical: spacing.xl,
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    userAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: Colors.primary[500],
      justifyContent: "center",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    userInitial: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: font(24),
      fontWeight: "bold",
      color: Colors.text.inverse,
    },
    userName: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: font(18),
      fontWeight: "bold",
      color: Colors.text.primary,
      marginBottom: spacing.xs / 2,
    },
    userEmail: {
      fontSize: font(14),
      color: Colors.text.secondary,
    },
    // Removed inline banner styles; using shared component
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: font(16),
      fontWeight: "600",
      color: Colors.text.primary,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.lg,
    },
    sectionContent: {
      backgroundColor: Colors.background.primary,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: Colors.border.primary,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: Colors.border.primary,
    },
    destructiveItem: {
      // Additional styling for destructive items if needed
    },
    settingContent: {
      flex: 1,
    },
    settingTitle: {
      fontSize: font(16),
      color: Colors.text.primary,
      marginBottom: 2,
    },
    destructiveText: {
      color: Colors.error[500],
    },
    settingSubtitle: {
      fontSize: font(14),
      color: Colors.text.secondary,
    },
    chevron: {
      fontSize: font(18),
      color: Colors.neutral[400],
      marginLeft: spacing.xs,
    },
    versionContainer: {
      paddingVertical: spacing.lg,
      alignItems: "center",
    },
    versionText: {
      fontSize: font(14),
      color: Colors.text.secondary,
    },
  });

  const renderSettingItem = (item: SettingItem, index: number) => (
    <TouchableOpacity
      key={index}
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
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor="#fff"
        />
      )}

      {item.type === "navigation" && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
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
    </ScreenContainer>
  );
}

