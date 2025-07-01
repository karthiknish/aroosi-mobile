/**
 * Notification Settings Screen
 * Allows users to configure their notification preferences
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useOneSignal } from "../../../hooks/useOneSignal";
import { NotificationPermissionsManager } from "../../../utils/notificationPermissions";
import { NotificationHandler } from "../../../utils/notificationHandler";
import {
  NotificationPreferences,
  defaultNotificationPreferences,
  NotificationPermissionStatus,
  NotificationType,
} from "../../../types/notifications";
import { Colors } from "../../../constants/Colors";
import { Layout } from "../../../constants/Layout";
import ScreenContainer from "@components/common/ScreenContainer";

const STORAGE_KEY = "notification_preferences";

interface SettingsRowProps {
  title: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  description,
  value,
  onToggle,
  disabled = false,
}) => (
  <View style={styles.settingsRow}>
    <View style={styles.settingsContent}>
      <Text style={[styles.settingsTitle, disabled && styles.disabledText]}>
        {title}
      </Text>
      {description && (
        <Text
          style={[styles.settingsDescription, disabled && styles.disabledText]}
        >
          {description}
        </Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      disabled={disabled}
      trackColor={{ false: Colors.gray[300], true: Colors.primary[500] }}
      thumbColor={value ? Colors.background.primary : Colors.gray[100]}
    />
  </View>
);

export default function NotificationSettingsScreen() {
  const {
    permissionStatus,
    isRegistered,
    requestPermission,
    registerForPushNotifications,
    unregisterFromPushNotifications,
  } = useOneSignal();

  const [preferences, setPreferences] = useState<NotificationPreferences>(
    defaultNotificationPreferences
  );
  const [loading, setLoading] = useState(true);
  const [systemPermissionStatus, setSystemPermissionStatus] =
    useState<NotificationPermissionStatus>("undetermined");

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
    checkSystemPermissions();
  }, []);

  // Update system permission status when OneSignal status changes
  useEffect(() => {
    setSystemPermissionStatus(permissionStatus);
  }, [permissionStatus]);

  /**
   * Load notification preferences from storage
   */
  const loadPreferences = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedPreferences = JSON.parse(stored);
        setPreferences({
          ...defaultNotificationPreferences,
          ...parsedPreferences,
        });
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Save notification preferences to storage
   */
  const savePreferences = async (
    newPreferences: NotificationPreferences
  ): Promise<void> => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
      setPreferences(newPreferences);
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      Alert.alert("Error", "Failed to save notification preferences");
    }
  };

  /**
   * Check system-level notification permissions
   */
  const checkSystemPermissions = async (): Promise<void> => {
    try {
      const status = await NotificationPermissionsManager.getPermissionStatus();
      setSystemPermissionStatus(status);
    } catch (error) {
      console.error("Error checking system permissions:", error);
    }
  };

  /**
   * Handle master notification toggle
   */
  const handleMasterToggle = async (enabled: boolean): Promise<void> => {
    if (enabled) {
      // User wants to enable notifications
      if (systemPermissionStatus !== "granted") {
        // Need to request system permission first
        const granted = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Permission Required",
            "Please enable notifications in your device settings to receive Aroosi notifications.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Open Settings",
                onPress: () =>
                  NotificationPermissionsManager.showSettingsAlert(),
              },
            ]
          );
          return;
        }
      }

      // Enable all notification types
      const newPreferences = {
        ...defaultNotificationPreferences,
        sound: preferences.sound,
        vibration: preferences.vibration,
        doNotDisturbStart: preferences.doNotDisturbStart,
        doNotDisturbEnd: preferences.doNotDisturbEnd,
      };

      await savePreferences(newPreferences);

      // Register for push notifications if not already registered
      if (!isRegistered) {
        await registerForPushNotifications();
      }
    } else {
      // User wants to disable all notifications
      const newPreferences = {
        ...preferences,
        newMessages: false,
        newInterests: false,
        newMatches: false,
        profileViews: false,
        subscriptionUpdates: false,
        systemNotifications: false,
      };

      await savePreferences(newPreferences);

      // Optionally unregister from push notifications
      // await unregisterFromPushNotifications();
    }
  };

  /**
   * Handle individual notification type toggle
   */
  const handleNotificationTypeToggle = (
    type: keyof NotificationPreferences,
    enabled: boolean
  ): void => {
    const newPreferences = { ...preferences, [type]: enabled };
    savePreferences(newPreferences);
  };

  /**
   * Test notification functionality
   */
  const testNotifications = async (): Promise<void> => {
    if (systemPermissionStatus !== "granted") {
      Alert.alert("Permission Required", "Please enable notifications first");
      return;
    }

    try {
      await NotificationHandler.createTestNotification("new_match");
      Alert.alert("Test Sent", "Check your notifications!");
    } catch (error) {
      Alert.alert("Error", "Failed to send test notification");
    }
  };

  /**
   * Clear all notifications and badge
   */
  const clearAllNotifications = async (): Promise<void> => {
    try {
      await NotificationHandler.clearAllNotifications();
      Alert.alert("Cleared", "All notifications have been cleared");
    } catch (error) {
      Alert.alert("Error", "Failed to clear notifications");
    }
  };

  /**
   * Check if any notification type is enabled
   */
  const isAnyNotificationEnabled = (): boolean => {
    return (
      preferences.newMessages ||
      preferences.newInterests ||
      preferences.newMatches ||
      preferences.profileViews ||
      preferences.subscriptionUpdates ||
      preferences.systemNotifications
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading preferences...</Text>
      </View>
    );
  }

  const notificationsEnabled = systemPermissionStatus === "granted";
  const anyTypeEnabled = isAnyNotificationEnabled();

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentContainer}
    >
      {/* Permission Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Status</Text>

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>System Permissions:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: notificationsEnabled
                    ? Colors.success[500]
                    : Colors.error[500],
                },
              ]}
            >
              {notificationsEnabled ? "Enabled" : "Disabled"}
            </Text>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Push Registration:</Text>
            <Text
              style={[
                styles.statusValue,
                {
                  color: isRegistered
                    ? Colors.success[500]
                    : Colors.warning[500],
                },
              ]}
            >
              {isRegistered ? "Active" : "Inactive"}
            </Text>
          </View>
        </View>

        {systemPermissionStatus === "denied" && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={() => NotificationPermissionsManager.showSettingsAlert()}
          >
            <Text style={styles.permissionButtonText}>Enable in Settings</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Master Toggle Section */}
      <View style={styles.section}>
        <SettingsRow
          title="All Notifications"
          description="Enable or disable all notification types"
          value={anyTypeEnabled && notificationsEnabled}
          onToggle={handleMasterToggle}
          disabled={!notificationsEnabled}
        />
      </View>

      {/* Notification Types Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Types</Text>

        <SettingsRow
          title="New Messages"
          description="Get notified when you receive new messages"
          value={preferences.newMessages}
          onToggle={(value) =>
            handleNotificationTypeToggle("newMessages", value)
          }
          disabled={!notificationsEnabled}
        />

        <SettingsRow
          title="New Interests"
          description="Get notified when someone likes your profile"
          value={preferences.newInterests}
          onToggle={(value) =>
            handleNotificationTypeToggle("newInterests", value)
          }
          disabled={!notificationsEnabled}
        />

        <SettingsRow
          title="New Matches"
          description="Get notified when you match with someone"
          value={preferences.newMatches}
          onToggle={(value) =>
            handleNotificationTypeToggle("newMatches", value)
          }
          disabled={!notificationsEnabled}
        />

        <SettingsRow
          title="Profile Views"
          description="Get notified when someone views your profile (Premium Plus)"
          value={preferences.profileViews}
          onToggle={(value) =>
            handleNotificationTypeToggle("profileViews", value)
          }
          disabled={!notificationsEnabled}
        />

        <SettingsRow
          title="Subscription Updates"
          description="Get notified about subscription changes and renewals"
          value={preferences.subscriptionUpdates}
          onToggle={(value) =>
            handleNotificationTypeToggle("subscriptionUpdates", value)
          }
          disabled={!notificationsEnabled}
        />

        <SettingsRow
          title="System Notifications"
          description="Get notified about app updates and important announcements"
          value={preferences.systemNotifications}
          onToggle={(value) =>
            handleNotificationTypeToggle("systemNotifications", value)
          }
          disabled={!notificationsEnabled}
        />
      </View>

      {/* Sound & Vibration Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sound & Vibration</Text>

        <SettingsRow
          title="Sound"
          description="Play sound for notifications"
          value={preferences.sound}
          onToggle={(value) => handleNotificationTypeToggle("sound", value)}
          disabled={!notificationsEnabled}
        />

        <SettingsRow
          title="Vibration"
          description="Vibrate for notifications"
          value={preferences.vibration}
          onToggle={(value) => handleNotificationTypeToggle("vibration", value)}
          disabled={!notificationsEnabled}
        />
      </View>

      {/* Testing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Testing & Management</Text>

        <TouchableOpacity
          style={[
            styles.actionButton,
            !notificationsEnabled && styles.disabledButton,
          ]}
          onPress={testNotifications}
          disabled={!notificationsEnabled}
        >
          <Text
            style={[
              styles.actionButtonText,
              !notificationsEnabled && styles.disabledText,
            ]}
          >
            Send Test Notification
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={clearAllNotifications}
        >
          <Text style={styles.actionButtonText}>Clear All Notifications</Text>
        </TouchableOpacity>
      </View>

      {/* Help Section */}
      <View style={styles.section}>
        <Text style={styles.helpText}>
          Notifications help you stay connected with your matches and never miss
          important updates. You can customize which types of notifications you
          receive and when you receive them.
        </Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
  },
  contentContainer: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.lg,
    flexGrow: 1,
  },
  loadingText: {
    textAlign: "center",
    marginTop: Layout.spacing.xl,
    fontSize: 16,
    color: Colors.text.secondary,
  },
  section: {
    marginBottom: Layout.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.md,
  },
  statusCard: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },
  statusLabel: {
    fontSize: 16,
    color: Colors.text.secondary,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  permissionButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: Layout.spacing.sm,
    paddingHorizontal: Layout.spacing.md,
    alignItems: "center",
  },
  permissionButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.md,
    padding: Layout.spacing.md,
    marginBottom: Layout.spacing.sm,
  },
  settingsContent: {
    flex: 1,
    marginRight: Layout.spacing.md,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  settingsDescription: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.md,
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    alignItems: "center",
    marginBottom: Layout.spacing.sm,
  },
  actionButtonText: {
    color: Colors.text.inverse,
    fontSize: 16,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: Colors.gray[100],
    borderRadius: Layout.radius.sm,
  },
  disabledText: {
    color: Colors.gray[500],
  },
  helpText: {
    fontSize: 14,
    color: Colors.text.secondary,
    lineHeight: 22,
    textAlign: "center",
    fontStyle: "italic",
  },
});
