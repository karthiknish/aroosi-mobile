import { Platform, Alert, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type PermissionStatus = "granted" | "denied" | "undetermined";

export interface NotificationPermissionState {
  status: PermissionStatus;
  canAskAgain: boolean;
  lastAsked: number | null;
  askCount: number;
}

const PERMISSION_STORAGE_KEY = "notification_permission_state";
const MAX_ASK_COUNT = 3;
const ASK_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

export class NotificationPermissionManager {
  private static instance: NotificationPermissionManager;
  private permissionState: NotificationPermissionState = {
    status: "undetermined",
    canAskAgain: true,
    lastAsked: null,
    askCount: 0,
  };

  private constructor() {
    this.loadPermissionState();
  }

  public static getInstance(): NotificationPermissionManager {
    if (!NotificationPermissionManager.instance) {
      NotificationPermissionManager.instance =
        new NotificationPermissionManager();
    }
    return NotificationPermissionManager.instance;
  }

  public async checkPermissionStatus(): Promise<PermissionStatus> {
    try {
      const { status } = await Notifications.getPermissionsAsync();

      let mappedStatus: PermissionStatus;
      switch (status) {
        case "granted":
          mappedStatus = "granted";
          break;
        case "denied":
          mappedStatus = "denied";
          break;
        default:
          mappedStatus = "undetermined";
      }

      this.permissionState.status = mappedStatus;
      await this.savePermissionState();

      return mappedStatus;
    } catch (error) {
      console.error("Failed to check notification permission:", error);
      return "undetermined";
    }
  }

  public async requestPermission(
    showRationale = true
  ): Promise<PermissionStatus> {
    const currentStatus = await this.checkPermissionStatus();

    if (currentStatus === "granted") {
      return "granted";
    }

    // Check if we can ask again
    if (!this.canAskForPermission()) {
      if (showRationale) {
        this.showPermissionRationale();
      }
      return currentStatus;
    }

    try {
      // Show rationale before asking (iOS best practice)
      if (
        showRationale &&
        Platform.OS === "ios" &&
        this.permissionState.askCount === 0
      ) {
        const shouldProceed = await this.showPrePermissionDialog();
        if (!shouldProceed) {
          return currentStatus;
        }
      }

      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowDisplayInCarPlay: true,
          allowCriticalAlerts: false,
          provideAppNotificationSettings: true,
          allowProvisional: false,
          allowAnnouncements: false,
        },
      });

      let mappedStatus: PermissionStatus;
      switch (status) {
        case "granted":
          mappedStatus = "granted";
          break;
        case "denied":
          mappedStatus = "denied";
          break;
        default:
          mappedStatus = "undetermined";
      }

      // Update permission state
      this.permissionState = {
        status: mappedStatus,
        canAskAgain:
          mappedStatus !== "denied" &&
          this.permissionState.askCount < MAX_ASK_COUNT,
        lastAsked: Date.now(),
        askCount: this.permissionState.askCount + 1,
      };

      await this.savePermissionState();

      return mappedStatus;
    } catch (error) {
      console.error("Failed to request notification permission:", error);
      return currentStatus;
    }
  }

  public canAskForPermission(): boolean {
    if (this.permissionState.status === "granted") {
      return false;
    }

    if (this.permissionState.askCount >= MAX_ASK_COUNT) {
      return false;
    }

    if (this.permissionState.lastAsked) {
      const timeSinceLastAsk = Date.now() - this.permissionState.lastAsked;
      if (timeSinceLastAsk < ASK_COOLDOWN) {
        return false;
      }
    }

    return this.permissionState.canAskAgain;
  }

  public getPermissionState(): NotificationPermissionState {
    return { ...this.permissionState };
  }

  public async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error("Failed to open app settings:", error);
    }
  }

  private async showPrePermissionDialog(): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        "Stay Connected",
        "Get notified about new messages, matches, and important updates. You can change this anytime in settings.",
        [
          {
            text: "Not Now",
            style: "cancel",
            onPress: () => resolve(false),
          },
          {
            text: "Enable Notifications",
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  private showPermissionRationale(): void {
    const title = "Notifications Disabled";
    let message =
      "Enable notifications to stay updated with messages and matches.";

    if (this.permissionState.status === "denied") {
      message += " You can enable them in your device settings.";
    }

    Alert.alert(title, message, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Open Settings",
        onPress: () => this.openAppSettings(),
      },
    ]);
  }

  private async loadPermissionState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PERMISSION_STORAGE_KEY);
      if (stored) {
        this.permissionState = {
          ...this.permissionState,
          ...JSON.parse(stored),
        };
      }
    } catch (error) {
      console.error("Failed to load permission state:", error);
    }
  }

  private async savePermissionState(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        PERMISSION_STORAGE_KEY,
        JSON.stringify(this.permissionState)
      );
    } catch (error) {
      console.error("Failed to save permission state:", error);
    }
  }

  public async resetPermissionState(): Promise<void> {
    this.permissionState = {
      status: "undetermined",
      canAskAgain: true,
      lastAsked: null,
      askCount: 0,
    };
    await this.savePermissionState();
  }
}

// Notification permission strategies
export class NotificationPermissionStrategy {
  private permissionManager: NotificationPermissionManager;

  constructor() {
    this.permissionManager = NotificationPermissionManager.getInstance();
  }

  // Strategy 1: Ask immediately on app launch
  public async requestOnLaunch(): Promise<PermissionStatus> {
    return this.permissionManager.requestPermission(true);
  }

  // Strategy 2: Ask after user engagement (e.g., after first match)
  public async requestAfterEngagement(
    context: string
  ): Promise<PermissionStatus> {
    const canAsk = this.permissionManager.canAskForPermission();
    if (!canAsk) {
      return this.permissionManager.getPermissionState().status;
    }

    return new Promise((resolve) => {
      const contextMessages = {
        first_match:
          "You got your first match! Enable notifications so you never miss a message.",
        first_message:
          "Stay connected! Enable notifications to get instant message alerts.",
        profile_complete:
          "Your profile is complete! Enable notifications to know when someone is interested.",
        subscription:
          "Get the most out of your premium subscription with instant notifications.",
      };

      const message =
        contextMessages[context as keyof typeof contextMessages] ||
        "Enable notifications to stay updated with your Aroosi activity.";

      Alert.alert("Stay Updated", message, [
        {
          text: "Maybe Later",
          style: "cancel",
          onPress: () =>
            resolve(this.permissionManager.getPermissionState().status),
        },
        {
          text: "Enable",
          onPress: async () => {
            const status = await this.permissionManager.requestPermission(
              false
            );
            resolve(status);
          },
        },
      ]);
    });
  }

  // Strategy 3: Soft ask with explanation
  public async softAsk(feature: string): Promise<PermissionStatus> {
    const canAsk = this.permissionManager.canAskForPermission();
    if (!canAsk) {
      return this.permissionManager.getPermissionState().status;
    }

    const featureMessages = {
      messages: "Get notified instantly when someone sends you a message.",
      matches: "Be the first to know when you have a new match.",
      interests: "Know when someone is interested in your profile.",
      premium: "Get exclusive notifications about premium features and offers.",
    };

    const message =
      featureMessages[feature as keyof typeof featureMessages] ||
      "Enable notifications for a better experience.";

    return new Promise((resolve) => {
      Alert.alert("Enable Notifications?", message, [
        {
          text: "Not Now",
          style: "cancel",
          onPress: () =>
            resolve(this.permissionManager.getPermissionState().status),
        },
        {
          text: "Enable",
          onPress: async () => {
            const status = await this.permissionManager.requestPermission(
              false
            );
            resolve(status);
          },
        },
      ]);
    });
  }

  // Strategy 4: Progressive permission (ask for specific types)
  public async requestProgressive(types: string[]): Promise<PermissionStatus> {
    const typeDescriptions = {
      messages: "new messages",
      matches: "new matches",
      interests: "profile interests",
      system: "important updates",
    };

    const descriptions = types
      .map((type) => typeDescriptions[type as keyof typeof typeDescriptions])
      .filter(Boolean);
    const message = `Get notified about ${descriptions.join(
      ", "
    )} to stay connected.`;

    return new Promise((resolve) => {
      Alert.alert("Notification Preferences", message, [
        {
          text: "Skip",
          style: "cancel",
          onPress: () =>
            resolve(this.permissionManager.getPermissionState().status),
        },
        {
          text: "Allow",
          onPress: async () => {
            const status = await this.permissionManager.requestPermission(
              false
            );
            resolve(status);
          },
        },
      ]);
    });
  }
}

// React hooks for permission management
export function useNotificationPermissions() {
  const [permissionState, setPermissionState] =
    React.useState<NotificationPermissionState>({
      status: "undetermined",
      canAskAgain: true,
      lastAsked: null,
      askCount: 0,
    });

  const permissionManager = NotificationPermissionManager.getInstance();
  const strategy = new NotificationPermissionStrategy();

  React.useEffect(() => {
    const checkStatus = async () => {
      await permissionManager.checkPermissionStatus();
      setPermissionState(permissionManager.getPermissionState());
    };

    checkStatus();
  }, []);

  const requestPermission = React.useCallback(
    async (showRationale = true) => {
      const status = await permissionManager.requestPermission(showRationale);
      setPermissionState(permissionManager.getPermissionState());
      return status;
    },
    [permissionManager]
  );

  const requestAfterEngagement = React.useCallback(
    async (context: string) => {
      const status = await strategy.requestAfterEngagement(context);
      setPermissionState(permissionManager.getPermissionState());
      return status;
    },
    [strategy, permissionManager]
  );

  const softAsk = React.useCallback(
    async (feature: string) => {
      const status = await strategy.softAsk(feature);
      setPermissionState(permissionManager.getPermissionState());
      return status;
    },
    [strategy, permissionManager]
  );

  const openSettings = React.useCallback(() => {
    return permissionManager.openAppSettings();
  }, [permissionManager]);

  return {
    permissionState,
    requestPermission,
    requestAfterEngagement,
    softAsk,
    openSettings,
    canAskAgain: permissionManager.canAskForPermission(),
  };
}
