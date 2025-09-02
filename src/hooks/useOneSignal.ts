/**
 * OneSignal Hook for Aroosi Mobile App
 * Handles push notification registration and management
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { OneSignal } from "react-native-onesignal";
import { logger } from "@utils/logger";
import { useAuth } from "@contexts/AuthProvider";
import { useApiClient } from "@utils/api";
import {
  PushRegistration,
  NotificationPermissionStatus,
  NotificationReceivedEvent,
  NotificationOpenedEvent,
  DeviceType,
  NotificationNavigationData,
} from "../../types/notifications";

interface UseOneSignalReturn {
  isInitialized: boolean;
  playerId: string | null;
  permissionStatus: NotificationPermissionStatus;
  isRegistered: boolean;
  requestPermission: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<boolean>;
  unregisterFromPushNotifications: () => Promise<boolean>;
  setExternalUserId: (userId: string) => void;
  clearExternalUserId: () => void;
  addTags: (tags: Record<string, string>) => void;
  removeTags: (tagKeys: string[]) => void;
}

export const useOneSignal = (): UseOneSignalReturn => {
  const { userId } = useAuth();
  const apiClient = useApiClient();
  const [isInitialized, setIsInitialized] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("undetermined");
  const [isRegistered, setIsRegistered] = useState(false);
  const initializationRef = useRef(false);

  // Initialize OneSignal
  const initializeOneSignal = useCallback(async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      const appId =
        process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
        process.env.EXPO_PUBLIC_ONE_SIGNAL_APP_ID;
      if (!appId) {
        logger.error("ONESIGNAL", "App ID not found in environment variables");
        return;
      }

      // Initialize OneSignal
      OneSignal.initialize(appId);

      // Check initial permission status
      const permissionState =
        await OneSignal.Notifications.getPermissionAsync();
      setPermissionStatus(permissionState ? "granted" : "denied");

      // Set up notification event listeners
      setupNotificationListeners();

      // Get player ID
      const playerIdResult = await OneSignal.User.getOnesignalId();
      if (playerIdResult) {
        setPlayerId(playerIdResult);
      }

      setIsInitialized(true);
      logger.debug("ONESIGNAL", "Initialized successfully");
    } catch (error) {
      logger.error("ONESIGNAL", "Failed to initialize OneSignal", error);
    }
  }, []);

  // Set up notification event listeners
  const setupNotificationListeners = useCallback(() => {
    // Handle notification received while app is in foreground
    OneSignal.Notifications.addEventListener(
      "foregroundWillDisplay",
      (event: any) => {
        logger.debug(
          "ONESIGNAL",
          "Notification received in foreground",
          event.notification
        );
        handleNotificationReceived(event as NotificationReceivedEvent);
      }
    );

    // Handle notification opened/clicked
    OneSignal.Notifications.addEventListener("click", (event: any) => {
      logger.debug("ONESIGNAL", "Notification clicked", event.notification);
      handleNotificationOpened(event as unknown as NotificationOpenedEvent);
    });

    // Handle permission changes
    OneSignal.Notifications.addEventListener(
      "permissionChange",
      (granted: boolean) => {
        logger.debug("ONESIGNAL", "Notification permission changed", {
          granted,
        });
        setPermissionStatus(granted ? "granted" : "denied");
      }
    );

    // Handle player ID changes
    OneSignal.User.addEventListener("change", (event: any) => {
      const newPlayerId = (event as unknown as { onesignalId: string })
        .onesignalId;
      if (newPlayerId && newPlayerId !== playerId) {
        setPlayerId(newPlayerId);
        logger.debug("ONESIGNAL", "Player ID updated", { newPlayerId });
      }
    });
  }, [playerId]);

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback(
    (event: NotificationReceivedEvent) => {
      const { notification } = event;

      // You can customize foreground notification display here
      // For now, we'll let the default behavior handle it
      logger.debug("ONESIGNAL", "Processing foreground notification", {
        title: notification.title || "",
      });
    },
    []
  );

  // Handle notification opened/clicked
  const handleNotificationOpened = useCallback(
    (event: NotificationOpenedEvent) => {
      const { notification, action } = event;

      try {
        // Parse navigation data from notification
        const navigationData = notification.additionalData
          ?.navigationData as NotificationNavigationData;

        if (navigationData?.screen) {
          // Handle deep linking based on notification type
          handleNotificationNavigation(navigationData);
        }

        logger.debug("ONESIGNAL", "Notification opened", {
          title: notification.title,
          actionType: action.type,
          actionId: action.actionId,
          navigationData,
        });
      } catch (error) {
        logger.error("ONESIGNAL", "Error handling notification opened", error);
      }
    },
    []
  );

  // Handle deep linking from notifications
  const handleNotificationNavigation = useCallback(
    (navigationData: NotificationNavigationData) => {
      // This would integrate with your navigation system
      // For now, we'll just log the intended navigation
      logger.debug("ONESIGNAL", "Navigate to", {
        screen: navigationData.screen,
        params: navigationData.params,
      });

      // Example navigation logic:
      // navigation.navigate(navigationData.screen, navigationData.params);
    },
    []
  );

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await OneSignal.Notifications.requestPermission(true);
      setPermissionStatus(granted ? "granted" : "denied");
      return granted;
    } catch (error) {
      logger.error(
        "ONESIGNAL",
        "Error requesting notification permission",
        error
      );
      return false;
    }
  }, []);

  // Register for push notifications
  const registerForPushNotifications =
    useCallback(async (): Promise<boolean> => {
      if (!userId || !playerId) {
        logger.warn("ONESIGNAL", "Cannot register: missing userId or playerId");
        return false;
      }

      try {
        // Get auth token - using userId as placeholder since getToken isn't available
        const token = userId; // In a real implementation, you'd get the actual token
        if (!token) {
          logger.error("ONESIGNAL", "No auth token available for registration");
          return false;
        }

        // Prepare registration data (aligned with main project API)
        const deviceType: DeviceType =
          Platform.OS === "ios"
            ? "ios"
            : Platform.OS === "android"
            ? "android"
            : "unknown";

        const registrationData = {
          playerId,
          deviceType,
          deviceToken: undefined, // OneSignal handles tokens internally
        };

        // Register with backend API
        const response = await apiClient.registerForPushNotifications(
          registrationData
        );

        if (response.success) {
          setIsRegistered(true);
          logger.debug(
            "ONESIGNAL",
            "Successfully registered for push notifications"
          );
          return true;
        } else {
          logger.error(
            "ONESIGNAL",
            "Failed to register for push notifications",
            response.data
          );
          return false;
        }
      } catch (error) {
        logger.error(
          "ONESIGNAL",
          "Error registering for push notifications",
          error
        );
        return false;
      }
    }, [userId, playerId, apiClient]);

  // Unregister from push notifications
  const unregisterFromPushNotifications =
    useCallback(async (): Promise<boolean> => {
      if (!userId || !playerId) {
        logger.warn(
          "ONESIGNAL",
          "Cannot unregister: missing userId or playerId"
        );
        return false;
      }

      try {
        // Prepare unregistration data (aligned with main project API)
        const unregistrationData = {
          playerId,
        };

        // Unregister from backend API
        const response = await apiClient.unregisterFromPushNotifications(
          unregistrationData
        );

        if (response.success) {
          setIsRegistered(false);
          logger.debug(
            "ONESIGNAL",
            "Successfully unregistered from push notifications"
          );
          return true;
        } else {
          logger.error(
            "ONESIGNAL",
            "Failed to unregister from push notifications",
            response.data
          );
          return false;
        }
      } catch (error) {
        logger.error(
          "ONESIGNAL",
          "Error unregistering from push notifications",
          error
        );
        return false;
      }
    }, [userId, playerId, apiClient]);

  // Set external user ID (for targeting)
  const setExternalUserId = useCallback((externalUserId: string) => {
    OneSignal.login(externalUserId);
    logger.debug("ONESIGNAL", "Set external user ID", { externalUserId });
  }, []);

  // Clear external user ID
  const clearExternalUserId = useCallback(() => {
    OneSignal.logout();
    logger.debug("ONESIGNAL", "Cleared external user ID");
  }, []);

  // Add tags for targeting
  const addTags = useCallback((tags: Record<string, string>) => {
    OneSignal.User.addTags(tags);
    logger.debug("ONESIGNAL", "Added tags", tags);
  }, []);

  // Remove tags
  const removeTags = useCallback((tagKeys: string[]) => {
    OneSignal.User.removeTags(tagKeys);
    logger.debug("ONESIGNAL", "Removed tags", { tagKeys });
  }, []);

  // Initialize OneSignal on mount
  useEffect(() => {
    initializeOneSignal();
  }, [initializeOneSignal]);

  // Auto-register when user logs in and OneSignal is ready
  useEffect(() => {
    if (
      isInitialized &&
      userId &&
      playerId &&
      permissionStatus === "granted" &&
      !isRegistered
    ) {
      registerForPushNotifications();
    }
  }, [
    isInitialized,
    userId,
    playerId,
    permissionStatus,
    isRegistered,
    registerForPushNotifications,
  ]);

  // Set external user ID when user logs in
  useEffect(() => {
    if (userId && isInitialized) {
      setExternalUserId(userId);
    }
  }, [userId, isInitialized, setExternalUserId]);

  // Clear external user ID when user logs out
  useEffect(() => {
    if (!userId && isInitialized) {
      clearExternalUserId();
      setIsRegistered(false);
    }
  }, [userId, isInitialized, clearExternalUserId]);

  return {
    isInitialized,
    playerId,
    permissionStatus,
    isRegistered,
    requestPermission,
    registerForPushNotifications,
    unregisterFromPushNotifications,
    setExternalUserId,
    clearExternalUserId,
    addTags,
    removeTags,
  };
};
