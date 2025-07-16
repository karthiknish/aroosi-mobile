# Aroosi Mobile - API Documentation

## Overview

This document provides comprehensive API documentation for the Aroosi Mobile application. The mobile app integrates with the same backend API as the web application to ensure data consistency and feature parity.

## Base Configuration

### API Base URL
- **Production**: `https://www.aroosi.app/api`
- **Staging**: `https://staging.aroosi.app/api`
- **Development**: `http://localhost:3000/api`

### Authentication
All API requests require authentication using JWT tokens in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Request/Response Format
- **Content-Type**: `application/json`
- **Accept**: `application/json`

### Standard Response Format

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}
```

## Authentication Endpoints

### Sign Up
Create a new user account.

**Endpoint**: `POST /auth/signup`

**Request Body**:
```typescript
{
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}
```

**Response**:
```typescript
{
  success: true;
  token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    isEmailVerified: boolean;
    isProfileComplete: boolean;
    isOnboardingComplete: boolean;
  };
}
```

**Error Codes**:
- `EMAIL_EXISTS`: Email already registered
- `WEAK_PASSWORD`: Password doesn't meet requirements
- `VALIDATION_ERROR`: Invalid input data

### Sign In
Authenticate existing user.

**Endpoint**: `POST /auth/signin`

**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```

**Response**:
```typescript
{
  success: true;
  token: string;
  user: User;
}
```

**Error Codes**:
- `INVALID_CREDENTIALS`: Wrong email/password
- `EMAIL_NOT_VERIFIED`: Email verification required
- `ACCOUNT_LOCKED`: Account temporarily locked

### Verify OTP
Verify email with OTP code.

**Endpoint**: `POST /auth/verify-otp`

**Request Body**:
```typescript
{
  email: string;
  otp: string;
}
```

**Response**:
```typescript
{
  success: true;
  user: User;
}
```

**Error Codes**:
- `OTP_INVALID`: Invalid OTP code
- `OTP_EXPIRED`: OTP code expired

### Google Sign In
Authenticate with Google OAuth.

**Endpoint**: `POST /auth/google`

**Request Body**:
```typescript
{
  credential: string; // Google ID token
}
```

**Response**:
```typescript
{
  success: true;
  token: string;
  user: User;
}
```

### Refresh Token
Refresh expired JWT token.

**Endpoint**: `POST /auth/refresh`

**Request Body**:
```typescript
{
  refreshToken: string;
}
```

**Response**:
```typescript
{
  success: true;
  token: string;
  refreshToken?: string;
}
```

## Profile Endpoints

### Get Profile
Retrieve current user's profile.

**Endpoint**: `GET /profile`

**Response**:
```typescript
{
  success: true;
  data: Profile;
}
```

### Update Profile
Update user profile information.

**Endpoint**: `PUT /profile`

**Request Body**:
```typescript
{
  fullName?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  phoneNumber?: string;
  country?: string;
  city?: string;
  height?: string;
  maritalStatus?: string;
  physicalStatus?: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  education?: string;
  occupation?: string;
  annualIncome?: string;
  aboutMe?: string;
  preferredGender?: string;
  partnerPreferenceAgeMin?: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceCity?: string[];
}
```

**Response**:
```typescript
{
  success: true;
  data: Profile;
}
```

### Upload Profile Image
Upload profile image.

**Endpoint**: `POST /profile/image`

**Request**: Multipart form data with image file

**Response**:
```typescript
{
  success: true;
  data: {
    imageUrl: string;
    storageId: string;
  };
}
```

**Error Codes**:
- `FILE_TOO_LARGE`: Image exceeds size limit
- `INVALID_FILE_TYPE`: Unsupported file format
- `UPLOAD_FAILED`: Image upload failed

### Get Profile by ID
Retrieve another user's profile.

**Endpoint**: `GET /profile/:userId`

**Response**:
```typescript
{
  success: true;
  data: PublicProfile;
}
```

## Search Endpoints

### Search Profiles
Search for user profiles with filters.

**Endpoint**: `GET /search`

**Query Parameters**:
```typescript
{
  page?: number;
  limit?: number;
  gender?: 'male' | 'female' | 'other';
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

**Response**:
```typescript
{
  success: true;
  data: {
    profiles: PublicProfile[];
    totalCount: number;
    hasMore: boolean;
    nextPage?: number;
  };
}
```

**Error Codes**:
- `SUBSCRIPTION_REQUIRED`: Premium filters require subscription
- `SEARCH_LIMIT_REACHED`: Daily search limit exceeded

## Interest Endpoints

### Send Interest
Send interest to another user.

**Endpoint**: `POST /interests`

**Request Body**:
```typescript
{
  toUserId: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: Interest;
}
```

**Error Codes**:
- `INTEREST_LIMIT_REACHED`: Daily interest limit exceeded
- `ALREADY_SENT`: Interest already sent to this user
- `SELF_INTEREST`: Cannot send interest to yourself

### Get Sent Interests
Retrieve interests sent by current user.

**Endpoint**: `GET /interests/sent`

**Query Parameters**:
```typescript
{
  page?: number;
  limit?: number;
}
```

**Response**:
```typescript
{
  success: true;
  data: Interest[];
}
```

### Get Received Interests
Retrieve interests received by current user.

**Endpoint**: `GET /interests/received`

**Response**:
```typescript
{
  success: true;
  data: Interest[];
}
```

### Remove Interest
Remove sent interest.

**Endpoint**: `DELETE /interests/:interestId`

**Response**:
```typescript
{
  success: true;
}
```

### Check Interest Status
Check interest status between two users.

**Endpoint**: `GET /interests/status/:userId`

**Response**:
```typescript
{
  success: true;
  data: {
    status: 'none' | 'sent' | 'received' | 'mutual';
    interestId?: string;
  };
}
```

## Match Endpoints

### Get Matches
Retrieve user's matches (mutual interests).

**Endpoint**: `GET /matches`

**Response**:
```typescript
{
  success: true;
  data: Match[];
}
```

### Get Match Details
Get detailed information about a specific match.

**Endpoint**: `GET /matches/:matchId`

**Response**:
```typescript
{
  success: true;
  data: {
    match: Match;
    conversation: Conversation;
    messages: Message[];
  };
}
```

## Messaging Endpoints

### Get Conversations
Retrieve user's conversations.

**Endpoint**: `GET /conversations`

**Response**:
```typescript
{
  success: true;
  data: Conversation[];
}
```

### Get Messages
Retrieve messages from a conversation.

**Endpoint**: `GET /conversations/:conversationId/messages`

**Query Parameters**:
```typescript
{
  page?: number;
  limit?: number;
  before?: number; // timestamp
}
```

**Response**:
```typescript
{
  success: true;
  data: Message[];
}
```

### Send Message
Send a text message.

**Endpoint**: `POST /conversations/:conversationId/messages`

**Request Body**:
```typescript
{
  text: string;
  toUserId: string;
}
```

**Response**:
```typescript
{
  success: true;
  data: Message;
}
```

### Send Voice Message
Send a voice message.

**Endpoint**: `POST /conversations/:conversationId/voice-messages`

**Request**: Multipart form data with audio file and metadata

**Response**:
```typescript
{
  success: true;
  data: Message;
}
```

### Mark Messages as Read
Mark messages in a conversation as read.

**Endpoint**: `POST /conversations/:conversationId/mark-read`

**Response**:
```typescript
{
  success: true;
  data: {
    conversationId: string;
    messagesRead: number;
    readAt: number;
  };
}
```

### Send Typing Indicator
Send typing indicator to conversation.

**Endpoint**: `POST /conversations/:conversationId/typing`

**Request Body**:
```typescript
{
  action: 'start' | 'stop';
}
```

**Response**:
```typescript
{
  success: true;
}
```

## Subscription Endpoints

### Get Subscription Status
Retrieve current subscription information.

**Endpoint**: `GET /subscription/status`

**Response**:
```typescript
{
  success: true;
  data: {
    plan: 'free' | 'premium' | 'premiumPlus';
    isActive: boolean;
    expiresAt?: number;
    features: string[];
    usage: {
      messagesUsed: number;
      messagesLimit: number;
      interestsUsed: number;
      interestsLimit: number;
      searchesUsed: number;
      searchesLimit: number;
    };
  };
}
```

### Purchase Subscription
Purchase a subscription plan.

**Endpoint**: `POST /subscription/purchase`

**Request Body**:
```typescript
{
  planId: string;
  paymentMethodId: string;
  platform: 'mobile';
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    subscriptionId: string;
    status: 'active' | 'pending';
    plan: string;
    expiresAt: number;
  };
}
```

### Cancel Subscription
Cancel active subscription.

**Endpoint**: `POST /subscription/cancel`

**Response**:
```typescript
{
  success: true;
  data: {
    status: 'cancelled';
    expiresAt: number;
  };
}
```

### Restore Purchases
Restore previous purchases (mobile only).

**Endpoint**: `POST /subscription/restore`

**Response**:
```typescript
{
  success: true;
  data: {
    restoredPurchases: Purchase[];
  };
}
```

### Get Usage Statistics
Get current usage statistics.

**Endpoint**: `GET /subscription/usage`

**Response**:
```typescript
{
  success: true;
  data: {
    messagesUsed: number;
    messagesLimit: number;
    interestsUsed: number;
    interestsLimit: number;
    searchesUsed: number;
    searchesLimit: number;
    resetDate: number;
  };
}
```

## Safety & Security Endpoints

### Block User
Block another user.

**Endpoint**: `POST /safety/block`

**Request Body**:
```typescript
{
  userId: string;
  reason?: string;
}
```

**Response**:
```typescript
{
  success: true;
}
```

### Unblock User
Unblock a previously blocked user.

**Endpoint**: `POST /safety/unblock`

**Request Body**:
```typescript
{
  userId: string;
}
```

**Response**:
```typescript
{
  success: true;
}
```

### Get Blocked Users
Retrieve list of blocked users.

**Endpoint**: `GET /safety/blocked`

**Response**:
```typescript
{
  success: true;
  data: BlockedUser[];
}
```

### Report User
Report inappropriate behavior.

**Endpoint**: `POST /safety/report`

**Request Body**:
```typescript
{
  userId: string;
  reason: string;
  description?: string;
  evidence?: string[];
}
```

**Response**:
```typescript
{
  success: true;
  data: {
    reportId: string;
  };
}
```

## Real-time Endpoints

### Connect to Real-time Events
Establish Server-Sent Events connection.

**Endpoint**: `GET /realtime/events`

**Headers**: `Authorization: Bearer <token>`

**Event Types**:
- `new_message`: New message received
- `new_match`: New match created
- `typing_indicator`: User typing status
- `message_read`: Message read receipt
- `profile_view`: Profile viewed notification

### Update Online Status
Update user's online status.

**Endpoint**: `POST /realtime/status`

**Request Body**:
```typescript
{
  isOnline: boolean;
}
```

**Response**:
```typescript
{
  success: true;
}
```

## Push Notification Endpoints

### Register for Push Notifications
Register device for push notifications.

**Endpoint**: `POST /notifications/register`

**Request Body**:
```typescript
{
  playerId: string; // OneSignal player ID
  deviceType: 'ios' | 'android';
}
```

**Response**:
```typescript
{
  success: true;
}
```

### Update Notification Preferences
Update notification preferences.

**Endpoint**: `PUT /notifications/preferences`

**Request Body**:
```typescript
{
  newMessages: boolean;
  newMatches: boolean;
  newInterests: boolean;
  profileViews: boolean;
  marketing: boolean;
}
```

**Response**:
```typescript
{
  success: true;
}
```

## Data Types

### User
```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  isEmailVerified: boolean;
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  createdAt: number;
  updatedAt: number;
}
```

### Profile
```typescript
interface Profile {
  id: string;
  userId: string;
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  profileFor: string;
  phoneNumber: string;
  email: string;
  country: string;
  city: string;
  height: string;
  maritalStatus: string;
  physicalStatus: string;
  motherTongue?: string;
  religion?: string;
  ethnicity?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  education?: string;
  occupation?: string;
  annualIncome?: string;
  aboutMe?: string;
  preferredGender: string;
  partnerPreferenceAgeMin: number;
  partnerPreferenceAgeMax?: number;
  partnerPreferenceCity: string[];
  isProfileComplete: boolean;
  isOnboardingComplete: boolean;
  isActive: boolean;
  subscriptionPlan: 'free' | 'premium' | 'premiumPlus';
  subscriptionExpiresAt?: number;
  profileImageIds: string[];
  profileImageUrls: string[];
  createdAt: number;
  updatedAt: number;
}
```

### Interest
```typescript
interface Interest {
  _id: string;
  fromUserId: string;
  toUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: number;
  updatedAt: number;
  fromProfile?: ProfileSummary;
  toProfile?: ProfileSummary;
}
```

### Match
```typescript
interface Match {
  _id: string;
  participants: string[];
  createdAt: number;
  lastMessageAt?: number;
  conversationId: string;
  profiles: ProfileSummary[];
}
```

### Message
```typescript
interface Message {
  _id: string;
  conversationId: string;
  fromUserId: string;
  toUserId: string;
  text?: string;
  type: 'text' | 'voice' | 'image';
  createdAt: number;
  readAt?: number;
  deliveredAt?: number;
  status: 'sent' | 'delivered' | 'read';
  audioStorageId?: string;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  imageStorageId?: string;
  imageUrl?: string;
}
```

### Conversation
```typescript
interface Conversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  lastMessageAt?: number;
  unreadCount: number;
  createdAt: number;
  updatedAt: number;
}
```

## Error Handling

### Common Error Codes

- `UNAUTHORIZED`: Authentication required or invalid token
- `FORBIDDEN`: Access denied or insufficient permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMITED`: Rate limit exceeded
- `SUBSCRIPTION_REQUIRED`: Premium subscription required
- `NETWORK_ERROR`: Network connectivity issue
- `INTERNAL_SERVER_ERROR`: Server error

### Error Response Format

```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      value?: any;
      constraint?: string;
    };
  };
}
```

## Rate Limiting

### Limits by Plan

**Free Plan**:
- API requests: 100/minute
- Interests: 20/day
- Messages: 50/day
- Searches: 20/day

**Premium Plan**:
- API requests: 200/minute
- Interests: 50/day
- Messages: 200/day
- Searches: 100/day

**Premium Plus Plan**:
- API requests: 500/minute
- Interests: 100/day
- Messages: Unlimited
- Searches: Unlimited

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## API Client Implementation

### Basic Usage

```typescript
import { ApiClient } from '../utils/api';

const apiClient = new ApiClient();

// Get profile
const profile = await apiClient.getProfile();

// Handle response
if (profile.success) {
  console.log('Profile:', profile.data);
} else {
  console.error('Error:', profile.error);
}
```

### Error Handling

```typescript
const handleApiCall = async () => {
  try {
    const result = await apiClient.sendInterest('user-123');
    
    if (!result.success) {
      switch (result.error?.code) {
        case 'INTEREST_LIMIT_REACHED':
          showUpgradePrompt();
          break;
        case 'ALREADY_SENT':
          showMessage('Interest already sent');
          break;
        default:
          showError(result.error?.message);
      }
      return;
    }
    
    showSuccess('Interest sent successfully');
  } catch (error) {
    showError('Network error occurred');
  }
};
```

### Request Interceptors

```typescript
// Add authentication header
apiClient.addRequestInterceptor((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
apiClient.addResponseInterceptor(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const newToken = await refreshToken();
      if (newToken) {
        // Retry original request
        return apiClient.request(error.config);
      } else {
        // Redirect to login
        redirectToLogin();
      }
    }
    return Promise.reject(error);
  }
);
```

## Testing API Integration

### Mock API Responses

```typescript
// Mock successful response
jest.mock('../utils/api', () => ({
  apiClient: {
    getProfile: jest.fn().mockResolvedValue({
      success: true,
      data: mockProfile
    }),
    sendInterest: jest.fn().mockResolvedValue({
      success: true,
      data: mockInterest
    })
  }
}));

// Mock error response
apiClient.getProfile.mockResolvedValue({
  success: false,
  error: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required'
  }
});
```

### Integration Testing

```typescript
describe('API Integration', () => {
  test('should handle authentication flow', async () => {
    const loginResult = await apiClient.signIn('test@example.com', 'password');
    expect(loginResult.success).toBe(true);
    
    const profileResult = await apiClient.getProfile();
    expect(profileResult.success).toBe(true);
  });
  
  test('should handle rate limiting', async () => {
    // Make multiple rapid requests
    const requests = Array(25).fill(null).map(() => 
      apiClient.sendInterest('user-123')
    );
    
    const results = await Promise.allSettled(requests);
    const rateLimited = results.some(result => 
      result.status === 'fulfilled' && 
      !result.value.success && 
      result.value.error?.code === 'RATE_LIMITED'
    );
    
    expect(rateLimited).toBe(true);
  });
});
```

## Changelog

### Version 1.0.0
- Initial API implementation
- Authentication endpoints
- Profile management
- Search functionality
- Interest system
- Messaging system
- Subscription management
- Real-time features
- Push notifications
- Safety features