# Subscription System Troubleshooting Guide

## Common Issues and Solutions

### TypeScript Compilation Errors

#### Issue: `clearTransactionIos` not found
**Error**: `'"react-native-iap"' has no exported member named 'clearTransactionIos'`

**Solution**: Use the correct method name `clearTransactionIOS` (uppercase IOS)
```typescript
// ❌ Incorrect
import { clearTransactionIos } from "react-native-iap";

// ✅ Correct
import { clearTransactionIOS } from "react-native-iap";
```

#### Issue: Type compatibility between Product and Subscription
**Error**: `Type 'Product | Subscription' is not assignable to type 'Product'`

**Solution**: Convert Subscription objects to Product format
```typescript
// ✅ Correct approach
const convertedSubscriptions: Product[] = subscriptions.map((sub: Subscription) => ({
  ...sub,
  type: 'subs' as any,
  price: (sub as any).price || '0',
  currency: (sub as any).currency || 'GBP',
  localizedPrice: (sub as any).localizedPrice || (sub as any).price || '0',
}));
```

#### Issue: Unused imports and variables
**Error**: Various hints about unused imports

**Solution**: Remove unused imports and variables
```typescript
// ❌ Remove unused imports
import { useState, useEffect } from "react"; // If not used

// ✅ Only import what you need
import { useCallback } from "react";
```

### Purchase Flow Issues

#### Issue: Purchase hangs or times out
**Symptoms**: Purchase never completes, no success or error callback

**Solutions**:
1. **Add timeout handling**:
```typescript
const purchasePromise = new Promise<PurchaseResult>((resolve) => {
  this.pendingPurchases.set(productId, resolve);
  
  // Set timeout to prevent hanging
  setTimeout(() => {
    if (this.pendingPurchases.has(productId)) {
      this.pendingPurchases.delete(productId);
      resolve({
        success: false,
        error: "Purchase timeout",
      });
    }
  }, 60000); // 60 second timeout
});
```

2. **Check network connectivity**
3. **Verify store account is signed in**
4. **Clear pending transactions** (iOS)

#### Issue: "Item unavailable for purchase" (Android)
**Symptoms**: Google Play returns item unavailable error

**Solutions**:
1. **Verify product ID matches Google Play Console exactly**
2. **Ensure app is signed with release key**
3. **Check if subscription is active in Google Play Console**
4. **Verify test account is added to testing track**

#### Issue: "Cannot connect to iTunes Store" (iOS)
**Symptoms**: iOS returns connection error

**Solutions**:
1. **Check internet connection**
2. **Verify sandbox account is signed in for testing**
3. **Ensure product IDs match App Store Connect**
4. **Check if subscriptions are approved in App Store Connect**

### API Integration Issues

#### Issue: Subscription status not updating
**Symptoms**: Mobile app shows old subscription status

**Solutions**:
1. **Check API endpoint responses**:
```typescript
// Verify response structure matches expected format
const response = await apiClient.getSubscriptionStatus();
console.log('Subscription response:', response);
```

2. **Clear cache and refresh**:
```typescript
SubscriptionCache.invalidate('subscription');
await refreshSubscription();
```

3. **Verify server-side validation is working**
4. **Check webhook/notification setup**

#### Issue: Feature access not working correctly
**Symptoms**: Users can't access features they should have

**Solutions**:
1. **Check feature access rules**:
```typescript
import { canAccessFeature } from '../utils/subscriptionFeatures';
const hasAccess = canAccessFeature('premium', 'canBoostProfile');
```

2. **Verify real-time feature checking**:
```typescript
const result = await canUseFeatureNow('profile_boost_used');
console.log('Feature access result:', result);
```

3. **Check usage limits and tracking**
4. **Verify subscription status is active**

### Platform-Specific Issues

#### iOS Issues

**Issue: Sandbox testing not working**
1. Sign out of Apple ID on device
2. Use sandbox test account created in App Store Connect
3. Verify subscriptions are approved for sandbox testing
4. Clear transaction queue: `await clearTransactionIOS()`

**Issue: Receipt validation fails**
1. Check receipt data format
2. Verify shared secret (if using)
3. Ensure using correct validation endpoint (sandbox vs production)
4. Check server-side validation logic

**Issue: Auto-renewal not working in sandbox**
1. Sandbox auto-renewal is accelerated (minutes instead of months)
2. Check subscription expiry and renewal in App Store Connect
3. Verify webhook handling for renewal events

#### Android Issues

**Issue: Purchase token validation fails**
1. Check purchase token format
2. Verify Google Play API credentials
3. Ensure proper API permissions
4. Check server-side validation logic

**Issue: Real-time developer notifications not working**
1. Verify Cloud Pub/Sub topic configuration
2. Check webhook endpoint setup
3. Test notification delivery manually
4. Verify subscription event handling

### Error Handling Issues

#### Issue: Users see generic error messages
**Solution**: Implement user-friendly error messages
```typescript
import { SubscriptionErrorHandler } from '../utils/subscriptionErrorHandler';

const error = SubscriptionErrorHandler.handle(rawError, 'purchase');
const userMessage = SubscriptionErrorHandler.getUserFriendlyMessage(error);
Alert.alert('Purchase Failed', userMessage);
```

#### Issue: No recovery options for errors
**Solution**: Provide recovery actions
```typescript
const recoveryAction = SubscriptionErrorHandler.getRecoveryAction(error);
if (error.recoverable) {
  // Show retry button or other recovery options
}
```

### Performance Issues

#### Issue: Subscription data loads slowly
**Solutions**:
1. **Implement caching**:
```typescript
import { SubscriptionCache, CACHE_TTL } from '../utils/subscriptionCache';

// Cache subscription data
SubscriptionCache.set('subscription_status', data, CACHE_TTL.SUBSCRIPTION_STATUS);
```

2. **Use offline fallback**:
```typescript
import { OfflineSubscriptionManager } from '../utils/subscriptionCache';

const data = await OfflineSubscriptionManager.getSubscriptionStatus(
  userId,
  () => apiClient.getSubscriptionStatus()
);
```

3. **Preload subscription data**
4. **Optimize API calls with batching**

#### Issue: App startup is slow due to subscription loading
**Solutions**:
1. **Load subscription data asynchronously**
2. **Show loading states**
3. **Cache critical subscription data**
4. **Use React Query for efficient data fetching**

### Testing Issues

#### Issue: Tests failing due to mocking issues
**Solution**: Properly mock react-native-iap
```typescript
jest.mock('react-native-iap', () => ({
  initConnection: jest.fn().mockResolvedValue(true),
  endConnection: jest.fn().mockResolvedValue(true),
  getProducts: jest.fn().mockResolvedValue([]),
  getSubscriptions: jest.fn().mockResolvedValue([]),
  // ... other mocks
}));
```

#### Issue: Integration tests not covering real scenarios
**Solution**: Create comprehensive test scenarios
```typescript
describe('Subscription User Journeys', () => {
  it('should complete premium subscription purchase');
  it('should restore previous purchases');
  it('should handle subscription expiry gracefully');
  it('should enforce feature limits correctly');
});
```

## Debugging Tools and Techniques

### Logging and Monitoring

1. **Enable detailed logging**:
```typescript
console.log('Subscription status:', subscription);
console.log('Feature access:', features);
console.log('Usage stats:', usage);
```

2. **Monitor API responses**:
```typescript
const response = await apiClient.getSubscriptionStatus();
console.log('API Response:', JSON.stringify(response, null, 2));
```

3. **Track subscription events**:
```typescript
import { logSubscriptionEvent } from '../utils/subscriptionUtils';
logSubscriptionEvent('purchase_started', { planId, platform });
```

### Testing Tools

1. **Use sandbox environments**:
   - iOS: App Store Connect Sandbox
   - Android: Google Play Console Testing

2. **Test with different account states**:
   - New user (no subscription)
   - Active subscriber
   - Expired subscriber
   - Cancelled subscriber

3. **Test error scenarios**:
   - Network failures
   - Invalid receipts
   - Expired subscriptions
   - Usage limit exceeded

### Monitoring in Production

1. **Set up error tracking**:
```typescript
import { SubscriptionErrorMonitoring } from '../utils/subscriptionErrorHandler';
SubscriptionErrorMonitoring.reportError(error, context);
```

2. **Monitor key metrics**:
   - Purchase success/failure rates
   - Feature usage patterns
   - Error rates by platform
   - Performance metrics

3. **Set up alerts for critical issues**:
   - High error rates
   - Purchase failures
   - API endpoint failures
   - Performance degradation

## Getting Help

### Internal Resources
- **Development Team**: For technical issues and code problems
- **QA Team**: For testing and validation issues
- **DevOps Team**: For deployment and infrastructure issues
- **Product Team**: For feature and business logic questions

### External Resources
- **Apple Developer Support**: For iOS-specific issues
- **Google Play Support**: For Android-specific issues
- **react-native-iap GitHub**: For library-specific issues
- **Stack Overflow**: For general development questions

### Documentation
- [Apple In-App Purchase Programming Guide](https://developer.apple.com/in-app-purchase/)
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [react-native-iap Documentation](https://github.com/dooboolab/react-native-iap)

## Prevention Strategies

### Code Quality
1. **Use TypeScript strictly** - Enable strict mode and fix all type errors
2. **Write comprehensive tests** - Unit, integration, and end-to-end tests
3. **Code reviews** - Have subscription code reviewed by multiple developers
4. **Static analysis** - Use ESLint and other tools to catch issues early

### Testing Strategy
1. **Test on real devices** - Don't rely only on simulators/emulators
2. **Test with real accounts** - Use actual App Store/Play Store accounts
3. **Test edge cases** - Network failures, expired subscriptions, etc.
4. **Automated testing** - Set up CI/CD with automated subscription tests

### Monitoring and Alerting
1. **Real-time monitoring** - Monitor subscription metrics in real-time
2. **Error alerting** - Get notified immediately when errors spike
3. **Performance monitoring** - Track subscription loading times
4. **User feedback** - Monitor user reports and support tickets

---

This troubleshooting guide should be updated regularly as new issues are discovered and resolved.