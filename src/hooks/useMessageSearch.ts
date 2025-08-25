import { useState, useEffect, useCallback, useMemo } from "react";
import { Message } from "@/types/message";
import {
  messageSearchEngine,
  SearchResult,
  SearchOptions,
  generateSearchSuggestions,
  highlightSearchTerms,
} from "@utils/messageSearch";
import { useMessageHistory } from "./useMessageHistory";
import { useApiClient } from "@utils/api";

interface UseMessageSearchOptions extends SearchOptions {
  conversationId?: string;
  debounceMs?: number;
  minQueryLength?: number;
  enableSuggestions?: boolean;
  enableServerSearch?: boolean;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  error: Error | null;
  suggestions: string[];
  totalResults: number;
}

/**
 * Hook for searching messages with local and server-side search capabilities
 */
export function useMessageSearch(options: UseMessageSearchOptions = {}) {
  const {
    conversationId,
    debounceMs = 300,
    minQueryLength = 2,
    enableSuggestions = true,
    enableServerSearch = false,
    ...searchOptions
  } = options;

  const [state, setState] = useState<SearchState>({
    query: "",
    results: [],
    isSearching: false,
    hasSearched: false,
    error: null,
    suggestions: [],
    totalResults: 0,
  });

  const apiClient = useApiClient();
  const { messages } = useMessageHistory({
    conversationId: conversationId || "",
    enableCache: true,
  });

  // Generate search suggestions from message history
  const suggestions = useMemo(() => {
    if (!enableSuggestions || messages.length === 0) return [];
    return generateSearchSuggestions(messages, 10);
  }, [messages, enableSuggestions]);

  // Update suggestions in state
  useEffect(() => {
    setState((prev) => ({ ...prev, suggestions }));
  }, [suggestions]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < minQueryLength) {
        setState((prev) => ({
          ...prev,
          results: [],
          isSearching: false,
          hasSearched: false,
          error: null,
          totalResults: 0,
        }));
        return;
      }

      setState((prev) => ({ ...prev, isSearching: true, error: null }));

      try {
        let results: SearchResult[] = [];

        // Local search in cached messages
        if (messages.length > 0) {
          results = messageSearchEngine.search(messages, query, searchOptions);
        }

        // Server-side search if enabled and we have a conversation ID
        if (enableServerSearch && conversationId) {
          try {
            const serverResults = await searchOnServer(query, conversationId);

            // Merge server results with local results, avoiding duplicates
            const localMessageIds = new Set(results.map((r) => r.message._id));
            const uniqueServerResults = serverResults.filter(
              (r) => !localMessageIds.has(r.message._id)
            );

            results = [...results, ...uniqueServerResults];

            // Re-sort by score
            results.sort((a, b) => b.score - a.score);
          } catch (serverError) {
            console.warn(
              "Server search failed, using local results only:",
              serverError
            );
          }
        }

        setState((prev) => ({
          ...prev,
          results,
          isSearching: false,
          hasSearched: true,
          totalResults: results.length,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isSearching: false,
          error: error instanceof Error ? error : new Error("Search failed"),
          results: [],
          totalResults: 0,
        }));
      }
    }, debounceMs),
    [
      messages,
      conversationId,
      enableServerSearch,
      searchOptions,
      minQueryLength,
      debounceMs,
    ]
  );

  // Server-side search function
  const searchOnServer = useCallback(
    async (query: string, convId: string): Promise<SearchResult[]> => {
      // This would be implemented based on your server API
      // For now, return empty array as placeholder
      console.log("Server search not implemented yet:", { query, convId });
      return [];
    },
    []
  );

  // Search function
  const search = useCallback(
    (query: string) => {
      setState((prev) => ({ ...prev, query }));
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  // Clear search
  const clearSearch = useCallback(() => {
    setState({
      query: "",
      results: [],
      isSearching: false,
      hasSearched: false,
      error: null,
      suggestions,
      totalResults: 0,
    });
  }, [suggestions]);

  // Search with suggestion
  const searchWithSuggestion = useCallback(
    (suggestion: string) => {
      search(suggestion);
    },
    [search]
  );

  // Get highlighted text for a result
  const getHighlightedText = useCallback((result: SearchResult): string => {
    return highlightSearchTerms(result.matchedText, result.highlightRanges);
  }, []);

  // Filter results by message type
  const filterResultsByType = useCallback(
    (type: "text" | "voice" | "image"): SearchResult[] => {
      return state.results.filter((result) => result.message.type === type);
    },
    [state.results]
  );

  // Get results in date range
  const getResultsInDateRange = useCallback(
    (startDate: Date, endDate: Date): SearchResult[] => {
      return state.results.filter((result) => {
        const messageDate = new Date(result.message.createdAt || 0);
        return messageDate >= startDate && messageDate <= endDate;
      });
    },
    [state.results]
  );

  return {
    // State
    ...state,

    // Actions
    search,
    clearSearch,
    searchWithSuggestion,

    // Utilities
    getHighlightedText,
    filterResultsByType,
    getResultsInDateRange,

    // Computed properties
    hasResults: state.results.length > 0,
    isEmpty: state.hasSearched && state.results.length === 0,
    isActive: state.query.length >= minQueryLength,
  };
}

/**
 * Hook for searching across multiple conversations
 */
export function useGlobalMessageSearch(options: UseMessageSearchOptions = {}) {
  const [conversations, setConversations] = useState<string[]>([]);
  const [searchResults, setSearchResults] = useState<
    Map<string, SearchResult[]>
  >(new Map());
  const [isSearching, setIsSearching] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const apiClient = useApiClient();

  // Search across all conversations
  const searchGlobal = useCallback(
    async (query: string) => {
      if (query.length < (options.minQueryLength || 2)) {
        setSearchResults(new Map());
        setTotalResults(0);
        return;
      }

      setIsSearching(true);
      const results = new Map<string, SearchResult[]>();
      let total = 0;

      try {
        // This would typically involve server-side search across conversations
        // For now, we'll search in locally cached conversations
        for (const conversationId of conversations) {
          // Get cached messages for this conversation
          const { messageCache } = await import("@utils/MessageCache");
          const messages = messageCache.get(conversationId);

          if (messages && messages.length > 0) {
            const conversationResults = messageSearchEngine.search(
              messages,
              query,
              options
            );
            if (conversationResults.length > 0) {
              results.set(conversationId, conversationResults);
              total += conversationResults.length;
            }
          }
        }

        setSearchResults(results);
        setTotalResults(total);
      } catch (error) {
        console.error("Global search failed:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [conversations, options]
  );

  // Get all results flattened
  const getAllResults = useCallback((): SearchResult[] => {
    const allResults: SearchResult[] = [];
    for (const results of searchResults.values()) {
      allResults.push(...results);
    }
    return allResults.sort((a, b) => b.score - a.score);
  }, [searchResults]);

  // Get results for specific conversation
  const getResultsForConversation = useCallback(
    (conversationId: string): SearchResult[] => {
      return searchResults.get(conversationId) || [];
    },
    [searchResults]
  );

  return {
    searchGlobal,
    getAllResults,
    getResultsForConversation,
    isSearching,
    totalResults,
    conversationResults: Object.fromEntries(searchResults),
    setConversations,
  };
}

/**
 * Debounce utility function
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
