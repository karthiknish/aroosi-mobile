import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { ApiClient } from "./api";

export interface MigrationResult {
  success: boolean;
  migratedItems: number;
  errors: string[];
  backupCreated: boolean;
}

export interface MigrationStep {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  rollback?: () => Promise<boolean>;
}

export class MigrationManager {
  private apiClient: ApiClient;
  private migrationSteps: MigrationStep[] = [];

  constructor() {
    this.apiClient = new ApiClient();
    this.initializeMigrationSteps();
  }

  private initializeMigrationSteps(): void {
    this.migrationSteps = [
      {
        id: "auth_system_migration",
        name: "Authentication System Migration",
        description: "Migrate from Clerk to custom JWT authentication",
        execute: this.migrateAuthSystem.bind(this),
        rollback: this.rollbackAuthSystem.bind(this),
      },
      {
        id: "api_endpoints_migration",
        name: "API Endpoints Migration",
        description: "Update API endpoints to match web application",
        execute: this.migrateApiEndpoints.bind(this),
        rollback: this.rollbackApiEndpoints.bind(this),
      },
      {
        id: "data_model_migration",
        name: "Data Model Migration",
        description: "Update data models to match web application schema",
        execute: this.migrateDataModels.bind(this),
        rollback: this.rollbackDataModels.bind(this),
      },
      {
        id: "storage_migration",
        name: "Storage Migration",
        description: "Migrate storage keys and encryption",
        execute: this.migrateStorage.bind(this),
        rollback: this.rollbackStorage.bind(this),
      },
      {
        id: "feature_flags_migration",
        name: "Feature Flags Migration",
        description: "Set up feature flags for gradual rollout",
        execute: this.migrateFeatureFlags.bind(this),
        rollback: this.rollbackFeatureFlags.bind(this),
      },
    ];
  }

  async runMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      backupCreated: false,
    };

    try {
      // Create backup before migration
      result.backupCreated = await this.createBackup();

      // Execute migration steps
      for (const step of this.migrationSteps) {
        try {
          console.log(`Executing migration step: ${step.name}`);
          const stepSuccess = await step.execute();

          if (stepSuccess) {
            result.migratedItems++;
            await this.recordMigrationStep(step.id, "completed");
          } else {
            throw new Error(`Migration step ${step.name} failed`);
          }
        } catch (error) {
          const errorMessage = `Failed to execute ${step.name}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`;
          result.errors.push(errorMessage);
          result.success = false;

          // Attempt rollback
          if (step.rollback) {
            try {
              await step.rollback();
              await this.recordMigrationStep(step.id, "rolled_back");
            } catch (rollbackError) {
              result.errors.push(
                `Rollback failed for ${step.name}: ${
                  rollbackError instanceof Error
                    ? rollbackError.message
                    : "Unknown error"
                }`
              );
            }
          }

          break; // Stop migration on first failure
        }
      }

      // Verify migration success
      if (result.success) {
        const verificationResult = await this.verifyMigration();
        if (!verificationResult.success) {
          result.success = false;
          result.errors.push(...verificationResult.errors);
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Migration failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Record migration result
    await this.recordMigrationResult(result);

    return result;
  }

  private async createBackup(): Promise<boolean> {
    try {
      const backupData = {
        timestamp: Date.now(),
        version: "1.0.0",
        data: {
          asyncStorage: await this.backupAsyncStorage(),
          secureStore: await this.backupSecureStore(),
          userPreferences: await this.backupUserPreferences(),
        },
      };

      await AsyncStorage.setItem(
        "migration_backup",
        JSON.stringify(backupData)
      );
      return true;
    } catch (error) {
      console.error("Failed to create backup:", error);
      return false;
    }
  }

  private async backupAsyncStorage(): Promise<Record<string, string>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const backup: Record<string, string> = {};

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        if (value !== null) {
          backup[key] = value;
        }
      }

      return backup;
    } catch (error) {
      console.error("Failed to backup AsyncStorage:", error);
      return {};
    }
  }

  private async backupSecureStore(): Promise<Record<string, string>> {
    try {
      const secureKeys = ["auth_token", "refresh_token", "user_credentials"];
      const backup: Record<string, string> = {};

      for (const key of secureKeys) {
        try {
          const value = await SecureStore.getItemAsync(key);
          if (value !== null) {
            backup[key] = value;
          }
        } catch (error) {
          // Key might not exist, continue
        }
      }

      return backup;
    } catch (error) {
      console.error("Failed to backup SecureStore:", error);
      return {};
    }
  }

  private async backupUserPreferences(): Promise<Record<string, any>> {
    try {
      const preferences = await AsyncStorage.getItem("user_preferences");
      return preferences ? JSON.parse(preferences) : {};
    } catch (error) {
      console.error("Failed to backup user preferences:", error);
      return {};
    }
  }

  private async migrateAuthSystem(): Promise<boolean> {
    try {
      // Check if Clerk token exists
      const clerkToken = await AsyncStorage.getItem("clerk_token");

      if (clerkToken) {
        // Exchange Clerk token for custom JWT
        const exchangeResult = await this.apiClient.exchangeClerkToken(
          clerkToken
        );

        if (exchangeResult.success && exchangeResult.token) {
          // Store new JWT token
          await SecureStore.setItemAsync("auth_token", exchangeResult.token);

          if (exchangeResult.refreshToken) {
            await SecureStore.setItemAsync(
              "refresh_token",
              exchangeResult.refreshToken
            );
          }

          // Remove old Clerk data
          await AsyncStorage.removeItem("clerk_token");
          await AsyncStorage.removeItem("clerk_user");

          return true;
        }
      }

      // No Clerk token found, migration not needed
      return true;
    } catch (error) {
      console.error("Auth system migration failed:", error);
      return false;
    }
  }

  private async rollbackAuthSystem(): Promise<boolean> {
    try {
      // Restore from backup if needed
      const backup = await AsyncStorage.getItem("migration_backup");
      if (backup) {
        const backupData = JSON.parse(backup);
        const clerkToken = backupData.data.asyncStorage.clerk_token;

        if (clerkToken) {
          await AsyncStorage.setItem("clerk_token", clerkToken);
        }
      }

      // Remove new JWT tokens
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("refresh_token");

      return true;
    } catch (error) {
      console.error("Auth system rollback failed:", error);
      return false;
    }
  }

  private async migrateApiEndpoints(): Promise<boolean> {
    try {
      // Update API base URL
      const newApiConfig = {
        baseUrl: "https://www.aroosi.app/api",
        version: "v1",
        timeout: 30000,
      };

      await AsyncStorage.setItem("api_config", JSON.stringify(newApiConfig));

      // Update endpoint mappings
      const endpointMappings = {
        profile: "/profile",
        search: "/search",
        interests: "/interests",
        matches: "/matches",
        messages: "/messages",
        subscription: "/subscription",
      };

      await AsyncStorage.setItem(
        "endpoint_mappings",
        JSON.stringify(endpointMappings)
      );

      return true;
    } catch (error) {
      console.error("API endpoints migration failed:", error);
      return false;
    }
  }

  private async rollbackApiEndpoints(): Promise<boolean> {
    try {
      // Restore old API configuration
      await AsyncStorage.removeItem("api_config");
      await AsyncStorage.removeItem("endpoint_mappings");

      return true;
    } catch (error) {
      console.error("API endpoints rollback failed:", error);
      return false;
    }
  }

  private async migrateDataModels(): Promise<boolean> {
    try {
      // Update cached profile data to new schema
      const cachedProfile = await AsyncStorage.getItem("cached_profile");

      if (cachedProfile) {
        const oldProfile = JSON.parse(cachedProfile);
        const newProfile = this.transformProfileToNewSchema(oldProfile);
        await AsyncStorage.setItem(
          "cached_profile",
          JSON.stringify(newProfile)
        );
      }

      // Update cached interests data
      const cachedInterests = await AsyncStorage.getItem("cached_interests");

      if (cachedInterests) {
        const oldInterests = JSON.parse(cachedInterests);
        const newInterests = oldInterests.map((interest: any) =>
          this.transformInterestToNewSchema(interest)
        );
        await AsyncStorage.setItem(
          "cached_interests",
          JSON.stringify(newInterests)
        );
      }

      // Update cached messages data
      const cachedMessages = await AsyncStorage.getItem("cached_messages");

      if (cachedMessages) {
        const oldMessages = JSON.parse(cachedMessages);
        const newMessages = oldMessages.map((message: any) =>
          this.transformMessageToNewSchema(message)
        );
        await AsyncStorage.setItem(
          "cached_messages",
          JSON.stringify(newMessages)
        );
      }

      return true;
    } catch (error) {
      console.error("Data models migration failed:", error);
      return false;
    }
  }

  private async rollbackDataModels(): Promise<boolean> {
    try {
      // Restore from backup
      const backup = await AsyncStorage.getItem("migration_backup");
      if (backup) {
        const backupData = JSON.parse(backup);

        if (backupData.data.asyncStorage.cached_profile) {
          await AsyncStorage.setItem(
            "cached_profile",
            backupData.data.asyncStorage.cached_profile
          );
        }

        if (backupData.data.asyncStorage.cached_interests) {
          await AsyncStorage.setItem(
            "cached_interests",
            backupData.data.asyncStorage.cached_interests
          );
        }

        if (backupData.data.asyncStorage.cached_messages) {
          await AsyncStorage.setItem(
            "cached_messages",
            backupData.data.asyncStorage.cached_messages
          );
        }
      }

      return true;
    } catch (error) {
      console.error("Data models rollback failed:", error);
      return false;
    }
  }

  private async migrateStorage(): Promise<boolean> {
    try {
      // Migrate storage keys to new naming convention
      const keyMappings = {
        user_token: "auth_token",
        user_data: "cached_profile",
        app_settings: "user_preferences",
      };

      for (const [oldKey, newKey] of Object.entries(keyMappings)) {
        const value = await AsyncStorage.getItem(oldKey);
        if (value !== null) {
          await AsyncStorage.setItem(newKey, value);
          await AsyncStorage.removeItem(oldKey);
        }
      }

      // Update encryption keys
      const encryptionConfig = {
        algorithm: "AES-256-GCM",
        keyDerivation: "PBKDF2",
        iterations: 100000,
      };

      await AsyncStorage.setItem(
        "encryption_config",
        JSON.stringify(encryptionConfig)
      );

      return true;
    } catch (error) {
      console.error("Storage migration failed:", error);
      return false;
    }
  }

  private async rollbackStorage(): Promise<boolean> {
    try {
      // Restore old key names
      const keyMappings = {
        auth_token: "user_token",
        cached_profile: "user_data",
        user_preferences: "app_settings",
      };

      for (const [newKey, oldKey] of Object.entries(keyMappings)) {
        const value = await AsyncStorage.getItem(newKey);
        if (value !== null) {
          await AsyncStorage.setItem(oldKey, value);
          await AsyncStorage.removeItem(newKey);
        }
      }

      await AsyncStorage.removeItem("encryption_config");

      return true;
    } catch (error) {
      console.error("Storage rollback failed:", error);
      return false;
    }
  }

  private async migrateFeatureFlags(): Promise<boolean> {
    try {
      const featureFlags = {
        new_auth_system: true,
        unified_api: true,
        auto_matching: true,
        real_time_messaging: true,
        premium_features: true,
        migration_complete: false,
      };

      await AsyncStorage.setItem("feature_flags", JSON.stringify(featureFlags));

      return true;
    } catch (error) {
      console.error("Feature flags migration failed:", error);
      return false;
    }
  }

  private async rollbackFeatureFlags(): Promise<boolean> {
    try {
      const rollbackFlags = {
        new_auth_system: false,
        unified_api: false,
        auto_matching: false,
        real_time_messaging: false,
        premium_features: false,
        migration_complete: false,
      };

      await AsyncStorage.setItem(
        "feature_flags",
        JSON.stringify(rollbackFlags)
      );

      return true;
    } catch (error) {
      console.error("Feature flags rollback failed:", error);
      return false;
    }
  }

  private transformProfileToNewSchema(oldProfile: any): any {
    return {
      id: oldProfile.id || oldProfile._id,
      userId: oldProfile.userId || oldProfile.user_id,
      fullName: oldProfile.fullName || oldProfile.full_name,
      email: oldProfile.email,
      dateOfBirth: oldProfile.dateOfBirth || oldProfile.date_of_birth,
      gender: oldProfile.gender,
      profileFor: oldProfile.profileFor || oldProfile.profile_for,
      phoneNumber: oldProfile.phoneNumber || oldProfile.phone_number,
      country: oldProfile.country,
      city: oldProfile.city,
      height: oldProfile.height,
      maritalStatus: oldProfile.maritalStatus || oldProfile.marital_status,
      physicalStatus: oldProfile.physicalStatus || oldProfile.physical_status,
      motherTongue: oldProfile.motherTongue || oldProfile.mother_tongue,
      religion: oldProfile.religion,
      ethnicity: oldProfile.ethnicity,
      diet: oldProfile.diet,
      smoking: oldProfile.smoking,
      drinking: oldProfile.drinking,
      education: oldProfile.education,
      occupation: oldProfile.occupation,
      annualIncome: oldProfile.annualIncome || oldProfile.annual_income,
      aboutMe: oldProfile.aboutMe || oldProfile.about_me,
      preferredGender:
        oldProfile.preferredGender || oldProfile.preferred_gender,
      partnerPreferenceAgeMin:
        oldProfile.partnerPreferenceAgeMin ||
        oldProfile.partner_preference_age_min,
      partnerPreferenceAgeMax:
        oldProfile.partnerPreferenceAgeMax ||
        oldProfile.partner_preference_age_max,
      partnerPreferenceCity:
        oldProfile.partnerPreferenceCity ||
        oldProfile.partner_preference_city ||
        [],
      isProfileComplete:
        oldProfile.isProfileComplete || oldProfile.is_profile_complete || false,
      isOnboardingComplete:
        oldProfile.isOnboardingComplete ||
        oldProfile.is_onboarding_complete ||
        false,
      isActive: oldProfile.isActive || oldProfile.is_active || true,
      subscriptionPlan:
        oldProfile.subscriptionPlan || oldProfile.subscription_plan || "free",
      subscriptionExpiresAt:
        oldProfile.subscriptionExpiresAt || oldProfile.subscription_expires_at,
      profileImageIds:
        oldProfile.profileImageIds || oldProfile.profile_image_ids || [],
      profileImageUrls:
        oldProfile.profileImageUrls || oldProfile.profile_image_urls || [],
      createdAt: oldProfile.createdAt || oldProfile.created_at || Date.now(),
      updatedAt: oldProfile.updatedAt || oldProfile.updated_at || Date.now(),
    };
  }

  private transformInterestToNewSchema(oldInterest: any): any {
    return {
      _id: oldInterest._id || oldInterest.id,
      fromUserId: oldInterest.fromUserId || oldInterest.from_user_id,
      toUserId: oldInterest.toUserId || oldInterest.to_user_id,
      status: oldInterest.status || "pending",
      createdAt: oldInterest.createdAt || oldInterest.created_at || Date.now(),
      updatedAt: oldInterest.updatedAt || oldInterest.updated_at || Date.now(),
      fromProfile: oldInterest.fromProfile || oldInterest.from_profile,
      toProfile: oldInterest.toProfile || oldInterest.to_profile,
    };
  }

  private transformMessageToNewSchema(oldMessage: any): any {
    return {
      _id: oldMessage._id || oldMessage.id,
      conversationId: oldMessage.conversationId || oldMessage.conversation_id,
      fromUserId: oldMessage.fromUserId || oldMessage.from_user_id,
      toUserId: oldMessage.toUserId || oldMessage.to_user_id,
      text: oldMessage.text || oldMessage.content,
      type: oldMessage.type || "text",
      createdAt: oldMessage.createdAt || oldMessage.created_at || Date.now(),
      readAt: oldMessage.readAt || oldMessage.read_at,
      deliveredAt: oldMessage.deliveredAt || oldMessage.delivered_at,
      status: oldMessage.status || "sent",
      audioStorageId: oldMessage.audioStorageId || oldMessage.audio_storage_id,
      duration: oldMessage.duration,
      fileSize: oldMessage.fileSize || oldMessage.file_size,
      mimeType: oldMessage.mimeType || oldMessage.mime_type,
      imageStorageId: oldMessage.imageStorageId || oldMessage.image_storage_id,
      imageUrl: oldMessage.imageUrl || oldMessage.image_url,
    };
  }

  private async verifyMigration(): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Verify auth system
      const authToken = await SecureStore.getItemAsync("auth_token");
      if (!authToken) {
        errors.push("Auth token not found after migration");
      }

      // Verify API configuration
      const apiConfig = await AsyncStorage.getItem("api_config");
      if (!apiConfig) {
        errors.push("API configuration not found after migration");
      }

      // Verify feature flags
      const featureFlags = await AsyncStorage.getItem("feature_flags");
      if (!featureFlags) {
        errors.push("Feature flags not found after migration");
      }

      // Test API connectivity
      const connectivityTest = await this.apiClient.testConnectivity();
      if (!connectivityTest.success) {
        errors.push("API connectivity test failed after migration");
      }
    } catch (error) {
      errors.push(
        `Migration verification failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  private async recordMigrationStep(
    stepId: string,
    status: string
  ): Promise<void> {
    try {
      const migrationLog =
        (await AsyncStorage.getItem("migration_log")) || "[]";
      const log = JSON.parse(migrationLog);

      log.push({
        stepId,
        status,
        timestamp: Date.now(),
      });

      await AsyncStorage.setItem("migration_log", JSON.stringify(log));
    } catch (error) {
      console.error("Failed to record migration step:", error);
    }
  }

  private async recordMigrationResult(result: MigrationResult): Promise<void> {
    try {
      const migrationRecord = {
        ...result,
        timestamp: Date.now(),
        version: "1.0.0",
      };

      await AsyncStorage.setItem(
        "migration_result",
        JSON.stringify(migrationRecord)
      );

      // Update feature flag if migration was successful
      if (result.success) {
        const featureFlags = await AsyncStorage.getItem("feature_flags");
        if (featureFlags) {
          const flags = JSON.parse(featureFlags);
          flags.migration_complete = true;
          await AsyncStorage.setItem("feature_flags", JSON.stringify(flags));
        }
      }
    } catch (error) {
      console.error("Failed to record migration result:", error);
    }
  }

  async getMigrationStatus(): Promise<{
    isComplete: boolean;
    lastMigration?: MigrationResult;
    migrationLog: any[];
  }> {
    try {
      const migrationResult = await AsyncStorage.getItem("migration_result");
      const migrationLog =
        (await AsyncStorage.getItem("migration_log")) || "[]";

      return {
        isComplete: migrationResult
          ? JSON.parse(migrationResult).success
          : false,
        lastMigration: migrationResult
          ? JSON.parse(migrationResult)
          : undefined,
        migrationLog: JSON.parse(migrationLog),
      };
    } catch (error) {
      console.error("Failed to get migration status:", error);
      return {
        isComplete: false,
        migrationLog: [],
      };
    }
  }

  async rollbackMigration(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: true,
      migratedItems: 0,
      errors: [],
      backupCreated: false,
    };

    try {
      // Restore from backup
      const backup = await AsyncStorage.getItem("migration_backup");
      if (!backup) {
        throw new Error("No backup found for rollback");
      }

      const backupData = JSON.parse(backup);

      // Restore AsyncStorage
      await AsyncStorage.clear();
      for (const [key, value] of Object.entries(backupData.data.asyncStorage)) {
        await AsyncStorage.setItem(key, value as string);
      }

      // Restore SecureStore
      for (const [key, value] of Object.entries(backupData.data.secureStore)) {
        await SecureStore.setItemAsync(key, value as string);
      }

      result.migratedItems =
        Object.keys(backupData.data.asyncStorage).length +
        Object.keys(backupData.data.secureStore).length;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Rollback failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    await this.recordMigrationResult(result);
    return result;
  }
}
