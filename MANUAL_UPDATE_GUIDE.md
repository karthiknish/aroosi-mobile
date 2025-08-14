# Manual Update Guide for Authentication Alignment

## Overview

This guide provides instructions for manually updating the remaining files that use the old authentication system to use the new Clerk-based authentication system.

## Key Differences Between Old and New Authentication Systems

### Old Authentication System (AuthContext)
```typescript
const { 
  user, 
  isLoading, 
  isAuthenticated, 
  userId, 
  token, 
  isProfileComplete, 
  isOnboardingComplete,
  signIn, 
  signUp, 
  signOut, 
  refreshUser, 
  refreshProfile 
} = useAuth();
```

### New Authentication System (ClerkAuthContext)
```typescript
const { 
  user, 
  isLoading, 
  isAuthenticated, 
  isSignedIn, 
  isLoaded, 
  isProfileComplete, 
  isOnboardingComplete, 
  isAdmin, 
  userId, 
  profile, 
  error, 
  signIn, 
  signUp, 
  signInWithGoogle, 
  signOut, 
  verifyEmailCode, 
  refreshUser, 
  resendEmailVerification, 
  refreshProfile 
} = useClerkAuth();
```

## Update Process

### 1. Update Import Statements

**Old:**
```typescript
import { useAuth } from "../contexts/AuthContext";
```

**New:**
```typescript
import { useClerkAuth } from "../contexts/ClerkAuthContext";
```

### 2. Update Hook Usage

**Old:**
```typescript
const { user, signIn, signOut, isLoading } = useAuth();
```

**New:**
```typescript
const { user, signIn, signOut, isLoading } = useClerkAuth();
```

### 3. Update Property Names (if needed)

Most property names are the same between the two systems, but there are some differences:

- `isAuthenticated` is available in both systems
- `token` is not available in the new system (use Clerk's token system instead)
- `isSignedIn` is available in the new system (equivalent to `isAuthenticated`)
- `isLoaded` is available in the new system
- `isAdmin` is available in the new system
- `profile` is available in the new system
- `error` is available in the new system
- `signInWithGoogle` is available in the new system
- `verifyEmailCode` is available in the new system
- `resendEmailVerification` is available in the new system

### 4. Update API Service Files

The API service files need to be updated to work with Clerk's authentication system instead of the custom cookie-based system.

**Old auth.ts:**
```typescript
import CookieManager from '@react-native-cookies/cookies';
import { http } from './http';

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Uses cookie-based authentication
  const res = await http.post('/api/auth/signin', { email, password }, { withCredentials: true });
  // ...
}
```

**New auth.ts (conceptual):**
```typescript
// Uses Clerk's authentication system
import { useSignIn } from '@clerk/clerk-expo';

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  // Uses Clerk's signIn hook
  const { signIn } = useSignIn();
  // ...
}
```

## Files That Need Manual Updates

### Hooks
1. `hooks/useContact.ts`
2. `hooks/useImageUpload.ts`
3. `hooks/useInAppPurchase.ts`
4. `hooks/useInterests.ts`
5. `hooks/useMessageSync.ts`
6. `hooks/useMessagingApi.ts`
7. `hooks/useMessagingSecurity.ts`
8. `hooks/useOfflineMessaging.ts`
9. `hooks/useOneSignal.ts`
10. `hooks/useOptimizedRealtime.ts`
11. `hooks/usePhotoManagement.ts`
12. `hooks/useRealtime.ts`
13. `hooks/useRealtimeMessaging.ts`
14. `hooks/useSubscription.ts`

### Components
1. `components/onboarding/OnboardingGuard.tsx`
2. `src/providers/NotificationProvider.tsx`
3. `src/screens/main/ChatScreen.tsx`
4. `src/screens/main/ConversationListScreen.tsx`
5. `src/screens/main/EditProfileScreen.tsx`
6. `src/screens/main/MatchesScreen.tsx`
7. `src/screens/main/ProfileDetailScreen.tsx`
8. `src/screens/main/ProfileScreen.tsx`
9. `src/screens/main/SearchScreen.tsx`
10. `src/screens/main/SubscriptionScreen.tsx`
11. `src/screens/onboarding/ProfileSetupScreen.tsx`
12. `src/screens/onboarding/WelcomeScreen.tsx`
13. `src/screens/settings/SettingsScreen.tsx`

### Utilities
1. `utils/enhancedApiClient.ts`
2. `utils/unifiedMessagingApi.ts`

### Tests
1. `__tests__/auth.test.ts`
2. `__tests__/integration/finalValidation.test.ts`
3. `__tests__/integration/userJourney.test.ts`
4. `__tests__/security.test.ts`

## Example Updates

### Before (useAuth)
```typescript
import { useAuth } from "../contexts/AuthContext";

export function useContact() {
  const { user } = useAuth();
  
  // ... rest of the hook
}
```

### After (useClerkAuth)
```typescript
import { useClerkAuth } from "../contexts/ClerkAuthContext";

export function useContact() {
  const { user } = useClerkAuth();
  
  // ... rest of the hook
}
```

## API Service Updates

The API service files need more substantial updates to work with Clerk's authentication system:

### Before (cookie-based)
```typescript
// services/auth.ts
import CookieManager from '@react-native-cookies/cookies';
import { http } from './http';

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const res = await http.post('/api/auth/signin', { email, password }, { withCredentials: true });
  // ...
}
```

### After (Clerk-based - conceptual)
```typescript
// services/auth.ts
import { useSignIn } from '@clerk/clerk-expo';

export async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  const { signIn } = useSignIn();
  try {
    const result = await signIn.create({
      identifier: email,
      password,
    });
    
    if (result.status === "complete") {
      return { success: true };
    } else {
      return { success: false, error: "Sign in requires additional verification" };
    }
  } catch (error) {
    return { success: false, error: "Sign in failed" };
  }
}
```

## Testing

After updating each file, test the functionality to ensure it works correctly with the new authentication system.

## Common Issues and Solutions

1. **Missing properties**: If a component was using a property that's not available in the new system, you may need to adjust the logic or find an alternative approach.

2. **Token-based API calls**: If a component was using the `token` property to make authenticated API calls, you'll need to update it to use Clerk's token system or the new authentication context's methods.

3. **Type mismatches**: The types for the user object and other properties may be different between the two systems, so you may need to update type definitions or casting.

4. **API service integration**: The API service files will need substantial updates to work with Clerk's authentication system instead of the custom cookie-based system.