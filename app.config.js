// Dynamic Expo app config with env-driven Google services file paths
// Load environment variables from .env for local development
require("dotenv").config();
const fs = require("fs");

module.exports = () => {
  // Load values from app.json if present, so Doctor recognizes it's used
  let jsonBase = {};
  try {
    const raw = fs.readFileSync(
      require("path").resolve(__dirname, "app.json"),
      "utf8"
    );
    jsonBase = JSON.parse(raw).expo || {};
  } catch (_) {
    // app.json may not exist; ignore
  }

  const base = {
    name: "Aroosi",
    slug: "aroosi",
    version: "1.0.3",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    scheme: "aroosi",
    description:
      "Find your perfect match in the Afghan community. Connect with like-minded individuals for meaningful relationships and marriage.",
    platforms: ["ios", "android"],
    primaryColor: "#BFA67A",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#BFA67A",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.aroosi.mobile",
      buildNumber: "2",
      usesAppleSignIn: false,
      requireFullScreen: false,
      userInterfaceStyle: "automatic",
      backgroundColor: "#F9F7F5",
      infoPlist: {
        NSPhotoLibraryUsageDescription:
          "Aroosi needs access to your photo library to upload beautiful profile pictures that help you find your perfect match.",
        NSCameraUsageDescription:
          "Aroosi needs access to your camera to take profile pictures and share moments with your matches.",
        NSMicrophoneUsageDescription:
          "Aroosi needs access to your microphone to record voice messages for more personal conversations.",
        NSContactsUsageDescription:
          "Aroosi can access your contacts to help you find friends who are also using the app (optional).",
        NSLocationWhenInUseUsageDescription:
          "Aroosi uses your location to show you matches nearby and improve your experience.",
        NSUserNotificationsUsageDescription:
          "Aroosi sends notifications about new matches, messages, and important updates.",
        NSCalendarsUsageDescription:
          "Aroosi can access your calendar to help you schedule dates with your matches (optional).",
        NSPhotoLibraryAddUsageDescription:
          "Aroosi can save photos shared by your matches to your photo library.",
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        CFBundleLocalizations: ["en", "fa", "ps"],
        UIBackgroundModes: ["audio"],
        UIViewControllerBasedStatusBarAppearance: true,
        UISupportedInterfaceOrientations: ["UIInterfaceOrientationPortrait"],
        "UISupportedInterfaceOrientations~ipad": [
          "UIInterfaceOrientationPortrait",
          "UIInterfaceOrientationPortraitUpsideDown",
          "UIInterfaceOrientationLandscapeLeft",
          "UIInterfaceOrientationLandscapeRight",
        ],
        UIRequiredDeviceCapabilities: ["armv7"],
        UIFileSharingEnabled: false,
        UISupportsDocumentBrowser: false,
        LSRequiresIPhoneOS: true,
        SKAdNetworkItems: [
          {
            SKAdNetworkIdentifier: "cstr6suwn9.skadnetwork",
          },
        ],
      },
      config: {
        usesNonExemptEncryption: false,
      },
      entitlements: {},
      associatedDomains: [],
      // googleServicesFile will be set below with env fallback
    },
    android: {
      package: "com.aroosi.mobile",
      versionCode: 4,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#BFA67A",
        monochromeImage: "./assets/adaptive-icon.png",
      },
      icon: "./assets/icon.png",
      backgroundColor: "#F9F7F5",
      allowBackup: false,
      softwareKeyboardLayoutMode: "pan",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.READ_MEDIA_VIDEO",
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.VIBRATE",
        "android.permission.WAKE_LOCK",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.READ_CONTACTS",
        "com.android.vending.BILLING",
        "android.permission.MODIFY_AUDIO_SETTINGS",
      ],
      blockedPermissions: ["ACCESS_BACKGROUND_LOCATION", "SYSTEM_ALERT_WINDOW"],
      edgeToEdgeEnabled: true,
      intentFilters: [
        {
          action: "VIEW",
          autoVerify: true,
          data: [
            { scheme: "https", host: "aroosi.app" },
            { scheme: "https", host: "www.aroosi.app" },
          ],
          category: ["BROWSABLE", "DEFAULT"],
        },
      ],
      scheme: "aroosi",
      config: {},
      // googleServicesFile will be set below with env fallback
    },
    web: {
      favicon: "./assets/favicon.png",
      bundler: "metro",
    },
    plugins: [
      ["expo-dev-client", { launchMode: "most-recent" }],
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          photosPermission:
            "Aroosi needs access to your photo library to upload beautiful profile pictures that help you find your perfect match.",
          cameraPermission:
            "Aroosi needs access to your camera to take profile pictures and share moments with your matches.",
        },
      ],
      [
        // Configure notifications without custom sounds to avoid missing file errors
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#EC4899",
          defaultChannel: "default",
        },
      ],
      "expo-font",
      [
        "expo-audio",
        {
          microphonePermission:
            "Allow Aroosi to access your microphone to record voice messages.",
        },
      ],
      "expo-router",
    ],
    extra: {
      eas: {
        projectId: "90150339-514c-413a-bfa1-9ce4cb689ba8",
      },
    },
    owner: "karthiknish",
    runtimeVersion: "1.0.0",
    updates: {
      url: "https://u.expo.dev/90150339-514c-413a-bfa1-9ce4cb689ba8",
    },
  };

  return {
    // Merge app.json values last so they take precedence if present
    ...base,
    plugins: [
      ...(base.plugins || []).filter(Boolean),
      ...(jsonBase.plugins || []).filter(Boolean),
      // Enable native Google Sign-In config plugin
      "@react-native-google-signin/google-signin",
    ],
    ios: {
      ...base.ios,
      ...(jsonBase.ios || {}),
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ??
        jsonBase.ios?.googleServicesFile ??
        base.ios?.googleServicesFile ??
        "./ios/Aroosi/GoogleService-Info.plist",
    },
    android: {
      ...base.android,
      ...(jsonBase.android || {}),
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        jsonBase.android?.googleServicesFile ??
        base.android?.googleServicesFile ??
        "./android/app/google-services.json",
    },
  };
};
