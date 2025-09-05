# Aroosi Mobile

## Android internal publishing

This project includes Gradle Play Publisher (GPP) and a small helper to publish the Android App Bundle to Google Play.

Prerequisites:

	- EITHER export `ANDROID_PUBLISHER_CREDENTIALS` in your shell (raw JSON or base64 JSON)
	- OR put base64 JSON into `../aroosi/.env.local` as `ANDROID_PUBLISHER_CREDENTIALS=...` (the helper will decode it)

Commands:


Notes:



## Development

### Dev build on a physical device (Expo development client)

1) Configure Google services and client IDs
- Place iOS `GoogleService-Info.plist` at `ios/Aroosi/GoogleService-Info.plist` and Android `google-services.json` at `android/app/google-services.json`.
- Or set env paths in `.env`:
	- `GOOGLE_SERVICE_INFO_PLIST=./path/to/GoogleService-Info.plist`
	- `GOOGLE_SERVICES_JSON=./path/to/google-services.json`
- Optionally set:
	- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

2) Build and run a dev client
- iOS (physical device):
	- Ensure device is registered: `eas device:create`
	- Build + start bundler: `npm run ios:devbuild`
	- After build: `eas build:run -p ios --profile development-device --latest` (or install from EAS page)
- Android:
	- Build + start bundler: `npm run android:devbuild`
	- Or install the latest: `eas build:run -p android --profile development --latest`

3) Start the dev server (with tunnel for reliability)
- `npm run start:tunnel`
- Open the dev client app on your phone and scan the QR in the terminal.

Notes
- Expo Go will not work for Google Sign-In (native module). Always use the dev client.
- Rebuild the dev client after adding/removing native modules or changing config plugins.

## Notifications

- We use `expo-notifications` with the config plugin. No custom sounds are configured by default.
- If you want a custom sound, add the file under `assets/sounds/` (e.g., `assets/sounds/notification.wav`) and add the relative path to the `sounds` array in the `expo-notifications` plugin in `app.config.js`.
- After changing sounds, you must rebuild the native app. If a sound is listed but the file is missing, iOS prebuild will fail when the plugin tries to copy it.
