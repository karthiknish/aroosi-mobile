# Aroosi Mobile - Subscription Setup Guide

This guide will help you set up in-app purchases and subscriptions for both iOS and Android platforms.

## 📱 Platform Requirements

### iOS Requirements
- iOS 13.0 or later
- Xcode 12 or later
- Apple Developer Account with App Store Connect access
- Valid iOS Distribution Certificate

### Android Requirements
- Android API level 21 or later
- Google Play Console access
- Google Play Billing Library v5+
- Valid Android signing key

## 🛠 Setup Instructions

### 1. iOS Setup (App Store Connect)

#### Step 1: Configure App Store Connect
1. Log in to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app
3. Go to **Features** → **In-App Purchases**

#### Step 2: Create Subscription Groups
1. Click **Manage** next to Subscription Groups
2. Create a new subscription group: "Aroosi Premium Subscriptions"
3. Set the reference name and display name

#### Step 3: Create Subscription Products
Create the following subscriptions:

**Premium Monthly:**
- Product ID: `com.aroosi.premium.monthly`
- Reference Name: `Premium Monthly Subscription`
- Duration: 1 Month
- Price: £14.99 (or equivalent in local currency)

**Premium Plus Monthly:**
- Product ID: `com.aroosi.premiumplus.monthly`
- Reference Name: `Premium Plus Monthly Subscription`
- Duration: 1 Month
- Price: £39.99 (or equivalent in local currency)

#### Step 4: Configure Subscription Details
For each subscription:
1. Add localized display names and descriptions
2. Set up subscription pricing for all territories
3. Add promotional images (1024x1024px)
4. Configure subscription benefits
5. Set up introductory offers (optional)

#### Step 5: Submit for Review
1. Fill in all required metadata
2. Add screenshots showing subscription benefits
3. Submit subscriptions for App Store review

### 2. Android Setup (Google Play Console)

#### Step 1: Configure Google Play Console
1. Log in to [Google Play Console](https://play.google.com/console)
2. Navigate to your app
3. Go to **Monetize** → **Products** → **Subscriptions**

#### Step 2: Create Subscription Products
Create the following subscriptions:

**Premium Monthly:**
- Product ID: `premium_monthly`
- Name: `Premium Monthly Subscription`
- Description: `Enhanced features for serious connections`
- Billing period: Monthly
- Price: £14.99

**Premium Plus Monthly:**
- Product ID: `aroosi_premium_plus_monthly`
- Name: `Premium Plus Monthly Subscription`
- Description: `Ultimate experience with all features`
- Billing period: Monthly
- Price: £39.99

#### Step 3: Configure Subscription Settings
For each subscription:
1. Set up pricing in all supported countries
2. Configure grace periods and account hold
3. Set up promotional offers (optional)
4. Add subscription benefits description

#### Step 4: Set up Real-time Developer Notifications
1. Go to **Monetize** → **Monetization setup**
2. Configure Real-time developer notifications
3. Set up Cloud Pub/Sub topic for subscription events

### 3. Code Configuration

#### Update Product IDs
Ensure the product IDs in your code match those configured in the stores:

```typescript
// utils/inAppPurchases.ts
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "premium_monthly",
    tier: "premium",
    name: "Premium",
    price: 14.99,
    currency: "GBP",
    duration: "monthly",
    appleProductId: "com.aroosi.premium.monthly",      // iOS Product ID
    googleProductId: "premium_monthly",                // Android Product ID
    // ... other properties
  },
  {
    id: "premiumPlus_monthly",
    tier: "premiumPlus",
    name: "Premium Plus",
    price: 39.99,
    currency: "GBP",
    duration: "monthly",
    appleProductId: "com.aroosi.premiumplus.monthly",  // iOS Product ID
    googleProductId: "aroosi_premium_plus_monthly",    // Android Product ID
    // ... other properties
  },
];
```

#### Configure Server-Side Validation
Update your backend to handle subscription validation:

```typescript
// Backend API endpoint: /api/subscription/purchase
{
  platform: "ios" | "android",
  productId: string,
  purchaseToken: string,      // Android purchase token
  receiptData?: string,       // iOS receipt data
}
```

### 4. Testing Setup

#### iOS Testing
1. Create sandbox test accounts in App Store Connect
2. Sign out of your Apple ID on the device
3. Use sandbox accounts for testing purchases
4. Test in iOS Simulator or physical device

#### Android Testing
1. Create test accounts in Google Play Console
2. Add test accounts to your app's testing track
3. Upload a signed APK to internal testing
4. Test purchases using test accounts

### 5. Environment Configuration

#### Development Environment
```bash
# .env.development
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_SUBSCRIPTION_ENVIRONMENT=sandbox
```

#### Production Environment
```bash
# .env.production
EXPO_PUBLIC_API_URL=https://www.aroosi.app/api
EXPO_PUBLIC_SUBSCRIPTION_ENVIRONMENT=production
```

## 🧪 Testing Checklist

### iOS Testing
- [ ] Sandbox account can purchase subscriptions
- [ ] Purchase flow completes successfully
- [ ] Receipt validation works with backend
- [ ] Subscription status updates correctly
- [ ] Restore purchases works
- [ ] Subscription cancellation works
- [ ] Auto-renewal works in sandbox

### Android Testing
- [ ] Test account can purchase subscriptions
- [ ] Purchase flow completes successfully
- [ ] Purchase token validation works with backend
- [ ] Subscription status updates correctly
- [ ] Restore purchases works
- [ ] Subscription cancellation works
- [ ] Auto-renewal works in testing

### Cross-Platform Testing
- [ ] Same user can access subscription on both platforms
- [ ] Subscription features work identically
- [ ] Backend correctly handles both iOS and Android purchases
- [ ] Error handling works on both platforms
- [ ] UI displays correctly on both platforms

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All subscription products approved in stores
- [ ] Backend validation endpoints tested
- [ ] Error handling implemented
- [ ] Analytics tracking configured
- [ ] Customer support documentation updated

### iOS Deployment
- [ ] App Store Connect subscriptions approved
- [ ] iOS app submitted with subscription features
- [ ] Subscription screenshots and metadata complete
- [ ] Privacy policy updated for subscriptions

### Android Deployment
- [ ] Google Play Console subscriptions active
- [ ] Android app uploaded to production track
- [ ] Store listing updated with subscription information
- [ ] Privacy policy updated for subscriptions

## 🔧 Troubleshooting

### Common iOS Issues
1. **"Cannot connect to iTunes Store"**
   - Ensure device is connected to internet
   - Check if sandbox account is signed in
   - Verify product IDs match App Store Connect

2. **"This In-App Purchase has already been bought"**
   - Clear transaction queue with `clearTransactionIos()`
   - Use different sandbox account
   - Reset iOS Simulator

3. **Receipt validation fails**
   - Check receipt data format
   - Verify shared secret (if using)
   - Ensure using correct validation endpoint

### Common Android Issues
1. **"Item unavailable for purchase"**
   - Verify product ID matches Google Play Console
   - Ensure app is signed with release key
   - Check if subscription is active in console

2. **"Authentication required"**
   - Ensure test account is added to testing track
   - Sign in with correct Google account
   - Clear Google Play Store cache

3. **Purchase token validation fails**
   - Check purchase token format
   - Verify Google Play API credentials
   - Ensure proper API permissions

### Backend Integration Issues
1. **Subscription status not updating**
   - Check webhook/notification setup
   - Verify database schema
   - Test API endpoints manually

2. **Cross-platform sync issues**
   - Ensure user accounts are properly linked
   - Check subscription status mapping
   - Verify feature access logic

## 📞 Support Resources

### Apple Resources
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [In-App Purchase Programming Guide](https://developer.apple.com/in-app-purchase/)
- [StoreKit Documentation](https://developer.apple.com/documentation/storekit)

### Google Resources
- [Google Play Billing Documentation](https://developer.android.com/google/play/billing)
- [Play Console Help](https://support.google.com/googleplay/android-developer/)
- [Subscription Testing Guide](https://developer.android.com/google/play/billing/test)

### React Native IAP
- [react-native-iap Documentation](https://github.com/dooboolab/react-native-iap)
- [Troubleshooting Guide](https://github.com/dooboolab/react-native-iap/blob/main/docs/troubleshooting.md)

## 🔐 Security Best Practices

1. **Always validate purchases server-side**
2. **Use HTTPS for all API communications**
3. **Store sensitive keys securely (not in code)**
4. **Implement proper error handling**
5. **Log purchase events for debugging**
6. **Monitor for fraudulent purchases**
7. **Keep receipt/token validation up to date**

## 📊 Analytics and Monitoring

### Key Metrics to Track
- Subscription conversion rates
- Churn rates by platform
- Revenue per user
- Purchase funnel drop-offs
- Error rates by platform
- Customer support tickets related to billing

### Recommended Tools
- App Store Connect Analytics
- Google Play Console Analytics
- Custom backend analytics
- Crash reporting (Sentry, Bugsnag)
- Revenue tracking (RevenueCat, Adapty)

---

This setup ensures your subscription system works reliably on both iOS and Android platforms with proper testing, validation, and error handling.