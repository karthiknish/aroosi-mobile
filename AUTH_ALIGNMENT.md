# Aroosi Mobile Authentication Alignment with Web Project

## Overview
This document outlines the changes made to align the authentication system in the Aroosi Mobile project with the web project. The mobile app previously used a custom cookie-session based authentication system, while the web project uses Clerk for authentication. This update migrates the mobile app to use Clerk as well.

## Changes Made

### 1. New ClerkAuthProvider
- Created `ClerkAuthContext.tsx` which implements Clerk-based authentication
- Mirrors the functionality of the web project's `ClerkAuthProvider.tsx`
- Includes all the same methods and properties as the web version

### 2. Updated App Entry Point
- Modified `App.tsx` to use `ClerkProvider` and `ClerkAuthProvider`
- Added environment variable check for Clerk publishable key

### 3. Updated Authentication Screens
- Modified `LoginScreen.tsx` to use `useClerkAuth` instead of `useAuth`
- Modified `SignUpScreen.tsx` to use `useClerkAuth` instead of `useAuth`
- Modified `ForgotPasswordScreen.tsx` to use `useClerkAuth` instead of `useAuth`
- Modified `ResetPasswordScreen.tsx` to use `useClerkAuth` instead of `useAuth`

### 4. Updated Navigation
- Modified `RootNavigator.tsx` to use `useClerkAuth` instead of `useAuth`

### 5. Updated Social Authentication
- Modified `SocialAuthButtons.tsx` to use Clerk's OAuth flow directly

### 6. Updated Context Export
- Modified `contexts/index.ts` to export `ClerkAuthProvider` instead of `AuthProvider`

## Environment Variables
The mobile app now requires the following environment variable:
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk publishable key

## Migration Notes
1. All existing authentication hooks should be updated to use `useClerkAuth` instead of `useAuth`
2. The `AuthProvider` component has been replaced with `ClerkAuthProvider`
3. Social authentication now uses Clerk's OAuth flow directly
4. The old `AuthContext.tsx` file can be removed once the migration is complete

## Testing
After implementing these changes, thoroughly test:
1. Email/password sign in
2. Email/password sign up
3. Google OAuth sign in
4. Password reset flow
5. Sign out functionality
6. Session persistence across app restarts