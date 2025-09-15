# Aroosi Mobile — Development Build Guide (Physical Devices)

This guide explains how to build and run the Expo Development Client ("dev build") on real iOS and Android devices. A dev build is required for native modules like `@react-native-google-signin/google-signin`.

> Expo Go will NOT work with native Google Sign-In. You must use a dev build.

---

## Prerequisites

- Expo account and EAS CLI
  - Install: `npm i -g eas-cli`
  - Login: `eas login`
- iOS device: Apple Developer Program access (for physical device installs)
- Android device: Developer options enabled (USB debugging recommended) or ability to install APKs
- Same network (device and dev machine) or use a tunnel

Optional (local builds/debugging):
- Xcode (macOS) for iOS simulator/local run
- Android Studio + adb for Android

---

## Environment and Config

1) Environment variables
- Copy `.env.example` to `.env` if needed, and fill any values you use locally.
- Public client IDs (optional if iOS client ID is provided by the plist):
  - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
  - `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`

2) Google services files
- Required paths (defaults):
  - iOS: `GoogleService-Info.plist` (project root; recommended for EAS)
  - Android: `android/app/google-services.json`
- If your files live elsewhere, set these env vars in `.env` or environment:
  - `GOOGLE_SERVICE_INFO_PLIST=./path/to/GoogleService-Info.plist`
  - `GOOGLE_SERVICES_JSON=./path/to/google-services.json`

  5) (Optional) Provide google services via EAS file env vars
  If you prefer not to commit these files locally, upload them as secret file variables on EAS and rely on the env fallback in `app.config.js`:

  ```bash
  # iOS plist as a file variable
  eas env:create --name GOOGLE_SERVICE_INFO_PLIST --type file --value ./GoogleService-Info.plist --environment development --visibility secret

  # Android json as a file variable
  eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./android/app/google-services.json --environment development --visibility secret
  ```
  Then run builds with the matching `environment` (our dev profiles already use `development`).

3) Verify files are present
```bash
node scripts/check-google-services.js
```
You should see both files found. If missing, add them or set the env paths above.

4) (Optional) EAS Secrets
```bash
# Set public client IDs in EAS for cloud builds
# Replace values with your actual IDs

# Web client ID
EASJSON_SECRETS=1 eas secret:create --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "<your-web-client-id>"

# iOS client ID (optional when plist provides it)
eas secret:create --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value "<your-ios-client-id>"
```

---

## Build and Run — iOS (Physical Device)

1) Register your device (one-time)
```bash
eas device:create
```
Follow the instructions to open a link on your iPhone; it captures the UDID.

2) Build a dev client and start the bundler (tunnel recommended)
```bash
npm run ios:devbuild
```
This uses the `development-device` profile and then starts `expo start --tunnel`.

3) Install the latest dev client on your device (if not auto-installed)
```bash
eas build:run -p ios --profile development-device --latest
```
Or install from the EAS build page link on your device.

4) Connect to the dev server
- Keep the bundler running: `npm run start:tunnel`
- Open the dev client app on your iPhone and scan the QR shown in the terminal

---

## Build and Run — Android (Physical Device)

1) Build a dev client and start the bundler (tunnel recommended)
```bash
npm run android:devbuild
```
This uses the `development` profile and then starts `expo start --tunnel`.

2) Install the latest dev client (if needed)
```bash
eas build:run -p android --profile development --latest
```
Or install via `adb install <path-to-apk>` when applicable.

3) Connect to the dev server
- Keep the bundler running: `npm run start:tunnel`
- Open the dev client on your Android device and scan the QR shown in the terminal

---

## Troubleshooting

- RNGoogleSignin not found / module not linked
  - Cause: Using Expo Go or an outdated dev client.
  - Fix: Rebuild the dev client after adding/updating native modules or config plugins.

- Can’t connect to bundler on LAN
  - Use a tunnel: `npm run start:tunnel`
  - Ensure device and machine are on the same network if not using tunnel.

- iOS install issues
  - Ensure device is registered: `eas device:create`
  - Verify Apple Team/App IDs and bundle identifier `com.aroosi.mobile`.

- Calendar permission crash (ExpoCalendar.MissingCalendarPListValueException)
  - Cause: Missing iOS Info.plist keys for Calendar/Reminders when using `expo-calendar`.
  - Fix: Ensure app config includes `NSCalendarsUsageDescription` and `NSRemindersUsageDescription`, or add the `expo-calendar` plugin with `calendarPermission` and `remindersPermission`.
  - Rebuild the dev client for changes to take effect.

- Google sign-in fails or crashes
  - Verify `GoogleService-Info.plist` and `google-services.json` match your app IDs.
  - Ensure `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (and iOS client ID if needed) are correct.
  - Tip: Align the Web Client ID in `.env` with the OAuth client (type 3) inside `android/app/google-services.json` to avoid token mismatch errors.
  - Rebuild dev client after any native/config changes.

- Clear caches (if bundler acts up)
```bash
rm -rf node_modules
npm i
npx expo start -c
```

---

## Optional: Local native runs
If you prefer to run locally without EAS cloud builds (useful for faster native debugging):

```bash
# iOS (requires Xcode)
npx expo run:ios

# Android (requires Android Studio / SDK)
npx expo run:android
```
You’ll still need the Google services files in place. Re-run these after any native/config changes.

---

## Useful Scripts (already in package.json)

- `npm run predev:check` — verifies Google services files exist
- `npm run start:tunnel` — starts the dev server using a tunnel
- `npm run ios:devbuild` — build iOS dev client for devices and start bundler
- `npm run android:devbuild` — build Android dev client and start bundler

---

## References
- Expo Development Builds — Use and debug: https://docs.expo.dev/develop/development-builds/use-development-builds/
- Add custom native code / Config plugins: https://docs.expo.dev/workflow/customizing/
- React Native Google Sign-In (Expo setup): https://react-native-google-signin.github.io/docs/setting-up/expo
