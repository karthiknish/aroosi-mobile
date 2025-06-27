# Development Setup Instructions

## Node.js Compatibility Issue

This project currently has a known compatibility issue with Node.js v20+ and Expo SDK 53. The error `ERR_UNKNOWN_FILE_EXTENSION` occurs when trying to start the development server.

## Current Status

✅ **Dependencies installed** - All required packages are installed
✅ **TypeScript configuration** - Properly configured with expo/tsconfig.base
✅ **Metro configuration** - Set up with TypeScript support
✅ **Project structure** - All files and folders are properly organized

❌ **Development server** - Cannot start due to Node.js v20+ compatibility issue

## Workarounds

### Option 1: Use Node.js v18 LTS (Recommended)
```bash
# Install Node.js v18 LTS using nvm
nvm install 18
nvm use 18
npm start
```

### Option 2: Use the workaround script
```bash
# Use the provided script that attempts to work around the issue
./expo-start.sh
```

### Option 3: Wait for Expo SDK 54
The Expo team is aware of this issue and it should be resolved in SDK 54.

## Commands to run after Node.js downgrade

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Start development server
npm start

# Type checking
npm run tsc

# Build for production
npx expo export
```

## Issue Reference

This is a known issue tracked at: https://github.com/expo/expo/issues/37633

The issue affects Node.js v20+ with Expo SDK 53 due to how Node.js handles TypeScript files in node_modules.