#!/usr/bin/env node

/**
 * Platform Asset Setup Script
 * Generates and organizes platform-specific assets and configurations
 */

const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '../assets');
const PLATFORM_DIR = path.join(__dirname, '../platform');

// Ensure directories exist
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create platform-specific directories
const setupDirectories = () => {
  console.log('📁 Setting up platform directories...');
  
  const dirs = [
    path.join(PLATFORM_DIR, 'ios'),
    path.join(PLATFORM_DIR, 'android'),
    path.join(ASSETS_DIR, 'icons'),
    path.join(ASSETS_DIR, 'splash'),
    path.join(ASSETS_DIR, 'sounds'),
    path.join(ASSETS_DIR, 'fonts'),
  ];
  
  dirs.forEach(ensureDir);
  console.log('✅ Platform directories created');
};

// Generate iOS Info.plist additions
const generateiOSConfig = () => {
  console.log('🍎 Generating iOS configuration...');
  
  const infoPlistAdditions = `
<!-- Additional Info.plist configurations for Aroosi -->
<key>CFBundleDisplayName</key>
<string>Aroosi</string>
<key>CFBundleName</key>
<string>Aroosi</string>
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>

<!-- URL Schemes -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.aroosi.mobile</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>aroosi</string>
    </array>
  </dict>
</array>

<!-- App Transport Security -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSExceptionDomains</key>
  <dict>
    <key>aroosi.app</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <false/>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.2</string>
      <key>NSExceptionRequiresForwardSecrecy</key>
      <true/>
    </dict>
  </dict>
</dict>

<!-- Background Modes -->
<key>UIBackgroundModes</key>
<array>
  <string>background-fetch</string>
  <string>remote-notification</string>
</array>

<!-- Interface Orientations -->
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
</array>

<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationPortraitUpsideDown</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>

<!-- Status Bar -->
<key>UIViewControllerBasedStatusBarAppearance</key>
<true/>
<key>UIStatusBarStyle</key>
<string>UIStatusBarStyleDefault</string>

<!-- Launch Screen -->
<key>UILaunchStoryboardName</key>
<string>SplashScreen</string>
`;

  fs.writeFileSync(
    path.join(PLATFORM_DIR, 'ios', 'Info.plist.additions'),
    infoPlistAdditions
  );
  
  console.log('✅ iOS Info.plist additions generated');
};

// Generate Android configurations
const generateAndroidConfig = () => {
  console.log('🤖 Generating Android configuration...');
  
  // Android Manifest additions
  const manifestAdditions = `
<!-- Additional AndroidManifest.xml configurations for Aroosi -->

<!-- Internet and Network Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

<!-- Camera and Media Permissions -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />

<!-- Audio Permissions -->
<uses-permission android:name="android.permission.RECORD_AUDIO" />

<!-- Biometric Permissions -->
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />

<!-- Location Permissions -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

<!-- Other Permissions -->
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.READ_CONTACTS" />

<!-- Hardware Features -->
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.microphone" android:required="false" />
<uses-feature android:name="android.hardware.location" android:required="false" />
<uses-feature android:name="android.hardware.fingerprint" android:required="false" />

<!-- Intent Filters for Deep Linking -->
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="https" android:host="aroosi.app" />
</intent-filter>

<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="aroosi" />
</intent-filter>
`;

  fs.writeFileSync(
    path.join(PLATFORM_DIR, 'android', 'AndroidManifest.additions.xml'),
    manifestAdditions
  );
  
  // Proguard rules
  const proguardRules = `
# Aroosi App Proguard Rules

# Keep React Native classes
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }


# Keep image picker classes
-keep class com.imagepicker.** { *; }

# Keep biometric classes
-keep class androidx.biometric.** { *; }

# Keep notification classes
-keep class com.google.firebase.** { *; }

# Keep networking classes
-keep class okhttp3.** { *; }
-keep class retrofit2.** { *; }

# Keep model classes (adjust package names as needed)
-keep class com.aroosi.mobile.models.** { *; }

# Remove logging in release builds
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
}

# Keep enum classes
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# Keep Parcelable classes
-keep class * implements android.os.Parcelable {
  public static final android.os.Parcelable$Creator *;
}
`;

  fs.writeFileSync(
    path.join(PLATFORM_DIR, 'android', 'proguard-rules.pro'),
    proguardRules
  );
  
  console.log('✅ Android configurations generated');
};

// Generate app icons documentation
const generateIconsGuide = () => {
  console.log('🎨 Generating icons guide...');
  
  const iconsGuide = `
# App Icons Guide

## iOS Icon Requirements

### iPhone
- 180x180 px (60pt @3x) - App icon for iPhone
- 120x120 px (60pt @2x) - App icon for iPhone
- 87x87 px (29pt @3x) - Settings icon for iPhone
- 58x58 px (29pt @2x) - Settings icon for iPhone
- 120x120 px (40pt @3x) - Spotlight icon for iPhone
- 80x80 px (40pt @2x) - Spotlight icon for iPhone

### iPad
- 152x152 px (76pt @2x) - App icon for iPad
- 76x76 px (76pt @1x) - App icon for iPad
- 167x167 px (83.5pt @2x) - App icon for iPad Pro
- 58x58 px (29pt @2x) - Settings icon for iPad
- 29x29 px (29pt @1x) - Settings icon for iPad
- 80x80 px (40pt @2x) - Spotlight icon for iPad
- 40x40 px (40pt @1x) - Spotlight icon for iPad

### App Store
- 1024x1024 px - App Store icon

## Android Icon Requirements

### Launcher Icons
- 192x192 px - xxxhdpi (4.0x)
- 144x144 px - xxhdpi (3.0x)
- 96x96 px - xhdpi (2.0x)
- 72x72 px - hdpi (1.5x)
- 48x48 px - mdpi (1.0x)

### Adaptive Icons (API 26+)
- 432x432 px - Adaptive icon (foreground + background)
- Safe zone: 264x264 px (centered)

### Play Store
- 512x512 px - Play Store icon

## Notification Icons (Android)
- 96x96 px - xxxhdpi
- 72x72 px - xxhdpi
- 48x48 px - xhdpi
- 36x36 px - hdpi
- 24x24 px - mdpi

## Guidelines
- Use PNG format for all icons
- Maintain consistent visual style
- Ensure icons work on light and dark backgrounds
- Test icons at different sizes
- Follow platform-specific design guidelines
`;

  fs.writeFileSync(
    path.join(ASSETS_DIR, 'icons', 'README.md'),
    iconsGuide
  );
  
  console.log('✅ Icons guide generated');
};

// Generate splash screen documentation
const generateSplashGuide = () => {
  console.log('🌟 Generating splash screen guide...');
  
  const splashGuide = `
# Splash Screen Guide

## iOS Launch Screen Requirements

### Storyboard Approach (Recommended)
- Use LaunchScreen.storyboard
- Support all device sizes dynamically
- Include app logo and brand colors
- Keep it simple and fast-loading

### Image Approach (Legacy)
- iPhone 15 Pro Max: 1290x2796 px
- iPhone 15 Pro: 1179x2556 px
- iPhone 15 Plus: 1284x2778 px
- iPhone 15: 1179x2556 px
- iPhone 14 Pro Max: 1290x2796 px
- iPhone 14 Pro: 1179x2556 px
- iPhone 14 Plus: 1284x2778 px
- iPhone 14: 1170x2532 px
- iPhone 13 Pro Max: 1284x2778 px
- iPhone 13 Pro: 1170x2532 px
- iPhone 13: 1170x2532 px
- iPhone 13 mini: 1080x2340 px
- iPhone 12 Pro Max: 1284x2778 px
- iPhone 12 Pro: 1170x2532 px
- iPhone 12: 1170x2532 px
- iPhone 12 mini: 1080x2340 px

### iPad
- iPad Pro 12.9": 2048x2732 px
- iPad Pro 11": 1668x2388 px
- iPad Air: 1640x2360 px
- iPad: 1620x2160 px
- iPad mini: 1488x2266 px

## Android Splash Screen Requirements

### Adaptive Splash (API 31+)
- Use adaptive icon (432x432 px)
- Background color: #F9F7F5 (brand background)
- Window background with centered logo

### Legacy Splash Screens
- xxxhdpi: 1440x2560 px
- xxhdpi: 1080x1920 px
- xhdpi: 720x1280 px
- hdpi: 540x960 px
- mdpi: 360x640 px

## Design Guidelines
- Keep splash screen duration under 3 seconds
- Use brand colors and minimal design
- Ensure smooth transition to main app
- Test on various device sizes
- Consider dark mode support
`;

  fs.writeFileSync(
    path.join(ASSETS_DIR, 'splash', 'README.md'),
    splashGuide
  );
  
  console.log('✅ Splash screen guide generated');
};

// Generate build scripts
const generateBuildScripts = () => {
  console.log('🔨 Generating build scripts...');
  
  const packageJsonScripts = `
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
`;

  fs.writeFileSync(
    path.join(PLATFORM_DIR, 'build-scripts.md'),
    packageJsonScripts
  );
  
  console.log('✅ Build scripts documentation generated');
};

// Main setup function
const main = () => {
  console.log('🚀 Setting up platform-specific assets and configurations...\n');
  
  try {
    setupDirectories();
    generateiOSConfig();
    generateAndroidConfig();
    generateIconsGuide();
    generateSplashGuide();
    generateBuildScripts();
    
    console.log('\n✅ Platform setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Review generated configuration files');
    console.log('2. Add platform-specific assets (icons, splash screens)');
    console.log('3. Configure signing certificates');
    console.log('4. Test builds on both platforms');
    console.log('5. Submit to app stores');
    
  } catch (error) {
    console.error('❌ Error setting up platform assets:', error);
    process.exit(1);
  }
};

// Run the setup
if (require.main === module) {
  main();
}

module.exports = {
  setupDirectories,
  generateiOSConfig,
  generateAndroidConfig,
  generateIconsGuide,
  generateSplashGuide,
  generateBuildScripts,
};