
# Additional package.json scripts for platform-specific builds

"scripts": {
  "build:ios": "eas build --platform ios",
  "build:android": "eas build --platform android",
  "build:both": "eas build --platform all",
  "build:ios:local": "expo run:ios --configuration Release",
  "build:android:local": "expo run:android --variant release",
  "preview:ios": "eas build --platform ios --profile preview",
  "preview:android": "eas build --platform android --profile preview",
  "submit:ios": "eas submit --platform ios",
  "submit:android": "eas submit --platform android",
  "submit:both": "eas submit --platform all",
  "clean:ios": "cd ios && xcodebuild clean && cd ..",
  "clean:android": "cd android && ./gradlew clean && cd ..",
  "clean:metro": "npx react-native start --reset-cache",
  "clean:all": "npm run clean:ios && npm run clean:android && npm run clean:metro",
  "icons:generate": "expo install expo-icon-set && npx expo-icon-set",
  "splash:generate": "expo install expo-splash-screen && npx expo-splash-screen",
  "assets:optimize": "node scripts/optimize-assets.js",
  "precommit": "npm run lint && npm run type-check",
  "postinstall": "node scripts/setup-platform-assets.js"
}
