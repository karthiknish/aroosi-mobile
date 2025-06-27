/**
 * Notification Permissions Utility
 * Handles notification permission requests and status checking
 */

import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import { NotificationPermissionStatus } from "../types/notifications";

export class NotificationPermissionsManager {
  /**
   * Check current notification permission status
   */
  static async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      switch (status) {
        case "granted":
          return "granted";
        case "denied":
          return "denied";
        case "undetermined":
          return "undetermined";
        default:
          return "undetermined";
      }
    } catch (error) {
      console.error("Error getting notification permission status:", error);
      return "undetermined";
    }
  }

  /**
   * Request notification permissions with user-friendly flow
   */
  static async requestPermissions(): Promise<{
    granted: boolean;
    status: NotificationPermissionStatus;
  }> {
    try {
      // First check current status
      const currentStatus = await this.getPermissionStatus();

      if (currentStatus === "granted") {
        return { granted: true, status: "granted" };
      }

      if (currentStatus === "denied") {
        // Show alert directing user to settings
        this.showSettingsAlert();
        return { granted: false, status: "denied" };
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      const granted = status === "granted";
      const finalStatus: NotificationPermissionStatus = granted
        ? "granted"
        : "denied";

      return { granted, status: finalStatus };
    } catch (error) {
      console.error("Error requesting notification permissions:", error);
      return { granted: false, status: "denied" };
    }
  }

  /**
   * Show alert directing user to app settings to enable notifications
   */
  static showSettingsAlert(): void {
    Alert.alert(
      "Enable Notifications",
      "To receive notifications about new matches, messages, and interests, please enable notifications in your device settings.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  }

  /**
   * Show permission rationale before requesting
   */
  static showPermissionRationale(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        "Stay Connected",
        "Aroosi would like to send you notifications about:\n\n• New matches and interests\n• New messages from your matches\n• Important account updates\n\nYou can change this anytime in Settings.",
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Allow Notifications",
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Check if notifications are enabled at system level
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    try {
      const status = await this.getPermissionStatus();
      return status === "granted";
    } catch (error) {
      console.error("Error checking if notifications are enabled:", error);
      return false;
    }
  }

  /**
   * Configure notification behavior
   */
  static configureNotificationBehavior(): void {
    // Configure how notifications are displayed when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        // Check notification type and decide whether to show
        const notificationType = notification.request.content.data?.type;

        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        };
      },
    });
  }

  /**
   * Handle notification channels for Android
   */
  static async setupAndroidNotificationChannels(): Promise<void> {
    if (Platform.OS !== "android") return;

    try {
      // Default channel
      await Notifications.setNotificationChannelAsync("default", {
        name: "General Notifications",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EC4899",
        sound: "default",
      });

      // Messages channel
      await Notifications.setNotificationChannelAsync("messages", {
        name: "New Messages",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#EC4899",
        sound: "default",
      });

      // Matches channel
      await Notifications.setNotificationChannelAsync("matches", {
        name: "Matches & Interests",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#D6B27C",
        sound: "default",
      });

      // System channel
      await Notifications.setNotificationChannelAsync("system", {
        name: "System Updates",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250],
        lightColor: "#5F92AC",
        sound: "default",
      });

      console.log("Android notification channels configured");
    } catch (error) {
      console.error("Error setting up Android notification channels:", error);
    }
  }

  /**
   * Clear notification badge
   */
  static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error("Error clearing notification badge:", error);
    }
  }

  /**
   * Set notification badge count
   */
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("Error setting notification badge:", error);
    }
  }

  /**
   * Get notification badge count
   */
  static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error("Error getting notification badge:", error);
      return 0;
    }
  }

  /**
   * Dismiss all notifications
   */
  static async dismissAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error("Error dismissing notifications:", error);
    }
  }

  /**
   * Dismiss specific notification
   */
  static async dismissNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.dismissNotificationAsync(notificationId);
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  }
}
