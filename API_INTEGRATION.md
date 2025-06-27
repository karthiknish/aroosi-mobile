# Aroosi Mobile - API Integration Guide

## Overview

This document outlines the complete API structure for the Aroosi mobile application. The backend is built using **Convex** (real-time serverless database) and **REST APIs**, with **Clerk** handling authentication.

The mobile app has been configured to use the web app's API endpoints, creating a unified architecture where:

- **Web App**: Runs on `http://localhost:3000` with full Convex backend
- **Mobile App**: Makes API calls to the web app at `http://localhost:3000/api`

## Base Configuration

### Environment Variables Required
```bash
# Clerk Authentication (same as web version)
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here

# API Configuration - Point to web app
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# For production:
# EXPO_PUBLIC_API_URL=https://your-web-app.vercel.app/api

# Push Notifications
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id_here

# Stripe (same as web version)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### Authentication Setup
- **Provider**: Clerk
- **Token Type**: JWT
- **Integration**: Use `@clerk/clerk-expo` for React Native
- **Auth Pattern**: All API calls require valid JWT token

## API Architecture

### 1. REST API Endpoints
**Usage**: All mobile operations go through web app REST APIs
**Client**: `axios` or `fetch` via `apiClient`

### 2. Real-time Features
**Usage**: Implement using polling or WebSocket connections to web app
**Pattern**: Mobile app connects to web app's real-time endpoints

---

## 🔐 Authentication APIs

### Clerk Integration
```typescript
// Setup in App.tsx
import { ClerkProvider } from '@clerk/clerk-expo';

// Use in components
import { useAuth } from '@clerk/clerk-expo';
const { userId, getToken } = useAuth();
```

### Auth Functions
- **Login/Register**: Handled by Clerk components
- **Token Refresh**: Automatic via Clerk
- **Logout**: `signOut()` from Clerk

---

## 👤 Profile Management

### Get Current User Profile
```typescript
// Using existing apiClient
import { useApiClient } from '../utils/api';
import { useQuery } from '@tanstack/react-query';

const apiClient = useApiClient();

const { data: profile } = useQuery({
  queryKey: ['currentProfile'],
  queryFn: async () => {
    const response = await apiClient.getProfile();
    return response.success ? response.data : null;
  },
  enabled: !!userId,
});
```

### Update Profile
```typescript
// PUT /api/profile
const updateProfile = async (updates: Partial<Profile>) => {
  const response = await apiClient.updateProfile(updates);
  return response;
};

// Usage
await updateProfile({
  fullName: "John Doe",
  dateOfBirth: "1990-01-01",
  gender: "male",
  ukCity: "London",
  // ... other fields
});
```

### Create Profile
```typescript
// POST /api/profile
const createProfile = async (profileData: CreateProfileData) => {
  const response = await apiClient.createProfile(profileData);
  return response;
};
```

---

## 📸 Image Management

### Upload Profile Image
```typescript
// POST /api/profile-images/upload-url - Get upload URL
// POST [upload-url] - Upload to Convex storage
// POST /api/profile-images - Save image metadata

const uploadProfileImage = async (imageFile: File) => {
  // 1. Get upload URL
  const uploadUrlResponse = await apiClient.getImageUploadUrl();
  
  // 2. Upload image
  const formData = new FormData();
  formData.append('file', imageFile);
  
  const uploadResponse = await fetch(uploadUrlResponse.uploadUrl, {
    method: 'POST',
    body: formData,
  });
  
  const { storageId } = await uploadResponse.json();
  
  // 3. Save metadata
  const saveResponse = await apiClient.saveProfileImage({
    storageId,
    fileName: imageFile.name,
    contentType: imageFile.type,
    fileSize: imageFile.size
  });
  
  return saveResponse;
};
```

### Get Profile Images
```typescript
// GET /api/profile-images
const { data: profileImages } = useQuery({
  queryKey: ['profileImages'],
  queryFn: async () => {
    const response = await apiClient.getProfileImages();
    return response.success ? response.data : [];
  },
  enabled: !!userId,
});
```

### Delete Profile Image
```typescript
// DELETE /api/profile-images
const deleteImage = async (imageId: string) => {
  const response = await apiClient.deleteProfileImage(imageId);
  return response;
};
```

### Reorder Images
```typescript
// PUT /api/profile-images/order
const updateImageOrder = async (imageIds: string[]) => {
  const response = await apiClient.updateImageOrder(imageIds);
  return response;
};
```

---

## 🔍 Search & Discovery

### Search Profiles
```typescript
// GET /api/search
const searchProfiles = async (filters: SearchFilters, page: number = 1) => {
  const response = await apiClient.searchProfiles(filters, page);
  return response;
};

// Usage with React Query
const { data: searchResults } = useQuery({
  queryKey: ['searchProfiles', filters, page],
  queryFn: () => searchProfiles(filters, page),
});
```

### Get Public Profile
```typescript
// GET /api/profile-detail/{userId}
const getPublicProfile = async (userId: string) => {
  const response = await apiClient.getPublicProfile(userId);
  return response;
};
```

### Available Search Filters
```typescript
interface SearchFilters {
  gender?: "male" | "female" | "other";
  ageMin?: number;
  ageMax?: number;
  ukCity?: string[];
  maritalStatus?: string[];
  education?: string[];
  occupation?: string[];
  diet?: string[];
  smoking?: string[];
  drinking?: string[];
  // Premium filters (Premium Plus only)
  annualIncomeMin?: number;
  heightMin?: string;
  heightMax?: string;
}
```

---

## 💕 Interest System (Likes/Matches)

### Send Interest
```typescript
// POST /api/interests
const sendInterest = async (toUserId: string) => {
  const response = await apiClient.sendInterest(toUserId);
  return response;
};
```

### Get Sent Interests
```typescript
// GET /api/interests?type=sent
const { data: sentInterests } = useQuery({
  queryKey: ['sentInterests'],
  queryFn: async () => {
    const response = await apiClient.getSentInterests();
    return response.success ? response.data : [];
  },
});
```

### Get Received Interests
```typescript
// GET /api/interests?type=received
const { data: receivedInterests } = useQuery({
  queryKey: ['receivedInterests'],
  queryFn: async () => {
    const response = await apiClient.getReceivedInterests();
    return response.success ? response.data : [];
  },
});
```

### Respond to Interest
```typescript
// PUT /api/interests/{interestId}
const respondToInterest = async (interestId: string, status: 'accepted' | 'rejected') => {
  const response = await apiClient.respondToInterest(interestId, status);
  return response;
};
```

### Get Matches
```typescript
// GET /api/matches
const { data: matches } = useQuery({
  queryKey: ['matches'],
  queryFn: async () => {
    const response = await apiClient.getMatches();
    return response.success ? response.data : [];
  },
});
```

---

## 💬 Messaging System

### Get Messages
```typescript
// GET /api/match-messages?conversationId={id}&limit=50&before={messageId}
const getMessages = async (conversationId: string, before?: string) => {
  const response = await apiClient.getMessages(conversationId, { before, limit: 50 });
  return response;
};
```

### Send Message
```typescript
// POST /api/match-messages
const sendMessage = async (conversationId: string, toUserId: string, text: string) => {
  const response = await apiClient.sendMessage({
    conversationId,
    toUserId,
    text
  });
  return response;
};
```

### Mark Messages as Read
```typescript
// POST /api/messages/mark-read
const markAsRead = async (conversationId: string) => {
  const response = await apiClient.markMessagesAsRead(conversationId);
  return response;
};
```

### Get Unread Counts
```typescript
// GET /api/messages/unread-counts
const { data: unreadCounts } = useQuery({
  queryKey: ['unreadCounts'],
  queryFn: async () => {
    const response = await apiClient.getUnreadCounts();
    return response.success ? response.data : {};
  },
});
```

---

## 🛡️ Safety & Blocking

### Block User
```typescript
// POST /api/safety/block
const blockUser = async (blockedUserId: string) => {
  const response = await apiClient.blockUser(blockedUserId);
  return response;
};
```

### Unblock User
```typescript
// POST /api/safety/unblock
const unblockUser = async (blockedUserId: string) => {
  const response = await apiClient.unblockUser(blockedUserId);
  return response;
};
```

### Report User
```typescript
// POST /api/safety/report
const reportUser = async (reportedUserId: string, reason: string, description?: string) => {
  const response = await apiClient.reportUser({
    reportedUserId,
    reason,
    description
  });
  return response;
};
```

### Get Blocked Users
```typescript
// GET /api/safety/blocked
const { data: blockedUsers } = useQuery({
  queryKey: ['blockedUsers'],
  queryFn: async () => {
    const response = await apiClient.getBlockedUsers();
    return response.success ? response.data : [];
  },
});
```

---

## 💳 Subscription Management

### Get Subscription Status
```typescript
// GET /api/subscription/status
const { data: subscription } = useQuery({
  queryKey: ['subscription'],
  queryFn: async () => {
    const response = await apiClient.getSubscriptionStatus();
    return response.success ? response.data : null;
  },
});
```

### Purchase Subscription
```typescript
// POST /api/subscription/purchase
const purchaseSubscription = async (planType: string, paymentMethodId: string) => {
  const response = await apiClient.purchaseSubscription({
    planType,
    paymentMethodId
  });
  return response;
};
```

### Cancel Subscription
```typescript
// POST /api/subscription/cancel
const cancelSubscription = async () => {
  const response = await apiClient.cancelSubscription();
  return response;
};
```

### Get Usage Statistics
```typescript
// GET /api/subscription/usage
const { data: usageStats } = useQuery({
  queryKey: ['usageStats'],
  queryFn: async () => {
    const response = await apiClient.getUsageStats();
    return response.success ? response.data : null;
  },
});
```

---

## 🚀 Premium Features

### Profile Boost (Premium Plus)
```typescript
// POST /api/profile/boost
const boostProfile = async () => {
  const response = await apiClient.boostProfile();
  return response;
};
```

### Grant Spotlight Badge
```typescript
// POST /api/profile/spotlight
const grantSpotlight = async (durationDays: number = 7) => {
  const response = await apiClient.grantSpotlight(durationDays);
  return response;
};
```

### Record Profile View (Premium Plus)
```typescript
// POST /api/profile/view
const recordProfileView = async (profileId: string) => {
  const response = await apiClient.recordProfileView(profileId);
  return response;
};
```

### Get Profile Viewers (Premium Plus)
```typescript
// GET /api/profile/viewers
const { data: profileViewers } = useQuery({
  queryKey: ['profileViewers'],
  queryFn: async () => {
    const response = await apiClient.getProfileViewers();
    return response.success ? response.data : [];
  },
});
```

---

## 📱 Mobile-Specific APIs

### Push Notifications
```typescript
// POST /api/push/register
const registerPushToken = async (deviceToken: string, platform: 'ios' | 'android') => {
  const response = await apiClient.registerPushToken({
    deviceToken,
    platform
  });
  return response;
};
```

### Voice Messages
```typescript
// POST /api/voice-messages/upload
const uploadVoiceMessage = async (audioFile: File) => {
  const response = await apiClient.uploadVoiceMessage(audioFile);
  return response;
};

// POST /api/voice-messages/send
const sendVoiceMessage = async (conversationId: string, voiceMessageId: string) => {
  const response = await apiClient.sendVoiceMessage({
    conversationId,
    voiceMessageId
  });
  return response;
};
```

---

## 📊 Analytics & Tracking

### Track App Events
```typescript
// POST /api/analytics/track
const trackEvent = async (event: string, properties: Record<string, any>) => {
  const response = await apiClient.trackEvent({
    event,
    properties
  });
  return response;
};
```

---

## 🔧 Utility APIs

### Get UK Cities List
```typescript
// GET /api/utilities/uk-cities
const { data: ukCities } = useQuery({
  queryKey: ['ukCities'],
  queryFn: async () => {
    const response = await apiClient.getUKCities();
    return response.success ? response.data : [];
  },
});
```

### Validate Postcode
```typescript
// POST /api/utilities/validate-postcode
const validatePostcode = async (postcode: string) => {
  const response = await apiClient.validatePostcode(postcode);
  return response;
};
```

---

## 📝 Error Handling

### Standard Error Response
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  }
}
```

### Common Error Codes
- `UNAUTHORIZED` - Invalid or missing auth token
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid input data
- `RATE_LIMITED` - Too many requests
- `SUBSCRIPTION_REQUIRED` - Premium feature requires subscription
- `PROFILE_INCOMPLETE` - Profile must be completed first

---

## 🚦 Rate Limiting

### Limits by Operation
- **Authentication**: 5 attempts / 15 minutes
- **Profile Updates**: 10 requests / minute
- **Search**: 100 requests / minute
- **Messaging**: 20 messages / minute
- **Image Upload**: 5 uploads / minute
- **Interests**: 50 per day (free), unlimited (premium)

---

## 🏗️ Implementation Guidelines for Mobile Screens

### 1. Authentication Screens
```typescript
// Login/Signup - Use Clerk components
import { SignInButton, SignUpButton } from '@clerk/clerk-expo';
```

### 2. Profile Screens
```typescript
// ProfileScreen.tsx - Already implemented
// EditProfileScreen.tsx - Use updateProfile mutation
// Integrate with image upload flow
```

### 3. Search Screen
```typescript
// Use searchProfiles with filters
// Implement infinite scrolling with pagination
// Cache results for offline viewing
```

### 4. Matches Screen
```typescript
// Combine getSentInterests + getReceivedInterests
// Filter for mutual matches (status: "accepted")
// Real-time updates via polling
```

### 5. Chat Screen
```typescript
// Use getMessages with pagination
// Implement message sending with sendMessage
// Handle read receipts with markMessagesAsRead
// Implement polling for real-time updates
```

### 6. Subscription Screen
```typescript
// Display current plan status
// Integrate Stripe for payments
// Show usage statistics for Premium Plus
```

---

## 🎯 Next Steps for Implementation

### Phase 1: Core Authentication
1. ✅ Set up Clerk provider in App.tsx
2. ❌ Create auth context wrapper
3. ❌ Implement login/signup screens

### Phase 2: Profile Management
1. ✅ Complete profile creation flow
2. ❌ Implement image upload functionality
3. ✅ Build profile editing screens

### Phase 3: Core Features
1. ❌ Search and discovery
2. ❌ Interest system (like/match)
3. ❌ Basic messaging

### Phase 4: Premium Features
1. ❌ Subscription management
2. ❌ Premium-only features
3. ❌ Push notifications

### Phase 5: Safety & Polish
1. ❌ Blocking and reporting
2. ❌ Error handling
3. ❌ Offline support
4. ❌ Performance optimization

---

## Development Workflow

### Running Both Apps

1. **Start Web App** (must be running first):
   ```bash
   cd aroosi
   npm run dev    # Starts on http://localhost:3000
   ```

2. **Start Mobile App**:
   ```bash
   cd aroosi-mobile
   npm start      # Starts Expo dev server
   ```

### Data Flow

```
Mobile App → API Call → Web App → Convex → Database
    ↑                                         ↓
    ← ← ← ← ← ← Response ← ← ← ← ← ← ← ← ← ← ← ←
```

## Benefits of This Architecture

1. **Single Source of Truth**: All data lives in one Convex backend
2. **Simplified Deployment**: Only need to deploy web app backend
3. **Consistent Logic**: Same business logic for web and mobile
4. **Cost Effective**: One Convex deployment instead of two
5. **Easy Maintenance**: Backend changes apply to both apps

## Authentication Flow

1. Mobile app uses Clerk Expo SDK
2. Same Clerk application as web app
3. Mobile gets JWT token from Clerk
4. Token sent as `Authorization: Bearer <token>` to web API
5. Web app validates token with Clerk and processes request

## Testing

To test the integration:

1. Ensure web app is running on `http://localhost:3000`
2. Start mobile app with `npm start`
3. Sign in through mobile app (should work with same Clerk account as web)
4. Navigate through app (profile, subscription features should work)

## Production Deployment

For production:
1. Deploy web app to Vercel/similar
2. Update mobile app's `EXPO_PUBLIC_API_URL` to production web app URL
3. Build mobile app for app stores
4. Same Clerk and Convex instances serve both apps

## Troubleshooting

- **Connection Refused**: Make sure web app is running on port 3000
- **401 Unauthorized**: Check Clerk configuration matches between apps  
- **CORS Issues**: Web app should be configured to accept requests from mobile
- **Token Issues**: Verify Clerk publishable key is same in both apps

---

## 📚 TypeScript Types

All types are available in the main aroosi project under:
- `packages/shared-types/` - Shared type definitions
- `convex/schema.ts` - Database schema types
- Auto-generated Convex types in `convex/_generated/`

Import types from the main project or recreate them in the mobile app's `types/` directory.

## Screen Implementation Status

### ✅ Completed
- ProfileScreen.tsx (already exists)
- Basic navigation structure
- Clerk authentication setup
- API client configuration

### ❌ Remaining Work from Checklist
- Auth context wrapper
- Remove blog tables from schema
- Complete Convex backend functions
- Build remaining screens (Auth, Onboarding, Main app screens)
- Implement missing components
- Add error handling and safety features