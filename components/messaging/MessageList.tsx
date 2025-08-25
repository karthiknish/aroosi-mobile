import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { Message } from "../../types/messaging";
import { useMessageHistory } from "@/hooks/useMessageHistory";

interface MessageListProps {
  conversationId: string;
  renderMessage: ListRenderItem<Message>;
  onEndReachedThreshold?: number;
  refreshing?: boolean;
  onRefresh?: () => void;
  style?: any;
  contentContainerStyle?: any;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  maintainVisibleContentPosition?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  conversationId,
  renderMessage,
  onEndReachedThreshold = 0.1,
  refreshing = false,
  onRefresh,
  style,
  contentContainerStyle,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  onScroll,
  maintainVisibleContentPosition = true,
}) => {
  const {
    messages,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMoreMessages,
    refresh,
    saveScrollPosition,
    getSavedScrollPosition,
    saveMessageHeight,
    calculateScrollOffset,
    canLoadMore,
    isEmpty,
  } = useMessageHistory({
    conversationId,
    pageSize: 20,
    enableCache: true,
    preloadPages: 1,
  });

  const flatListRef = useRef<FlatList>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [shouldMaintainPosition, setShouldMaintainPosition] = useState(false);
  const previousMessageCount = useRef(messages.length);

  // Handle scroll to maintain position when loading more messages
  useEffect(() => {
    if (
      maintainVisibleContentPosition &&
      messages.length > previousMessageCount.current
    ) {
      const newMessageCount = messages.length - previousMessageCount.current;

      if (shouldMaintainPosition && !isNearBottom) {
        // Calculate offset to maintain scroll position
        const scrollOffset = calculateScrollOffset(newMessageCount);

        // Scroll to maintain position
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: scrollOffset,
            animated: false,
          });
        }, 50);
      }

      setShouldMaintainPosition(false);
    }

    previousMessageCount.current = messages.length;
  }, [
    messages.length,
    maintainVisibleContentPosition,
    shouldMaintainPosition,
    isNearBottom,
    calculateScrollOffset,
  ]);

  // Handle end reached (load more messages)
  const handleEndReached = useCallback(() => {
    if (canLoadMore) {
      setShouldMaintainPosition(true);
      loadMoreMessages();
    }
  }, [canLoadMore, loadMoreMessages]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    } else {
      refresh();
    }
  }, [onRefresh, refresh]);

  // Handle scroll events
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } =
        event.nativeEvent;

      // Save scroll position
      saveScrollPosition(contentOffset.y);

      // Check if near bottom (within 100px)
      const isNearBottomNow =
        contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
      setIsNearBottom(isNearBottomNow);

      // Call external scroll handler
      onScroll?.(event);
    },
    [saveScrollPosition, onScroll]
  );

  // Handle message layout for scroll position calculation
  const handleMessageLayout = useCallback(
    (messageId: string, height: number) => {
      saveMessageHeight(messageId, height);
    },
    [saveMessageHeight]
  );

  // Render message with layout handling
  const renderMessageWithLayout = useCallback<ListRenderItem<Message>>(
    (info) => {
      const { item, index } = info;
      return (
        <View
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            handleMessageLayout(item._id, height);
          }}
        >
          {renderMessage(info)}
        </View>
      );
    },
    [renderMessage, handleMessageLayout]
  );

  // Render loading header (when loading more messages)
  const renderLoadingHeader = useCallback(() => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingHeader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.loadingText}>Loading more messages...</Text>
      </View>
    );
  }, [isLoadingMore]);

  // Render empty state
  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.emptyText}>Loading messages...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.errorText}>Failed to load messages</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No messages yet</Text>
          <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
      );
    }

    if (!ListEmptyComponent) return null;
    return typeof ListEmptyComponent === "function" ? (
      // Component type
      // @ts-ignore runtime component invocation
      <ListEmptyComponent />
    ) : (
      // Already an element
      ListEmptyComponent
    );
  }, [isLoading, error, isEmpty, ListEmptyComponent]);

  // Key extractor
  const keyExtractor = useCallback((item: Message) => item._id, []);

  // Get item layout for better performance
  const getItemLayout = useCallback(
    (_data: ArrayLike<Message> | null | undefined, index: number) => {
      const averageHeight = 80; // Estimated average message height
      return {
        length: averageHeight,
        offset: averageHeight * index,
        index,
      };
    },
    []
  );

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      renderItem={renderMessageWithLayout}
      keyExtractor={keyExtractor}
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.contentContainer,
        contentContainerStyle,
        isEmpty && styles.emptyContentContainer,
      ]}
      inverted // Show newest messages at bottom
      onEndReached={handleEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={["#007AFF"]}
          tintColor="#007AFF"
        />
      }
      ListHeaderComponent={renderLoadingHeader}
      ListFooterComponent={ListFooterComponent}
          ListEmptyComponent={renderEmptyState as any}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={20}
      getItemLayout={getItemLayout}
      maintainVisibleContentPosition={
        maintainVisibleContentPosition
          ? {
              minIndexForVisible: 0,
              autoscrollToTopThreshold: 100,
            }
          : undefined
      }
    />
  );
};

interface MessageListWithSearchProps extends MessageListProps {
  searchQuery?: string;
  onSearchResults?: (results: Message[]) => void;
}

export const MessageListWithSearch: React.FC<MessageListWithSearchProps> = ({
  searchQuery,
  onSearchResults,
  ...props
}) => {
  const { searchMessages } = useMessageHistory({
    conversationId: props.conversationId,
  });

  const [searchResults, setSearchResults] = useState<Message[]>([]);

  // Handle search
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      const results = searchMessages(searchQuery);
      setSearchResults(results);
      onSearchResults?.(results);
    } else {
      setSearchResults([]);
      onSearchResults?.([]);
    }
  }, [searchQuery, searchMessages, onSearchResults]);

  // Render search results or normal messages
  const data = searchQuery && searchQuery.trim() ? searchResults : undefined;

  return (
    <MessageList
      {...props}
      // Override data if searching
      {...(data && { data })}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingVertical: 8,
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
