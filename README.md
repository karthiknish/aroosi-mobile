# Aroosi Mobile

## Android internal publishing

This project includes Gradle Play Publisher (GPP) and a small helper to publish the Android App Bundle to Google Play.

Prerequisites:

- First upload and enroll in Play App Signing via the Play Console.
- Create a service account with Android Publisher API and grant access to your app.
- Provide credentials to the build:
	- EITHER export `ANDROID_PUBLISHER_CREDENTIALS` in your shell (raw JSON or base64 JSON)
	- OR put base64 JSON into `../aroosi/.env.local` as `ANDROID_PUBLISHER_CREDENTIALS=...` (the helper will decode it)

Commands:

- Build + publish to Internal track: `npm run publish:internal`
- Build + upload to Internal App Sharing (download URL): `npm run share:internal`
- Dry-run (no upload): `npm run publish:internal:dry`

Notes:

- Internal App Sharing uses debug signing automatically to avoid keystore requirements.
- For track publishing, ensure your Play signing is set up and that your upload key/keystore is configured if needed.
- See `CI_PLAY_PUBLISHING.md` for CI setup.
