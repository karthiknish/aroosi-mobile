# Env Sync with `aroosi` (web)

This app shares several environment variables with the web project and adds mobile-specific ones. The following keys have been synced or added:

## Copied from web
- EXPO_PUBLIC_API_URL (points to https://www.aroosi.app for production; do not include trailing /api)
- EXPO_PUBLIC_GOOGLE_CLIENT_ID (same as web client ID)
- EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (alias for web client ID)
- EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY (public key)
- ADMIN_EMAIL

## Mobile-specific required keys
- EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
- EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
- EXPO_PUBLIC_ONESIGNAL_APP_ID
- IOS_BUNDLE_ID
- ANDROID_PACKAGE

## Optional keys used in code
- EXPO_PUBLIC_ENABLE_ANALYTICS (default false)
- EXPO_PUBLIC_ENABLE_BIOMETRIC_AUTH
- EXPO_PUBLIC_ENABLE_VOICE_MESSAGES
- EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS
- PEXELS_API_KEY
- GEMINI_API_KEY
- RESEND_API_KEY
- E2E_USER_EMAIL / E2E_USER_PASSWORD

Ensure the platform-specific Google client IDs are configured in Google Cloud Console for iOS/Android OAuth flows.
