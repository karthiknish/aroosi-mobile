export interface EnvironmentConfig {
  // API Configuration
  API_BASE_URL: string;
  API_VERSION: string;
  API_TIMEOUT: number;

  // Authentication
  JWT_SECRET_KEY?: string;
  GOOGLE_CLIENT_ID: string;

  // Push Notifications
  ONESIGNAL_APP_ID: string;

  // Payments
  STRIPE_PUBLISHABLE_KEY: string;

  // Storage (Convex removed)

  // Monitoring & Analytics
  SENTRY_DSN?: string;
  ANALYTICS_ENDPOINT?: string;

  // Feature Flags
  ENABLE_REAL_TIME: boolean;
  ENABLE_VOICE_MESSAGES: boolean;
  ENABLE_PREMIUM_FEATURES: boolean;
  ENABLE_BIOMETRIC_AUTH: boolean;
  ENABLE_OFFLINE_MODE: boolean;

  // Development
  ENVIRONMENT: "development" | "staging" | "production";
  DEBUG_MODE: boolean;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";

  // Rate Limiting
  API_RATE_LIMIT: number;
  INTEREST_RATE_LIMIT: number;
  MESSAGE_RATE_LIMIT: number;

  // Cache Configuration
  CACHE_TTL: number;
  IMAGE_CACHE_SIZE: number;
  OFFLINE_CACHE_SIZE: number;

  // Security
  ENABLE_SSL_PINNING: boolean;
  ENABLE_ROOT_DETECTION: boolean;
  ENABLE_SCREENSHOT_PROTECTION: boolean;
}

const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || "development";
  const isDevelopment = env === "development";
  const isProduction = env === "production";

  // Base configuration
  const baseConfig: EnvironmentConfig = {
    // API Configuration
    API_BASE_URL:
      process.env.EXPO_PUBLIC_API_URL || "https://www.aroosi.app/api",
    API_VERSION: "v1",
    API_TIMEOUT: 30000,

    // Authentication
    GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",

    // Push Notifications
    ONESIGNAL_APP_ID: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || "",

    // Payments
    STRIPE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",

    // Storage (Convex removed)

    // Monitoring & Analytics
    SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    ANALYTICS_ENDPOINT: process.env.EXPO_PUBLIC_ANALYTICS_ENDPOINT,

    // Feature Flags
    ENABLE_REAL_TIME: true,
    ENABLE_VOICE_MESSAGES: true,
    ENABLE_PREMIUM_FEATURES: true,
    ENABLE_BIOMETRIC_AUTH: true,
    ENABLE_OFFLINE_MODE: true,

    // Development
    ENVIRONMENT: env as "development" | "staging" | "production",
    DEBUG_MODE: isDevelopment,
    LOG_LEVEL: isDevelopment ? "debug" : "info",

    // Rate Limiting
    API_RATE_LIMIT: 100, // requests per minute
    INTEREST_RATE_LIMIT: 20, // interests per day
    MESSAGE_RATE_LIMIT: 100, // messages per day

    // Cache Configuration
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    IMAGE_CACHE_SIZE: 100 * 1024 * 1024, // 100MB
    OFFLINE_CACHE_SIZE: 50 * 1024 * 1024, // 50MB

    // Security
    ENABLE_SSL_PINNING: isProduction,
    ENABLE_ROOT_DETECTION: isProduction,
    ENABLE_SCREENSHOT_PROTECTION: isProduction,
  };

  // Environment-specific overrides
  switch (env) {
    case "development":
      return {
        ...baseConfig,
        API_BASE_URL:
          process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api",
        DEBUG_MODE: true,
        LOG_LEVEL: "debug",
        ENABLE_SSL_PINNING: false,
        ENABLE_ROOT_DETECTION: false,
        ENABLE_SCREENSHOT_PROTECTION: false,
        API_RATE_LIMIT: 1000, // Higher limits for development
        INTEREST_RATE_LIMIT: 100,
        MESSAGE_RATE_LIMIT: 1000,
      };

    case "staging":
      return {
        ...baseConfig,
        API_BASE_URL:
          process.env.EXPO_PUBLIC_API_URL || "https://staging.aroosi.app/api",
        DEBUG_MODE: true,
        LOG_LEVEL: "debug",
        ENABLE_SSL_PINNING: false,
        ENABLE_ROOT_DETECTION: false,
        ENABLE_SCREENSHOT_PROTECTION: false,
        API_RATE_LIMIT: 200,
        INTEREST_RATE_LIMIT: 50,
        MESSAGE_RATE_LIMIT: 200,
      };

    case "production":
      return {
        ...baseConfig,
        API_BASE_URL:
          process.env.EXPO_PUBLIC_API_URL || "https://www.aroosi.app/api",
        DEBUG_MODE: false,
        LOG_LEVEL: "warn",
        ENABLE_SSL_PINNING: true,
        ENABLE_ROOT_DETECTION: true,
        ENABLE_SCREENSHOT_PROTECTION: true,
      };

    default:
      return baseConfig;
  }
};

// Export the configuration
export const config = getEnvironmentConfig();

// Validation function to ensure required environment variables are set
export const validateEnvironmentConfig = (): {
  isValid: boolean;
  missingVars: string[];
} => {
  const requiredVars = [
    "GOOGLE_CLIENT_ID",
    "ONESIGNAL_APP_ID",
    "STRIPE_PUBLISHABLE_KEY",
  ];

  const missingVars: string[] = [];

  requiredVars.forEach((varName) => {
    const value = config[varName as keyof EnvironmentConfig];
    if (!value || (typeof value === "string" && value.trim() === "")) {
      missingVars.push(varName);
    }
  });

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
};

// Helper functions for feature flags
export const isFeatureEnabled = (feature: keyof EnvironmentConfig): boolean => {
  const value = config[feature];
  return typeof value === "boolean" ? value : false;
};

export const getApiUrl = (endpoint: string): string => {
  const baseUrl = config.API_BASE_URL.replace(/\/$/, ""); // Remove trailing slash
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

export const getApiHeaders = (): Record<string, string> => {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-Version": config.API_VERSION,
    "X-Client-Platform": "mobile",
    "X-Client-Version": "1.0.0", // This could be dynamic
  };
};

// Rate limiting helpers
export const getRateLimit = (type: "api" | "interest" | "message"): number => {
  switch (type) {
    case "api":
      return config.API_RATE_LIMIT;
    case "interest":
      return config.INTEREST_RATE_LIMIT;
    case "message":
      return config.MESSAGE_RATE_LIMIT;
    default:
      return 100;
  }
};

// Cache configuration helpers
export const getCacheConfig = () => ({
  ttl: config.CACHE_TTL,
  imageCacheSize: config.IMAGE_CACHE_SIZE,
  offlineCacheSize: config.OFFLINE_CACHE_SIZE,
});

// Security configuration helpers
export const getSecurityConfig = () => ({
  sslPinning: config.ENABLE_SSL_PINNING,
  rootDetection: config.ENABLE_ROOT_DETECTION,
  screenshotProtection: config.ENABLE_SCREENSHOT_PROTECTION,
});

// Development helpers
export const isDevelopment = (): boolean =>
  config.ENVIRONMENT === "development";
export const isStaging = (): boolean => config.ENVIRONMENT === "staging";
export const isProduction = (): boolean => config.ENVIRONMENT === "production";
export const isDebugMode = (): boolean => config.DEBUG_MODE;

// Logging configuration
export const getLogLevel = (): string => config.LOG_LEVEL;

// Feature flag helpers
export const canUseRealTime = (): boolean => config.ENABLE_REAL_TIME;
export const canUseVoiceMessages = (): boolean => config.ENABLE_VOICE_MESSAGES;
export const canUsePremiumFeatures = (): boolean =>
  config.ENABLE_PREMIUM_FEATURES;
export const canUseBiometricAuth = (): boolean => config.ENABLE_BIOMETRIC_AUTH;
export const canUseOfflineMode = (): boolean => config.ENABLE_OFFLINE_MODE;

// Configuration validation for runtime
export const validateRuntimeConfig = (): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Validate API URL
  try {
    new URL(config.API_BASE_URL);
  } catch {
    errors.push("Invalid API_BASE_URL format");
  }

  // Validate timeout values
  if (config.API_TIMEOUT <= 0) {
    errors.push("API_TIMEOUT must be greater than 0");
  }

  // Validate cache sizes
  if (config.IMAGE_CACHE_SIZE <= 0) {
    errors.push("IMAGE_CACHE_SIZE must be greater than 0");
  }

  if (config.OFFLINE_CACHE_SIZE <= 0) {
    errors.push("OFFLINE_CACHE_SIZE must be greater than 0");
  }

  // Validate rate limits
  if (config.API_RATE_LIMIT <= 0) {
    errors.push("API_RATE_LIMIT must be greater than 0");
  }

  // Validate required external service keys in production
  if (isProduction()) {
    if (!config.GOOGLE_CLIENT_ID) {
      errors.push("GOOGLE_CLIENT_ID is required in production");
    }

    if (!config.ONESIGNAL_APP_ID) {
      errors.push("ONESIGNAL_APP_ID is required in production");
    }

    if (!config.STRIPE_PUBLISHABLE_KEY) {
      errors.push("STRIPE_PUBLISHABLE_KEY is required in production");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Export configuration summary for debugging
export const getConfigSummary = () => ({
  environment: config.ENVIRONMENT,
  apiBaseUrl: config.API_BASE_URL,
  debugMode: config.DEBUG_MODE,
  logLevel: config.LOG_LEVEL,
  featuresEnabled: {
    realTime: config.ENABLE_REAL_TIME,
    voiceMessages: config.ENABLE_VOICE_MESSAGES,
    premiumFeatures: config.ENABLE_PREMIUM_FEATURES,
    biometricAuth: config.ENABLE_BIOMETRIC_AUTH,
    offlineMode: config.ENABLE_OFFLINE_MODE,
  },
  rateLimits: {
    api: config.API_RATE_LIMIT,
    interest: config.INTEREST_RATE_LIMIT,
    message: config.MESSAGE_RATE_LIMIT,
  },
  security: {
    sslPinning: config.ENABLE_SSL_PINNING,
    rootDetection: config.ENABLE_ROOT_DETECTION,
    screenshotProtection: config.ENABLE_SCREENSHOT_PROTECTION,
  },
});

// Initialize configuration validation on import
const validation = validateRuntimeConfig();
if (!validation.isValid && isProduction()) {
  console.error("Configuration validation failed:", validation.errors);
  // In production, you might want to prevent app startup or show an error screen
}

// Log configuration summary in development
if (isDevelopment()) {
  console.log("Environment Configuration:", getConfigSummary());
}
