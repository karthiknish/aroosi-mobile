# CI/CD Setup Guide

## Overview

This project uses GitHub Actions for continuous integration and deployment with Expo Application Services (EAS).

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)
Runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Lint and Type Check**: TypeScript compilation and code formatting
- **Security Scan**: npm audit and vulnerability checks
- **Dependency Check**: Outdated packages and duplicates
- **Expo Doctor**: Expo-specific health checks

### 2. Build and Deploy Workflow (`.github/workflows/build-and-deploy.yml`)
Handles building and deploying the app to various environments.

**Triggers:**
- **Pull Requests**: Builds preview versions
- **Main Branch**: Builds staging versions for internal testing
- **Tags (v*)**: Builds production versions for app stores

**Jobs:**
- **Test**: Runs tests, linting, and type checking
- **Build Preview**: Creates preview builds for PRs
- **Build Staging**: Creates staging builds for main branch
- **Build Production**: Creates production builds for tagged releases

## Required Secrets

Add these secrets to your GitHub repository settings:

### Expo Secrets
```
EXPO_TOKEN=your_expo_access_token
```

### iOS Secrets (for App Store deployment)
```
APPLE_ID=your_apple_id@example.com
APPLE_APP_SPECIFIC_PASSWORD=your_app_specific_password
APPLE_TEAM_ID=your_apple_team_id
ASC_APP_ID=your_app_store_connect_app_id
```

### Android Secrets (for Google Play deployment)
```
GOOGLE_SERVICE_ACCOUNT_KEY=your_google_service_account_json
```

## EAS Configuration

The project uses EAS Build and Submit with the following profiles:

### Build Profiles
- **development**: Debug builds for development
- **staging**: Release builds for internal testing
- **preview**: Release builds for PR previews
- **production**: Store-ready builds

### Submit Profiles
- **preview**: Internal testing (TestFlight/Internal Testing)
- **production**: App stores (App Store/Google Play)

## Setup Instructions

### 1. Install EAS CLI
```bash
npm install -g @expo/cli eas-cli
```

### 2. Login to Expo
```bash
eas login
```

### 3. Configure EAS Project
```bash
eas build:configure
```

### 4. Update EAS Configuration
Edit `eas.json` and `app.json` with your app-specific details:
- Bundle identifier
- App Store Connect app ID
- Apple Team ID
- Google Play package name

### 5. Set up Credentials
```bash
# iOS credentials
eas credentials:configure -p ios

# Android credentials
eas credentials:configure -p android
```

### 6. Add GitHub Secrets
Go to your repository settings and add the required secrets listed above.

## Manual Commands

### Building
```bash
# Build for development
npm run build:ios
npm run build:android

# Build for production
eas build --platform all --profile production
```

### Submitting
```bash
# Submit to app stores
npm run submit:ios
npm run submit:android
```

### Local Development
```bash
# Start development server
npm start

# Type checking
npm run tsc

# Build export
npm run build
```

## Troubleshooting

### Node.js Version Issues
This project requires Node.js 18 due to Expo SDK 53 compatibility issues with Node.js 20+.

### Build Failures
1. Check EAS build logs in your Expo dashboard
2. Verify all required secrets are set
3. Ensure credentials are properly configured
4. Check for TypeScript errors

### Deployment Issues
1. Verify App Store Connect/Google Play Console access
2. Check app metadata and compliance
3. Ensure proper signing certificates

## Monitoring

- **Build Status**: Check GitHub Actions tab
- **EAS Builds**: Monitor in Expo dashboard
- **App Store Status**: Check App Store Connect
- **Google Play Status**: Check Google Play Console

## Support

For issues with:
- **GitHub Actions**: Check workflow logs
- **EAS Build**: Check Expo documentation
- **App Store**: Check Apple Developer documentation
- **Google Play**: Check Google Play Console help