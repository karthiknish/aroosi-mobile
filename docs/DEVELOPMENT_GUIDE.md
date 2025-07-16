# Aroosi Mobile - Development Guide

## Overview

This guide provides comprehensive information for developers working on the Aroosi Mobile application. The app is built with React Native and Expo, designed to provide feature parity with the Aroosi web application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Testing Strategy](#testing-strategy)
5. [API Integration](#api-integration)
6. [State Management](#state-management)
7. [Performance Guidelines](#performance-guidelines)
8. [Security Considerations](#security-considerations)
9. [Deployment Process](#deployment-process)
10. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio and Android SDK (for Android development)

### Installation

```bash
# Clone the repository
git clone https://github.com/aroosi/aroosi-mobile.git
cd aroosi-mobile

# Install dependencies
npm install

# Install Expo CLI globally
npm install -g @expo/cli

# Start the development server
expo start
```

### Environment Setup

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Configure your environment variables:
```env
EXPO_PUBLIC_API_URL=https://www.aroosi.app/api
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_ONESIGNAL_APP_ID=your_onesignal_app_id
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

## Project Structure

```
aroosi-mobile/
├── components/           # Reusable UI components
│   ├── forms/           # Form-specific components
│   ├── feedback/        # User feedback components
│   └── common/          # Common UI elements
├── contexts/            # React contexts for state management
├── hooks/               # Custom React hooks
├── screens/             # Screen components
├── services/            # External service integrations
├── utils/               # Utility functions and helpers
├── types/               # TypeScript type definitions
├── config/              # Configuration files
├── __tests__/           # Test files
│   ├── unit/           # Unit tests
│   ├── integration/    # Integration tests
│   └── e2e/            # End-to-end tests
└── docs/               # Documentation
```

### Key Directories

- **components/**: Reusable UI components following atomic design principles
- **contexts/**: React contexts for global state management (Auth, Theme, etc.)
- **hooks/**: Custom hooks for business logic and API interactions
- **utils/**: Helper functions, API clients, and utility modules
- **types/**: TypeScript interfaces and type definitions

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature branches
- `hotfix/*`: Critical bug fixes

### Code Standards

#### TypeScript

- Use strict TypeScript configuration
- Define interfaces for all data structures
- Avoid `any` type usage
- Use proper type guards for runtime type checking

```typescript
// Good
interface User {
  id: string;
  email: string;
  fullName: string;
}

const isUser = (obj: any): obj is User => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string';
};

// Bad
const user: any = getUserData();
```

#### Component Structure

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onPress?: () => void;
}

export const MyComponent: React.FC<Props> = ({ title, onPress }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
```

#### Naming Conventions

- Components: PascalCase (`UserProfile`)
- Files: camelCase (`userProfile.tsx`)
- Constants: UPPER_SNAKE_CASE (`API_BASE_URL`)
- Functions: camelCase (`getUserData`)

### Git Workflow

1. Create feature branch from `develop`
2. Make changes with descriptive commits
3. Write/update tests
4. Create pull request to `develop`
5. Code review and approval
6. Merge to `develop`

#### Commit Message Format

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(auth): implement biometric authentication

Add support for fingerprint and face ID authentication
on supported devices. Includes fallback to password
authentication when biometrics are not available.

Closes #123
```

## Testing Strategy

### Test Types

1. **Unit Tests**: Individual functions and components
2. **Integration Tests**: Component interactions and API integration
3. **End-to-End Tests**: Complete user workflows
4. **Performance Tests**: Load and stress testing
5. **Accessibility Tests**: Screen reader and accessibility compliance

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:performance
npm run test:accessibility

# Run tests with coverage
npm run test:coverage

# Run final validation tests
npm run test:final-validation
```

### Writing Tests

#### Unit Test Example

```typescript
import { validateEmail } from '../utils/validation';

describe('validateEmail', () => {
  test('should validate correct email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
  });

  test('should reject invalid email addresses', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('@domain.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
  });
});
```

#### Integration Test Example

```typescript
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../screens/LoginScreen';

describe('LoginScreen', () => {
  test('should login user with valid credentials', async () => {
    const { getByTestId } = render(<LoginScreen />);
    
    fireEvent.changeText(getByTestId('email-input'), 'user@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));
    
    await waitFor(() => {
      expect(getByTestId('success-message')).toBeTruthy();
    });
  });
});
```

## API Integration

### API Client Structure

The app uses a centralized API client (`utils/api.ts`) that handles:

- Authentication token management
- Request/response interceptors
- Error handling and retry logic
- Rate limiting
- Request deduplication

### Making API Calls

```typescript
import { apiClient } from '../utils/api';

// Get user profile
const profile = await apiClient.getProfile();

// Update profile
const updatedProfile = await apiClient.updateProfile({
  aboutMe: 'Updated description'
});

// Handle errors
if (!profile.success) {
  console.error('API Error:', profile.error);
}
```

### Error Handling

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

const handleApiError = (error: ApiError) => {
  switch (error.code) {
    case 'UNAUTHORIZED':
      // Redirect to login
      break;
    case 'RATE_LIMITED':
      // Show rate limit message
      break;
    default:
      // Show generic error
  }
};
```

## State Management

### Context-Based State Management

The app uses React Context for global state management:

- **AuthContext**: User authentication state
- **ThemeContext**: App theme and styling
- **NotificationContext**: Push notifications
- **RealtimeContext**: Real-time updates

### Using Contexts

```typescript
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, signIn, signOut, isLoading } = useAuth();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  return (
    <View>
      {user ? (
        <Text>Welcome, {user.fullName}</Text>
      ) : (
        <LoginForm onSubmit={signIn} />
      )}
    </View>
  );
};
```

### Local State Management

For component-specific state, use React hooks:

```typescript
const [formData, setFormData] = useState({
  email: '',
  password: ''
});

const [errors, setErrors] = useState<Record<string, string>>({});

const handleSubmit = async () => {
  const validationErrors = validateForm(formData);
  if (Object.keys(validationErrors).length > 0) {
    setErrors(validationErrors);
    return;
  }
  
  // Submit form
};
```

## Performance Guidelines

### Optimization Strategies

1. **Image Optimization**
   - Use appropriate image formats (WebP when supported)
   - Implement lazy loading for images
   - Cache images locally
   - Compress images before upload

2. **List Performance**
   - Use `FlatList` for large datasets
   - Implement `getItemLayout` when possible
   - Use `keyExtractor` for better performance
   - Implement pull-to-refresh and infinite scrolling

3. **Memory Management**
   - Clean up event listeners in `useEffect` cleanup
   - Avoid memory leaks in async operations
   - Use `React.memo` for expensive components
   - Implement proper cleanup in navigation

### Performance Monitoring

```typescript
import { monitoring } from '../utils/monitoring';

// Track performance metrics
const endTimer = monitoring.startTimer('screen_load');
// ... load screen
endTimer();

// Track API performance
monitoring.trackApiCall('GET', '/api/profile', duration, statusCode);

// Track user actions
monitoring.trackUserAction('button_click', { button: 'send_interest' });
```

## Security Considerations

### Data Protection

1. **Secure Storage**
   - Use Expo SecureStore for sensitive data
   - Never store passwords in plain text
   - Encrypt sensitive user data

2. **API Security**
   - Always use HTTPS in production
   - Implement proper authentication headers
   - Validate all user inputs
   - Sanitize data before display

3. **Input Validation**

```typescript
import { sanitizeUserInput, validateInput } from '../utils/validation';

const handleUserInput = (input: string) => {
  // Sanitize input to prevent XSS
  const sanitized = sanitizeUserInput(input);
  
  // Validate input format
  const validation = validateInput('email', sanitized);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(', '));
  }
  
  return sanitized;
};
```

### Authentication Security

```typescript
// Secure token storage
await SecureStore.setItemAsync('auth_token', token);

// Token validation
const isValidToken = (token: string): boolean => {
  try {
    const decoded = jwt.decode(token);
    return decoded && decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
};
```

## Deployment Process

### Build Configuration

The app supports multiple environments:

- **Development**: Local development with debug features
- **Staging**: Pre-production testing environment
- **Production**: Live production environment

### Environment-Specific Builds

```bash
# Development build
expo build:android --type=apk --release-channel=development

# Staging build
expo build:android --type=apk --release-channel=staging

# Production build
expo build:android --type=app-bundle --release-channel=production
```

### CI/CD Pipeline

The GitHub Actions workflow automatically:

1. Runs tests and security scans
2. Builds the app for different environments
3. Deploys to staging/production
4. Runs final validation tests
5. Submits to app stores

### Release Process

1. Create release branch from `develop`
2. Update version numbers in `app.json`
3. Run final validation tests
4. Merge to `main`
5. Tag release
6. Deploy to production

## Troubleshooting

### Common Issues

#### Build Errors

**Metro bundler cache issues:**
```bash
expo start --clear
```

**Node modules issues:**
```bash
rm -rf node_modules
npm install
```

**iOS build issues:**
```bash
cd ios && pod install
```

#### Runtime Errors

**Network request failures:**
- Check API endpoint configuration
- Verify authentication tokens
- Check network connectivity

**Authentication issues:**
- Clear stored tokens
- Check token expiration
- Verify API credentials

#### Performance Issues

**Slow list rendering:**
- Implement `FlatList` optimization
- Use `getItemLayout` for fixed-height items
- Implement virtualization

**Memory leaks:**
- Check for uncleaned event listeners
- Verify async operation cleanup
- Use React DevTools Profiler

### Debugging Tools

1. **React Native Debugger**
   - Network inspection
   - Redux DevTools integration
   - Element inspector

2. **Flipper**
   - Network requests
   - Database inspection
   - Performance monitoring

3. **Expo DevTools**
   - Real-time logs
   - Performance metrics
   - Device testing

### Logging and Monitoring

```typescript
import { logger } from '../utils/logger';

// Log different levels
logger.debug('AUTH', 'User login attempt', { email });
logger.info('API', 'Profile updated successfully');
logger.warn('VALIDATION', 'Invalid input detected', { field, value });
logger.error('NETWORK', 'API request failed', error);

// Performance logging
const endTimer = logger.startTimer('API', 'Profile fetch');
// ... API call
endTimer();
```

### Getting Help

1. Check the [API Documentation](./API_DOCUMENTATION.md)
2. Review existing GitHub issues
3. Check Expo documentation
4. Contact the development team

## Contributing

1. Follow the coding standards outlined in this guide
2. Write comprehensive tests for new features
3. Update documentation for significant changes
4. Ensure all CI/CD checks pass
5. Request code review from team members

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Testing Library Documentation](https://testing-library.com/docs/react-native-testing-library/intro)
- [Jest Documentation](https://jestjs.io/docs/getting-started)