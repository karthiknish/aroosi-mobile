# Aroosi Mobile

## Feature gating and hint popovers

We centralize messaging/media gating and surface lightweight, consistent hints.

- Guard hook: `useFeatureGuard()` returns `ensureAllowed(action)` for actions like `text | voice | image`.
- Popover: `HintPopover` shows a small “Why?” chip that opens a BottomSheet with the reason.

Usage patterns:

- In action handlers, preflight and optionally show upgrade:
	- `const { ensureAllowed } = useFeatureGuard();`
	- `const g = ensureAllowed('voice', { voiceDuration }); if (!g.allowed) { setRecommendedTier(g.recommendedTier); setUpgradeVisible(true); return; }`

- Near disabled controls, add a contextual popover to reduce inline noise:
	- `<HintPopover label="Why?" title="Send disabled" hint={reason} />`

Copy and placement guidelines:

- Prefer placing the popover near section subtitles or next to the gated control; avoid long inline banners.
- Keep copy short and specific (e.g., “You’ve reached today’s messaging limit. Upgrade for higher limits.”).
- For monthly quotas (e.g., interests), say “this month’s free interest limit”. For daily limits (e.g., messages, likes), say “today’s”.
- When opening an upgrade, prefer `UpgradePrompt` or the existing paywall per screen conventions.

Examples in code:

- Chat: gating on send/mic and attachment tray with popovers and inline chip hint for images.
- Matches/Interests: popover when interests quota is reached; preflight checks before actions.
- QuickPicks: like action preflight; header-level popover when like limit is reached.
- Search: popover near filter toggle when advanced filters require Premium; paywall remains for upgrade.

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
- Place iOS `GoogleService-Info.plist` at project root `GoogleService-Info.plist` (recommended for EAS) and Android `google-services.json` at `android/app/google-services.json`.
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

## Releases

Versioning is centralized:
- App version comes from `package.json`.
- Platform build numbers live in `versioning/build-version.json`.

Bump versions:
- Patch: `npm run bump:patch`
- Minor: `npm run bump:minor`
- Major: `npm run bump:major`

End-to-end flows:
- Staging iOS: `npm run release:staging:ios`
- Staging Android: `npm run release:staging:android`
- Prod iOS: `npm run release:prod:ios`
- Prod Android: `npm run release:prod:android`

Each flow does: bump version -> build -> submit -> git tag (and push tags).

Manual tag after submit:
- `npm run tag`
