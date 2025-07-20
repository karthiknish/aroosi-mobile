# Authentication Flow Alignment Guide

## Overview
This document outlines the alignment of authentication flows between the web (aroosi) and mobile (aroosi-mobile) applications to ensure consistent user experience across platforms.

## ✅ Current Alignment Status

### Email/Password Authentication
- **Status**: ✅ Fully Aligned
- **Web**: Native Next.js API routes with JWT tokens
- **Mobile**: Direct API calls to web endpoints with JWT tokens
- **Required Fields**: email, password
- **Response**: JWT token + user object

### Email Verification (OTP)
- **Status**: ✅ Fully Aligned
- **Web**: 6-digit OTP sent via email
- **Mobile**: 6-digit OTP sent via email
- **Flow**: Registration → OTP verification → Profile creation

### Password Reset
- **Status**: ✅ Fully Aligned
- **Web**: Email → OTP → New password
- **Mobile**: Email → OTP → New password
- **Endpoints**: `/auth/forgot-password` and `/auth/reset-password`

### User Registration Data
- **Status**: ✅ Fully Aligned
- **Required Fields**: firstName, lastName, email, password
- **Password Requirements**: Minimum 8 characters
- **Email Validation**: Standard email format

### Session Management
- **Status**: ✅ Aligned (Different storage methods)
- **Web**: JWT tokens in httpOnly cookies
- **Mobile**: JWT tokens in SecureStore (encrypted storage)

## ❌ Areas Requiring Implementation

### Social Authentication
- **Status**: ❌ Needs Implementation
- **Web**: ✅ Google OAuth fully implemented with account linking
- **Mobile**: ❌ Placeholder only - needs Google Sign-In integration

#### Implementation Steps for Mobile Google Auth:

1. **Install Dependencies**:
```bash
npm install @react-native-google-signin/google-signin
# For iOS, also run: cd ios && pod install
```

2. **Configure Google Sign-In**:
```javascript
// In your app initialization
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  offlineAccess: false,
});
```

3. **Update SocialAuthButtons Component**:
Replace the placeholder implementation with actual Google Sign-In flow.

4. **Update Android Configuration**:
Add to `android/app/build.gradle`:
```gradle
implementation 'com.google.android.gms:play-services-auth:20.7.0'
```

5. **Update iOS Configuration**:
Add to `ios/Podfile`:
```ruby
pod 'GoogleSignIn', '~> 7.0'
```

## API Endpoint Structure

### Web Endpoints (aroosi)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/google` - Google OAuth
- `POST /api/auth/verify-otp` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `GET /api/auth/me` - Get current user

### Mobile Usage
Mobile uses the same endpoints via direct API calls:
- Base URL: `https://www.aroosi.app/api`
- Authentication: Bearer token in Authorization header

## User Object Structure

### Common Fields
```typescript
interface User {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  createdAt?: number;
  profile?: {
    id: string;
    fullName?: string;
    isProfileComplete?: boolean;
    isOnboardingComplete?: boolean;
  };
}
```

## Error Handling Alignment

### Error Response Format
```typescript
interface ErrorResponse {
  success: false;
  error: string;
}
```

### Common Error Messages
- **Invalid Credentials**: "Invalid email or password"
- **Email Exists**: "Email already registered"
- **Invalid OTP**: "Invalid or expired verification code"
- **Network Error**: "Network error. Please check your connection."

## Security Considerations

### Token Storage
- **Web**: httpOnly cookies (secure, XSS-resistant)
- **Mobile**: SecureStore (encrypted device storage)

### Token Expiration
- **Access Token**: 24 hours
- **Refresh Token**: 30 days (both platforms)

### HTTPS Enforcement
- **Web**: Automatic redirect to HTTPS
- **Mobile**: API calls use HTTPS endpoints

## Implementation Checklist

### Immediate Actions
- [ ] Install Google Sign-In dependencies
- [ ] Configure Google Sign-In for React Native
- [ ] Update SocialAuthButtons with real implementation
- [ ] Test Google OAuth flow end-to-end
- [ ] Verify account linking works correctly

### Testing Requirements
- [ ] Test email/password registration
- [ ] Test email verification flow
- [ ] Test password reset flow
- [ ] Test Google OAuth registration
- [ ] Test Google OAuth login
- [ ] Test account linking for existing users
- [ ] Test session persistence
- [ ] Test logout functionality

### Future Enhancements
- [ ] Add Apple Sign-In (iOS)
- [ ] Add Facebook Login
- [ ] Add phone number authentication
- [ ] Add biometric authentication
- [ ] Add social account unlinking

## Environment Variables

### Required for Mobile
```bash
EXPO_PUBLIC_API_URL=https://www.aroosi.app/api
GOOGLE_WEB_CLIENT_ID=your_web_client_id
```

### Required for Web
```bash
GOOGLE_CLIENT_ID=your_web_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=https://www.aroosi.app
```

## Troubleshooting

### Common Issues
1. **Google Sign-In Not Working**: Check client ID configuration
2. **OTP Not Received**: Check email service configuration
3. **Token Expired**: Implement automatic refresh
4. **CORS Issues**: Ensure proper CORS configuration on web

## Summary of Changes Made

1. **Updated SocialAuthButtons component** to provide proper Google Sign-In implementation guidance
2. **Fixed authentication flow alignment** between web and mobile
3. **Documented all alignment issues** and provided implementation steps
4. **Verified consistent error handling** across platforms
5. **Ensured API endpoint consistency** between web and mobile

The authentication flows are now aligned except for the Google OAuth implementation on mobile, which has been documented with clear implementation steps.