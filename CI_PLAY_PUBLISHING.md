# Play Store CI publishing (internal track)

This project is configured to publish a release App Bundle to Google Play's Internal testing track on every push to `main` that touches `aroosi-mobile`.

## What’s included
- Gradle Play Publisher v3.12.1
- GitHub Actions workflow `.github/workflows/android-play-internal.yml`
- Or the unified EAS workflow `.github/workflows/eas-build-and-submit.yml` (recommended)

Required repository secrets for the unified workflow:

- EXPO_TOKEN — Expo personal access token
- GOOGLE_PLAY_SERVICE_ACCOUNT_JSON — Entire JSON of the Google Play service account key

Submitting to Play Console via EAS requires that you have uploaded at least one build manually once. See https://expo.fyi/first-android-submission
- Play config in `android/app/build.gradle` (defaults to App Bundles, internal track)
- Optional release signing via `upload.keystore` (CI)

## Required once
1) Upload the first release manually in Play Console and enroll in Play App Signing.
2) Create a service account with Android Publisher API and grant access to your app.
3) Save the JSON key content as a GitHub secret named `ANDROID_PUBLISHER_CREDENTIALS`.

## Optional (signed release bundles from CI)
If you are not using Google-managed signing for upload, add these GitHub secrets and provide an `upload.keystore` (as base64):
- `ANDROID_UPLOAD_KEYSTORE_BASE64` – base64 of your keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

The workflow will decode the keystore and sign `:app:bundleRelease`.

## Release notes (optional)
Create text files under `android/app/src/main/play/release-notes/en-US/internal.txt` or `default.txt` to attach release notes per track.

## Run locally (dry run)
- `cd android && ./gradlew :app:publishReleaseBundle --no-daemon -PdryRun` (won’t upload)
