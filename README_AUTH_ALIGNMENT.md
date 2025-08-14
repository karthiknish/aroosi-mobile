# Aroosi Mobile Authentication Alignment

This directory contains the work done to align the authentication system in the Aroosi Mobile project with the web project.

## Overview

The Aroosi Mobile project previously used a custom cookie-session based authentication system, while the web project uses Clerk for authentication. This update migrates the mobile app to use Clerk as well, ensuring consistency across platforms.

## Files Created/Modified

### New Files
- `contexts/ClerkAuthContext.tsx` - New Clerk-based authentication context
- `AUTH_ALIGNMENT.md` - Documentation of the alignment process
- `AUTH_ALIGNMENT_SUMMARY.md` - Summary of changes made
- `AUTH_ALIGNMENT_CHECKLIST.md` - Checklist of remaining tasks
- `AUTH_ALIGNMENT_FINAL_SUMMARY.md` - Final summary of work completed and remaining
- `scripts/updateAuth.sh` - Script to help automate remaining updates

### Modified Files
- `App.tsx` - Updated to use ClerkProvider and ClerkAuthProvider
- `src/screens/auth/LoginScreen.tsx` - Updated to use useClerkAuth
- `src/screens/auth/SignUpScreen.tsx` - Updated to use useClerkAuth
- `src/screens/auth/ForgotPasswordScreen.tsx` - Updated to use useClerkAuth
- `src/screens/auth/ResetPasswordScreen.tsx` - Updated to use useClerkAuth
- `src/navigation/RootNavigator.tsx` - Updated to use useClerkAuth
- `components/auth/SocialAuthButtons.tsx` - Updated to use Clerk's OAuth flow
- `contexts/index.ts` - Updated exports to use ClerkAuthProvider

## Remaining Work

See `AUTH_ALIGNMENT_CHECKLIST.md` and `AUTH_ALIGNMENT_FINAL_SUMMARY.md` for details on remaining work.

## Testing

After completing all updates, thoroughly test all authentication flows and related functionality.