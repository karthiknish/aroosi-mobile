# iOS App Store CI/CD with EAS

This repo is wired for automated iOS builds and submissions to App Store Connect via:

- EAS Workflows (.eas/workflows/ios-release.yml) — Expo-hosted CI
- GitHub Actions (.github/workflows/eas-ios-release.yml) — your own CI

Prereqs
- Expo account and EXPO_TOKEN (create from https://expo.dev/accounts/<your>/settings/access-tokens)
- App Store Connect app created; note Apple ID (ascAppId) and Team ID
- Configure one of:
  - App Store Connect API Key (recommended)
  - or Apple ID + App-Specific Password
- EAS Build credentials already set up for iOS production (certs/profiles)

Secrets to set
- In Expo (for EAS Workflows) or GitHub repo secrets (for Actions):
  - EXPO_TOKEN
  - For API Key auth (recommended):
    - ASC_API_KEY_ID
    - ASC_API_KEY_ISSUER_ID
    - ASC_API_KEY_JSON (contents of .p8 JSON; or use ascApiKeyPath with a file)
  - For Apple ID + app-specific password (fallback):
    - APPLE_ID
    - EXPO_APPLE_APP_SPECIFIC_PASSWORD

eas.json submit profiles
- This repo already includes submit profiles with ascAppId and Apple IDs via secrets interpolation. Ensure values exist in your CI.

Run on GitHub Actions
- Manual dispatch: Actions > EAS iOS Release > Run workflow
- Or tag push: git tag ios-v1.0.0 && git push --tags

Run with EAS Workflows
- Trigger a job from dashboard, or push tag `ios-v*`.

Local helpers
- npm run release:ios — build + auto-submit with production profile
- npm run release:ios:manual — build then submit in two steps

Notes
- ascAppId is the App Store Connect Apple ID of your app (Apps > App Information)
- If using API Key, you can configure in eas.json submit. Alternatively, set up once via `eas credentials --platform ios` > App Store Connect: Manage your API key
- Make sure app versioning is correct (eas.json cli.appVersionSource is remote). Update versions via EAS if needed.
