import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Animated,
  Keyboard,
} from "react-native";
import { useMessageSearch } from "@/hooks/useMessageSearch";
import { SearchResult } from "../../utils/messageSearch";
import { useTheme, useThemedStyles } from "@contexts/ThemeContext";
import { Theme } from "@constants/Theme";
import { StyleProp, ViewStyle, TextStyle } from "react-native";

interface MessageSearchBarProps {
  conversationId: string;
  onResultSelect?: (result: SearchResult) => void;
  onSearchStateChange?: (isActive: boolean) => void;
  placeholder?: string;
  style?: any;
  autoFocus?: boolean;
  showSuggestions?: boolean;
  maxSuggestions?: number;
}

export const MessageSearchBar: React.FC<MessageSearchBarProps> = ({
  conversationId,
  onResultSelect,
  onSearchStateChange,
  placeholder = "Search messages...",
  style,
  autoFocus = false,
  showSuggestions = true,
  maxSuggestions = 5,
}) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  const {
    query,
    results,
    isSearching,
    hasSearched,
    suggestions,
    search,
    clearSearch,
    searchWithSuggestion,
    getHighlightedText,
    hasResults,
    isEmpty,
    isActive,
  } = useMessageSearch({
    conversationId,
    enableSuggestions: showSuggestions,
    debounceMs: 300,
    minQueryLength: 2,
  });

  // Notify parent of search state changes
  useEffect(() => {
    onSearchStateChange?.(isActive || isFocused);
  }, [isActive, isFocused, onSearchStateChange]);

  // Animate results container
  useEffect(() => {
    const shouldShow =
      isFocused &&
      (hasResults ||
        isSearching ||
        (query.length === 0 && suggestions.length > 0));
    setShowResults(shouldShow);

    Animated.timing(animatedHeight, {
      toValue: shouldShow ? 300 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [
    isFocused,
    hasResults,
    isSearching,
    query,
    suggestions.length,
    animatedHeight,
  ]);

  // Handle input focus
  const handleFocus = () => {
    setIsFocused(true);
  };

  // Handle input blur
  const handleBlur = () => {
    // Delay blur to allow for result selection
    setTimeout(() => {
      setIsFocused(false);
    }, 150);
  };

  // Handle text change
  const handleTextChange = (text: string) => {
    search(text);
  };

  // Handle clear button press
  const handleClear = () => {
    clearSearch();
    inputRef.current?.focus();
  };

  // Handle suggestion press
  const handleSuggestionPress = (suggestion: string) => {
    searchWithSuggestion(suggestion);
    Keyboard.dismiss();
  };

  // Handle result press
  const handleResultPress = (result: SearchResult) => {
    onResultSelect?.(result);
    setIsFocused(false);
    Keyboard.dismiss();
  };

  // Render search suggestion
  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSuggestionPress(item)}
    >
      <Text style={styles.suggestionIcon}>🔍</Text>
      <Text style={styles.suggestionText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render search result
  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultText} numberOfLines={2}>
          {item.matchedText}
        </Text>
        <Text style={styles.resultTime}>
          {new Date(item.message.createdAt || 0).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
      <View style={styles.resultScoreContainer}>
        <Text style={styles.scoreText}>{Math.round(item.score)}</Text>
      </View>
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => {
    if (isSearching) {
      return (
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={theme.colors.info[500]} />
          <Text style={styles.emptyText}>Searching...</Text>
        </View>
      );
    }

    if (isEmpty) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No messages found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      );
    }

    return null;
  };

  // Get data to display
  const getData = () => {
    if (query.length === 0 && showSuggestions) {
      return suggestions.slice(0, maxSuggestions);
    }
    return results;
  };

  const data = getData();
  const isShowingSuggestions = query.length === 0 && showSuggestions;

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={styles.inputContainer}>
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>

        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.text.secondary}
          value={query}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          autoFocus={autoFocus}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        {query.length > 0 && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}

        {isSearching && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={theme.colors.info[500]} />
          </View>
        )}
      </View>

      {/* Results/Suggestions Container */}
      <Animated.View
        style={[
          styles.resultsContainer,
          { height: animatedHeight },
          showResults && styles.resultsContainerVisible,
        ]}
      >
        {showResults &&
          (isShowingSuggestions ? (
            <FlatList
              data={data as string[]}
              keyExtractor={(item) => `suggestion-${item}`}
              renderItem={renderSuggestion}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
            />
          ) : (
            <FlatList
              data={data as SearchResult[]}
              keyExtractor={(item) => `result-${item.message._id}`}
              renderItem={renderResult}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.resultsList}
            />
          ))}
      </Animated.View>
    </View>
  );
};

interface MessageSearchResultsProps {
  results: SearchResult[];
  onResultSelect?: (result: SearchResult) => void;
  style?: any;
  showScore?: boolean;
}

export const MessageSearchResults: React.FC<MessageSearchResultsProps> = ({
  results,
  onResultSelect,
  style,
  showScore = false,
}) => {
  const styles = useThemedStyles(createStyles);
  const renderResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => onResultSelect?.(item)}
    >
      <View style={styles.resultContent}>
        <Text style={styles.resultText} numberOfLines={3}>
          {item.matchedText}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultTime}>
            {new Date(item.message.createdAt || 0).toLocaleDateString()}{" "}
            {new Date(item.message.createdAt || 0).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          {showScore && (
            <Text style={styles.resultScore}>
              Score: {Math.round(item.score)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (results.length === 0) {
    return (
      <View style={[styles.emptyState, style]}>
        <Text style={styles.emptyText}>No search results</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.message._id}
      renderItem={renderResult}
      style={[styles.resultsList, style]}
      showsVerticalScrollIndicator={true}
    />
  );
};

type Styles = {
  container: ViewStyle;
  inputContainer: ViewStyle;
  searchIcon: ViewStyle;
  searchIconText: TextStyle;
  input: TextStyle;
  clearButton: ViewStyle;
  clearButtonText: TextStyle;
  loadingIndicator: ViewStyle;
  resultsContainer: ViewStyle;
  resultsContainerVisible: ViewStyle;
  resultsList: ViewStyle;
  suggestionItem: ViewStyle;
  suggestionIcon: TextStyle;
  suggestionText: TextStyle;
  resultItem: ViewStyle;
  resultContent: ViewStyle;
  resultText: TextStyle;
  resultMeta: ViewStyle;
  resultTime: TextStyle;
  resultScoreContainer: ViewStyle;
  resultScore: TextStyle;
  scoreText: TextStyle;
  emptyState: ViewStyle;
  emptyText: TextStyle;
  emptySubtext: TextStyle;
};

const createStyles = (theme: Theme) =>
  StyleSheet.create<Styles>({
    container: {
      backgroundColor: theme.colors.background.primary,
    },
    inputContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background.secondary,
      borderRadius: 20,
      paddingHorizontal: 12,
      height: 40,
    },
    searchIcon: {
      marginRight: 8,
    },
    searchIconText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.primary,
      paddingVertical: 0,
    },
    clearButton: {
      marginLeft: 8,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.colors.neutral[300],
      alignItems: "center",
      justifyContent: "center",
    },
    clearButtonText: {
      fontSize: 12,
      color: theme.colors.background.primary,
      fontWeight: "bold",
    },
    loadingIndicator: {
      marginLeft: 8,
    },
    resultsContainer: {
      backgroundColor: theme.colors.background.primary,
      borderRadius: 8,
      marginTop: 4,
      overflow: "hidden",
      shadowColor: theme.colors.neutral[900],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    resultsContainerVisible: {
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
    },
    resultsList: {
      flex: 1,
    },
    suggestionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    suggestionIcon: {
      fontSize: 14,
      marginRight: 12,
      color: theme.colors.text.secondary,
    },
    suggestionText: {
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    resultItem: {
      flexDirection: "row",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.neutral[200],
    },
    resultContent: {
      flex: 1,
    },
    resultText: {
      fontSize: 14,
      color: theme.colors.text.primary,
      lineHeight: 20,
      marginBottom: 4,
    },
    resultMeta: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    resultTime: {
      fontSize: 12,
      color: theme.colors.text.secondary,
    },
    resultScoreContainer: {
      minWidth: 32,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 12,
      backgroundColor: theme.colors.info[50],
      alignItems: "center",
      justifyContent: "center",
    },
    resultScore: {
      fontSize: 12,
      color: theme.colors.info[600],
      fontWeight: "500",
    },
    scoreText: {
      fontSize: 12,
      color: theme.colors.info[600],
      fontWeight: "500",
    },
    emptyState: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 32,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.text.secondary,
      marginBottom: 4,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.neutral[500],
    },
  });
