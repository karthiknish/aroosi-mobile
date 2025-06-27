/**
 * Notification Handler Utility
 * Handles notification processing, deep linking, and user interactions
 */

import { Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  NotificationType,
  NotificationPayload,
  NotificationNavigationData,
  NotificationReceivedEvent,
  NotificationOpenedEvent,
} from '../types/notifications';
import { NotificationPermissionsManager } from './notificationPermissions';

export class NotificationHandler {
  private static navigationRef: any = null;

  /**
   * Set navigation reference for deep linking
   */
  static setNavigationRef(ref: any): void {
    this.navigationRef = ref;
  }

  /**
   * Initialize notification handling
   */
  static initialize(): void {
    // Configure notification behavior
    NotificationPermissionsManager.configureNotificationBehavior();
    
    // Setup Android channels
    NotificationPermissionsManager.setupAndroidNotificationChannels();
    
    // Add notification event listeners
    this.setupNotificationListeners();
    
    console.log('Notification handler initialized');
  }

  /**
   * Setup notification event listeners for Expo Notifications
   */
  private static setupNotificationListeners(): void {
    // Handle notifications received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received in foreground:', notification);
      this.handleNotificationReceived(notification);
    });

    // Handle notification responses (when user taps notification)
    Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response received:', response);
      this.handleNotificationOpened(response);
    });
  }

  /**
   * Handle notification received in foreground
   */
  private static handleNotificationReceived(notification: Notifications.Notification): void {
    try {
      const { title, body, data } = notification.request.content;
      const notificationType = data?.type as NotificationType;

      console.log('Processing foreground notification:', {
        type: notificationType,
        title,
        body,
        data,
      });

      // Update badge count based on notification type
      this.updateBadgeCount(notificationType);

    } catch (error) {
      console.error('Error handling notification received:', error);
    }
  }

  /**
   * Handle notification opened/clicked
   */
  private static handleNotificationOpened(response: Notifications.NotificationResponse): void {
    try {
      const { notification } = response;
      const { title, body, data } = notification.request.content;
      const notificationType = data?.type as NotificationType;
      const navigationData = data?.navigationData as NotificationNavigationData;

      console.log('Processing notification tap:', {
        type: notificationType,
        title,
        body,
        navigationData,
      });

      // Handle deep linking
      if (navigationData?.screen) {
        this.handleDeepLinking(navigationData, notificationType);
      }

      // Clear specific notification badge
      this.handleNotificationClearance(notificationType);

    } catch (error) {
      console.error('Error handling notification opened:', error);
    }
  }

  /**
   * Handle deep linking from notifications
   */
  private static handleDeepLinking(
    navigationData: NotificationNavigationData,
    notificationType: NotificationType
  ): void {
    try {
      if (!this.navigationRef) {
        console.warn('Navigation ref not set, cannot handle deep linking');
        return;
      }

      const { screen, params } = navigationData;

      // Route to appropriate screen based on notification type
      switch (notificationType) {
        case 'new_message':
          this.navigateToChat(params);
          break;
        
        case 'new_interest':
        case 'new_match':
          this.navigateToMatches(params);
          break;
        
        case 'profile_view':
          this.navigateToProfileViewers(params);
          break;
        
        case 'subscription_update':
          this.navigateToSubscription(params);
          break;
        
        case 'system_notification':
          this.navigateToSettings(params);
          break;
        
        default:
          // Fallback navigation
          this.navigationRef.navigate(screen, params);
      }

      console.log('Deep link navigation completed:', { screen, params, type: notificationType });

    } catch (error) {
      console.error('Error handling deep linking:', error);
    }
  }

  /**
   * Navigate to chat screen
   */
  private static navigateToChat(params: any): void {
    if (params?.conversationId) {
      this.navigationRef.navigate('Chat', {
        screen: 'ConversationScreen',
        params: { conversationId: params.conversationId },
      });
    } else {
      this.navigationRef.navigate('Chat');
    }
  }

  /**
   * Navigate to matches screen
   */
  private static navigateToMatches(params: any): void {
    this.navigationRef.navigate('Matches', params);
  }

  /**
   * Navigate to profile viewers (Premium Plus feature)
   */
  private static navigateToProfileViewers(params: any): void {
    this.navigationRef.navigate('Profile', {
      screen: 'ProfileViewersScreen',
      params,
    });
  }

  /**
   * Navigate to subscription screen
   */
  private static navigateToSubscription(params: any): void {
    this.navigationRef.navigate('Subscription', params);
  }

  /**
   * Navigate to settings screen
   */
  private static navigateToSettings(params: any): void {
    this.navigationRef.navigate('Settings', params);
  }

  /**
   * Update badge count based on notification type
   */
  private static async updateBadgeCount(notificationType: NotificationType): Promise<void> {
    try {
      const currentCount = await NotificationPermissionsManager.getBadgeCount();
      let increment = 0;

      // Only increment for user-actionable notifications
      switch (notificationType) {
        case 'new_message':
        case 'new_interest':
        case 'new_match':
          increment = 1;
          break;
        default:
          // Don't increment for system notifications
          break;
      }

      if (increment > 0) {
        await NotificationPermissionsManager.setBadgeCount(currentCount + increment);
      }

    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }

  /**
   * Handle notification clearance (reduce badge count)
   */
  private static async handleNotificationClearance(notificationType: NotificationType): Promise<void> {
    try {
      // Clear badge for actionable notifications when user opens them
      switch (notificationType) {
        case 'new_message':
        case 'new_interest':
        case 'new_match':
          const currentCount = await NotificationPermissionsManager.getBadgeCount();
          if (currentCount > 0) {
            await NotificationPermissionsManager.setBadgeCount(Math.max(0, currentCount - 1));
          }
          break;
        default:
          // Don't modify badge for other types
          break;
      }

    } catch (error) {
      console.error('Error handling notification clearance:', error);
    }
  }

  /**
   * Generate notification content based on type
   */
  static generateNotificationContent(
    type: NotificationType,
    data: Record<string, any>
  ): Partial<NotificationPayload> {
    switch (type) {
      case 'new_message':
        return {
          title: 'New Message',
          body: `${data.senderName || 'Someone'} sent you a message`,
        };

      case 'new_interest':
        return {
          title: 'New Interest',
          body: `${data.senderName || 'Someone'} is interested in you!`,
        };

      case 'new_match':
        return {
          title: 'It\'s a Match! 💕',
          body: `You and ${data.matchName || 'someone'} liked each other`,
        };

      case 'profile_view':
        return {
          title: 'Profile View',
          body: `${data.viewerName || 'Someone'} viewed your profile`,
        };

      case 'subscription_update':
        return {
          title: 'Subscription Update',
          body: data.message || 'Your subscription has been updated',
        };

      case 'system_notification':
        return {
          title: 'Aroosi',
          body: data.message || 'You have a new notification',
        };

      default:
        return {
          title: 'Aroosi',
          body: 'You have a new notification',
        };
    }
  }

  /**
   * Create local notification for testing
   */
  static async createTestNotification(type: NotificationType): Promise<void> {
    try {
      const content = this.generateNotificationContent(type, {
        senderName: 'Test User',
        matchName: 'Test Match',
        viewerName: 'Test Viewer',
        message: 'This is a test notification',
      });

      await Notifications.scheduleNotificationAsync({
        content: {
          title: content.title || 'Test Notification',
          body: content.body || 'This is a test notification',
          data: {
            type,
            navigationData: {
              screen: 'Matches',
              params: { test: true },
            },
          },
        },
        trigger: null, // Show immediately
      });

      console.log('Test notification scheduled:', type);

    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  }

  /**
   * Clear all notifications
   */
  static async clearAllNotifications(): Promise<void> {
    try {
      await NotificationPermissionsManager.dismissAllNotifications();
      await NotificationPermissionsManager.clearBadge();
      console.log('All notifications cleared');
    } catch (error) {
      console.error('Error clearing all notifications:', error);
    }
  }
}