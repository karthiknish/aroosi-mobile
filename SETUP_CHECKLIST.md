# Aroosi Mobile Setup Checklist

## Phase 1: Core Infrastructure Setup

### Authentication & Providers
- [x] Install Clerk Expo SDK (`@clerk/clerk-expo`)
- [x] Set up Clerk provider in App.tsx
- [x] Configure Clerk with environment variables
- [x] Create auth context wrapper
- [x] Set up secure token storage

### Backend Integration
- [x] ~~Install Convex React hooks (`convex/react`)~~ - Using web app APIs instead
- [x] ~~Set up Convex provider in App.tsx~~ - Using REST API client
- [x] Configure API URL from environment (`EXPO_PUBLIC_API_URL`)
- [x] Test API connection via web app
- [x] Set up authenticated API client with Clerk tokens

### Navigation
- [x] Install React Navigation dependencies
  - [x] `@react-navigation/native`
  - [x] `@react-navigation/stack`
  - [x] `@react-navigation/bottom-tabs`
  - [x] `react-native-screens`
  - [x] `react-native-safe-area-context`
  - [x] `react-native-gesture-handler`
  - [x] `react-native-reanimated`
- [x] Configure React Navigation in App.tsx
- [x] Set up root navigator structure
- [x] Create authenticated vs unauthenticated navigation flows

### State Management
- [x] Set up React Query provider
- [x] Configure React Query client
- [x] Set up offline persistence (via React Query)
- [x] Configure cache invalidation strategies (via React Query)

## Phase 2: Clean Up & Mobile API Integration

### Remove Unnecessary Code
- [x] ~~Delete `/convex/blog.ts`~~ - Not applicable (no Convex in mobile)
- [x] ~~Remove blog tables from `/convex/schema.ts`~~ - Not applicable (no Convex in mobile)
- [x] ~~Remove blog-related types~~ - Not applicable (no Convex in mobile)
- [ ] Clean up any admin-only frontend code

### Backend Integration (Web App APIs)
**Note**: Mobile app uses REST API calls to web app backend, not direct Convex integration.

- [x] API client setup (`utils/api.ts` and `utils/enhancedApiClient.ts`)
- [x] Authentication integration with Clerk tokens
- [x] Profile API endpoints integration
- [x] Image upload API integration  
- [x] Safety/blocking API integration
- [x] Verify all required API endpoints are implemented in web app:
  - [x] Profile CRUD operations (100% coverage via hooks)
  - [x] Subscription management (100% coverage via useSubscription)
  - [x] Interest/matching system (100% coverage via useInterests)
  - [x] Messaging functionality (100% coverage via useMessaging, useMessageStatus, useTypingIndicator)
  - [x] Safety reporting/blocking (100% coverage via useSafety)

## Phase 3: Screen Development

### Auth Screens
- [x] Create `screens/auth/` directory
- [x] Build `LoginScreen.tsx`
  - [x] Email/password form
  - [x] Google auth integration
  - [x] Forgot password link
- [x] Build `SignUpScreen.tsx`
  - [x] Registration form
  - [x] Terms acceptance
  - [x] Email verification flow
  - [x] Google auth integration
- [x] Build `ForgotPasswordScreen.tsx`

### Onboarding Screens
- [x] Create `screens/onboarding/` directory
- [x] Build `WelcomeScreen.tsx`
- [x] Build `ProfileSetupScreen.tsx` with steps:
  - [x] Basic Info (fullName, dateOfBirth, gender, preferredGender)
  - [x] Location (UK city, postcode)
  - [x] Physical Details (height, marital status)
  - [x] Professional Details (education, occupation, income)
  - [x] About Me & Contact (aboutMe, phoneNumber)
  - [x] Lifestyle Preferences (diet, smoking, drinking, physical status, partner age preferences)
  - [x] Photo Upload (ImageUpload component with full functionality)
- [x] Build `OnboardingCompleteScreen.tsx`

## Profile Fields & Validation (Match Web Version)

### Core Profile Types & Interfaces
- [x] Create comprehensive profile types (`types/profile.ts`)
  - [x] All field types matching web version exactly
  - [x] Gender, marital status, diet, lifestyle enums
  - [x] UK cities list (24 cities from web)
  - [x] Profile completion calculation
  - [x] Height conversion utilities
  - [x] Age calculation helpers

### Profile Validation Rules
- [x] Create validation utilities (`utils/profileValidation.ts`)
  - [x] Field-by-field validation functions
  - [x] Character limits matching web version
  - [x] Age validation (18-120 years)
  - [x] UK phone number validation
  - [x] Height validation (137-198 cm)
  - [x] Partner preference age validation
  - [x] Profile completion checking

### Required Fields for Onboarding
- [ ] **fullName** (2-100 chars, letters/spaces/hyphens/apostrophes only)
- [ ] **dateOfBirth** (must be 18+ years old, format: yyyy-MM-dd)
- [ ] **gender** (male/female/other)
- [ ] **preferredGender** (male/female/other/any)
- [ ] **ukCity** (from predefined list of 24 UK cities)
- [ ] **height** (137-198 cm, displayed as feet/inches)
- [ ] **annualIncome** (positive number in GBP)
- [ ] **aboutMe** (20-2000 characters)
- [ ] **phoneNumber** (UK format validation)

### Optional Fields for Profile Completion
- [ ] **ukPostcode** (max 10 chars, optional)
- [ ] **maritalStatus** (single/divorced/widowed/annulled)
- [ ] **education** (max 100 chars)
- [ ] **occupation** (max 100 chars)
- [ ] **diet** (vegetarian/non-vegetarian/vegan/eggetarian/other)
- [ ] **smoking** (no/occasionally/yes)
- [ ] **drinking** (no/occasionally/yes)
- [ ] **physicalStatus** (normal/differently-abled/other)
- [ ] **partnerPreferenceAgeMin** (18-120, must be ≤ max)
- [ ] **partnerPreferenceAgeMax** (18-120, must be ≥ min)
- [ ] **partnerPreferenceUkCity** (array of cities)

### Profile Image Requirements
- [x] **profileImageIds** (at least 1 image required for completion)
- [x] Support multiple images with ordering
- [x] Main image selection (first image is main)
- [x] Image upload via Convex storage

## Image Upload & Management Implementation

### Image Upload API Integration
- [x] Updated API client with correct endpoints matching web version
  - [x] `getUploadUrl()` - Generate signed upload URL (GET /profile-images/upload-url)
  - [x] `uploadImageToStorage()` - Direct upload to Convex storage
  - [x] `saveImageMetadata()` - Save image metadata (POST /profile-images)
  - [x] `deleteProfileImage()` - Delete image (DELETE /profile-images)
  - [x] `reorderProfileImages()` - Reorder images (POST /profile-images/order)
  - [x] `getProfileImages()` - Fetch user images
  - [x] `getBatchProfileImages()` - Batch fetch for multiple users

### Image Upload Components & Hooks
- [x] Created `types/image.ts` with comprehensive image types
  - [x] ImageType, ProfileImage, ImageUploadResponse interfaces
  - [x] Image validation constants (5MB limit, allowed types)
- [x] Created `hooks/useImageUpload.ts` custom hook
  - [x] Three-step upload process (URL → Storage → Metadata)
  - [x] Image validation (type, size, count limits)
  - [x] Delete and reorder functionality
  - [x] Progress tracking and error handling
- [x] Created `components/profile/ImageUpload.tsx` reusable component
  - [x] Image picker integration with react-native-image-picker
  - [x] Grid layout with add/delete buttons
  - [x] Main image badge and index indicators
  - [x] Upload progress display
  - [x] Validation and error messages
  - [x] Guidelines and help text

### Screen Integration
- [x] Added ImageUpload to ProfileSetupScreen (Step 7)
  - [x] Optional photo upload during onboarding
  - [x] Clear guidelines for users
- [x] Added ImageUpload to EditProfileScreen
  - [x] Full photo management functionality
  - [x] Integrated with existing profile editing flow

### Dependencies & Configuration
- [x] Added required dependencies to package.json
  - [x] react-native-image-picker ^7.1.2
  - [x] @react-native-community/datetimepicker ^8.2.0
  - [x] @react-native-picker/picker ^2.9.0

### Image Upload Features
- [x] **File Validation**: Type checking (JPEG, PNG, WebP), size limit (5MB)
- [x] **Upload Process**: Matches web version's three-step process exactly
- [x] **Error Handling**: Comprehensive error messages and user feedback
- [x] **Progress Tracking**: Real-time upload progress indicators
- [x] **Image Management**: Add, delete, reorder images
- [x] **Main Image**: First image automatically becomes main profile picture
- [x] **Guidelines**: Clear instructions and photo guidelines for users
- [x] **Responsive Design**: Adaptive grid layout for different screen sizes

### Profile Completion Calculation
- [ ] 9 required fields for 100% completion:
  1. fullName
  2. gender
  3. dateOfBirth
  4. maritalStatus
  5. ukCity
  6. occupation
  7. education
  8. aboutMe
  9. profileImageIds (at least 1 image)

### Validation Rules Summary
- [ ] **Character Limits**:
  - fullName: 2-100 chars
  - ukCity: 2-50 chars
  - ukPostcode: max 10 chars
  - education: max 100 chars
  - occupation: max 100 chars
  - aboutMe: 20-2000 chars
  - phoneNumber: 7-20 chars

- [ ] **Special Validations**:
  - Age: 18-120 years old
  - Height: 137-198 cm (4'6" - 6'6")
  - Partner age preferences: min ≤ max, both 18-120
  - Phone: UK format `/^(\+44|0)[0-9]{10,11}$/`
  - Income: positive numbers only
  - Full name: letters, spaces, hyphens, apostrophes only

### Form Field Components Needed
- [ ] **TextInput** with validation
- [ ] **DatePicker** for date of birth with age calculation
- [ ] **Dropdown/Picker** for enums (gender, marital status, etc.)
- [ ] **CityPicker** with search for UK cities
- [ ] **HeightSlider** with ft/inches display
- [ ] **NumberInput** for income and age preferences
- [ ] **TextArea** for aboutMe with character count
- [ ] **PhoneInput** with UK formatting
- [ ] **ImagePicker** for profile photos
- [ ] **MultiSelect** for partner city preferences

### Main App Screens
- [x] Create `screens/main/` directory
- [x] Build `ProfileScreen.tsx`
  - [x] View own profile
  - [x] Edit profile option
  - [x] Settings link
- [x] Build `EditProfileScreen.tsx`
  - [x] All profile fields editable
  - [x] Photo management
  - [x] Save/cancel functionality
- [x] Build `SearchScreen.tsx`
  - [x] Filter options
  - [x] Profile cards
  - [x] Like/pass functionality
- [x] Build `MatchesScreen.tsx`
  - [x] Active matches list
  - [x] Pending interests
  - [x] Match notifications
- [x] Build `ChatScreen.tsx`
  - [x] Conversation list
  - [x] Individual chat view
  - [x] Message input
  - [x] Read receipts (basic implementation)
- [x] Build `SubscriptionScreen.tsx`
  - [x] Current plan display
  - [x] Upgrade options
  - [x] Usage statistics
  - [x] Payment management

### Settings Screens
- [ ] Create `screens/settings/` directory
- [ ] Build `SettingsScreen.tsx`
  - [ ] Account settings
  - [ ] Privacy settings
  - [ ] Notification preferences
  - [ ] Logout option
- [ ] Build `BlockedUsersScreen.tsx`
- [ ] Build `SafetyScreen.tsx`

## Phase 6: Safety & Security Implementation

### Core Safety Infrastructure
- [x] Set up safety database schema (blocks table)
- [x] Create safety API endpoints integration
  - [x] Report user functionality
  - [x] Block/unblock user functionality
  - [x] Get blocked users list
  - [x] Check block status
- [x] Implement safety rate limiting
- [x] Add safety-related types and interfaces

### Safety Components
- [x] Build `SafetyActionSheet.tsx`
  - [x] Report user option
  - [x] Block/unblock user option
  - [x] Safety guidelines link
  - [x] Context-aware options
- [x] Create `ReportUserModal.tsx`
  - [x] Report reason selection (radio buttons)
  - [x] Description field (required for "other")
  - [x] Character limit (500 chars)
  - [x] Review process explanation
- [x] Build `BlockUserModal.tsx`
  - [x] Block confirmation dialog
  - [x] Explanation of blocking effects
  - [x] Alternative options suggestion
  - [x] Reversible action notice
- [ ] Create `BlockedUserBanner.tsx`
  - [ ] Different states (blocked by you/blocked by them)
  - [ ] Unblock functionality
  - [ ] Informational display

### Safety Screens
- [x] Build `SafetyGuidelinesScreen.tsx`
  - [x] General safety tips
  - [x] Warning signs section
  - [x] Reporting vs blocking guidance
  - [x] Community guidelines
  - [x] Privacy protection tips
- [x] Create `BlockedUsersScreen.tsx`
  - [x] List of blocked users
  - [x] User profile preview
  - [x] Block date information
  - [x] One-click unblock
  - [x] Empty state with education
- [ ] Build `ReportStatusScreen.tsx` (optional)
  - [ ] Track report submissions
  - [ ] Status updates
  - [ ] Resolution notifications

### Safety Integration
- [ ] Integrate safety into ProfileScreen
  - [ ] SafetyActionSheet in header
  - [ ] BlockedUserBanner display
  - [ ] Hide blocked user profiles
- [ ] Add safety to ChatScreen
  - [ ] Block status checking
  - [ ] Inline blocking/reporting
  - [ ] Chat restrictions for blocked users
- [ ] Update SearchScreen
  - [ ] Filter out blocked users
  - [ ] Safety options in profile cards
  - [ ] Report inappropriate profiles
- [ ] Enhance MatchesScreen
  - [ ] Handle blocked matches
  - [ ] Safety options in match cards
  - [ ] Block status indicators

### Safety Hooks & Utilities
- [x] Create `useSafety.ts` hook
  - [x] `useReportUser()` mutation
  - [x] `useBlockUser()` mutation
  - [x] `useUnblockUser()` mutation
  - [x] `useBlockedUsers()` query
  - [x] `useBlockStatus(userId)` query
- [x] Build safety API client methods
  - [x] `reportUser(userId, reason, description)`
  - [x] `blockUser(userId)`
  - [x] `unblockUser(userId)`
  - [x] `getBlockedUsers()`
  - [x] `checkBlockStatus(userId)`

### Safety Education & Onboarding
- [ ] Add safety step to onboarding flow
  - [ ] Safety guidelines overview
  - [ ] How to report/block walkthrough
  - [ ] Privacy settings introduction
- [ ] Create safety tips notifications
  - [ ] Weekly safety reminders
  - [ ] Context-aware tips
  - [ ] Best practices guidance

### Safety Settings
- [ ] Add safety section to SettingsScreen
  - [ ] View blocked users
  - [ ] Safety guidelines link
  - [ ] Privacy controls
  - [ ] Report history (optional)
- [ ] Implement privacy controls
  - [ ] Hide from search toggle
  - [ ] Photo privacy settings
  - [ ] Information sharing controls

### Admin Safety Features (Phase 7)
- [ ] Build admin safety dashboard
  - [ ] View user reports
  - [ ] Moderate reported content
  - [ ] Ban/unban users
  - [ ] View safety statistics
- [ ] Implement automated moderation
  - [ ] Auto-hide after X reports
  - [ ] Flagged content detection
  - [ ] Suspicious behavior patterns

### Safety Monitoring & Analytics
- [ ] Track safety metrics
  - [ ] Report submission rates
  - [ ] Block/unblock patterns
  - [ ] Safety feature usage
- [ ] Implement safety alerts
  - [ ] High-priority reports
  - [ ] Unusual blocking patterns
  - [ ] Potential safety issues

### Safety Communication
- [ ] In-app safety notifications
  - [ ] Report acknowledgments
  - [ ] Safety policy updates
  - [ ] Action taken notifications
- [ ] Safety-related push notifications
  - [ ] Important safety updates
  - [ ] Report resolution notices
  - [ ] Safety feature reminders

## Phase 7: Advanced Safety Features

### Enhanced Reporting System
- [ ] Photo reporting functionality
- [ ] Message reporting from chat
- [ ] Bulk reporting for spam
- [ ] Anonymous reporting option

### Advanced Blocking Features
- [ ] Temporary blocks (24h, 7d options)
- [ ] Block reasons tracking
- [ ] Block recommendations based on behavior
- [ ] Mass block for related accounts

### Safety AI & Automation
- [ ] Inappropriate content detection
- [ ] Fake profile identification
- [ ] Harassment pattern recognition
- [ ] Automated safety warnings

### Safety Community Features
- [ ] User safety ratings
- [ ] Community safety badges
- [ ] Safety champion program
- [ ] Peer safety reporting

## Safety Implementation Priority

### Critical (Must Have)
1. Block/unblock functionality
2. User reporting system
3. Safety guidelines screen
4. Basic safety integration in profiles/chat

### High Priority 
1. Blocked users management
2. Safety action sheet component
3. Report/block modals
4. Safety education in onboarding

### Medium Priority
1. Admin safety dashboard
2. Safety analytics
3. Advanced reporting features
4. Safety notifications

### Low Priority

1. AI-powered safety features
2. Community safety features
3. Temporary blocking
4. Safety gamification

## Phase 4: Component Integration

### Wire Up Existing Components
- [ ] Integrate subscription components into SubscriptionScreen
- [ ] Use chat components in ChatScreen
- [ ] Implement photo gallery in profile screens
- [ ] Add safety action sheet to appropriate screens
- [ ] Integrate onboarding components

### Create Missing Components
- [x] **ProfileDetailScreen.tsx** (COMPLETED)
  - [x] Comprehensive profile viewing for other users
  - [x] Image gallery with navigation
  - [x] Complete profile information display
  - [x] Interest/heart button functionality
  - [x] Safety features (report/block buttons)
  - [x] Navigation integration
- [ ] Profile card component for search results
- [ ] Match card component
- [ ] Filter modal for search
- [ ] Profile completion indicator
- [ ] Loading screens
- [ ] Error boundaries

### Missing Profile Viewing Features (Web vs Mobile Gap)

#### **Own Profile View (Current ProfileScreen vs Web /profile)**
- [x] **Enhanced ProfileScreen to match web /profile page**
  - [x] Comprehensive profile information display (50+ fields)
  - [x] All profile sections (Basic Info, Location, Education, Lifestyle, Partner Preferences)
  - [x] Multiple profile images with gallery view
  - [x] Image management (edit photos, reorder, delete)
  - [x] Premium features integration (boost, viewers, badges)
  - [x] Profile completion percentage
  - [x] Account information (email, join date)
  - [x] Enhanced subscription section
  - [x] Delete profile functionality
  - [x] Professional card-based layout matching web design
  - [x] Loading states and skeleton placeholders
  - [x] Error handling and retry functionality

#### **Other Users Profile Viewing**
- [x] **ProfileDetailScreen implementation** (Navigation fixed)
- [x] Interest management UI (send/remove interest buttons)
- [x] Safety features in profile viewing (report/block functionality)
- [ ] Enhanced profile cards in search results
- [x] Image gallery component for multiple photos
- [x] Profile view tracking integration
- [ ] Premium user indicators and boosted profiles
- [x] Blocked user handling in profile views

#### **Navigation Integration**
- [x] **Global ProfileDetail Navigation** (COMPLETED)
  - [x] Created centralized navigation types (`src/navigation/types.ts`)
  - [x] Updated RootNavigator with modal ProfileDetail access
  - [x] Enhanced MainNavigator with ProfileStack integration
  - [x] Fixed broken navigation references in SearchScreen and MatchesScreen
  - [x] Added TypeScript support for navigation parameters
  - [x] Enabled ProfileDetail access from any screen in the app

## Phase 4.5: Theme & Responsive Design

### Theme System Setup
- [x] Update Colors.ts to match web app theme
  - [x] Primary colors (Soft Pink #EC4899)
  - [x] Secondary colors (Dusty Blue #5F92AC)
  - [x] Accent colors (Muted Gold #D6B27C)
  - [x] Success colors (Gentle Green #7BA17D)
  - [x] Error colors (Subtle Terracotta Red #B45E5E)
  - [x] Background colors (Clean Soft Off-white #F9F7F5)
  - [x] Text colors (Muted Charcoal #4A4A4A)
- [x] Create comprehensive Theme.ts system
  - [x] Component styles matching web app
  - [x] Light and dark theme variants
  - [x] Theme utilities and helpers
- [x] Add ThemeContext for theme management
  - [x] Theme provider with persistence
  - [x] System theme detection
  - [x] Theme switching functionality

### Responsive Design System
- [x] Enhanced Layout.ts with responsive breakpoints
  - [x] Device size detection (xs, sm, md, lg, xl, tablet)
  - [x] Dynamic spacing based on device size
  - [x] Responsive typography system
- [x] Create useResponsive hooks
  - [x] useResponsive for device detection
  - [x] useResponsiveValue for responsive values
  - [x] useResponsiveSpacing for dynamic spacing
  - [x] useResponsiveTypography for scalable fonts
- [x] Add responsive utilities
  - [x] getResponsiveValue helper
  - [x] createShadow utility
  - [x] Theme-aware style creation

### Typography Matching Web App
- [x] Font family system (Nunito Sans + Boldonse)
- [x] Responsive font sizes with device scaling
- [x] Line height system matching web (1.3 for headings)
- [x] Font weight system
- [x] Font scale accessibility support

### Component Theme Integration
- [ ] Update Button components to use new theme
- [ ] Update Card components with web app styling
- [ ] Update Input components with theme colors
- [ ] Update Text components with typography system
- [ ] Update Navigation components with theme
- [ ] Update Modal/Alert components with theme

### Responsive Testing
- [ ] Test on iPhone SE (320px width)
- [ ] Test on iPhone 12 mini (375px width)
- [ ] Test on iPhone 12/13/14 (390px width)
- [ ] Test on iPhone 12/13/14 Plus (414px width)
- [ ] Test on iPhone 12/13/14 Pro Max (428px width)
- [ ] Test on iPad (768px+ width)
- [ ] Test orientation changes
- [ ] Test font scale accessibility settings

### Dependencies Added
- [x] @react-native-async-storage/async-storage for theme persistence

## Phase 5: Features & Polish

### Core Features
- [x] Implement push notifications (Based on Aroosi Web App Setup)
  - [x] Install required dependencies
    - [x] expo-notifications
    - [x] react-native-onesignal 
    - [x] onesignal-expo-plugin
    - [x] @react-native-async-storage/async-storage (for preferences)
  - [x] OneSignal Configuration
    - [x] Configure OneSignal React Native SDK
    - [x] Add OneSignal app configuration to app.json
    - [x] Set up environment variables:
      - [x] EXPO_PUBLIC_ONE_SIGNAL_APP_ID
      - [x] ONESIGNAL_REST_API_KEY (for backend)
  - [x] Push Registration System
    - [x] Create useOneSignal hook for mobile
    - [x] Implement auto-registration on app launch/login
    - [x] Send device data to /api/push/register endpoint:
      - [x] userId (from Clerk auth)
      - [x] playerId (OneSignal player ID) 
      - [x] deviceType ("ios" | "android")
      - [x] deviceToken (native push token)
      - [x] registeredAt timestamp
    - [x] Handle registration/unregistration API calls
  - [x] Permission Handling
    - [x] Request notification permissions on iOS
    - [x] Handle Android notification channels
    - [x] Graceful permission denial handling
    - [x] Settings deep link for permission changes
  - [x] Notification Types Support
    - [x] New message notifications
    - [x] New interest notifications
    - [x] Match notifications  
    - [x] Profile view notifications (Premium Plus)
    - [x] Subscription and system notifications
  - [x] Notification Handling
    - [x] Foreground notification display
    - [x] Background notification processing
    - [x] Deep linking from notifications
    - [x] Badge count management for unread items
    - [x] Rich notifications with actions
  - [x] User Preferences
    - [x] Notification settings screen (NotificationSettingsScreen.tsx)
    - [x] Toggle for each notification type
    - [x] Do not disturb hours support
    - [x] Sound and vibration preferences
  - [x] Integration with Auth
    - [x] Auto-register on successful login
    - [x] Unregister on logout
    - [x] Re-register on app reinstall/token refresh
    - [x] NotificationProvider integration with app navigation
- [x] Implement biometric authentication (Mobile Login Only)
  - [x] Install expo-local-authentication and expo-secure-store
  - [x] Create comprehensive biometric type system
  - [x] Develop biometric utilities with device capability detection
  - [x] Build biometric authentication hook (useBiometric)
  - [x] Create BiometricLogin component with animated UI
  - [x] Build BiometricSettingsScreen for user preferences
  - [x] Implement secure storage utility for credentials
  - [x] Integrate biometric login with main authentication flow
  - [x] Add biometric option to LoginScreen
  - [x] Support auto-login and manual biometric authentication
  - [x] Handle permission requests and device enrollment
  - [x] Provide fallback to password authentication
  - [x] Include security features:
    - [x] Failed attempt tracking and lockout
    - [x] Secure credential storage with device encryption
    - [x] Platform-specific biometric type detection (Touch ID, Face ID, Fingerprint)
    - [x] User preference management and testing functionality
  - [x] Backend Support (Optional - for settings sync):
    - [x] Updated Convex schema with biometric settings fields
    - [x] Created biometric Convex functions for settings management
    - [x] Added biometric API endpoints for device registration
    - [x] Implemented audit logging for Premium Plus users
- [ ] Implement in-app purchases
  - [ ] Install expo-in-app-purchases
  - [ ] Configure products
  - [ ] Handle purchase flow
  - [ ] Restore purchases

### UI/UX Polish
- [x] Add loading states to all screens
  - [x] Created comprehensive LoadingStates.tsx component
  - [x] Added skeleton loading for ProfileCard, ChatList, ProfileDetail
  - [x] Implemented FullScreenLoading component
  - [x] Updated SearchScreen, MatchesScreen, ConversationListScreen with skeleton loading
- [x] Implement pull-to-refresh where appropriate
  - [x] Added RefreshControl to SearchScreen with manual refresh
  - [x] Added RefreshControl to MatchesScreen for matches and interests
  - [x] Added RefreshControl to ConversationListScreen for conversations
  - [x] Integrated refresh with React Query refetch functionality
- [x] Add empty states for lists
  - [x] Created comprehensive EmptyStates.tsx component
  - [x] Added specific empty states: NoSearchResults, NoMatches, NoMessages, NoPhotos, etc.
  - [x] Added NetworkError, UnauthorizedAccess, ProfileIncomplete states
  - [x] Integrated empty states across SearchScreen, MatchesScreen, ConversationListScreen
- [x] Implement proper error handling
  - [x] Created ErrorHandling.tsx with ErrorBoundary component
  - [x] Added ApiErrorDisplay for API-specific error messages
  - [x] Added ValidationErrorDisplay for form validation
  - [x] Wrapped main screens with ErrorBoundary components
  - [x] Added retry functionality and proper error classification
- [x] Add animations and transitions
  - [x] Created comprehensive animations utility (`utils/animations.ts`)
  - [x] Created reusable animated components (`components/ui/AnimatedComponents.tsx`)
  - [x] Added navigation transition animations (`utils/navigationAnimations.ts`)
  - [x] Implemented page transitions, fade effects, scale animations, slide transitions
  - [x] Added interactive animations: button press, heart animation, shake, pulse
  - [x] Updated SearchScreen with staggered profile card animations
  - [x] Updated MatchesScreen with animated match cards and interests
  - [x] Enhanced MainNavigator with screen-specific transition animations
  - [x] Added floating action button, progress bar, and specialized animations
- [x] Ensure keyboard handling works properly
  - [x] Created keyboard utilities (`utils/keyboardUtils.ts`)
  - [x] Created KeyboardAwareComponents (`components/ui/KeyboardAwareComponents.tsx`)
  - [x] Added useKeyboard hook for keyboard state tracking
  - [x] Implemented KeyboardAwareScrollView with auto-scroll to focused inputs
  - [x] Added DismissKeyboardView for touch-to-dismiss functionality
  - [x] Created AnimatedTextInput with focus/blur animations
  - [x] Added KeyboardSpacer and KeyboardToolbar components
  - [x] Platform-specific keyboard behavior handling (iOS/Android)

### Platform-Specific Features
- [x] Configure iOS-specific settings
  - [x] Info.plist permissions (generated in platform/ios/Info.plist.additions)
  - [x] iOS entitlements and capabilities configuration
  - [x] App Store and build configurations
  - [x] Deep linking and URL scheme setup
  - [x] Security and performance optimizations
  - [ ] App icons (follow assets/icons/README.md guide)
  - [ ] Launch screen (follow assets/splash/README.md guide)
- [x] Configure Android-specific settings
  - [x] Permissions in manifest (generated in platform/android/AndroidManifest.additions.xml)
  - [x] Android SDK and build tool configurations
  - [x] Proguard rules for code optimization
  - [x] Intent filters for deep linking
  - [x] Play Store metadata configuration
  - [ ] App icons (follow assets/icons/README.md guide)
  - [ ] Splash screen (follow assets/splash/README.md guide)
- [x] Platform Setup Infrastructure
  - [x] Created platform-config.js with centralized configurations
  - [x] Enhanced metro.config.js with aliases and optimizations
  - [x] Updated eas.json with comprehensive build profiles
  - [x] Generated platform-specific documentation and guides
  - [x] Created setup script for platform assets
  - [x] Organized platform directories and build scripts

## Phase 6: Testing & Optimization

### Testing
- [ ] Test authentication flow
- [ ] Test profile creation/editing
- [ ] Test subscription purchases
- [ ] Test messaging functionality
- [ ] Test on various devices
- [ ] Test offline functionality

### Performance
- [ ] Optimize image loading
- [ ] Implement lazy loading
- [ ] Minimize re-renders
- [ ] Optimize Convex queries
- [ ] Add performance monitoring

### Security
- [ ] Secure API endpoints
- [ ] Implement rate limiting
- [ ] Add input validation
- [ ] Secure storage for sensitive data
- [ ] Review authentication flow

## Phase 7: Deployment Preparation

### Build Configuration
- [ ] Configure production environment variables
- [ ] Set up EAS Build
- [ ] Configure app signing
- [ ] Set up CI/CD pipeline

### App Store Preparation
- [ ] Create app store listings
- [ ] Prepare screenshots
- [ ] Write app descriptions
- [ ] Set up app review information

### Final Checks
- [ ] Complete testing on production build
- [ ] Review all features work correctly
- [ ] Ensure GDPR compliance
- [ ] Verify subscription flow works in production
- [ ] Test crash reporting

## Environment Variables Required

```bash
EXPO_PUBLIC_CONVEX_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_ONESIGNAL_APP_ID=
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_ENVIRONMENT=
```

## Priority Order

1. **Critical** (App won't work without these):
   - Clerk authentication setup
   - Convex provider setup
   - Basic navigation
   - Login/Signup screens
   - Profile creation

2. **High** (Core functionality):
   - Profile viewing/editing
   - Search functionality
   - Matching system
   - Basic messaging

3. **Medium** (Enhanced features):
   - Subscription management
   - Push notifications
   - Photo management
   - Safety features

4. **Low** (Nice to have):
   - Biometric auth
   - Animations
   - Advanced filters
   - Analytics

## Notes

- Start with Phase 1 infrastructure before moving to screens
- Test each phase thoroughly before moving to the next
- Keep the web app as reference for business logic
- Ensure consistent UI/UX across all screens
- Follow React Native best practices for performance