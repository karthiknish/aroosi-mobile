# Messaging System Test Suite

This directory contains comprehensive tests for the messaging system alignment feature. The test suite validates core functionality, cross-platform consistency, and performance requirements.

## Test Structure

### Core Functionality Tests (`messagingCore.test.ts`)

Tests the fundamental messaging features:

- **Message Validation and Sanitization**
  - Text message validation (length, content, HTML sanitization)
  - Voice message validation (duration, file size)
  - Security sanitization (XSS prevention, malicious content filtering)

- **Subscription Feature Gating**
  - Free tier limitations (no chat initiation, daily limits, no voice messages)
  - Premium tier features (unlimited messaging, voice messages)
  - Premium Plus tier features (all features including image messages)
  - Feature gate enforcement during message flow

- **Voice Message Upload and Playback**
  - Voice message upload flow (validation, storage, API integration)
  - Playback URL generation and caching
  - Error handling for upload/playback failures

- **Real-time Messaging Features**
  - WebSocket connection management
  - Typing indicators (send/receive)
  - Message delivery receipts
  - Real-time message synchronization

### Integration Tests (`messagingIntegration.test.ts`)

Tests end-to-end messaging flows and cross-platform functionality:

- **End-to-End Message Flow**
  - Complete message sending workflow
  - Voice message end-to-end flow
  - Real-time message updates

- **Cross-Platform Message Synchronization**
  - Message sync between web and mobile
  - Message ordering consistency
  - Read status synchronization

- **Offline/Online Transition Scenarios**
  - Message queuing when offline
  - Queue processing when back online
  - Missed message synchronization

- **Message Caching and Performance**
  - Message caching for improved performance
  - Cache invalidation on new messages
  - LRU cache eviction

- **Error Recovery and Resilience**
  - Retry logic with exponential backoff
  - WebSocket reconnection handling
  - Malformed message handling

- **Subscription Integration**
  - Feature gate enforcement during message flow
  - Premium feature access validation

### Performance Tests (`messagingPerformance.test.ts`)

Tests system performance and scalability:

- **Message Loading Performance**
  - Efficient pagination
  - Cache performance
  - Large message list handling

- **Real-time Performance**
  - High-frequency message updates
  - Typing indicator throttling
  - WebSocket connection efficiency

- **Voice Message Performance**
  - Upload efficiency
  - URL caching
  - Concurrent upload handling

- **Memory Management**
  - Cache eviction strategies
  - Event listener cleanup
  - Memory-efficient batching

- **Network Optimization**
  - Request batching
  - Request deduplication
  - Message serialization optimization

## Running Tests

### All Messaging Tests
```bash
npm run test:messaging
```

### Individual Test Suites
```bash
# Core functionality tests
npm run test:messaging:core

# Integration tests
npm run test:messaging:integration

# Performance tests
npm run test:messaging:performance
```

### Development Mode
```bash
# Watch mode for development
npm run test:messaging:watch

# Coverage report
npm run test:messaging:coverage
```

## Test Configuration

### Jest Configuration (`jest.config.js`)
- React Native preset with jsdom environment
- Custom setup file for mocking dependencies
- Coverage thresholds (80% minimum)
- Module name mapping for imports
- Transform ignore patterns for React Native modules

### Setup File (`setup.ts`)
- React Native module mocks
- AsyncStorage mock
- Audio recording/playback mocks
- Permissions mocks
- WebSocket mocks
- Blob/File mocks for file upload testing
- Performance API mocks
- Global fetch mock

## Test Coverage Requirements

The test suite maintains minimum 80% coverage across:
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Covered Components and Services

- `services/messagingService.ts`
- `services/voiceMessageManager.ts`
- `services/RealtimeMessagingService.ts`
- `utils/messageValidation.ts`
- `utils/messagingFeatures.ts`
- `utils/MessageCache.ts`
- `hooks/useMessaging*.ts`
- `components/messaging/**/*.tsx`

## Mock Strategy

### External Dependencies
- **React Native**: Platform-specific APIs mocked
- **AsyncStorage**: In-memory storage simulation
- **Audio APIs**: Recording/playback simulation
- **Permissions**: Always granted for testing
- **WebSocket**: Full WebSocket API simulation
- **Fetch**: Configurable response mocking

### Internal Dependencies
- **API Client**: Mocked with configurable responses
- **Storage Services**: Mocked file operations
- **Authentication**: Mocked user sessions

## Test Data Patterns

### Message Objects
```typescript
const mockMessage = {
  _id: 'msg1',
  conversationId: 'conv1',
  fromUserId: 'user1',
  toUserId: 'user2',
  text: 'Test message',
  type: 'text' as const,
  createdAt: Date.now()
};
```

### User Objects
```typescript
const mockUser = {
  id: 'user1',
  subscriptionTier: 'premium' as SubscriptionTier
};
```

### Voice Message Blobs
```typescript
const mockBlob = new Blob(['audio data'], { type: 'audio/mp4' });
```

## Performance Benchmarks

### Response Time Targets
- Message loading: < 100ms (cached)
- Voice upload: < 5s (1MB file)
- Real-time updates: < 50ms processing
- Cache operations: < 10ms

### Memory Usage Targets
- Message cache: < 10MB for 1000 messages
- WebSocket connections: < 1MB per connection
- Voice message buffers: Released after upload

### Network Efficiency
- Request deduplication: 100% for identical requests
- Batch operations: > 5x efficiency improvement
- Cache hit rate: > 90% for repeated requests

## Debugging Tests

### Common Issues
1. **WebSocket Mock Issues**: Ensure event listeners are properly mocked
2. **Async/Await Problems**: Use proper async/await patterns in tests
3. **Timer Issues**: Use fake timers for time-dependent tests
4. **Memory Leaks**: Clean up mocks and listeners in afterEach

### Debug Commands
```bash
# Run specific test with verbose output
npm run test:messaging -- --verbose --testNamePattern="should validate"

# Run with debug logging
DEBUG=* npm run test:messaging

# Run single test file
npm run test:messaging -- messagingCore.test.ts
```

## Continuous Integration

### Pre-commit Hooks
- Run messaging tests before commit
- Ensure coverage thresholds are met
- Validate test file naming conventions

### CI Pipeline
- Run full test suite on pull requests
- Generate coverage reports
- Performance regression detection
- Cross-platform test execution

## Contributing

### Adding New Tests
1. Follow existing test structure and naming
2. Include both positive and negative test cases
3. Mock external dependencies appropriately
4. Maintain coverage thresholds
5. Document complex test scenarios

### Test Naming Convention
- Describe behavior, not implementation
- Use "should" statements for clarity
- Group related tests in describe blocks
- Use descriptive test data names

### Best Practices
- Keep tests focused and atomic
- Use meaningful assertions
- Avoid testing implementation details
- Mock at the boundary of your system
- Test error conditions thoroughly