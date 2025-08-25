import { useState, useEffect, useCallback, useRef } from "react";
import { Message } from "../types/messaging";
import { useApiClient } from "@utils/api";
import { messageCache, messagePagination } from "@utils/MessageCache";

interface UseMessageHistoryOptions {
  conversationId: string;
  pageSize?: number;
  enableCache?: boolean;
  preloadPages?: number;
  onError?: (error: Error) => void;
}

interface MessageHistoryState {
  messages: Message[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  totalCount: number;
  currentPage: number;
}

/**
 * Hook for managing message history with infinite scroll and caching
 */
export function useMessageHistory({
  conversationId,
  pageSize = 20,
  enableCache = true,
  preloadPages = 1,
  onError,
}: UseMessageHistoryOptions) {
  const [state, setState] = useState<MessageHistoryState>({
    messages: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: true,
    error: null,
    totalCount: 0,
    currentPage: 0,
  });

  const apiClient = useApiClient();
  const loadingRef = useRef(false);
  const scrollPositionRef = useRef<number>(0);
  const messageHeightsRef = useRef<Map<string, number>>(new Map());

  // Initialize with cached messages
  useEffect(() => {
    if (enableCache && conversationId) {
      const cachedMessages = messageCache.get(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        setState((prev) => ({
          ...prev,
          messages: cachedMessages,
          totalCount: cachedMessages.length,
        }));
      }
    }
  }, [conversationId, enableCache]);

  // Load initial messages
  useEffect(() => {
    if (conversationId) {
      loadInitialMessages();
    }
  }, [conversationId]);

  // Load initial messages
  const loadInitialMessages = useCallback(async () => {
    if (loadingRef.current) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    loadingRef.current = true;

    try {
      // Check cache first
      if (enableCache) {
        const cachedMessages = messageCache.get(conversationId);
        if (cachedMessages && cachedMessages.length >= pageSize) {
          setState((prev) => ({
            ...prev,
            messages: cachedMessages,
            isLoading: false,
            hasMore: messagePagination.hasMorePages(conversationId),
            totalCount: messagePagination.getTotalCount(conversationId),
          }));
          loadingRef.current = false;
          return;
        }
      }

      // Load from API
      const response = await apiClient.getMessages(conversationId, {
        limit: pageSize,
      });

      if (response.success && response.data) {
        const messages = response.data;

        // Update cache
        if (enableCache) {
          messageCache.set(conversationId, messages);
          messagePagination.markPageLoaded(conversationId, 0);
          messagePagination.setTotalCount(conversationId, messages.length);
        }

        setState((prev) => ({
          ...prev,
          messages,
          isLoading: false,
          hasMore: messages.length === pageSize,
          totalCount: messages.length,
          currentPage: 0,
        }));

        // Preload additional pages if requested
        if (preloadPages > 0 && messages.length === pageSize) {
          preloadNextPages(1, preloadPages);
        }
      } else {
        throw new Error(response.error?.message || "Failed to load messages");
      }
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error("Failed to load messages");
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err,
      }));
      onError?.(err);
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId, pageSize, enableCache, preloadPages, apiClient, onError]);

  // Load more messages (for infinite scroll)
  const loadMoreMessages = useCallback(async () => {
    if (loadingRef.current || !state.hasMore || state.isLoadingMore) {
      return false;
    }

    setState((prev) => ({ ...prev, isLoadingMore: true, error: null }));
    loadingRef.current = true;

    try {
      const nextPage = enableCache
        ? messagePagination.getNextPage(conversationId)
        : state.currentPage + 1;

      // Check if page is already loaded in cache
      if (
        enableCache &&
        messagePagination.isPageLoaded(conversationId, nextPage)
      ) {
        const cachedMessages = messageCache.get(conversationId);
        if (cachedMessages) {
          setState((prev) => ({
            ...prev,
            messages: cachedMessages,
            isLoadingMore: false,
            currentPage: nextPage,
          }));
          loadingRef.current = false;
          return true;
        }
      }

      // Calculate offset for pagination
      const offset = nextPage * pageSize;
      const oldestMessage = state.messages[0];
      const before = oldestMessage?.createdAt;

      const response = await apiClient.getMessages(conversationId, {
        limit: pageSize,
        before,
      });

      if (response.success && response.data) {
        const newMessages = response.data;

        if (newMessages.length === 0) {
          setState((prev) => ({
            ...prev,
            isLoadingMore: false,
            hasMore: false,
          }));
          loadingRef.current = false;
          return false;
        }

        // Merge with existing messages
        const allMessages = [...newMessages, ...state.messages];

        // Update cache
        if (enableCache) {
          messageCache.set(conversationId, allMessages);
          messagePagination.markPageLoaded(conversationId, nextPage);
          messagePagination.setTotalCount(conversationId, allMessages.length);
        }

        setState((prev) => ({
          ...prev,
          messages: allMessages,
          isLoadingMore: false,
          hasMore: newMessages.length === pageSize,
          totalCount: allMessages.length,
          currentPage: nextPage,
        }));

        return true;
      } else {
        throw new Error(
          response.error?.message || "Failed to load more messages"
        );
      }
    } catch (error) {
      const err =
        error instanceof Error
          ? error
          : new Error("Failed to load more messages");
      setState((prev) => ({
        ...prev,
        isLoadingMore: false,
        error: err,
      }));
      onError?.(err);
      return false;
    } finally {
      loadingRef.current = false;
    }
  }, [conversationId, pageSize, state, enableCache, apiClient, onError]);

  // Preload next pages in background
  const preloadNextPages = useCallback(
    async (startPage: number, count: number) => {
      for (let i = 0; i < count; i++) {
        const page = startPage + i;

        if (
          enableCache &&
          messagePagination.isPageLoaded(conversationId, page)
        ) {
          continue;
        }

        try {
          const offset = page * pageSize;
          const response = await apiClient.getMessages(conversationId, {
            limit: pageSize,
            before: state.messages[offset - 1]?.createdAt,
          });

          if (response.success && response.data && response.data.length > 0) {
            if (enableCache) {
              messageCache.addMessages(conversationId, response.data, true);
              messagePagination.markPageLoaded(conversationId, page);
            }
          } else {
            break; // No more messages to preload
          }
        } catch (error) {
          console.warn(`Failed to preload page ${page}:`, error);
          break;
        }
      }
    },
    [conversationId, pageSize, state.messages, enableCache, apiClient]
  );

  // Add new message (for real-time updates)
  const addMessage = useCallback(
    (message: Message) => {
      setState((prev) => {
        const newMessages = [...prev.messages, message];

        // Update cache
        if (enableCache) {
          messageCache.set(conversationId, newMessages);
        }

        return {
          ...prev,
          messages: newMessages,
          totalCount: prev.totalCount + 1,
        };
      });
    },
    [conversationId, enableCache]
  );

  // Update existing message
  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      setState((prev) => {
        const messageIndex = prev.messages.findIndex(
          (m) => m._id === messageId
        );
        if (messageIndex === -1) return prev;

        const newMessages = [...prev.messages];
        newMessages[messageIndex] = {
          ...newMessages[messageIndex],
          ...updates,
        };

        // Update cache
        if (enableCache) {
          messageCache.set(conversationId, newMessages);
        }

        return {
          ...prev,
          messages: newMessages,
        };
      });
    },
    [conversationId, enableCache]
  );

  // Remove message
  const removeMessage = useCallback(
    (messageId: string) => {
      setState((prev) => {
        const newMessages = prev.messages.filter((m) => m._id !== messageId);

        // Update cache
        if (enableCache) {
          messageCache.set(conversationId, newMessages);
        }

        return {
          ...prev,
          messages: newMessages,
          totalCount: Math.max(0, prev.totalCount - 1),
        };
      });
    },
    [conversationId, enableCache]
  );

  // Refresh messages
  const refresh = useCallback(async () => {
    // Clear cache for this conversation
    if (enableCache) {
      messageCache.delete(conversationId);
      messagePagination.clearConversation(conversationId);
    }

    // Reset state
    setState((prev) => ({
      ...prev,
      messages: [],
      currentPage: 0,
      hasMore: true,
      totalCount: 0,
    }));

    // Reload
    await loadInitialMessages();
  }, [conversationId, enableCache, loadInitialMessages]);

  // Save scroll position
  const saveScrollPosition = useCallback((position: number) => {
    scrollPositionRef.current = position;
  }, []);

  // Get saved scroll position
  const getSavedScrollPosition = useCallback(() => {
    return scrollPositionRef.current;
  }, []);

  // Save message height for scroll position calculation
  const saveMessageHeight = useCallback((messageId: string, height: number) => {
    messageHeightsRef.current.set(messageId, height);
  }, []);

  // Calculate scroll position after loading more messages
  const calculateScrollOffset = useCallback(
    (newMessageCount: number): number => {
      let totalHeight = 0;
      const messageIds = state.messages
        .slice(0, newMessageCount)
        .map((m) => m._id);

      for (const messageId of messageIds) {
        const height = messageHeightsRef.current.get(messageId) || 60; // Default height
        totalHeight += height;
      }

      return totalHeight;
    },
    [state.messages]
  );

  // Search messages in current loaded set
  const searchMessages = useCallback(
    (query: string): Message[] => {
      if (!query.trim()) return [];

      const lowercaseQuery = query.toLowerCase();
      return state.messages.filter((message) =>
        message.text?.toLowerCase().includes(lowercaseQuery)
      );
    },
    [state.messages]
  );

  return {
    // State
    ...state,

    // Actions
    loadMoreMessages,
    addMessage,
    updateMessage,
    removeMessage,
    refresh,

    // Scroll position management
    saveScrollPosition,
    getSavedScrollPosition,
    saveMessageHeight,
    calculateScrollOffset,

    // Search
    searchMessages,

    // Utilities
    canLoadMore: state.hasMore && !state.isLoading && !state.isLoadingMore,
    isEmpty: state.messages.length === 0 && !state.isLoading,
  };
}
