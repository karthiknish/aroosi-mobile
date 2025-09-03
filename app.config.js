// Dynamic Expo app config to support secret file variables for Firebase config
// Load environment variables from .env for local development
require('dotenv').config();
// - Uses GOOGLE_SERVICE_INFO_PLIST (iOS) and GOOGLE_SERVICES_JSON (Android) when provided by EAS
// - Falls back to the checked-in paths for local development

module.exports = () => {
  const base = require('./app.json').expo;

  return {
    ...base,
    plugins: [
      ...(base.plugins || []),
      // Enable native Google Sign-In config plugin
      "@react-native-google-signin/google-signin",
    ],
    ios: {
      ...base.ios,
      googleServicesFile:
        process.env.GOOGLE_SERVICE_INFO_PLIST ??
        base.ios?.googleServicesFile ??
        "./ios/Aroosi/GoogleService-Info.plist",
    },
    android: {
      ...base.android,
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ??
        base.android?.googleServicesFile ??
        "./android/app/google-services.json",
    },
  };
};
