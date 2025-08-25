import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PermissionStatus = "undetermined" | "denied" | "granted";

export class NotificationPermissionsManager {
  private static readonly PERMISSION_RATIONALE_SHOWN_KEY =
    "notification_rationale_shown";

  /**
   * Get current notification permission status
   */
  public static async getPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status as PermissionStatus;
    } catch (error) {
      console.error("Failed to get notification permission status:", error);
      return "undetermined";
    }
  }

  /**
   * Request notification permissions
   */
  public static async requestPermissions(): Promise<PermissionStatus> {
    try {
      // Android 13+: ensure a channel exists BEFORE prompting for permission
      if (Platform.OS === "android") {
        try {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          });
        } catch (e) {
          console.warn(
            "Failed to create default Android notification channel before permission:",
            e
          );
        }
      }
      const { status } = await Notifications.requestPermissionsAsync();
      return status as PermissionStatus;
    } catch (error) {
      console.error("Failed to request notification permissions:", error);
      return "denied";
    }
  }

  /**
   * Show permission rationale to user
   */
  public static async showPermissionRationale(): Promise<boolean> {
    try {
      // Check if we've already shown the rationale
      const hasShownRationale = await AsyncStorage.getItem(
        this.PERMISSION_RATIONALE_SHOWN_KEY
      );

      if (hasShownRationale === "true") {
        // If we've shown it before, just request permissions directly
        const status = await this.requestPermissions();
        return status === "granted";
      }

      return new Promise((resolve) => {
        Alert.alert(
          "Enable Notifications",
          "Stay connected with your matches! Get notified when you receive new messages, matches, and interests.",
          [
            {
              text: "Not Now",
              style: "cancel",
              onPress: () => {
                this.markRationaleShown();
                resolve(false);
              },
            },
            {
              text: "Enable",
              onPress: async () => {
                this.markRationaleShown();
                const status = await this.requestPermissions();
                resolve(status === "granted");
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error("Failed to show permission rationale:", error);
      return false;
    }
  }

  /**
   * Clear notification badge
   */
  public static async clearBadge(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error("Failed to clear notification badge:", error);
    }
  }

  /**
   * Set notification badge count
   */
  public static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("Failed to set notification badge count:", error);
    }
  }

  /**
   * Get current badge count
   */
  public static async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error("Failed to get notification badge count:", error);
      return 0;
    }
  }

  /**
   * Check if notifications are supported on this device
   */
  public static isSupported(): boolean {
    return Platform.OS === "ios" || Platform.OS === "android";
  }

  /**
   * Mark that we've shown the permission rationale
   */
  private static async markRationaleShown(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.PERMISSION_RATIONALE_SHOWN_KEY, "true");
    } catch (error) {
      console.error("Failed to mark rationale as shown:", error);
    }
  }

  /**
   * Reset rationale shown flag (useful for testing)
   */
  public static async resetRationaleShown(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PERMISSION_RATIONALE_SHOWN_KEY);
    } catch (error) {
      console.error("Failed to reset rationale shown flag:", error);
    }
  }

  /**
   * Show settings alert when permissions are denied
   */
  public static showSettingsAlert(): void {
    Alert.alert(
      "Notifications Disabled",
      "To receive notifications, please enable them in your device settings.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Open Settings",
          onPress: () => {
            // Try the cross-platform openSettings API first
            try {
              Linking.openSettings();
            } catch (e) {
              // Fallbacks per-platform
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:").catch(() => {
                  console.warn("Failed to open iOS settings");
                });
              } else {
                console.warn("Failed to open Android settings");
              }
            }
          },
        },
      ]
    );
  }
}
