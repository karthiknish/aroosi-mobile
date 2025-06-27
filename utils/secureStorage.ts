/**
 * Secure Storage Utility
 * Provides encrypted storage for sensitive data using Expo SecureStore
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Storage configuration options
interface SecureStorageOptions {
  requireAuthentication?: boolean;
  authenticationPrompt?: string;
  keychainService?: string;
  sharedPreferencesName?: string;
}

// Default options for secure storage
const defaultOptions: SecureStorageOptions = {
  requireAuthentication: false,
  authenticationPrompt: "Authenticate to access secure data",
  keychainService: "aroosi_secure_storage",
  sharedPreferencesName: "aroosi_encrypted_prefs",
};

export class SecureStorage {
  private static options: SecureStorageOptions = defaultOptions;

  /**
   * Configure secure storage options
   */
  static configure(options: Partial<SecureStorageOptions>): void {
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Store a value securely
   */
  static async setItem(
    key: string,
    value: string,
    options?: Partial<SecureStorageOptions>
  ): Promise<void> {
    try {
      const storeOptions = { ...this.options, ...options };

      const secureStoreOptions: SecureStore.SecureStoreOptions = {};

      if (Platform.OS === "ios") {
        secureStoreOptions.keychainService = storeOptions.keychainService;
        if (storeOptions.requireAuthentication) {
          secureStoreOptions.requireAuthentication = true;
          secureStoreOptions.authenticationPrompt =
            storeOptions.authenticationPrompt;
        }
      } else {
        secureStoreOptions.keychainService = storeOptions.sharedPreferencesName;
        if (storeOptions.requireAuthentication) {
          secureStoreOptions.requireAuthentication = true;
          secureStoreOptions.authenticationPrompt =
            storeOptions.authenticationPrompt;
        }
      }

      await SecureStore.setItemAsync(key, value, secureStoreOptions);
    } catch (error) {
      console.error("Error storing secure item:", error);
      throw new Error(`Failed to store secure item: ${key}`);
    }
  }

  /**
   * Retrieve a value securely
   */
  static async getItem(
    key: string,
    options?: Partial<SecureStorageOptions>
  ): Promise<string | null> {
    try {
      const storeOptions = { ...this.options, ...options };

      const secureStoreOptions: SecureStore.SecureStoreOptions = {};

      if (Platform.OS === "ios") {
        secureStoreOptions.keychainService = storeOptions.keychainService;
        if (storeOptions.requireAuthentication) {
          secureStoreOptions.requireAuthentication = true;
          secureStoreOptions.authenticationPrompt =
            storeOptions.authenticationPrompt;
        }
      } else {
        secureStoreOptions.keychainService = storeOptions.sharedPreferencesName;
        if (storeOptions.requireAuthentication) {
          secureStoreOptions.requireAuthentication = true;
          secureStoreOptions.authenticationPrompt =
            storeOptions.authenticationPrompt;
        }
      }

      return await SecureStore.getItemAsync(key, secureStoreOptions);
    } catch (error) {
      console.error("Error retrieving secure item:", error);
      return null;
    }
  }

  /**
   * Remove a value securely
   */
  static async removeItem(
    key: string,
    options?: Partial<SecureStorageOptions>
  ): Promise<void> {
    try {
      const storeOptions = { ...this.options, ...options };

      const secureStoreOptions: SecureStore.SecureStoreOptions = {};

      if (Platform.OS === "ios") {
        secureStoreOptions.keychainService = storeOptions.keychainService;
      } else {
        secureStoreOptions.keychainService = storeOptions.sharedPreferencesName;
      }

      await SecureStore.deleteItemAsync(key, secureStoreOptions);
    } catch (error) {
      console.error("Error removing secure item:", error);
      throw new Error(`Failed to remove secure item: ${key}`);
    }
  }

  /**
   * Check if a key exists
   */
  static async hasItem(key: string): Promise<boolean> {
    try {
      const value = await this.getItem(key);
      return value !== null;
    } catch (error) {
      console.error("Error checking secure item existence:", error);
      return false;
    }
  }

  /**
   * Store JSON data securely
   */
  static async setJSON<T>(
    key: string,
    data: T,
    options?: Partial<SecureStorageOptions>
  ): Promise<void> {
    try {
      const jsonString = JSON.stringify(data);
      await this.setItem(key, jsonString, options);
    } catch (error) {
      console.error("Error storing secure JSON:", error);
      throw new Error(`Failed to store secure JSON: ${key}`);
    }
  }

  /**
   * Retrieve JSON data securely
   */
  static async getJSON<T>(
    key: string,
    options?: Partial<SecureStorageOptions>
  ): Promise<T | null> {
    try {
      const jsonString = await this.getItem(key, options);
      if (jsonString) {
        return JSON.parse(jsonString) as T;
      }
      return null;
    } catch (error) {
      console.error("Error retrieving secure JSON:", error);
      return null;
    }
  }

  /**
   * Store sensitive user credentials
   */
  static async storeUserCredentials(
    userId: string,
    credentials: {
      email?: string;
      refreshToken?: string;
      [key: string]: any;
    }
  ): Promise<void> {
    try {
      const key = `user_credentials_${userId}`;
      await this.setJSON(key, credentials, {
        requireAuthentication: true,
        authenticationPrompt: "Authenticate to access your stored credentials",
      });
    } catch (error) {
      console.error("Error storing user credentials:", error);
      throw new Error("Failed to store user credentials securely");
    }
  }

  /**
   * Retrieve sensitive user credentials
   */
  static async getUserCredentials(userId: string): Promise<any | null> {
    try {
      const key = `user_credentials_${userId}`;
      return await this.getJSON(key, {
        requireAuthentication: true,
        authenticationPrompt: "Authenticate to access your stored credentials",
      });
    } catch (error) {
      console.error("Error retrieving user credentials:", error);
      return null;
    }
  }

  /**
   * Remove user credentials
   */
  static async removeUserCredentials(userId: string): Promise<void> {
    try {
      const key = `user_credentials_${userId}`;
      await this.removeItem(key);
    } catch (error) {
      console.error("Error removing user credentials:", error);
      throw new Error("Failed to remove user credentials");
    }
  }

  /**
   * Store app-level secure settings
   */
  static async storeAppSettings(settings: Record<string, any>): Promise<void> {
    try {
      await this.setJSON("app_secure_settings", settings);
    } catch (error) {
      console.error("Error storing app settings:", error);
      throw new Error("Failed to store app settings securely");
    }
  }

  /**
   * Retrieve app-level secure settings
   */
  static async getAppSettings(): Promise<Record<string, any> | null> {
    try {
      return await this.getJSON("app_secure_settings");
    } catch (error) {
      console.error("Error retrieving app settings:", error);
      return null;
    }
  }

  /**
   * Store authentication tokens securely
   */
  static async storeAuthTokens(tokens: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
    expiresAt?: number;
  }): Promise<void> {
    try {
      await this.setJSON("auth_tokens", tokens, {
        requireAuthentication: false, // Allow without biometric for initial auth
      });
    } catch (error) {
      console.error("Error storing auth tokens:", error);
      throw new Error("Failed to store authentication tokens");
    }
  }

  /**
   * Retrieve authentication tokens
   */
  static async getAuthTokens(): Promise<any | null> {
    try {
      return await this.getJSON("auth_tokens");
    } catch (error) {
      console.error("Error retrieving auth tokens:", error);
      return null;
    }
  }

  /**
   * Clear all authentication data
   */
  static async clearAuthData(): Promise<void> {
    try {
      await Promise.all([this.removeItem("auth_tokens")]);
    } catch (error) {
      console.error("Error clearing auth data:", error);
    }
  }

  /**
   * Store temporary secure data with expiration
   */
  static async storeTemporary(
    key: string,
    value: string,
    expirationMinutes: number = 15
  ): Promise<void> {
    try {
      const expirationTime = Date.now() + expirationMinutes * 60 * 1000;
      const data = {
        value,
        expiresAt: expirationTime,
      };
      await this.setJSON(`temp_${key}`, data);
    } catch (error) {
      console.error("Error storing temporary data:", error);
      throw new Error(`Failed to store temporary data: ${key}`);
    }
  }

  /**
   * Retrieve temporary secure data (auto-expires)
   */
  static async getTemporary(key: string): Promise<string | null> {
    try {
      const data = await this.getJSON<{ value: string; expiresAt: number }>(
        `temp_${key}`
      );

      if (!data) {
        return null;
      }

      if (Date.now() > data.expiresAt) {
        // Data has expired, remove it
        await this.removeItem(`temp_${key}`);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error("Error retrieving temporary data:", error);
      return null;
    }
  }

  /**
   * Clean up expired temporary data
   */
  static async cleanupExpiredData(): Promise<void> {
    try {
      // This would require enumerating all keys, which SecureStore doesn't support
      // In a production app, you might want to maintain a separate index of temporary keys
      console.log("Cleanup of expired data would run here");
    } catch (error) {
      console.error("Error cleaning up expired data:", error);
    }
  }

  /**
   * Migrate data between keychain services (for app updates)
   */
  static async migrateData(
    oldService: string,
    newService: string,
    keys: string[]
  ): Promise<void> {
    try {
      for (const key of keys) {
        const value = await SecureStore.getItemAsync(key, {
          keychainService: oldService,
        });

        if (value) {
          await SecureStore.setItemAsync(key, value, {
            keychainService: newService,
          });

          await SecureStore.deleteItemAsync(key, {
            keychainService: oldService,
          });
        }
      }

      console.log(
        `Migrated ${keys.length} keys from ${oldService} to ${newService}`
      );
    } catch (error) {
      console.error("Error migrating secure data:", error);
    }
  }
}
