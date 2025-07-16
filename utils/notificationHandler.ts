import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";

export interface NotificationData {
  type: "message" | "match" | "interest" | "system" | "subscription";
  title: string;
  body: string;
  data?: Record<string, any>;
  userId?: string;
  profileId?: string;
  conversationId?: string;
  matchId?: string;
}

export interface NotificationPreferences {
  messages: boolean;
  matches: boolean;
  interests: boolean;
  system: boolean;
  marketing: boolean;
  sound: boolean;
  vibration: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  messages: true,
  matches: true,
  interests: true,
  system: true,
  marketing: false,
  sound: true,
  vibration: true,
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "08:00",
  },
};

export class NotificationHandler {
  private static navigationRef: any = null;
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      this.isInitialized = true;
      console.log("NotificationHandler initialized");
    } catch (error) {
      console.error("Failed to initialize NotificationHandler:", error);
    }
  }

  public static setNavigationRef(ref: any): void {
    this.navigationRef = ref;
  }

  public static handleDeepLink(data: NotificationData): void {
    if (!this.navigationRef) {
      console.warn("Navigation ref not set for deep linking");
      return;
    }

    switch (data.type) {
      case "message":
        this.navigateToChat(data.conversationId, data.data);
        break;
      case "match":
        this.navigateToMatch(data.matchId, data.data);
        break;
      case "interest":
        this.navigateToProfile(data.profileId, data.data);
        break;
      case "system":
        this.navigateToSystem(data.data);
        break;
      default:
        this.navigateToHome();
    }
  }

  private static navigateToChat(conversationId?: string, data?: any): void {
    if (conversationId) {
      this.navigationRef.navigate("Chat", {
        conversationId,
        ...data,
      });
    }
  }

  private static navigateToMatch(matchId?: string, data?: any): void {
    if (matchId) {
      this.navigationRef.navigate("Matches", {
        matchId,
        ...data,
      });
    }
  }

  private static navigateToProfile(profileId?: string, data?: any): void {
    if (profileId) {
      this.navigationRef.navigate("ProfileDetail", {
        profileId,
        ...data,
      });
    }
  }

  private static navigateToSystem(data?: any): void {
    this.navigationRef.navigate("Settings", data);
  }

  private static navigateToHome(): void {
    this.navigationRef.navigate("Main");
  }
}

export class NotificationManager {
  private static instance: NotificationManager;
  private token: string | null = null;
  private preferences: NotificationPreferences = DEFAULT_PREFERENCES;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const shouldShow = await this.shouldShowNotification(notification);
          return {
            shouldShowAlert: shouldShow,
            shouldPlaySound: shouldShow && this.preferences.sound,
            shouldSetBadge: true,
          };
        },
      });

      // Load preferences
      await this.loadPreferences();

      // Register for push notifications
      await this.registerForPushNotifications();

      // Set up notification listeners
      this.setupNotificationListeners();

      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize notifications:", error);
    }
  }

  public async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.warn("Push notifications only work on physical devices");
      return null;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.warn("Push notification permission not granted");
        return null;
      }

      // Get push token
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      });

      this.token = tokenData.data;

      // Configure notification channel for Android
      if (Platform.OS === "android") {
        await this.setupAndroidChannels();
      }

      return this.token;
    } catch (error) {
      console.error("Failed to register for push notifications:", error);
      return null;
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public async updatePreferences(
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    this.preferences = { ...this.preferences, ...preferences };
    await this.savePreferences();
  }

  public getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  public async scheduleLocalNotification(
    data: NotificationData,
    delay = 0
  ): Promise<void> {
    if (!this.shouldAllowNotification(data.type)) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: data.title,
          body: data.body,
          data: data.data || {},
          sound: this.preferences.sound ? "default" : undefined,
        },
        trigger: delay > 0 ? { seconds: delay } : null,
      });
    } catch (error) {
      console.error("Failed to schedule local notification:", error);
    }
  }

  public async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (error) {
      console.error("Failed to cancel notifications:", error);
    }
  }

  public async getBadgeCount(): Promise<number> {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error("Failed to get badge count:", error);
      return 0;
    }
  }

  public async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error("Failed to set badge count:", error);
    }
  }

  public async clearBadge(): Promise<void> {
    await this.setBadgeCount(0);
  }

  private async setupAndroidChannels(): Promise<void> {
    const channels = [
      {
        id: "messages",
        name: "Messages",
        description: "New message notifications",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      },
      {
        id: "matches",
        name: "Matches",
        description: "New match notifications",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 500, 200, 500],
      },
      {
        id: "interests",
        name: "Interests",
        description: "Interest notifications",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      },
      {
        id: "system",
        name: "System",
        description: "System notifications",
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: "default",
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.id, channel);
    }
  }

  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log("Notification received:", notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification tapped
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log("Notification tapped:", response);
      this.handleNotificationTapped(response);
    });
  }

  private async handleNotificationReceived(
    notification: Notifications.Notification
  ): Promise<void> {
    const data = notification.request.content.data as NotificationData;

    // Update badge count for messages
    if (data.type === "message") {
      const currentBadge = await this.getBadgeCount();
      await this.setBadgeCount(currentBadge + 1);
    }
  }

  private handleNotificationTapped(
    response: Notifications.NotificationResponse
  ): void {
    const data = response.notification.request.content.data as NotificationData;

    // Navigate based on notification type
    NotificationHandler.handleDeepLink(data);
  }

  private async shouldShowNotification(
    notification: Notifications.Notification
  ): Promise<boolean> {
    const data = notification.request.content.data as NotificationData;

    // Check if notification type is enabled
    if (!this.shouldAllowNotification(data.type)) {
      return false;
    }

    // Check quiet hours
    if (this.preferences.quietHours.enabled && this.isInQuietHours()) {
      return false;
    }

    return true;
  }

  private shouldAllowNotification(type: NotificationData["type"]): boolean {
    switch (type) {
      case "message":
        return this.preferences.messages;
      case "match":
        return this.preferences.matches;
      case "interest":
        return this.preferences.interests;
      case "system":
        return this.preferences.system;
      case "subscription":
        return this.preferences.marketing;
      default:
        return true;
    }
  }

  private isInQuietHours(): boolean {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

    const { start, end } = this.preferences.quietHours;

    if (start <= end) {
      // Same day quiet hours (e.g., 22:00 to 23:00)
      return currentTime >= start && currentTime <= end;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= start || currentTime <= end;
    }
  }

  private async loadPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("notification_preferences");
      if (stored) {
        this.preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
    }
  }

  private async savePreferences(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "notification_preferences",
        JSON.stringify(this.preferences)
      );
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
    }
  }
}

// React hooks for notifications
export function useNotifications() {
  const [token, setToken] = React.useState<string | null>(null);
  const [preferences, setPreferences] =
    React.useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const manager = NotificationManager.getInstance();

  React.useEffect(() => {
    const initializeNotifications = async () => {
      await manager.initialize();
      const notificationToken = manager.getToken();
      setToken(notificationToken);
      setPreferences(manager.getPreferences());
    };

    initializeNotifications();
  }, []);

  const updatePreferences = React.useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      await manager.updatePreferences(newPreferences);
      setPreferences(manager.getPreferences());
    },
    [manager]
  );

  const scheduleNotification = React.useCallback(
    (data: NotificationData, delay = 0) => {
      return manager.scheduleLocalNotification(data, delay);
    },
    [manager]
  );

  const clearBadge = React.useCallback(() => {
    return manager.clearBadge();
  }, [manager]);

  return {
    token,
    preferences,
    updatePreferences,
    scheduleNotification,
    clearBadge,
    setBadgeCount: manager.setBadgeCount.bind(manager),
    getBadgeCount: manager.getBadgeCount.bind(manager),
  };
}