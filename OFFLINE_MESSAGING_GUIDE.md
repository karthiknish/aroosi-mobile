# Offline Messaging Implementation Guide

This document describes the offline messaging system implemented for the Aroosi mobile app, providing reliable message delivery even when the device is offline or has poor connectivity.

## Overview

The offline messaging system consists of several key components:

1. **OfflineMessageQueue** - Core queue system for managing offline messages
2. **OfflineMessagingService** - High-level service integrating queue with sync
3. **Hooks** - React hooks for easy integration with components
4. **Components** - UI components for status display and user feedback

## Key Features

### ✅ Message Queuing
- Automatic queuing of messages when offline
- Priority-based message ordering (high, normal, low)
- Persistent storage using AsyncStorage
- Automatic retry with exponential backoff

### ✅ Automatic Sync
- Real-time sync when connection is restored
- Cross-platform message synchronization
- Conflict resolution strategies
- Background sync on app state changes

### ✅ Error Handling
- Intelligent error classification (recoverable vs non-recoverable)
- User-friendly error messages
- Manual retry options for failed messages
- Comprehensive error reporting

### ✅ Optimistic Updates
- Immediate UI updates for better UX
- Automatic confirmation when messages are sent
- Rollback on failure with error indication

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                         │
├─────────────────────────────────────────────────────────────┤
│                      React Hooks                           │
│  useOfflineMessaging | useOfflineMessageQueue | etc.       │
├─────────────────────────────────────────────────────────────┤
│                 OfflineMessagingService                     │
├─────────────────────────────────────────────────────────────┤
│  OfflineMessageQueue  │  MessageSyncManager  │ MessageCache │
├─────────────────────────────────────────────────────────────┤
│              AsyncStorage │ Network │ API Client            │
└─────────────────────────────────────────────────────────────┘
```

## Usage Examples

### Basic Message Sending

```typescript
import { useOfflineMessaging } from '../hooks/useOfflineMessaging';

function ChatComponent() {
  const { sendMessage, isOnline, hasFailedMessages } = useOfflineMessaging();

  const handleSendMessage = async (text: string) => {
    const result = await sendMessage({
      conversationId: 'conv-123',
      fromUserId: 'user-1',
      toUserId: 'user-2',
      text,
      type: 'text',
      createdAt: Date.now(),
    });

    if (result.success) {
      console.log('Message queued/sent:', result.messageId);
    } else {
      console.error('Failed to send:', result.error);
    }
  };

  return (
    <View>
      {!isOnline && <Text>Offline - messages will be sent when connected</Text>}
      {hasFailedMessages && <Text>Some messages failed to send</Text>}
      {/* Your chat UI */}
    </View>
  );
}
```

### Conversation-Specific Messaging

```typescript
import { useConversationMessaging } from '../hooks/useOfflineMessaging';

function ConversationScreen({ conversationId }: { conversationId: string }) {
  const {
    messages,
    sendMessage,
    loading,
    sync,
    isOnline,
  } = useConversationMessaging(conversationId);

  const handleSend = async (text: string) => {
    await sendMessage({
      fromUserId: 'user-1',
      toUserId: 'user-2',
      text,
      type: 'text',
    });
  };

  return (
    <View>
      {messages.map(message => (
        <MessageBubble key={message._id} message={message} />
      ))}
      <MessageInput onSend={handleSend} />
      {!isOnline && <OfflineIndicator />}
    </View>
  );
}
```

### Health Monitoring

```typescript
import { useOfflineMessagingHealth } from '../hooks/useOfflineMessaging';

function MessagingHealthMonitor() {
  const { healthStatus, availableActions, stats } = useOfflineMessagingHealth();

  return (
    <View>
      <Text>Status: {healthStatus.message}</Text>
      <Text>Failed Messages: {stats.failedMessages}</Text>
      
      {availableActions.map(action => (
        <Button
          key={action.id}
          title={action.label}
          onPress={action.action}
        />
      ))}
    </View>
  );
}
```

### Status Display Component

```typescript
import { OfflineMessageStatus } from '../components/messaging/OfflineMessageStatus';

function ChatScreen() {
  return (
    <View>
      <OfflineMessageStatus showDetails={true} />
      {/* Your chat content */}
    </View>
  );
}
```

## Configuration Options

### OfflineMessageQueue Options

```typescript
interface QueueOptions {
  maxRetries?: number;        // Default: 3
  baseRetryDelay?: number;    // Default: 1000ms
  maxRetryDelay?: number;     // Default: 30000ms
  storageKey?: string;        // Default: 'offline_message_queue'
  batchSize?: number;         // Default: 5
}
```

### OfflineMessagingService Options

```typescript
interface OfflineMessagingOptions {
  enableOfflineQueue?: boolean;   // Default: true
  enableAutoSync?: boolean;       // Default: true
  maxRetries?: number;           // Default: 3
  syncInterval?: number;         // Default: 30000ms
  cacheMessages?: boolean;       // Default: true
}
```

## Error Handling

### Error Types

The system classifies errors into recoverable and non-recoverable categories:

**Recoverable Errors** (will retry):
- Network errors
- Rate limiting (429)
- Temporary server errors (5xx)

**Non-Recoverable Errors** (will not retry):
- Authentication errors (401)
- Permission denied (403)
- User blocked
- Subscription required
- Message too long

### Error Recovery

```typescript
// Manual retry of failed messages
const { retryAllFailed, clearFailedMessages } = useOfflineMessaging();

// Retry all failed messages
await retryAllFailed();

// Or clear failed messages
const clearedCount = await clearFailedMessages();
```

## Storage and Persistence

### Queue Persistence

Messages are automatically persisted to AsyncStorage:

```typescript
// Storage structure
{
  queue: QueuedMessage[],
  stats: {
    totalProcessed: number,
    totalSuccessful: number,
    totalFailed: number,
    lastProcessedAt: number,
  },
  timestamp: number,
}
```

### Cache Management

Messages are cached using an LRU cache with automatic cleanup:

```typescript
// Cache configuration
const messageCache = new MessageCache({
  maxSize: 100,                    // Max conversations
  maxAge: 30 * 60 * 1000,         // 30 minutes
  cleanupInterval: 5 * 60 * 1000,  // 5 minutes
});
```

## Network Monitoring

The system automatically monitors network connectivity:

- Uses `@react-native-community/netinfo` for network status
- Monitors app state changes (foreground/background)
- Automatically processes queue when coming online
- Triggers sync when connection is restored

## Testing

### Unit Tests

Run the offline messaging tests:

```bash
npm test -- offlineMessageQueue.test.ts
```

### Integration Testing

Test the complete flow:

1. Send messages while offline
2. Verify messages are queued
3. Go online
4. Verify messages are sent automatically
5. Test error scenarios and retries

### Manual Testing Scenarios

1. **Offline Messaging**
   - Turn off network
   - Send messages
   - Verify they're queued
   - Turn on network
   - Verify they're sent

2. **Poor Connectivity**
   - Simulate slow/unreliable network
   - Send messages
   - Verify retry behavior

3. **Error Handling**
   - Test with invalid auth tokens
   - Test with blocked users
   - Verify appropriate error handling

## Performance Considerations

### Queue Size Management

- Maximum queue size: 1000 messages per conversation
- Automatic cleanup of old messages
- LRU eviction when memory is low

### Batch Processing

- Messages processed in batches of 5
- Prevents overwhelming the API
- Maintains UI responsiveness

### Background Processing

- Queue processing continues in background
- Automatic pause/resume based on app state
- Efficient battery usage

## Troubleshooting

### Common Issues

1. **Messages not sending**
   - Check network connectivity
   - Verify API authentication
   - Check queue status

2. **High memory usage**
   - Check cache size settings
   - Verify cleanup intervals
   - Monitor queue size

3. **Sync conflicts**
   - Check conflict resolution strategy
   - Verify message timestamps
   - Review sync logs

### Debug Information

```typescript
// Get detailed status
const service = useOfflineMessaging();
const status = service.getStatus();

console.log('Service Status:', {
  isInitialized: status.isInitialized,
  isOnline: status.isOnline,
  queueStats: status.queueStats,
  optimisticMessages: status.optimisticMessages,
});
```

## Best Practices

### Message Handling

1. Always use optimistic updates for better UX
2. Provide clear feedback for offline states
3. Handle errors gracefully with user-friendly messages
4. Implement proper loading states

### Performance

1. Limit message cache size appropriately
2. Use pagination for large conversations
3. Implement proper cleanup strategies
4. Monitor memory usage

### User Experience

1. Show clear offline indicators
2. Provide retry options for failed messages
3. Display sync progress when appropriate
4. Handle edge cases gracefully

## Migration Guide

### From Basic Messaging

1. Replace direct API calls with `useOfflineMessaging`
2. Add offline status indicators to UI
3. Implement error handling for failed messages
4. Add retry mechanisms

### Configuration Updates

Update your messaging configuration:

```typescript
// Before
const sendMessage = async (data) => {
  return await apiClient.sendMessage(data);
};

// After
const { sendMessage } = useOfflineMessaging({
  enableOfflineQueue: true,
  enableAutoSync: true,
  maxRetries: 3,
});
```

## Future Enhancements

### Planned Features

1. **Message Encryption** - End-to-end encryption for queued messages
2. **Advanced Sync** - Selective sync based on conversation activity
3. **Analytics** - Detailed metrics for message delivery
4. **Compression** - Message compression for large queues

### Performance Improvements

1. **Background Sync** - More efficient background processing
2. **Smart Retry** - Adaptive retry strategies based on error patterns
3. **Bandwidth Optimization** - Compress messages and batch uploads
4. **Storage Optimization** - More efficient storage formats

This implementation provides a robust foundation for offline messaging that ensures reliable message delivery while maintaining excellent user experience across all network conditions.