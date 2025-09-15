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

  // Load version from package.json and build numbers from local file
  const pkg = require("./package.json");
  let buildMeta = { ios: { buildNumber: 1 }, android: { versionCode: 1 } };
  try {
    buildMeta = JSON.parse(
      fs.readFileSync(
        require("path").resolve(__dirname, "versioning/build-version.json"),
        "utf8"
      )
    );
  } catch (_) {
    // default values used; file will be created by bump script
  }

  const base = {
    name: "Aroosi",
    slug: "aroosi",
    version: pkg.version || "1.0.0",
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
      buildNumber: String(buildMeta.ios?.buildNumber ?? 1),
      usesAppleSignIn: true,
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
        NSUserNotificationsUsageDescription:
          "Aroosi sends notifications about new matches, messages, and important updates.",
        NSPhotoLibraryAddUsageDescription:
          "Aroosi can save photos shared by your matches to your photo library.",
        ITSAppUsesNonExemptEncryption: false,
        CFBundleAllowMixedLocalizations: true,
        CFBundleLocalizations: ["en", "fa", "ps"],
        UIBackgroundModes: ["audio"],
        // Must be false for React Native status bar manager; setting true crashes dev/runtime
        UIViewControllerBasedStatusBarAppearance: false,
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
      entitlements: {
        // Enable Apple Sign-In capability
        "com.apple.developer.applesignin": ["Default"],
      },
      associatedDomains: [
        // Universal links for deep linking parity
        "applinks:aroosi.app",
        "applinks:www.aroosi.app",
      ],
      // googleServicesFile will be set below with env fallback
    },
    android: {
      package: "com.aroosi.mobile",
      versionCode: Number(buildMeta.android?.versionCode ?? 1),
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
      // OneSignal config plugin should be first
      [
        "onesignal-expo-plugin",
        {
          mode:
            process.env.ONESIGNAL_MODE ||
            (process.env.ENVIRONMENT === "production"
              ? "production"
              : "development"),
        },
      ],
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
      // Enable Apple Sign-In native config
      "expo-apple-authentication",
    ],
    extra: {
      eas: {
        projectId: "90150339-514c-413a-bfa1-9ce4cb689ba8",
      },
      oneSignalAppId:
        process.env.ONESIGNAL_APP_ID ||
        process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID ||
        null,
    },
    owner: "karthiknish",
    runtimeVersion: { policy: "appVersion" },
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
      // Deep-merge Info.plist so required keys are not lost when app.json is present
      infoPlist: {
        ...(base.ios?.infoPlist || {}),
        ...((jsonBase.ios && jsonBase.ios.infoPlist) || {}),
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ??
        jsonBase.ios?.googleServicesFile ??
        base.ios?.googleServicesFile ??
        "./GoogleService-Info.plist",
    },
    android: {
      ...base.android,
      ...(jsonBase.android || {}),
      // Union permissions so additions here are not overwritten by app.json
      permissions: Array.from(
        new Set([
          ...(base.android?.permissions || []),
          ...((jsonBase.android && jsonBase.android.permissions) || []),
        ])
      ),
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        jsonBase.android?.googleServicesFile ??
        base.android?.googleServicesFile ??
        "./android/app/google-services.json",
    },
  };
};
