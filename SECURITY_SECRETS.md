Firebase config and secrets handling
====================================

Summary
-------
- Firebase API keys in GoogleService-Info.plist and google-services.json are identifiers, not auth secrets, but should not be publicly committed in OSS.
- With Expo EAS, supply these files via secret file env vars and reference them in app.config.js.
- Avoid embedding truly sensitive secrets (private keys, Sentry auth tokens, Stripe secret keys) in code or EXPO_PUBLIC_ vars.

What changed
------------
- Added dynamic `app.config.js` to use:
  - iOS: `process.env.GOOGLE_SERVICE_INFO_PLIST`
  - Android: `process.env.GOOGLE_SERVICES_JSON`
  with local fallbacks for dev.
- `.gitignore` already ignores `.env` and generic secrets.

Set up on EAS
-------------
1) Create secret file variables (one-time per environment):
   - GOOGLE_SERVICE_INFO_PLIST: upload the GoogleService-Info.plist
   - GOOGLE_SERVICES_JSON: upload the android/google-services.json

2) In `eas.json`, set `environment` for build profiles (development/preview/production) so EAS injects the right vars.

3) Optional: `eas env:pull --environment development` to sync non-secret vars locally. Secret file vars won’t pull.

4) Keep `.env` files git-ignored. Use `EXPO_PUBLIC_` only for non-sensitive runtime config.

Rotating/Revoking
-----------------
- You can rotate Firebase web API keys in GCP > APIs & Services > Credentials. Update the plist/json via EAS secret files.
- Ensure Firestore/Storage/Realtime DB access is secured with Firebase Security Rules and App Check.

Audit checklist
---------------
- [ ] Remove any real secrets from .env before committing
- [ ] Verify `ios.googleServicesFile` and `android.googleServicesFile` resolve during EAS build
- [ ] Lock down non-Firebase API keys (e.g., Gemini, Maps) with separate keys and restrictions
- [ ] Don’t log tokens, PII, or credentials

References
----------
- Firebase API keys guidance: https://firebase.google.com/docs/projects/api-keys
- EAS env variables & secret file vars: https://docs.expo.dev/eas/environment-variables/
