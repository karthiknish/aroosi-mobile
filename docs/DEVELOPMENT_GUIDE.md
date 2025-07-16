# Aroosi Mobile Development Guide

## Table of Contents
1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Code Standards](#code-standards)
4. [Development Workflow](#development-workflow)
5. [Testing Guidelines](#testing-guidelines)
6. [Performance Guidelines](#performance-guidelines)
7. [Security Guidelines](#security-guidelines)
8. [Troubleshooting](#troubleshooting)

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Installation
```bash
# Clone the repository
git clone https://github.com/aroosi/aroosi-mobile.git
cd aroosi-mobile

# Install dependencies
npm install

# Start development server
npm start
```

### Environment Setup
1. Copy `.env.example` to `.env`
2. Configure environment variables:
   ```
   API_BASE_URL=http://localhost:3000/api
   ONESIGNAL_APP_ID=your-onesignal-app-id
   GOOGLE_OAUTH_CLIENT_ID=your-google-client-id
   ```

## Project Structure

```
aroosi-mobile/
├── components/           # Reusable UI components
│   ├── auth/            # Authentication components
│   ├── chat/            # Chat and messaging components
│   ├── common/          # Common UI components
│   ├── forms/           # Form components
│   └── feedback/        # User feedback components
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── screens/             # Screen components
│   ├── auth/           # Authentication screens
│   ├── main/           # Main app screens
│   └── onboarding/     # Onboarding screens
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
├── config/              # Configuration files
├── docs/                # Documentation
├── __tests__/           # Test files
└── assets/              # Static assets
```

### Component Organization
- **components/**: Reusable UI components organized by feature
- **screens/**: Full-screen components that represent app screens
- **contexts/**: React Context providers for global state
- **hooks/**: Custom hooks for business logic
- **utils/**: Pure utility functions and classes

## Code Standards

### TypeScript Guidelines
1. **Strict Type Checking**: Enable strict mode in tsconfig.json
2. **Interface Definitions**: Define interfaces for all data structures
3. **Type Exports**: Export types from dedicated type files
4. **Generic Types**: Use generics for reusable components

```typescript
// Good: Proper interface definition
interface UserProfile {
  id: string;
  name: string;
  email: string;
  isVerified: boolean;
}

// Good: Generic component
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}

function List<T>({ items, renderItem }: ListProps<T>) {
  return (
    <View>
      {items.map(renderItem)}
    </View>
  );
}
```

### React Component Guidelines

#### Functional Components
Use functional components with hooks:
```typescript
// Good: Functional component with proper typing
interface ProfileCardProps {
  profile: UserProfile;
  onPress: (profileId: string) => void;
}

export function ProfileCard({ profile, onPress }: ProfileCardProps) {
  const handlePress = useCallback(() => {
    onPress(profile.id);
  }, [profile.id, onPress]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>{profile.name}</Text>
    </TouchableOpacity>
  );
}
```

#### Component Structure
1. **Props Interface**: Define props interface above component
2. **Component Function**: Use arrow function or function declaration
3. **Hooks**: Place all hooks at the top of component
4. **Event Handlers**: Use useCallback for event handlers
5. **Render**: Keep render logic clean and readable

#### Custom Hooks
Extract business logic into custom hooks:
```typescript
// Good: Custom hook for API data
export function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const result = await apiClient.getProfile(userId);
        if (result.success) {
          setProfile(result.data);
        } else {
          setError(result.error?.message || 'Failed to load profile');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  return { profile, loading, error };
}
```

### Styling Guidelines

#### StyleSheet Usage
Use StyleSheet.create for performance:
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text.primary,
    fontFamily: 'Boldonse-Regular',
  },
});
```

#### Color System
Use the centralized color system:
```typescript
import { Colors } from '../constants/Colors';

// Good: Use color constants
backgroundColor: Colors.primary[500]
color: Colors.gray[900]

// Bad: Hard-coded colors
backgroundColor: '#3B82F6'
color: '#111827'
```

#### Typography
Use consistent typography:
```typescript
// Good: Consistent font usage
fontFamily: 'Boldonse-Regular'    // For headings
fontFamily: 'NunitoSans-Regular' // For body text
fontFamily: 'NunitoSans-Bold'    // For emphasis
```

### Error Handling

#### API Error Handling
```typescript
// Good: Comprehensive error handling
try {
  const result = await apiClient.getProfile();
  if (result.success) {
    setProfile(result.data);
  } else {
    const errorMessage = result.error?.message || 'Unknown error';
    showErrorToast(errorMessage);
    logError('Profile fetch failed', result.error);
  }
} catch (error) {
  showErrorToast('Network error occurred');
  logError('Network error', error);
}
```

#### Component Error Boundaries
```typescript
// Good: Error boundary for components
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryComponent
      onError={(error, errorInfo) => {
        logError('Component error', { error, errorInfo });
      }}
      fallback={<ErrorFallback />}
    >
      {children}
    </ErrorBoundaryComponent>
  );
}
```

### Performance Guidelines

#### Memoization
Use React.memo and useMemo appropriately:
```typescript
// Good: Memoized component
export const ProfileCard = React.memo<ProfileCardProps>(({ profile, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(profile.id);
  }, [profile.id, onPress]);

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>{profile.name}</Text>
    </TouchableOpacity>
  );
});

// Good: Memoized expensive calculation
const expensiveValue = useMemo(() => {
  return calculateComplexValue(data);
}, [data]);
```

#### List Optimization
Use FlatList for large lists:
```typescript
// Good: Optimized list rendering
<FlatList
  data={profiles}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <ProfileCard profile={item} />}
  getItemLayout={(data, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
  removeClippedSubviews
  maxToRenderPerBatch={10}
  windowSize={10}
/>
```

## Development Workflow

### Git Workflow
1. **Branch Naming**: Use descriptive branch names
   - `feature/user-authentication`
   - `bugfix/message-sending-issue`
   - `hotfix/critical-crash-fix`

2. **Commit Messages**: Follow conventional commits
   ```
   feat: add voice message recording
   fix: resolve crash on profile save
   docs: update API documentation
   test: add unit tests for auth service
   ```

3. **Pull Requests**: 
   - Create detailed PR descriptions
   - Include screenshots for UI changes
   - Request appropriate reviewers
   - Ensure CI passes before merging

### Code Review Guidelines

#### What to Look For
1. **Functionality**: Does the code work as intended?
2. **Performance**: Are there any performance issues?
3. **Security**: Are there any security vulnerabilities?
4. **Maintainability**: Is the code readable and maintainable?
5. **Testing**: Are there adequate tests?

#### Review Checklist
- [ ] Code follows project standards
- [ ] No console.log statements in production code
- [ ] Proper error handling implemented
- [ ] TypeScript types are properly defined
- [ ] Components are properly memoized if needed
- [ ] Accessibility attributes are included
- [ ] Tests are included for new functionality

## Testing Guidelines

### Unit Testing
Use Jest and React Native Testing Library:
```typescript
// Good: Unit test example
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ProfileCard } from '../ProfileCard';

describe('ProfileCard', () => {
  const mockProfile = {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
    isVerified: true,
  };

  it('should render profile information', () => {
    const { getByText } = render(
      <ProfileCard profile={mockProfile} onPress={jest.fn()} />
    );
    
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('should call onPress when tapped', async () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(
      <ProfileCard profile={mockProfile} onPress={mockOnPress} />
    );
    
    fireEvent.press(getByTestId('profile-card'));
    
    await waitFor(() => {
      expect(mockOnPress).toHaveBeenCalledWith('1');
    });
  });
});
```

### Integration Testing
Test complete user flows:
```typescript
// Good: Integration test
describe('Authentication Flow', () => {
  it('should complete login process', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);
    
    // Enter credentials
    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    
    // Submit form
    fireEvent.press(getByTestId('login-button'));
    
    // Wait for navigation
    await waitFor(() => {
      expect(getByText('Welcome')).toBeTruthy();
    });
  });
});
```

### Test Organization
```
__tests__/
├── unit/                # Unit tests
│   ├── components/     # Component tests
│   ├── hooks/          # Hook tests
│   └── utils/          # Utility tests
├── integration/        # Integration tests
└── e2e/               # End-to-end tests
```

## Security Guidelines

### Data Protection
1. **Sensitive Data**: Never log sensitive information
2. **Token Storage**: Use SecureStore for tokens
3. **Input Validation**: Validate all user inputs
4. **API Security**: Use HTTPS and proper authentication

```typescript
// Good: Secure token storage
import * as SecureStore from 'expo-secure-store';

export async function storeToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('access_token', token);
}

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync('access_token');
}
```

### Input Sanitization
```typescript
// Good: Input sanitization
import { sanitizeString } from '../utils/validation';

function handleUserInput(input: string) {
  const sanitized = sanitizeString(input);
  // Process sanitized input
}
```

## Performance Guidelines

### Image Optimization
```typescript
// Good: Optimized image loading
import { OptimizedImage } from '../utils/imageCache';

<OptimizedImage
  uri={profile.imageUrl}
  style={styles.profileImage}
  placeholder={<ImagePlaceholder />}
/>
```

### Memory Management
```typescript
// Good: Cleanup in useEffect
useEffect(() => {
  const subscription = someService.subscribe(callback);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

### Bundle Size Optimization
1. **Dynamic Imports**: Use dynamic imports for large libraries
2. **Tree Shaking**: Import only what you need
3. **Image Assets**: Optimize image sizes and formats

```typescript
// Good: Dynamic import
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Good: Specific imports
import { debounce } from 'lodash/debounce';
// Bad: Full library import
import _ from 'lodash';
```

## Troubleshooting

### Common Issues

#### Metro Bundler Issues
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clear npm cache
npm start -- --clear
```

#### iOS Build Issues
```bash
# Clean iOS build
cd ios && xcodebuild clean && cd ..

# Reinstall pods
cd ios && pod install && cd ..
```

#### Android Build Issues
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..

# Reset Android
npx react-native run-android --reset-cache
```

#### TypeScript Issues
```bash
# Restart TypeScript server
# In VS Code: Cmd+Shift+P -> "TypeScript: Restart TS Server"

# Check TypeScript configuration
npx tsc --noEmit
```

### Debugging Tools

#### React Native Debugger
1. Install React Native Debugger
2. Enable debugging in app
3. Use Redux DevTools for state inspection

#### Flipper Integration
1. Install Flipper desktop app
2. Add Flipper plugins to project
3. Use network inspector and layout inspector

#### Performance Profiling
```typescript
// Good: Performance monitoring
import { performanceMonitor } from '../utils/performanceMonitor';

function ExpensiveComponent() {
  useEffect(() => {
    performanceMonitor.startScreenLoad('ExpensiveComponent');
    
    return () => {
      performanceMonitor.endScreenLoad('ExpensiveComponent');
    };
  }, []);
  
  // Component logic
}
```

### Getting Help

#### Internal Resources
1. Check existing documentation
2. Search through codebase for similar implementations
3. Review test files for usage examples

#### External Resources
1. [React Native Documentation](https://reactnative.dev/)
2. [Expo Documentation](https://docs.expo.dev/)
3. [TypeScript Handbook](https://www.typescriptlang.org/docs/)

#### Team Communication
1. Use descriptive issue titles
2. Include reproduction steps
3. Provide relevant code snippets
4. Tag appropriate team members

## Best Practices Summary

### Do's ✅
- Use TypeScript for type safety
- Implement proper error handling
- Write comprehensive tests
- Follow consistent code formatting
- Use performance optimization techniques
- Implement proper security measures
- Document complex logic
- Use meaningful variable names

### Don'ts ❌
- Don't ignore TypeScript errors
- Don't skip error handling
- Don't commit console.log statements
- Don't hardcode sensitive data
- Don't ignore performance implications
- Don't skip code reviews
- Don't write untested code
- Don't use any type unless absolutely necessary

This guide should be updated as the project evolves and new patterns emerge.