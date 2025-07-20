# Messaging System Test Suite

This document provides comprehensive information about the messaging system test suite, including how to run tests, interpret results, and contribute new tests.

## Overview

The messaging system test suite validates the core functionality, cross-platform synchronization, integration, and performance of the messaging features. It ensures that the messaging system works correctly across web and mobile platforms with proper subscription-based feature gating.

## Test Structure

### 📁 Test Files

- **`messagingCoreFixed.test.ts`** - Core functionality tests
- **`messagingIntegrationFixed.test.ts`** - Integration tests  
- **`crossPlatformSyncFixed.test.ts`** - Cross-platform synchronization tests
- **`messagingPerformanceFixed.test.ts`** - Performance and stress tests
- **`setup.ts`** - Test environment setup and mocks
- **`jest.config.js`** - Jest configuration for messaging tests
- **`runTests.js`** - Test runner script with reporting

## 🚀 Running Tests

### Quick Start

```bash
# Run all messaging tests
npm run test:messaging

# Run specific test suites
npm run test:messaging:core          # Core functionality only
npm run test:messaging:integration   # Integration tests only
npm run test:messaging:sync         # Cross-platform sync only
npm run test:messaging:performance  # Performance tests only

# Development modes
npm run test:messaging:watch        # Watch mode for development
npm run test:messaging:coverage     # Generate coverage report
```

### Advanced Usage

```bash
# Run tests with custom options
node __tests__/messaging/runTests.js --help

# Run specific test patterns
npx jest __tests__/messaging --testNamePattern="voice message"
npx jest __tests__/messaging --testNamePattern="subscription"

# Debug mode
DEBUG=* npm run test:messaging:core
```

## 📊 Test Categories

### 1. Core Functionality Tests (`messagingCoreFixed.test.ts`)

Tests the fundamental messaging features:

#### Message Validation and Sanitization
- ✅ Text message validation (length, content, HTML sanitization)
- ✅ Voice message validation (duration, file size)
- ✅ Image message validation (format, size)
- ✅ Security sanitization (XSS prevention, malicious content filtering)
- ✅ Unicode and emoji support

#### Subscription Feature Gating
- ✅ Free tier limitations (no chat initiation, daily limits, no voice messages)
- ✅ Premium tier features (unlimited messaging, voice messages)
- ✅ Premium Plus tier features (all features including image messages)
- ✅ Feature gate enforcement during message flow
- ✅ Daily message limit tracking

#### Voice Message System
- ✅ Voice message upload flow (validation, storage, API integration)
- ✅ Playback URL generation and caching
- ✅ Error handling for upload/playback failures
- ✅ Audio permission handling

#### Real-time Messaging Features
- ✅ WebSocket connection management
- ✅ Typing indicators (send/receive)
- ✅ Message delivery receipts
- ✅ Real-time message synchronization
- ✅ Connection status handling

#### Message Caching
- ✅ LRU cache implementation
- ✅ Cache performance with large datasets
- ✅ Message search functionality
- ✅ Cache expiration and cleanup

#### Rate Limiting and Security
- ✅ Client-side rate limiting
- ✅ Burst protection
- ✅ Security validation
- ✅ Spam detection

### 2. Integration Tests (`messagingIntegrationFixed.test.ts`)

Tests end-to-end messaging flows:

#### End-to-End Message Flow
- ✅ Complete message sending workflow
- ✅ Voice message end-to-end flow
- ✅ Real-time message updates
- ✅ Error recovery scenarios

#### Cross-Platform Message Synchronization
- ✅ Message sync between web and mobile
- ✅ Message ordering consistency
- ✅ Read status synchronization
- ✅ Conversation state sync

#### Offline/Online Transition Scenarios
- ✅ Message queuing when offline
- ✅ Queue processing when back online
- ✅ Missed message synchronization
- ✅ Network failure recovery

#### Subscription Integration
- ✅ Feature gate enforcement during message flow
- ✅ Premium feature access validation
- ✅ Daily limit tracking and enforcement

### 3. Cross-Platform Sync Tests (`crossPlatformSyncFixed.test.ts`)

Tests synchronization between platforms:

#### Real-time Synchronization
- ✅ Bidirectional message sync (web ↔ mobile)
- ✅ Typing indicator sync
- ✅ Read receipt sync
- ✅ Connection management across platforms

#### Message History Synchronization
- ✅ Consistent message ordering
- ✅ Pagination consistency
- ✅ Out-of-order message handling
- ✅ Conflict resolution

#### Offline/Online Scenarios
- ✅ Offline message queuing
- ✅ Missed message sync on reconnection
- ✅ Network partition handling
- ✅ Data consistency after reconnection

#### Voice Message Sync
- ✅ Voice message cross-platform delivery
- ✅ Playback status synchronization
- ✅ Metadata consistency

### 4. Performance Tests (`messagingPerformanceFixed.test.ts`)

Tests system performance and scalability:

#### Message Cache Performance
- ✅ Large message set handling (10,000+ messages)
- ✅ Concurrent cache operations
- ✅ Search performance with large datasets
- ✅ Memory usage optimization

#### API Performance
- ✅ Rapid message sending (50+ messages/second)
- ✅ Batch message retrieval
- ✅ High-frequency API calls with rate limiting
- ✅ Response time benchmarks

#### Real-time Performance
- ✅ High-frequency WebSocket messages (1000+ messages/second)
- ✅ Typing indicator efficiency
- ✅ Multiple concurrent connections (20+ simultaneous)
- ✅ Message broadcasting performance

#### Voice Message Performance
- ✅ Upload efficiency across file sizes (1KB - 5MB)
- ✅ URL caching performance
- ✅ Concurrent upload handling
- ✅ Playback optimization

#### Stress Testing
- ✅ Extreme message volumes (100,000+ messages)
- ✅ Memory leak prevention
- ✅ Connection/disconnection cycles
- ✅ System responsiveness under load

## 🎯 Performance Benchmarks

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

## 📈 Coverage Requirements

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
- `utils/offlineMessageQueue.ts`
- `hooks/useMessaging*.ts`
- `components/messaging/**/*.tsx`

## 🔧 Test Configuration

### Jest Configuration (`jest.config.js`)
- React Native preset with jsdom environment
- Custom setup file for mocking dependencies
- Coverage thresholds (80% minimum)
- Module name mapping for imports
- Transform ignore patterns for React Native modules

### Mock Strategy

#### External Dependencies
- **React Native**: Platform-specific APIs mocked
- **AsyncStorage**: In-memory storage simulation
- **Audio APIs**: Recording/playback simulation
- **Permissions**: Always granted for testing
- **WebSocket**: Full WebSocket API simulation
- **Fetch**: Configurable response mocking

#### Internal Dependencies
- **API Client**: Mocked with configurable responses
- **Storage Services**: Mocked file operations
- **Authentication**: Mocked user sessions

## 🐛 Debugging Tests

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
npx jest __tests__/messaging/messagingCoreFixed.test.ts --verbose
```

## 📝 Test Data Patterns

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

## 🚀 Continuous Integration

### Pre-commit Hooks
- Run messaging tests before commit
- Ensure coverage thresholds are met
- Validate test file naming conventions

### CI Pipeline
- Run full test suite on pull requests
- Generate coverage reports
- Performance regression detection
- Cross-platform test execution

## 🤝 Contributing

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

## 📊 Test Results Interpretation

### Success Indicators
- ✅ All tests pass
- ✅ Coverage thresholds met
- ✅ Performance benchmarks achieved
- ✅ No memory leaks detected

### Failure Analysis
- ❌ Test failures indicate functional issues
- ⚠️ Coverage drops suggest missing tests
- 🐌 Performance regressions need investigation
- 💾 Memory issues require optimization

## 🔄 Maintenance

### Regular Tasks
- Update tests when adding new features
- Review and update performance benchmarks
- Clean up deprecated test patterns
- Update mock implementations

### Quarterly Reviews
- Analyze test coverage trends
- Review performance benchmark relevance
- Update test documentation
- Optimize test execution time

## 📞 Support

For questions about the messaging test suite:

1. Check this documentation first
2. Review existing test patterns
3. Check the test output for specific error messages
4. Consult the main messaging system documentation

## 🎉 Success Metrics

The messaging test suite is successful when:

- ✅ All core messaging features are validated
- ✅ Cross-platform synchronization works reliably
- ✅ Performance meets or exceeds benchmarks
- ✅ Subscription features are properly gated
- ✅ Error scenarios are handled gracefully
- ✅ Code coverage exceeds 80% threshold
- ✅ Tests run quickly and reliably in CI/CD

This comprehensive test suite ensures the messaging system is robust, performant, and reliable across all supported platforms and subscription tiers.