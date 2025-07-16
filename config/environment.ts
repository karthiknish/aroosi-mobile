import Constants from "expo-constants";

export type Environment = "development" | "staging" | "production";

export interface EnvironmentConfig {
  API_BASE_URL: string;
  WEB_APP_URL: string;
  WEBSOCKET_URL: string;
  ONESIGNAL_APP_ID: string;
  GOOGLE_OAUTH_CLIENT_ID: string;
  SENTRY_DSN?: string;
  ANALYTICS_KEY?: string;
  FEATURE_FLAGS: {
    VOICE_MESSAGES: boolean;
    PUSH_NOTIFICATIONS: boolean;
    OFFLINE_MODE: boolean;
    PREMIUM_FEATURES: boolean;
    REAL_TIME_MESSAGING: boolean;
    IMAGE_COMPRESSION: boolean;
    PERFORMANCE_MONITORING: boolean;
  };
  CACHE_CONFIG: {
    IMAGE_CACHE_SIZE_MB: number;
    OFFLINE_CACHE_SIZE_MB: number;
    CACHE_EXPIRY_HOURS: number;
  };
  SUBSCRIPTION_CONFIG: {
    PREMIUM_PRODUCT_ID: string;
    PREMIUM_PLUS_PRODUCT_ID: string;
    TRIAL_PERIOD_DAYS: number;
  };
  SECURITY_CONFIG: {
    TOKEN_REFRESH_THRESHOLD_MINUTES: number;
    SESSION_TIMEOUT_HOURS: number;
    MAX_LOGIN_ATTEMPTS: number;
  };
  PERFORMANCE_CONFIG: {
    API_TIMEOUT_MS: number;
    IMAGE_UPLOAD_TIMEOUT_MS: number;
    RETRY_ATTEMPTS: number;
    RETRY_DELAY_MS: number;
  };
}

const developmentConfig: EnvironmentConfig = {
  API_BASE_URL: "http://localhost:3000/api",
  WEB_APP_URL: "http://localhost:3000",
  WEBSOCKET_URL: "ws://localhost:3000",
  ONESIGNAL_APP_ID: "dev-onesignal-app-id",
  GOOGLE_OAUTH_CLIENT_ID: "dev-google-client-id",
  SENTRY_DSN: undefined, // No error tracking in development
  ANALYTICS_KEY: undefined, // No analytics in development
  FEATURE_FLAGS: {
    VOICE_MESSAGES: true,
    PUSH_NOTIFICATIONS: true,
    OFFLINE_MODE: true,
    PREMIUM_FEATURES: true,
    REAL_TIME_MESSAGING: true,
    IMAGE_COMPRESSION: true,
    PERFORMANCE_MONITORING: true,
  },
  CACHE_CONFIG: {
    IMAGE_CACHE_SIZE_MB: 50, // Smaller cache for development
    OFFLINE_CACHE_SIZE_MB: 25,
    CACHE_EXPIRY_HOURS: 1, // Shorter expiry for testing
  },
  SUBSCRIPTION_CONFIG: {
    PREMIUM_PRODUCT_ID: "com.aroosi.premium.monthly.dev",
    PREMIUM_PLUS_PRODUCT_ID: "com.aroosi.premiumplus.monthly.dev",
    TRIAL_PERIOD_DAYS: 7,
  },
  SECURITY_CONFIG: {
    TOKEN_REFRESH_THRESHOLD_MINUTES: 5,
    SESSION_TIMEOUT_HOURS: 24,
    MAX_LOGIN_ATTEMPTS: 5, // More lenient for development
  },
  PERFORMANCE_CONFIG: {
    API_TIMEOUT_MS: 10000, // 10 seconds
    IMAGE_UPLOAD_TIMEOUT_MS: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1000,
  },
};

const stagingConfig: EnvironmentConfig = {
  API_BASE_URL: "https://staging-api.aroosi.com/api",
  WEB_APP_URL: "https://staging.aroosi.com",
  WEBSOCKET_URL: "wss://staging-api.aroosi.com",
  ONESIGNAL_APP_ID: "staging-onesignal-app-id",
  GOOGLE_OAUTH_CLIENT_ID: "staging-google-client-id",
  SENTRY_DSN: "https://staging-sentry-dsn@sentry.io/project",
  ANALYTICS_KEY: "staging-analytics-key",
  FEATURE_FLAGS: {
    VOICE_MESSAGES: true,
    PUSH_NOTIFICATIONS: true,
    OFFLINE_MODE: true,
    PREMIUM_FEATURES: true,
    REAL_TIME_MESSAGING: true,
    IMAGE_COMPRESSION: true,
    PERFORMANCE_MONITORING: true,
  },
  CACHE_CONFIG: {
    IMAGE_CACHE_SIZE_MB: 100,
    OFFLINE_CACHE_SIZE_MB: 50,
    CACHE_EXPIRY_HOURS: 6,
  },
  SUBSCRIPTION_CONFIG: {
    PREMIUM_PRODUCT_ID: "com.aroosi.premium.monthly.staging",
    PREMIUM_PLUS_PRODUCT_ID: "com.aroosi.premiumplus.monthly.staging",
    TRIAL_PERIOD_DAYS: 7,
  },
  SECURITY_CONFIG: {
    TOKEN_REFRESH_THRESHOLD_MINUTES: 5,
    SESSION_TIMEOUT_HOURS: 12,
    MAX_LOGIN_ATTEMPTS: 3,
  },
  PERFORMANCE_CONFIG: {
    API_TIMEOUT_MS: 8000,
    IMAGE_UPLOAD_TIMEOUT_MS: 25000,
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY_MS: 1500,
  },
};

const productionConfig: EnvironmentConfig = {
  API_BASE_URL: "https://api.aroosi.com/api",
  WEB_APP_URL: "https://aroosi.com",
  WEBSOCKET_URL: "wss://api.aroosi.com",
  ONESIGNAL_APP_ID: "production-onesignal-app-id",
  GOOGLE_OAUTH_CLIENT_ID: "production-google-client-id",
  SENTRY_DSN: "https://production-sentry-dsn@sentry.io/project",
  ANALYTICS_KEY: "production-analytics-key",
  FEATURE_FLAGS: {
    VOICE_MESSAGES: true,
    PUSH_NOTIFICATIONS: true,
    OFFLINE_MODE: true,
    PREMIUM_FEATURES: true,
    REAL_TIME_MESSAGING: true,
    IMAGE_COMPRESSION: true,
    PERFORMANCE_MONITORING: false, // Disabled in production for performance
  },
  CACHE_CONFIG: {
    IMAGE_CACHE_SIZE_MB: 200,
    OFFLINE_CACHE_SIZE_MB: 100,
    CACHE_EXPIRY_HOURS: 24,
  },
  SUBSCRIPTION_CONFIG: {
    PREMIUM_PRODUCT_ID: "com.aroosi.premium.monthly",
    PREMIUM_PLUS_PRODUCT_ID: "com.aroosi.premiumplus.monthly",
    TRIAL_PERIOD_DAYS: 7,
  },
  SECURITY_CONFIG: {
    TOKEN_REFRESH_THRESHOLD_MINUTES: 5,
    SESSION_TIMEOUT_HOURS: 8,
    MAX_LOGIN_ATTEMPTS: 3,
  },
  PERFORMANCE_CONFIG: {
    API_TIMEOUT_MS: 5000,
    IMAGE_UPLOAD_TIMEOUT_MS: 20000,
    RETRY_ATTEMPTS: 2,
    RETRY_DELAY_MS: 2000,
  },
};

function getEnvironment(): Environment {
  // Check for explicit environment variable
  const envVar = Constants.expoConfig?.extra?.environment;
  if (envVar && ["development", "staging", "production"].includes(envVar)) {
    return envVar as Environment;
  }

  // Determine environment based on release channel or other indicators
  const releaseChannel = Constants.expoConfig?.extra?.releaseChannel;

  if (releaseChannel === "production") {
    return "production";
  } else if (releaseChannel === "staging") {
    return "staging";
  } else if (__DEV__) {
    return "development";
  } else {
    return "production"; // Default to production for safety
  }
}

function getConfig(): EnvironmentConfig {
  const environment = getEnvironment();

  switch (environment) {
    case "development":
      return developmentConfig;
    case "staging":
      return stagingConfig;
    case "production":
      return productionConfig;
    default:
      return productionConfig;
  }
}

export const ENV = getEnvironment();
export const CONFIG = getConfig();

// Feature flag utilities
export function isFeatureEnabled(
  feature: keyof EnvironmentConfig["FEATURE_FLAGS"]
): boolean {
  return CONFIG.FEATURE_FLAGS[feature];
}

export function getApiUrl(endpoint: string): string {
  return `${CONFIG.API_BASE_URL}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`;
}

export function getWebUrl(path: string = ""): string {
  return `${CONFIG.WEB_APP_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Environment-specific logging
export function logEnvironmentInfo(): void {
  console.log("🌍 Environment Configuration:");
  console.log(`📍 Environment: ${ENV}`);
  console.log(`🔗 API Base URL: ${CONFIG.API_BASE_URL}`);
  console.log(`🌐 Web App URL: ${CONFIG.WEB_APP_URL}`);
  console.log(`🚀 Feature Flags:`, CONFIG.FEATURE_FLAGS);

  if (ENV === "development") {
    console.log("🔧 Development mode - All features enabled");
  } else if (ENV === "staging") {
    console.log("🧪 Staging mode - Testing configuration");
  } else {
    console.log("🏭 Production mode - Optimized configuration");
  }
}

// Configuration validation
export function validateConfig(): boolean {
  const requiredFields = [
    "API_BASE_URL",
    "WEB_APP_URL",
    "ONESIGNAL_APP_ID",
    "GOOGLE_OAUTH_CLIENT_ID",
  ];

  for (const field of requiredFields) {
    if (!CONFIG[field as keyof EnvironmentConfig]) {
      console.error(`❌ Missing required configuration: ${field}`);
      return false;
    }
  }

  // Validate URLs
  try {
    new URL(CONFIG.API_BASE_URL);
    new URL(CONFIG.WEB_APP_URL);
  } catch (error) {
    console.error("❌ Invalid URL configuration:", error);
    return false;
  }

  console.log("✅ Configuration validation passed");
  return true;
}

// Export individual configs for testing
export const configs = {
  development: developmentConfig,
  staging: stagingConfig,
  production: productionConfig,
};
