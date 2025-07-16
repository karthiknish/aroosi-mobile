# Aroosi Mobile API Documentation

## Overview

This document describes the API integration for the Aroosi Mobile application, which is fully aligned with the web application's backend services.

## Base Configuration

### Environment URLs
- **Development**: `http://localhost:3000/api`
- **Staging**: `https://staging-api.aroosi.com/api`
- **Production**: `https://api.aroosi.com/api`

### Authentication
All API requests require Bearer token authentication:
```
Authorization: Bearer <access_token>
```

## API Client Usage

### Basic Usage
```typescript
import { apiClient } from '../utils/api';

// Get user profile
const profile = await apiClient.getProfile();

// Update profile
const updatedProfile = await apiClient.updateProfile({
  fullName: 'John Doe',
  city: 'New York'
});
```

### Error Handling
```typescript
try {
  const result = await apiClient.getProfile();
  if (result.success) {
    console.log('Profile:', result.data);
  } else {
    console.error('Error:', result.error);
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```typescript
{
  email: string;
  password: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  agreeToTerms: boolean;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    user: User;
    requiresVerification: boolean;
    message: string;
  };
  error?: ApiError;
}
```

### POST /auth/login
Authenticate user and receive tokens.

**Request Body:**
```typescript
{
  email: string;
  password: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    user: User;
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiresAt: number;
    };
    profile?: {
      id: string;
      isComplete: boolean;
      isOnboardingComplete: boolean;
    };
  };
  error?: ApiError;
}
```

### POST /auth/verify-otp
Verify email with OTP code.

**Request Body:**
```typescript
{
  email: string;
  code: string;
}
```

### POST /auth/refresh
Refresh access token using refresh token.

**Request Body:**
```typescript
{
  refreshToken: string;
}
```

## Profile Endpoints

### GET /profile
Get current user's profile.

**Response:**
```typescript
{
  success: boolean;
  data?: Profile;
  error?: ApiError;
}
```

### PUT /profile
Update user profile.

**Request Body:**
```typescript
{
  fullName?: string;
  city?: string;
  aboutMe?: string;
  // ... other profile fields
}
```

### POST /profile
Create new profile (onboarding).

**Request Body:**
```typescript
{
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  city: string;
  // ... required profile fields
}
```

## Search Endpoints

### GET /search/profiles
Search for profiles with filters.

**Query Parameters:**
```typescript
{
  city?: string;
  ageMin?: number;
  ageMax?: number;
  gender?: 'male' | 'female' | 'other' | 'any';
  maritalStatus?: string[];
  education?: string[];
  // ... other filters
  page?: number;
  limit?: number;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    profiles: ProfileSearchResult[];
    total: number;
    hasMore: boolean;
    nextPage?: number;
  };
  error?: ApiError;
}
```

## Interest Endpoints

### POST /interests
Send interest to another user.

**Request Body:**
```typescript
{
  toUserId: string;
}
```

### GET /interests/sent
Get sent interests.

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
}
```

### GET /interests/received
Get received interests.

**Query Parameters:**
```typescript
{
  page?: number;
  limit?: number;
}
```

## Messaging Endpoints

### GET /conversations
Get user's conversations.

**Response:**
```typescript
{
  success: boolean;
  data?: Conversation[];
  error?: ApiError;
}
```

### GET /conversations/:id/messages
Get messages for a conversation.

**Query Parameters:**
```typescript
{
  limit?: number;
  before?: number;
  after?: number;
}
```

### POST /conversations/:id/messages
Send a message.

**Request Body:**
```typescript
{
  text: string;
  toUserId: string;
  type?: 'text' | 'voice' | 'image';
}
```

### POST /conversations/:id/read
Mark messages as read.

### POST /conversations/:id/typing
Send typing indicator.

**Request Body:**
```typescript
{
  action: 'start' | 'stop';
}
```

## Voice Message Endpoints

### POST /messages/voice/upload-url
Get upload URL for voice message.

**Request Body:**
```typescript
{
  conversationId: string;
  fileSize: number;
  mimeType: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    uploadUrl: string;
    storageId: string;
  };
  error?: ApiError;
}
```

## Image Endpoints

### POST /images/upload-url
Get upload URL for image.

**Request Body:**
```typescript
{
  contentType: string;
}
```

### POST /images/confirm-upload
Confirm image upload.

**Request Body:**
```typescript
{
  storageId: string;
}
```

### DELETE /images/:storageId
Delete an image.

### POST /images/reorder
Reorder profile images.

**Request Body:**
```typescript
{
  imageIds: string[];
}
```

## Subscription Endpoints

### GET /subscription/status
Get subscription status.

**Response:**
```typescript
{
  success: boolean;
  data?: {
    plan: 'free' | 'premium' | 'premiumPlus';
    isActive: boolean;
    expiresAt?: number;
    features?: Record<string, boolean>;
  };
  error?: ApiError;
}
```

### POST /subscription/purchase/:tier
Purchase subscription.

**Request Body:**
```typescript
{
  productId: string;
  purchaseToken: string;
  platform: 'ios' | 'android';
  receipt?: string;
}
```

### GET /subscription/feature/:feature
Check feature access.

**Response:**
```typescript
{
  success: boolean;
  data?: {
    canUse: boolean;
    reason?: string;
    upgradeRequired?: boolean;
    usageStats?: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
  error?: ApiError;
}
```

## Safety Endpoints

### POST /safety/report
Report a user.

**Request Body:**
```typescript
{
  reportedUserId: string;
  reason: string;
  details?: string;
}
```

### POST /safety/block
Block a user.

**Request Body:**
```typescript
{
  blockedUserId: string;
}
```

### POST /safety/unblock
Unblock a user.

**Request Body:**
```typescript
{
  blockedUserId: string;
}
```

### GET /safety/blocked
Get blocked users list.

### GET /safety/block-status
Check if user is blocked.

**Query Parameters:**
```typescript
{
  profileId?: string;
  userId?: string;
}
```

## Real-time Events

### EventSource Connection
Connect to real-time events:
```
GET /realtime/events?token=<access_token>
```

### Event Types
- `new_message`: New message received
- `new_match`: New match created
- `typing_indicator`: User typing status
- `profile_view`: Profile viewed

### Event Format
```typescript
{
  type: string;
  data: any;
  timestamp: number;
}
```

## Error Handling

### Error Response Format
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### Common Error Codes
- `INVALID_CREDENTIALS`: Invalid login credentials
- `TOKEN_EXPIRED`: Access token expired
- `VALIDATION_ERROR`: Request validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `FEATURE_RESTRICTED`: Premium feature requires subscription
- `USER_NOT_FOUND`: User not found
- `NETWORK_ERROR`: Network connection error

### Rate Limiting
- Most endpoints: 100 requests per minute
- Authentication endpoints: 10 requests per minute
- Message sending: 60 messages per minute

### Retry Logic
The API client automatically retries failed requests with exponential backoff:
- Initial delay: 1 second
- Maximum retries: 3
- Backoff multiplier: 2

## Data Types

### User
```typescript
interface User {
  id: string;
  email: string;
  fullName?: string;
  profileId?: string;
  role?: 'user' | 'admin';
  isEmailVerified?: boolean;
  createdAt?: number;
  updatedAt?: number;
}
```

### Profile
```typescript
interface Profile {
  _id: string;
  userId: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  city: string;
  country: string;
  phoneNumber: string;
  aboutMe: string;
  height: string;
  maritalStatus: 'single' | 'divorced' | 'widowed' | 'annulled';
  education: string;
  occupation: string;
  annualIncome: string | number;
  profileImageUrls?: string[];
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  // ... additional fields
}
```

### Message
```typescript
interface Message {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text: string;
  type?: 'text' | 'voice' | 'image';
  createdAt: number;
  readAt?: number;
  deliveredAt?: number;
  status?: 'sent' | 'delivered' | 'read';
  // Voice message fields
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  // Image message fields
  imageStorageId?: string;
  imageUrl?: string;
}
```

## Best Practices

### Authentication
1. Always check token expiration before API calls
2. Implement automatic token refresh
3. Store tokens securely using SecureStore
4. Clear tokens on logout

### Error Handling
1. Always check the `success` field in responses
2. Implement proper error messaging for users
3. Log errors for debugging
4. Handle network errors gracefully

### Performance
1. Implement request caching where appropriate
2. Use pagination for large data sets
3. Implement offline support for critical features
4. Monitor API response times

### Security
1. Never log sensitive data (tokens, passwords)
2. Validate all user inputs
3. Use HTTPS for all requests
4. Implement proper session management