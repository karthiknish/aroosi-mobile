# Android Release Keystore Setup

To ensure release builds are always signed with a proper upload key (not debug), follow these steps.

## 1) Generate an upload keystore

Run from `aroosi-mobile/android/app`:

```
keytool -genkeypair -v -keystore upload.keystore -alias <YOUR_ALIAS> -keyalg RSA -keysize 2048 -validity 10000
```

Remember the passwords you set for:
- Keystore (ANDROID_KEYSTORE_PASSWORD)
- Key alias (ANDROID_KEY_ALIAS)
- Key password (ANDROID_KEY_PASSWORD)

## 2) Set environment variables before building

```
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=...
export ANDROID_KEY_PASSWORD=...
```

## 3) Build the release bundle

```
cd aroosi-mobile/android
./gradlew :app:bundleRelease
```

If any variable is missing or the keystore is absent, the build will fail early with a clear error.

## CI notes
- In CI, store the keystore as a base64 secret and decode it to `android/app/upload.keystore` before building.
- Provide the three env vars as CI secrets.
