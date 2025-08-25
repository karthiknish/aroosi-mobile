/**
 * Notification Provider
 * Provides notification context and initializes notification system
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { NavigationContainerRef } from '@react-navigation/native';
import { useAuth } from "@contexts/AuthProvider";
// import { useOneSignal } from '../../hooks/useOneSignal'; // Temporarily disabled
import { NotificationHandler } from "@utils/notificationHandler";
import { NotificationPermissionsManager } from "@utils/notificationPermissions";

interface NotificationContextType {
  isInitialized: boolean;
  playerId: string | null;
  permissionStatus: string;
  isRegistered: boolean;
  requestPermission: () => Promise<boolean>;
  registerForPushNotifications: () => Promise<boolean>;
  unregisterFromPushNotifications: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

interface NotificationProviderProps {
  children: React.ReactNode;
  navigationRef: React.RefObject<NavigationContainerRef<any>>;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  navigationRef,
}) => {
  const { isAuthenticated, user } = useAuth();
  const userId = user?.id;

  // Temporary mock for OneSignal until we fix the integration
  const oneSignalData = {
    isInitialized: false,
    playerId: null,
    permissionStatus: "undetermined",
    isRegistered: false,
    requestPermission: async () => false,
    registerForPushNotifications: async () => false,
    unregisterFromPushNotifications: async () => false,
    setExternalUserId: (id: string) => {},
    clearExternalUserId: () => {},
  };

  const initializationRef = useRef(false);

  // Initialize notification system
  useEffect(() => {
    if (!initializationRef.current) {
      initializationRef.current = true;
      initializeNotificationSystem();
    }
  }, []);

  // Set navigation reference for deep linking
  useEffect(() => {
    if (navigationRef.current) {
      NotificationHandler.setNavigationRef(navigationRef.current);
    }
  }, [navigationRef]);

  // Handle user authentication state changes
  useEffect(() => {
    if (isAuthenticated && userId) {
      handleUserSignIn();
    } else {
      handleUserSignOut();
    }
  }, [isAuthenticated, userId]);

  /**
   * Initialize the notification system
   */
  const initializeNotificationSystem = async (): Promise<void> => {
    try {
      // Initialize notification handler
      NotificationHandler.initialize();

      console.log("Notification system initialized");
    } catch (error) {
      console.error("Error initializing notification system:", error);
    }
  };

  /**
   * Handle user sign in
   */
  const handleUserSignIn = async (): Promise<void> => {
    try {
      console.log("User signed in, setting up notifications...");

      // Optional: Show permission rationale if first time
      const permissionStatus =
        await NotificationPermissionsManager.getPermissionStatus();

      if (permissionStatus === "undetermined") {
        // Show rationale and request permission
        const shouldRequest =
          await NotificationPermissionsManager.showPermissionRationale();
        if (shouldRequest) {
          await oneSignalData.requestPermission();
        }
      }

      // Set external user ID for targeting
      if (userId) {
        oneSignalData.setExternalUserId(userId);
      }
    } catch (error) {
      console.error("Error handling user sign in for notifications:", error);
    }
  };

  /**
   * Handle user sign out
   */
  const handleUserSignOut = async (): Promise<void> => {
    try {
      console.log("User signed out, cleaning up notifications...");

      // Clear external user ID
      oneSignalData.clearExternalUserId();

      // Optionally unregister from push notifications
      // await oneSignalData.unregisterFromPushNotifications();

      // Clear notification badge
      await NotificationPermissionsManager.clearBadge();
    } catch (error) {
      console.error("Error handling user sign out for notifications:", error);
    }
  };

  const contextValue: NotificationContextType = {
    isInitialized: oneSignalData.isInitialized,
    playerId: oneSignalData.playerId,
    permissionStatus: oneSignalData.permissionStatus,
    isRegistered: oneSignalData.isRegistered,
    requestPermission: oneSignalData.requestPermission,
    registerForPushNotifications: oneSignalData.registerForPushNotifications,
    unregisterFromPushNotifications:
      oneSignalData.unregisterFromPushNotifications,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

/**
 * Hook to use notification context
 */
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};