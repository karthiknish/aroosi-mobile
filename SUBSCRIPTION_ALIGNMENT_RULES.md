# Subscription System Alignment Rules

## Overview
This document defines the alignment rules between the main Aroosi project and the mobile project's subscription systems to ensure consistency and compatibility.

## Core Type Definitions

### 1. Subscription Plan Types

**Main Project (aroosi/src/types/profile.ts)**:
```typescript
export type SubscriptionPlan = "free" | "premium" | "premiumPlus";
```

**Mobile Project Alignment Rule**:
- Use `SubscriptionTier` as the base type (same values)
- Keep `SubscriptionPlan` as an interface for plan objects with details
- Components expect plan objects, not just string literals

### 2. Subscription Plan Details Structure

**Main Project Structure**:
```typescript
export interface SubscriptionPlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: number;
  displayPrice: string;
  duration: string;
  features: string[];
  popular?: boolean;
  badge?: string;
}
```

**Mobile Project Requirements**:
- Must include all main project fields
- Add mobile-specific fields: `tier`, `currency`, `description`, `popularBadge`
- Add store-specific IDs: `appleProductId`, `googleProductId`, `stripeProductId`

### 3. User Subscription Status

**Main Project API Response** (aroosi/src/lib/api/subscription.ts):
```typescript
interface SubscriptionStatus {
  plan: "free" | "premium" | "premiumPlus";
  isActive: boolean;
  expiresAt?: number;
  daysRemaining: number;
  boostsRemaining: number;
  hasSpotlightBadge: boolean;
  spotlightBadgeExpiresAt?: number;
}
```

**Mobile Project Alignment Rule**:
- Must include all main project fields
- Add `tier` field for component compatibility
- Add `currentPeriodEnd` for component compatibility
- Add mobile-specific fields for payment tracking

### 4. Feature Usage Tracking

**Main Project Structure** (aroosi/src/lib/api/subscription.ts):
```typescript
interface UsageStats {
  plan: "free" | "premium" | "premiumPlus";
  messaging: { sent: number; received: number; limit: number; };
  profileViews: { count: number; limit: number; };
  searches: { count: number; limit: number; };
  boosts: { used: number; remaining: number; monthlyLimit: number; };
}
```

**Mobile Project Requirements**:
- Must support main project structure for backward compatibility
- Add flat structure for component compatibility: `messagesSent`, `interestsSent`, etc.
- Add `limits` object with all feature limits
- Add period tracking: `periodStart`, `periodEnd`

### 5. Subscription Features

**Main Project** (aroosi/src/lib/utils/subscriptionUtils.ts):
```typescript
export interface SubscriptionFeatures {
  canViewMatches: boolean;
  canChatWithMatches: boolean;
  canInitiateChat: boolean;
  canSendUnlimitedLikes: boolean;
  canViewFullProfiles: boolean;
  canHideFromFreeUsers: boolean;
  canBoostProfile: boolean;
  canViewProfileViewers: boolean;
  canUseAdvancedFilters: boolean;
  hasSpotlightBadge: boolean;
  canUseIncognitoMode: boolean;
  canAccessPrioritySupport: boolean;
  canSeeReadReceipts: boolean;
  maxLikesPerDay: number;
  boostsPerMonth: number;
}
```

**Mobile Project Alignment Rule**:
- Must match exactly with main project
- Use same feature names and types
- Implement same feature access logic

## Feature Access Rules

### Free Plan Features
- `canViewMatches: true`
- `canChatWithMatches: true`
- `canInitiateChat: false`
- `maxLikesPerDay: 5`
- All other premium features: `false`

### Premium Plan Features
- All free features: `true`
- `canInitiateChat: true`
- `canSendUnlimitedLikes: true`
- `canViewFullProfiles: true`
- `canHideFromFreeUsers: true`
- `canAccessPrioritySupport: true`
- `canSeeReadReceipts: true`
- `maxLikesPerDay: -1` (unlimited)
- Premium Plus features: `false`

### Premium Plus Features
- All premium features: `true`
- `canBoostProfile: true`
- `canViewProfileViewers: true`
- `canUseAdvancedFilters: true`
- `hasSpotlightBadge: true`
- `canUseIncognitoMode: true`
- `boostsPerMonth: 5`

## API Compatibility Rules

### 1. Subscription Status Endpoint
**Expected Response Format**:
```typescript
{
  plan: SubscriptionTier;
  tier: SubscriptionTier; // For component compatibility
  isActive: boolean;
  expiresAt?: number;
  currentPeriodEnd?: number; // For component compatibility
  daysRemaining: number;
  boostsRemaining: number;
  hasSpotlightBadge: boolean;
  spotlightBadgeExpiresAt?: number;
}
```

### 2. Usage Stats Endpoint
**Expected Response Format**:
```typescript
{
  plan: SubscriptionTier;
  currentMonth: string;
  resetDate: number;
  periodStart: number;
  periodEnd: number;
  messagesSent: number;
  interestsSent: number;
  searchesPerformed: number;
  profileBoosts: number;
  limits: FeatureLimits;
  // Legacy format for backward compatibility
  messaging: { sent: number; limit: number; };
  profileViews: { count: number; limit: number; };
  searches: { count: number; limit: number; };
  boosts: { used: number; monthlyLimit: number; };
}
```

### 3. Feature Access Check
**Convex Function** (aroosi/convex/subscriptions.ts):
```typescript
export const checkFeatureAccess = query({
  args: { userId: v.id("users"), feature: v.string() },
  handler: async (ctx, args) => {
    // Returns boolean indicating feature access
  }
});
```

## Mobile-Specific Extensions

### 1. In-App Purchase Integration
- Support Apple App Store and Google Play Store
- Store product IDs in plan definitions
- Handle purchase validation and receipt verification

### 2. Offline Support
- Cache subscription status locally
- Graceful degradation when offline
- Sync when connection restored

### 3. Platform-Specific Features
- iOS: Support for App Store subscriptions
- Android: Support for Google Play Billing
- Cross-platform: Stripe integration for web purchases

## Implementation Checklist

### Type Definitions
- [ ] `SubscriptionTier` type matches main project
- [ ] `SubscriptionPlan` interface includes all required fields
- [ ] `UserSubscription` includes both `plan` and `tier` fields
- [ ] `FeatureUsage` supports both flat and nested structures
- [ ] `SubscriptionFeatures` matches main project exactly

### API Integration
- [ ] Subscription status API returns compatible format
- [ ] Usage stats API returns compatible format
- [ ] Feature access checks use main project logic
- [ ] Error handling matches main project patterns

### Component Compatibility
- [ ] All subscription components work with aligned types
- [ ] Feature gates use correct feature names
- [ ] Usage displays work with both data formats
- [ ] Upgrade flows use correct plan structures

### Testing
- [ ] TypeScript compilation passes
- [ ] All subscription features work correctly
- [ ] API responses are properly typed
- [ ] Cross-platform compatibility verified

## Migration Strategy

### Phase 1: Type Alignment
1. Update type definitions to match main project
2. Fix TypeScript compilation errors
3. Ensure backward compatibility

### Phase 2: API Integration
1. Align API response formats
2. Update data transformation logic
3. Test cross-platform compatibility

### Phase 3: Feature Parity
1. Implement missing features
2. Align feature access rules
3. Test all subscription flows

### Phase 4: Optimization
1. Optimize performance
2. Add offline support
3. Enhance error handling

## Maintenance Guidelines

### 1. Synchronization
- Any changes to main project subscription types must be reflected in mobile
- Feature access rules must remain consistent
- API response formats must maintain compatibility

### 2. Testing
- Run TypeScript compilation after any subscription changes
- Test all subscription flows on both platforms
- Verify API compatibility with main project

### 3. Documentation
- Update this document when making changes
- Document any mobile-specific extensions
- Maintain changelog of subscription system changes

## Common Issues and Solutions

### 1. TypeScript Errors
**Issue**: Components expect object but receive string
**Solution**: Use `SubscriptionPlan` interface for objects, `SubscriptionTier` for strings

### 2. Missing Properties
**Issue**: Components access properties that don't exist
**Solution**: Ensure all expected properties are included in type definitions

### 3. API Incompatibility
**Issue**: Mobile app can't parse main project API responses
**Solution**: Add transformation layer to convert between formats

### 4. Feature Access Inconsistency
**Issue**: Different feature access rules between projects
**Solution**: Use shared feature access logic and keep rules synchronized