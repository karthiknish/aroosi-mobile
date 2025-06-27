/**
 * Platform-specific configuration for Aroosi Mobile App
 * This file contains all platform-specific settings and optimizations
 */

const { Platform } = require('react-native');

const PLATFORM_CONFIG = {
  // iOS specific configurations
  ios: {
    // App Store configuration
    appStore: {
      category: 'Social Networking',
      subcategory: 'Dating',
      contentRating: '17+',
      keywords: 'matrimony,dating,afghan,muslim,marriage,relationships,halal',
      supportURL: 'https://aroosi.app/support',
      marketingURL: 'https://aroosi.app',
      privacyURL: 'https://aroosi.app/privacy',
    },
    
    // Performance optimizations
    performance: {
      enableHermes: true,
      enableFabric: true,
      enableTurboModules: true,
      enableBridgeless: false, // Keep false for stability
      enableConcurrentFeatures: true,
    },
    
    // Capabilities and entitlements
    capabilities: {
      pushNotifications: true,
      backgroundModes: ['background-fetch', 'remote-notification'],
      associatedDomains: ['applinks:aroosi.app', 'applinks:www.aroosi.app'],
      keychain: true,
      networkingWifi: true,
      increasedMemoryLimit: true,
    },
    
    // Security configurations
    security: {
      dataProtection: 'NSFileProtectionComplete',
      allowArbitraryLoads: false,
      allowLocalNetworking: false,
      requiresCertificateTransparency: true,
    },
    
    // UI configurations
    ui: {
      statusBarStyle: 'default',
      userInterfaceStyle: 'automatic',
      requiresFullScreen: false,
      supportedOrientations: ['UIInterfaceOrientationPortrait'],
      supportedOrientations_iPad: [
        'UIInterfaceOrientationPortrait',
        'UIInterfaceOrientationPortraitUpsideDown',
        'UIInterfaceOrientationLandscapeLeft',
        'UIInterfaceOrientationLandscapeRight',
      ],
    },
    
    // Build settings
    build: {
      deploymentTarget: '13.0',
      swift_version: '5.0',
      enable_bitcode: false,
      dead_code_stripping: true,
      strip_style: 'non-global',
    },
  },
  
  // Android specific configurations
  android: {
    // Play Store configuration
    playStore: {
      category: 'Social',
      contentRating: 'Mature 17+',
      tags: 'matrimony,dating,afghan,muslim,marriage,relationships',
      supportEmail: 'support@aroosi.app',
      websiteURL: 'https://aroosi.app',
      privacyPolicyURL: 'https://aroosi.app/privacy',
    },
    
    // Performance optimizations
    performance: {
      enableHermes: true,
      enableProguard: true,
      enableSeparateBuildPerCPUArchitecture: true,
      universalAPK: false,
      enableVectorDrawables: true,
    },
    
    // Build configurations
    build: {
      compileSdkVersion: 34,
      targetSdkVersion: 34,
      minSdkVersion: 21,
      buildToolsVersion: '34.0.0',
      ndkVersion: '25.1.8937393',
      gradleVersion: '8.3',
      gradlePluginVersion: '8.1.1',
    },
    
    // Security configurations
    security: {
      allowBackup: false,
      networkSecurityConfig: true,
      usesCleartextTraffic: false,
      extractNativeLibs: false,
    },
    
    // UI configurations
    ui: {
      hardwareAccelerated: true,
      largeHeap: true,
      supportsRtl: false,
      theme: '@style/AppTheme',
      windowSoftInputMode: 'adjustResize',
    },
    
    // Signing configurations
    signing: {
      storeFile: 'aroosi-release-key.keystore',
      keyAlias: 'aroosi-key',
      v1SigningEnabled: true,
      v2SigningEnabled: true,
      v3SigningEnabled: true,
      v4SigningEnabled: true,
    },
  },
  
  // Shared configurations
  shared: {
    // App metadata
    app: {
      name: 'Aroosi',
      description: 'Find your perfect match in the Afghan community. Connect with like-minded individuals for meaningful relationships and marriage.',
      version: '1.0.0',
      author: 'Aroosi Team',
      copyright: `© ${new Date().getFullYear()} Aroosi. All rights reserved.`,
    },
    
    // Feature flags
    features: {
      pushNotifications: true,
      biometricAuth: true,
      voiceMessages: true,
      videoCall: false, // Future feature
      locationServices: true,
      socialLogin: true,
      deepLinking: true,
      analytics: true,
      crashReporting: true,
    },
    
    // API configurations
    api: {
      timeout: 30000,
      retryAttempts: 3,
      rateLimitRequests: 100,
      rateLimitWindow: 900000, // 15 minutes
    },
    
    // Localization
    localization: {
      supportedLanguages: ['en', 'fa', 'ps'],
      defaultLanguage: 'en',
      fallbackLanguage: 'en',
      rtlLanguages: ['fa', 'ps'],
    },
    
    // Analytics
    analytics: {
      trackScreenViews: true,
      trackUserActions: true,
      trackErrors: true,
      anonymizeIp: true,
      dataRetentionDays: 730,
    },
  },
};

// Helper functions
const getPlatformConfig = () => {
  const platform = Platform.OS;
  return {
    ...PLATFORM_CONFIG.shared,
    ...PLATFORM_CONFIG[platform],
  };
};

const isFeatureEnabled = (featureName) => {
  return PLATFORM_CONFIG.shared.features[featureName] === true;
};

const getApiConfig = () => {
  return PLATFORM_CONFIG.shared.api;
};

const getLocalizationConfig = () => {
  return PLATFORM_CONFIG.shared.localization;
};

module.exports = {
  PLATFORM_CONFIG,
  getPlatformConfig,
  isFeatureEnabled,
  getApiConfig,
  getLocalizationConfig,
};