# Push Notifications E2E Test (OneSignal + Web Admin)

Use this quick checklist to validate end-to-end push from Aroosi Web → Mobile device.

## Prereqs
- OneSignal is configured on Web (ONESIGNAL_APP_ID, ONESIGNAL_API_KEY)
- Mobile app built as a Dev or Release build (Expo Go will not receive remote push)
- EXPO_PUBLIC_API_URL is set in mobile env to your web backend base URL
- EXPO_PUBLIC_ONESIGNAL_APP_ID is set in mobile env to the same OneSignal app

## Steps
1) Install a development or release build on a physical iOS/Android device.
2) Log in on mobile; open the app at least once. The app will:
   - Initialize OneSignal and request permission
   - Set external user ID to your backend user id
   - Auto-register the OneSignal playerId with the web backend at /api/push/register
3) From the mobile app logs, capture the OneSignal playerId (we log it on sign-in):
   - Look for: NOTIFICATIONS OneSignal playerId { playerId: "..." }
4) On Aroosi Web (as admin), open Admin → Push Notification and run a test send:
   - Endpoint: POST /api/admin/push-notification/test-send
   - Body: { "playerId": "<the id from step 3>", "title": "Test", "message": "Hello from web" }
   - Or use the web admin UI’s Test Send tool if available.
5) Confirm the device receives the notification and tapping it deep-links into the app.

## Troubleshooting
- If no push arrives:
  - Ensure iOS: using a development or release build (not Expo Go) and APNs set up in OneSignal
  - Ensure Android: FCM key set in OneSignal; app reinstall after permission changes
  - Verify mobile registered: check Firestore `pushTokens` for your playerId
  - Confirm the OneSignal app ID matches on Web and Mobile
- If tap doesn’t navigate:
  - Ensure notification’s additionalData includes `navigationData` with `{ screen, params }`
  - We also map common types (new_message, new_match, new_interest) to navigation routes
