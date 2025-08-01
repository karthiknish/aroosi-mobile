import { Platform, Linking } from "react-native";

export enum PermissionType {
  Camera = "camera",
  MediaLibrary = "mediaLibrary",
  Notifications = "notifications",
  Location = "location",
  LocationForeground = "locationForeground",
  LocationBackground = "locationBackground",
  Contacts = "contacts",
}

export enum PermissionStatus {
  Granted = "granted",
  Denied = "denied",
  Undetermined = "undetermined",
  Restricted = "restricted", // iOS only
}

export interface PermissionResult {
  status: PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}

class PlatformPermissions {
  private static permissionModules: any = {};
  // Optional UI handler hooks to keep this utility UI-agnostic
  private static rationaleHandler?: (args: {
    type: PermissionType;
    rationale: { title: string; message: string; buttonPositive?: string; buttonNegative?: string };
    proceed: () => Promise<PermissionResult>;
    cancel: () => PermissionResult;
  }) => void;

  private static openSettingsHandler?: () => void;

  static setRationaleHandler(handler: (args: {
    type: PermissionType;
    rationale: { title: string; message: string; buttonPositive?: string; buttonNegative?: string };
    proceed: () => Promise<PermissionResult>;
    cancel: () => PermissionResult;
  }) => void) {
    PlatformPermissions.rationaleHandler = handler;
  }

  static setOpenSettingsHandler(handler: () => void) {
    PlatformPermissions.openSettingsHandler = handler;
  }

  private static async getPermissionModule(type: PermissionType) {
    try {
      switch (type) {
        case PermissionType.Camera:
        case PermissionType.MediaLibrary:
          if (!PlatformPermissions.permissionModules.ImagePicker) {
            PlatformPermissions.permissionModules.ImagePicker = require("expo-image-picker");
          }
          return PlatformPermissions.permissionModules.ImagePicker;

        case PermissionType.Notifications:
          if (!PlatformPermissions.permissionModules.Notifications) {
            PlatformPermissions.permissionModules.Notifications = require("expo-notifications");
          }
          return PlatformPermissions.permissionModules.Notifications;

        case PermissionType.Location:
        case PermissionType.LocationForeground:
        case PermissionType.LocationBackground:
          if (!PlatformPermissions.permissionModules.Location) {
            PlatformPermissions.permissionModules.Location = require("expo-location");
          }
          return PlatformPermissions.permissionModules.Location;

        case PermissionType.Contacts:
          if (!PlatformPermissions.permissionModules.Contacts) {
            PlatformPermissions.permissionModules.Contacts = require("expo-contacts");
          }
          return PlatformPermissions.permissionModules.Contacts;

        default:
          throw new Error(`Unsupported permission type: ${type}`);
      }
    } catch (error) {
      console.warn(`Failed to load permission module for ${type}:`, error);
      return null;
    }
  }

  static async checkPermission(
    type: PermissionType
  ): Promise<PermissionResult> {
    try {
      const module = await PlatformPermissions.getPermissionModule(type);
      if (!module) {
        return {
          status: PermissionStatus.Denied,
          granted: false,
          canAskAgain: false,
        };
      }

      let result;
      switch (type) {
        case PermissionType.Camera:
          result = await module.getCameraPermissionsAsync();
          break;
        case PermissionType.MediaLibrary:
          result = await module.getMediaLibraryPermissionsAsync();
          break;
        case PermissionType.Notifications:
          result = await module.getPermissionsAsync();
          break;
        case PermissionType.Location:
        case PermissionType.LocationForeground:
          result = await module.getForegroundPermissionsAsync();
          break;
        case PermissionType.LocationBackground:
          result = await module.getBackgroundPermissionsAsync();
          break;
        case PermissionType.Contacts:
          result = await module.getPermissionsAsync();
          break;
        default:
          return {
            status: PermissionStatus.Denied,
            granted: false,
            canAskAgain: false,
          };
      }

      return PlatformPermissions.parsePermissionResult(result);
    } catch (error) {
      console.error(`Failed to check ${type} permission:`, error);
      return {
        status: PermissionStatus.Denied,
        granted: false,
        canAskAgain: false,
      };
    }
  }

  static async requestPermission(
    type: PermissionType
  ): Promise<PermissionResult> {
    try {
      const module = await PlatformPermissions.getPermissionModule(type);
      if (!module) {
        return {
          status: PermissionStatus.Denied,
          granted: false,
          canAskAgain: false,
        };
      }

      let result;
      switch (type) {
        case PermissionType.Camera:
          result = await module.requestCameraPermissionsAsync();
          break;
        case PermissionType.MediaLibrary:
          result = await module.requestMediaLibraryPermissionsAsync();
          break;
        case PermissionType.Notifications:
          result = await module.requestPermissionsAsync();
          break;
        case PermissionType.Location:
        case PermissionType.LocationForeground:
          result = await module.requestForegroundPermissionsAsync();
          break;
        case PermissionType.LocationBackground:
          result = await module.requestBackgroundPermissionsAsync();
          break;
        case PermissionType.Contacts:
          result = await module.requestPermissionsAsync();
          break;
        default:
          return {
            status: PermissionStatus.Denied,
            granted: false,
            canAskAgain: false,
          };
      }

      return PlatformPermissions.parsePermissionResult(result);
    } catch (error) {
      console.error(`Failed to request ${type} permission:`, error);
      return {
        status: PermissionStatus.Denied,
        granted: false,
        canAskAgain: false,
      };
    }
  }

  private static parsePermissionResult(result: any): PermissionResult {
    const status = result.status as PermissionStatus;
    const granted = status === PermissionStatus.Granted;
    const canAskAgain =
      result.canAskAgain !== false && status !== PermissionStatus.Restricted;

    return { status, granted, canAskAgain };
  }

  static async requestWithRationale(
    type: PermissionType,
    rationale: {
      title: string;
      message: string;
      buttonPositive?: string;
      buttonNegative?: string;
    }
  ): Promise<PermissionResult> {
    // First check if we already have permission
    const currentStatus = await PlatformPermissions.checkPermission(type);
    if (currentStatus.granted) {
      return currentStatus;
    }

    // If we can't ask again, suggest opening settings (no blocking alert)
    if (!currentStatus.canAskAgain) {
      if (PlatformPermissions.openSettingsHandler) {
        PlatformPermissions.openSettingsHandler();
      } else {
        // fall back to opening settings directly
        try {
          Linking.openSettings();
        } catch (e) {
          console.warn("Failed to open settings:", e);
        }
      }
      return currentStatus;
    }

    // Show rationale on Android, iOS handles this automatically
    if (Platform.OS === "android") {
      // If an app-level rationale UI handler is provided, delegate to it
      if (PlatformPermissions.rationaleHandler) {
        return new Promise((resolve) => {
          const proceed = async () => {
            const result = await PlatformPermissions.requestPermission(type);
            return result;
          };
          const cancel = (): PermissionResult => currentStatus;
          PlatformPermissions.rationaleHandler!({
            type,
            rationale,
            proceed: async () => {
              const r = await proceed();
              resolve(r);
              return r;
            },
            cancel: () => {
              const r = cancel();
              resolve(r);
              return r;
            },
          });
        });
      }
      // Fallback: request directly without blocking alert
      return PlatformPermissions.requestPermission(type);
    }

    // iOS - request directly
    return PlatformPermissions.requestPermission(type);
  }

  // Removed blocking alerts; open settings is handled via handler or direct Linking

  private static getPermissionDisplayName(type: PermissionType): string {
    switch (type) {
      case PermissionType.Camera:
        return "Camera";
      case PermissionType.MediaLibrary:
        return "Photo Library";
      case PermissionType.Notifications:
        return "Notifications";
      case PermissionType.Location:
      case PermissionType.LocationForeground:
      case PermissionType.LocationBackground:
        return "Location";
      case PermissionType.Contacts:
        return "Contacts";
      default:
        return "Permission";
    }
  }

  // Convenience methods
  static async requestCameraPermission(
    showRationale = true
  ): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(PermissionType.Camera, {
        title: "Camera Permission",
        message: "This app needs camera access to take profile photos.",
      });
    }
    return PlatformPermissions.requestPermission(PermissionType.Camera);
  }

  static async requestMediaLibraryPermission(
    showRationale = true
  ): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(
        PermissionType.MediaLibrary,
        {
          title: "Photo Library Permission",
          message:
            "This app needs photo library access to select profile photos.",
        }
      );
    }
    return PlatformPermissions.requestPermission(PermissionType.MediaLibrary);
  }

  static async requestNotificationPermission(
    showRationale = true
  ): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(
        PermissionType.Notifications,
        {
          title: "Notification Permission",
          message:
            "Enable notifications to receive messages and match updates.",
        }
      );
    }
    return PlatformPermissions.requestPermission(PermissionType.Notifications);
  }

  static async requestLocationPermission(
    showRationale = true
  ): Promise<PermissionResult> {
    if (showRationale) {
      return PlatformPermissions.requestWithRationale(
        PermissionType.LocationForeground,
        {
          title: "Location Permission",
          message:
            "This app uses your location to show nearby matches and improve search results.",
        }
      );
    }
    return PlatformPermissions.requestPermission(
      PermissionType.LocationForeground
    );
  }
}

export default PlatformPermissions;
