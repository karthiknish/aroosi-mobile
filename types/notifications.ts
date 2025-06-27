/**
 * Push Notification Types for Aroosi Mobile App
 * Based on web app OneSignal integration
 */

// OneSignal Device Types
export type DeviceType = 'ios' | 'android' | 'unknown';

// Push Registration Data
export interface PushRegistration {
  userId: string;
  playerId: string;           // OneSignal player ID
  deviceType: DeviceType;
  deviceToken?: string;       // Native push token
  registeredAt: number;
  isActive: boolean;
}

// Notification Types (matching web app)
export type NotificationType = 
  | 'new_message'
  | 'new_interest' 
  | 'new_match'
  | 'profile_view'           // Premium Plus feature
  | 'subscription_update'
  | 'system_notification';

// Notification Payload Structure
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  imageUrl?: string;
  actionButtons?: NotificationAction[];
}

// Notification Actions
export interface NotificationAction {
  id: string;
  title: string;
  icon?: string;
}

// Notification Preferences
export interface NotificationPreferences {
  newMessages: boolean;
  newInterests: boolean;
  newMatches: boolean;
  profileViews: boolean;      // Premium Plus
  subscriptionUpdates: boolean;
  systemNotifications: boolean;
  doNotDisturbStart?: string; // HH:MM format
  doNotDisturbEnd?: string;   // HH:MM format
  sound: boolean;
  vibration: boolean;
}

// Default notification preferences
export const defaultNotificationPreferences: NotificationPreferences = {
  newMessages: true,
  newInterests: true,
  newMatches: true,
  profileViews: true,
  subscriptionUpdates: true,
  systemNotifications: true,
  sound: true,
  vibration: true,
};

// Notification Permission Status
export type NotificationPermissionStatus = 
  | 'granted'
  | 'denied' 
  | 'undetermined'
  | 'provisional';

// OneSignal Player Data
export interface OneSignalPlayerData {
  playerId: string;
  pushToken?: string;
  userId?: string;
  emailAddress?: string;
  phoneNumber?: string;
  tags?: Record<string, string>;
  external_user_id?: string;
}

// Push Notification Event Types
export interface NotificationReceivedEvent {
  notification: {
    notificationId: string;
    title?: string;
    body?: string;
    additionalData: Record<string, any>;
  };
}

export interface NotificationOpenedEvent {
  notification: {
    notificationId: string;
    title?: string;
    body?: string;
    additionalData: Record<string, any>;
  };
  action: {
    type: 'opened' | 'actionTaken';
    actionId?: string;
  };
}

// Deep Link Navigation Data
export interface NotificationNavigationData {
  screen: string;
  params?: Record<string, any>;
}

// API Response Types
export interface PushRegistrationResponse {
  success: boolean;
  message: string;
  registrationId?: string;
}

export interface NotificationStatusResponse {
  success: boolean;
  preferences: NotificationPreferences;
}