# Google OAuth — App Name, Branding, and Client IDs

Use this guide to ensure Google sign-in shows the correct app name (Aroosi) and your client IDs are aligned across platforms.

## 1) Show the correct app name on the Google consent screen

The app name shown in Google’s sign-in/consent screen comes from your project’s OAuth consent screen configuration, not from your mobile app bundle or Expo config.

Steps:
- Open Google Cloud Console → APIs & Services → OAuth consent screen
- Click Edit app under App information
- Set App name to "Aroosi"
- Set User support email and Developer contact information
- Save. If your app is External and in Testing/Production, click Publish changes

Tip: If you manage OAuth in Firebase console, it links to the same OAuth consent screen under the same Google Cloud project.

## 2) Align OAuth client IDs across platforms

- iOS: GoogleService-Info.plist must match your iOS OAuth client (CLIENT_ID and REVERSED_CLIENT_ID). Our project reads this file from the repo root and the config plugin adds the URL scheme automatically.
- Android: android/app/google-services.json must contain the correct WEB_CLIENT_ID (client_type: 3). This ID must match EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your .env.
- Web client ID: Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to the same value used by Android (client_type 3) and iOS if applicable.

We added a preflight check (npm run predev:check) that warns if EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID doesn’t match the web client in google-services.json.

## 3) Rebuild your dev client after changes

Any change to native modules, config plugins, or Info.plist/AndroidManifest values requires rebuilding the dev client:
- iOS: npm run ios:devbuild (development-device profile)
- Android: npm run android:devbuild (development profile)

Once installed, open the dev client and connect to the bundler (tunnel recommended).

## References
- OAuth consent screen: https://console.cloud.google.com/apis/credentials/consent
- Expo Google Auth guide: https://docs.expo.dev/guides/google-authentication/
- React Native Google Sign-In (Expo): https://react-native-google-signin.github.io/docs/setting-up/expo
