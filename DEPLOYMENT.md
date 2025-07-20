# Aroosi Mobile - Production Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Aroosi mobile application to production using the configured CI/CD pipeline.

## Prerequisites

### Required Accounts
- [ ] Apple Developer Account (for iOS deployment)
- [ ] Google Play Console Account (for Android deployment)
- [ ] Expo Account (for EAS services)
- [ ] GitHub Account (for CI/CD pipeline)

### Required Tools
- [ ] Node.js 20.x
- [ ] npm or yarn
- [ ] EAS CLI (`npm install -g eas-cli`)
- [ ] Git

## Environment Setup

### 1. Environment Variables
Create the following environment files:

```bash
# Copy the example file
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

### 2. Secrets Configuration
Create the following secrets files:

```bash
# Create secrets directory
mkdir -p secrets

# Google Service Account (for Android deployment)
# Place your google-service-account.json here
# Get this from Google Play Console → Setup → API access

# Apple App Store credentials
# These will be configured as GitHub secrets
```

### 3. GitHub Secrets
Configure the following secrets in your GitHub repository:

#### Required Secrets
- `EXPO_TOKEN` - Your Expo token (get from expo.dev/settings/access-tokens)
- `APPLE_ID` - Your Apple ID email
- `APPLE_TEAM_ID` - Your Apple Developer Team ID
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password for Apple ID
- `ASC_APP_ID` - Your App Store Connect App ID
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Contents of google-service-account.json
- `API_BASE_URL` - Your production API URL
- `FIREBASE_API_KEY` - Firebase API key
- `FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `FIREBASE_PROJECT_ID` - Firebase project ID
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `FIREBASE_APP_ID` - Firebase app ID
- `REVENUECAT_API_KEY` - RevenueCat API key
- `SENTRY_DSN` - Sentry DSN for error tracking
- `GOOGLE_MAPS_API_KEY` - Google Maps API key

## Deployment Process

### 1. Initial Setup
```bash
# Install dependencies
npm install

# Login to EAS
eas login

# Configure EAS project
eas build:configure
```

### 2. Build for Production
```bash
# Build for iOS
eas build -p ios --profile production

# Build for Android
eas build -p android --profile production
```

### 3. Submit to App Stores
```bash
# Submit iOS to App Store
eas submit -p ios --profile production

# Submit Android to Google Play
eas submit -p android --profile production
```

### 4. Automated Deployment
The CI/CD pipeline will automatically:
- Run tests on every PR
- Build and deploy to staging on develop branch
- Build and deploy to production on main branch
- Create releases on GitHub releases

## Branch Strategy

- `main` - Production branch (triggers production deployment)
- `develop` - Staging branch (triggers staging deployment)
- `staging` - Staging environment branch
- `feature/*` - Feature branches (run tests only)

## Testing Before Deployment

### 1. Run All Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### 2. Test on Real Devices
- Test on iOS devices (iPhone/iPad)
- Test on Android devices (various screen sizes)
- Test offline functionality
- Test performance with large datasets

### 3. Security Testing
- Run security scan: `npm run security:scan`
- Check for sensitive data exposure
- Verify API endpoints are secure

## Monitoring and Maintenance

### 1. Error Tracking
- Monitor Sentry dashboard for errors
- Set up alerts for critical issues
- Review error trends weekly

### 2. Performance Monitoring
- Monitor app performance metrics
- Track crash rates and ANRs
- Monitor API response times

### 3. App Store Management
- Monitor app store reviews
- Respond to user feedback
- Update app metadata regularly

## Rollback Procedure

### 1. Emergency Rollback
```bash
# Rollback to previous version
eas build:rollout --channel production --percentage 0
```

### 2. Gradual Rollback
```bash
# Gradual rollback (e.g., 50% of users)
eas build:rollout --channel production --percentage 50
```

## Troubleshooting

### Common Issues

#### Build Failures
- Check environment variables are set correctly
- Verify all dependencies are installed
- Check for iOS/Android specific issues

#### Deployment Failures
- Verify app store credentials are correct
- Check app store compliance
- Review build logs for specific errors

#### Performance Issues
- Use performance monitoring tools
- Check for memory leaks
- Optimize image sizes and assets

## Support
For deployment issues, contact:
- Technical Lead: [your-email@company.com]
- DevOps Team: [devops@company.com]

## Resources
- [Expo EAS Documentation](https://docs.expo.dev/build/introduction/)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)