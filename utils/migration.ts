import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { apiClient } from "./api";
import { logger } from "./logger";

export interface MigrationResult {
  success: boolean;
  version: string;
  migratedData?: string[];
  errors?: string[];
  rollbackAvailable?: boolean;
}

export interface UserMigrationData {
  userId: string;
  email: string;
  profile?: any;
  preferences?: any;
  cachedData?: any;
}

const CURRENT_VERSION = "2.0.0";
const VERSION_KEY = "app_version";
const MIGRATION_BACKUP_KEY = "migration_backup";

export class MigrationManager {
  private static instance: MigrationManager;

  private constructor() {}

  public static getInstance(): MigrationManager {
    if (!MigrationManager.instance) {
      MigrationManager.instance = new MigrationManager();
    }
    return MigrationManager.instance;
  }

  public async checkMigrationNeeded(): Promise<boolean> {
    try {
      const storedVersion = await AsyncStorage.getItem(VERSION_KEY);

      if (!storedVersion) {
        // First time installation
        await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
        return false;
      }

      return this.compareVersions(storedVersion, CURRENT_VERSION) < 0;
    } catch (error) {
      logger.error("Failed to check migration status", error);
      return false;
    }
  }

  public async performMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      version: CURRENT_VERSION,
      migratedData: [],
      errors: [],
      rollbackAvailable: false,
    };

    try {
      const storedVersion = await AsyncStorage.getItem(VERSION_KEY);
      logger.info("Starting migration", {
        from: storedVersion,
        to: CURRENT_VERSION,
      });

      // Create backup before migration
      await this.createMigrationBackup();
      result.rollbackAvailable = true;

      // Perform version-specific migrations
      if (!storedVersion || this.compareVersions(storedVersion, "1.0.0") < 0) {
        await this.migrateToV1(result);
      }

      if (this.compareVersions(storedVersion || "0.0.0", "2.0.0") < 0) {
        await this.migrateToV2(result);
      }

      // Update version
      await AsyncStorage.setItem(VERSION_KEY, CURRENT_VERSION);
      result.success = true;

      logger.info("Migration completed successfully", result);
      return result;
    } catch (error) {
      logger.error("Migration failed", error);
      result.errors?.push(
        error instanceof Error ? error.message : "Unknown error"
      );

      // Attempt rollback
      try {
        await this.rollbackMigration();
        result.errors?.push("Rollback completed");
      } catch (rollbackError) {
        result.errors?.push("Rollback failed");
      }

      return result;
    }
  }

  // Migration to v1.0.0 - Initial Clerk to JWT migration
  private async migrateToV1(result: MigrationResult): Promise<void> {
    logger.info("Migrating to v1.0.0 - Clerk to JWT migration");

    try {
      // Check for old Clerk authentication data
      const clerkData = await this.getClerkAuthData();

      if (clerkData) {
        // Migrate user session
        await this.migrateClerkToJWT(clerkData);
        result.migratedData?.push("clerk_authentication");

        // Clean up old Clerk data
        await this.cleanupClerkData();
        result.migratedData?.push("clerk_cleanup");
      }

      // Migrate old profile data structure
      await this.migrateProfileData();
      result.migratedData?.push("profile_data");

      // Migrate cached data
      await this.migrateCachedData();
      result.migratedData?.push("cached_data");
    } catch (error) {
      logger.error("v1.0.0 migration failed", error);
      throw error;
    }
  }

  // Migration to v2.0.0 - Full alignment with web app
  private async migrateToV2(result: MigrationResult): Promise<void> {
    logger.info("Migrating to v2.0.0 - Web app alignment");

    try {
      // Remove biometric authentication data
      await this.removeBiometricAuth();
      result.migratedData?.push("biometric_removal");

      // Update interest system data
      await this.migrateInterestSystem();
      result.migratedData?.push("interest_system");

      // Update message data structure
      await this.migrateMessageData();
      result.migratedData?.push("message_data");

      // Update subscription data
      await this.migrateSubscriptionData();
      result.migratedData?.push("subscription_data");

      // Update notification preferences
      await this.migrateNotificationPreferences();
      result.migratedData?.push("notification_preferences");

      // Update cache structure
      await this.migrateCacheStructure();
      result.migratedData?.push("cache_structure");
    } catch (error) {
      logger.error("v2.0.0 migration failed", error);
      throw error;
    }
  }

  // Remove biometric authentication as requested
  private async removeBiometricAuth(): Promise<void> {
    try {
      // Remove biometric settings
      await AsyncStorage.removeItem("biometric_enabled");
      await AsyncStorage.removeItem("biometric_type");
      await SecureStore.deleteItemAsync("biometric_key");

      // Update user preferences to remove biometric options
      const preferences = await AsyncStorage.getItem("user_preferences");
      if (preferences) {
        const parsed = JSON.parse(preferences);
        delete parsed.biometricAuth;
        delete parsed.biometricEnabled;
        await AsyncStorage.setItem("user_preferences", JSON.stringify(parsed));
      }

      logger.info("Biometric authentication data removed");
    } catch (error) {
      logger.error("Failed to remove biometric auth data", error);
      throw error;
    }
  }

  private async getClerkAuthData(): Promise<any> {
    try {
      // Check for old Clerk session data
      const clerkSession = await AsyncStorage.getItem("clerk_session");
      const clerkUser = await AsyncStorage.getItem("clerk_user");

      if (clerkSession || clerkUser) {
        return {
          session: clerkSession ? JSON.parse(clerkSession) : null,
          user: clerkUser ? JSON.parse(clerkUser) : null,
        };
      }

      return null;
    } catch (error) {
      logger.error("Failed to get Clerk auth data", error);
      return null;
    }
  }

  private async migrateClerkToJWT(clerkData: any): Promise<void> {
    try {
      if (!clerkData.user?.emailAddress) {
        throw new Error("No valid Clerk user data found");
      }

      // Attempt to authenticate with the backend using Clerk data
      const migrationResponse = await apiClient.request("/auth/migrate-clerk", {
        method: "POST",
        body: JSON.stringify({
          clerkUserId: clerkData.user.id,
          email: clerkData.user.emailAddress,
          sessionToken: clerkData.session?.id,
        }),
      });

      if (migrationResponse.success && migrationResponse.data?.tokens) {
        // Store new JWT tokens
        await SecureStore.setItemAsync(
          "access_token",
          migrationResponse.data.tokens.accessToken
        );
        await SecureStore.setItemAsync(
          "refresh_token",
          migrationResponse.data.tokens.refreshToken
        );
        await AsyncStorage.setItem(
          "token_expires_at",
          migrationResponse.data.tokens.expiresAt.toString()
        );

        // Store user data
        await AsyncStorage.setItem(
          "user_data",
          JSON.stringify(migrationResponse.data.user)
        );

        logger.info("Successfully migrated Clerk authentication to JWT");
      } else {
        throw new Error("Failed to migrate authentication");
      }
    } catch (error) {
      logger.error("Clerk to JWT migration failed", error);
      throw error;
    }
  }

  private async cleanupClerkData(): Promise<void> {
    const clerkKeys = [
      "clerk_session",
      "clerk_user",
      "clerk_token",
      "clerk_refresh_token",
      "__clerk_client_jwt",
      "__clerk_db_jwt",
    ];

    for (const key of clerkKeys) {
      try {
        await AsyncStorage.removeItem(key);
        await SecureStore.deleteItemAsync(key);
      } catch (error) {
        // Ignore errors for keys that don't exist
      }
    }

    logger.info("Clerk data cleanup completed");
  }

  private async migrateProfileData(): Promise<void> {
    try {
      const profileData = await AsyncStorage.getItem("user_profile");
      if (!profileData) return;

      const profile = JSON.parse(profileData);

      // Update profile structure to match new schema
      const migratedProfile = {
        ...profile,
        // Rename old fields
        ukCity: undefined, // Remove deprecated field
        city: profile.city || profile.ukCity,

        // Add new required fields with defaults
        profileFor: profile.profileFor || "self",
        isOnboardingComplete:
          profile.isOnboardingComplete ?? profile.isProfileComplete,

        // Update image structure
        profileImageUrls: profile.profileImageUrls || profile.images || [],
        profileImageIds: profile.profileImageIds || [],

        // Ensure numeric fields are numbers
        partnerPreferenceAgeMin: Number(profile.partnerPreferenceAgeMin) || 18,
        partnerPreferenceAgeMax: Number(profile.partnerPreferenceAgeMax) || 65,
        annualIncome: Number(profile.annualIncome) || 0,
      };

      await AsyncStorage.setItem(
        "user_profile",
        JSON.stringify(migratedProfile)
      );
      logger.info("Profile data migration completed");
    } catch (error) {
      logger.error("Profile data migration failed", error);
      throw error;
    }
  }

  private async migrateCachedData(): Promise<void> {
    try {
      // Migrate old cache keys to new structure
      const oldCacheKeys = await AsyncStorage.getAllKeys();
      const cacheKeysToMigrate = oldCacheKeys.filter(
        (key) => key.startsWith("cache_") || key.startsWith("offline_")
      );

      for (const oldKey of cacheKeysToMigrate) {
        const data = await AsyncStorage.getItem(oldKey);
        if (data) {
          const newKey = `offline_cache_${oldKey.replace(
            /^(cache_|offline_)/,
            ""
          )}`;
          await AsyncStorage.setItem(newKey, data);
          await AsyncStorage.removeItem(oldKey);
        }
      }

      logger.info("Cached data migration completed");
    } catch (error) {
      logger.error("Cached data migration failed", error);
      throw error;
    }
  }

  private async migrateInterestSystem(): Promise<void> {
    try {
      // Remove old manual interest response data
      await AsyncStorage.removeItem("pending_interests");
      await AsyncStorage.removeItem("interest_responses");

      // Update interest data structure to match auto-matching system
      const interestsData = await AsyncStorage.getItem("user_interests");
      if (interestsData) {
        const interests = JSON.parse(interestsData);
        const migratedInterests = interests.map((interest: any) => ({
          ...interest,
          // Remove manual response fields
          canRespond: undefined,
          responseDeadline: undefined,
          // Ensure status is compatible with auto-matching
          status: interest.status === "pending" ? "pending" : interest.status,
        }));

        await AsyncStorage.setItem(
          "user_interests",
          JSON.stringify(migratedInterests)
        );
      }

      logger.info("Interest system migration completed");
    } catch (error) {
      logger.error("Interest system migration failed", error);
      throw error;
    }
  }

  private async migrateMessageData(): Promise<void> {
    try {
      const messagesData = await AsyncStorage.getItem("cached_messages");
      if (messagesData) {
        const messages = JSON.parse(messagesData);
        const migratedMessages = messages.map((message: any) => ({
          ...message,
          // Add new message fields
          deliveredAt: message.deliveredAt || message.createdAt,
          status: message.status || "sent",
          // Update voice message structure
          audioStorageId: message.audioStorageId || message.audioId,
          // Update image message structure
          imageStorageId: message.imageStorageId || message.imageId,
        }));

        await AsyncStorage.setItem(
          "cached_messages",
          JSON.stringify(migratedMessages)
        );
      }

      logger.info("Message data migration completed");
    } catch (error) {
      logger.error("Message data migration failed", error);
      throw error;
    }
  }

  private async migrateSubscriptionData(): Promise<void> {
    try {
      const subscriptionData = await AsyncStorage.getItem(
        "subscription_status"
      );
      if (subscriptionData) {
        const subscription = JSON.parse(subscriptionData);
        const migratedSubscription = {
          ...subscription,
          // Update plan names to match new system
          plan: subscription.tier || subscription.plan || "free",
          // Add new subscription fields
          features: subscription.features || {},
          paymentProvider: subscription.paymentProvider || "stripe",
        };

        await AsyncStorage.setItem(
          "subscription_status",
          JSON.stringify(migratedSubscription)
        );
      }

      logger.info("Subscription data migration completed");
    } catch (error) {
      logger.error("Subscription data migration failed", error);
      throw error;
    }
  }

  private async migrateNotificationPreferences(): Promise<void> {
    try {
      const notificationPrefs = await AsyncStorage.getItem(
        "notification_preferences"
      );
      if (notificationPrefs) {
        const prefs = JSON.parse(notificationPrefs);
        const migratedPrefs = {
          ...prefs,
          // Remove biometric-related notification settings
          biometricReminder: undefined,
          // Ensure all required preferences exist
          messages: prefs.messages ?? true,
          matches: prefs.matches ?? true,
          interests: prefs.interests ?? true,
          system: prefs.system ?? true,
          marketing: prefs.marketing ?? false,
        };

        await AsyncStorage.setItem(
          "notification_preferences",
          JSON.stringify(migratedPrefs)
        );
      }

      logger.info("Notification preferences migration completed");
    } catch (error) {
      logger.error("Notification preferences migration failed", error);
      throw error;
    }
  }

  private async migrateCacheStructure(): Promise<void> {
    try {
      // Update cache structure to new format
      const cacheIndex = await AsyncStorage.getItem("cache_index");
      if (cacheIndex) {
        const index = JSON.parse(cacheIndex);
        const migratedIndex = Object.entries(index).reduce(
          (acc: any, [key, value]: [string, any]) => {
            acc[`offline_cache_${key}`] = {
              ...value,
              version: "2.0.0",
              timestamp: value.timestamp || Date.now(),
            };
            return acc;
          },
          {}
        );

        await AsyncStorage.setItem(
          "offline_cache_index",
          JSON.stringify(migratedIndex)
        );
        await AsyncStorage.removeItem("cache_index");
      }

      logger.info("Cache structure migration completed");
    } catch (error) {
      logger.error("Cache structure migration failed", error);
      throw error;
    }
  }

  private async createMigrationBackup(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allData: Record<string, string> = {};

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          allData[key] = value;
        }
      }

      // Store backup
      await AsyncStorage.setItem(
        MIGRATION_BACKUP_KEY,
        JSON.stringify({
          timestamp: Date.now(),
          version: await AsyncStorage.getItem(VERSION_KEY),
          data: allData,
        })
      );

      logger.info("Migration backup created");
    } catch (error) {
      logger.error("Failed to create migration backup", error);
      throw error;
    }
  }

  private async rollbackMigration(): Promise<void> {
    try {
      const backupData = await AsyncStorage.getItem(MIGRATION_BACKUP_KEY);
      if (!backupData) {
        throw new Error("No backup data available for rollback");
      }

      const backup = JSON.parse(backupData);

      // Clear current data
      await AsyncStorage.clear();

      // Restore backup data
      for (const [key, value] of Object.entries(backup.data)) {
        await AsyncStorage.setItem(key, value as string);
      }

      logger.info("Migration rollback completed");
    } catch (error) {
      logger.error("Migration rollback failed", error);
      throw error;
    }
  }

  public async cleanupMigrationData(): Promise<void> {
    try {
      await AsyncStorage.removeItem(MIGRATION_BACKUP_KEY);
      logger.info("Migration cleanup completed");
    } catch (error) {
      logger.error("Migration cleanup failed", error);
    }
  }

  private compareVersions(version1: string, version2: string): number {
    const v1Parts = version1.split(".").map(Number);
    const v2Parts = version2.split(".").map(Number);

    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
      const v1Part = v1Parts[i] || 0;
      const v2Part = v2Parts[i] || 0;

      if (v1Part < v2Part) return -1;
      if (v1Part > v2Part) return 1;
    }

    return 0;
  }

  // Feature flag management for gradual rollout
  public async enableFeatureFlag(flag: string, userId?: string): Promise<void> {
    try {
      const flags = await this.getFeatureFlags();
      flags[flag] = true;

      await AsyncStorage.setItem("feature_flags", JSON.stringify(flags));

      if (userId) {
        logger.info("Feature flag enabled", { flag, userId });
      }
    } catch (error) {
      logger.error("Failed to enable feature flag", { flag, error });
    }
  }

  public async isFeatureFlagEnabled(flag: string): Promise<boolean> {
    try {
      const flags = await this.getFeatureFlags();
      return flags[flag] === true;
    } catch (error) {
      logger.error("Failed to check feature flag", { flag, error });
      return false;
    }
  }

  private async getFeatureFlags(): Promise<Record<string, boolean>> {
    try {
      const flags = await AsyncStorage.getItem("feature_flags");
      return flags ? JSON.parse(flags) : {};
    } catch (error) {
      return {};
    }
  }
}

// Convenience functions
export const migrationManager = MigrationManager.getInstance();

export async function checkAndPerformMigration(): Promise<MigrationResult | null> {
  const needsMigration = await migrationManager.checkMigrationNeeded();

  if (needsMigration) {
    return await migrationManager.performMigration();
  }

  return null;
}
