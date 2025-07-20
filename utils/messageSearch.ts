import { Message } from "../types/messaging";

export interface SearchResult {
  message: Message;
  matchedText: string;
  highlightRanges: Array<{ start: number; end: number }>;
  score: number;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWords?: boolean;
  fuzzyMatch?: boolean;
  maxResults?: number;
  includeContext?: boolean;
  contextLength?: number;
}

/**
 * Advanced message search utility with highlighting and scoring
 */
export class MessageSearchEngine {
  private stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "can",
    "must",
    "shall",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "me",
    "him",
    "her",
    "us",
    "them",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "this",
    "that",
    "these",
    "those",
  ]);

  /**
   * Search messages with advanced options
   */
  search(
    messages: Message[],
    query: string,
    options: SearchOptions = {}
  ): SearchResult[] {
    if (!query.trim()) return [];

    const {
      caseSensitive = false,
      wholeWords = false,
      fuzzyMatch = false,
      maxResults = 50,
      includeContext = true,
      contextLength = 50,
    } = options;

    const normalizedQuery = caseSensitive ? query : query.toLowerCase();
    const queryTerms = this.tokenize(normalizedQuery);
    const results: SearchResult[] = [];

    for (const message of messages) {
      if (!message.text) continue;

      const messageText = caseSensitive
        ? message.text
        : message.text.toLowerCase();
      const searchResult = this.searchInMessage(
        message,
        messageText,
        normalizedQuery,
        queryTerms,
        { wholeWords, fuzzyMatch, includeContext, contextLength }
      );

      if (searchResult) {
        results.push(searchResult);
      }
    }

    // Sort by relevance score (highest first)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }

  /**
   * Search within a single message
   */
  private searchInMessage(
    message: Message,
    messageText: string,
    query: string,
    queryTerms: string[],
    options: {
      wholeWords: boolean;
      fuzzyMatch: boolean;
      includeContext: boolean;
      contextLength: number;
    }
  ): SearchResult | null {
    const { wholeWords, fuzzyMatch, includeContext, contextLength } = options;

    let score = 0;
    const highlightRanges: Array<{ start: number; end: number }> = [];
    let matchedText = messageText;

    // Exact phrase match (highest score)
    if (messageText.includes(query)) {
      const startIndex = messageText.indexOf(query);
      highlightRanges.push({
        start: startIndex,
        end: startIndex + query.length,
      });
      score += 100;

      if (includeContext) {
        matchedText = this.extractContext(
          messageText,
          startIndex,
          query.length,
          contextLength
        );
      }
    }
    // Individual term matches
    else {
      let termMatches = 0;
      const messageTokens = this.tokenize(messageText);

      for (const term of queryTerms) {
        if (this.stopWords.has(term)) continue;

        const termScore = this.findTermMatches(
          messageText,
          messageTokens,
          term,
          wholeWords,
          fuzzyMatch,
          highlightRanges
        );

        if (termScore > 0) {
          termMatches++;
          score += termScore;
        }
      }

      // Bonus for matching multiple terms
      if (termMatches > 1) {
        score += termMatches * 10;
      }

      // No matches found
      if (score === 0) {
        return null;
      }

      if (includeContext && highlightRanges.length > 0) {
        const firstMatch = highlightRanges[0];
        matchedText = this.extractContext(
          messageText,
          firstMatch.start,
          firstMatch.end - firstMatch.start,
          contextLength
        );
      }
    }

    // Boost score based on message recency
    const messageAge = Date.now() - (message.createdAt || 0);
    const daysSinceMessage = messageAge / (1000 * 60 * 60 * 24);
    const recencyBoost = Math.max(0, 10 - daysSinceMessage * 0.1);
    score += recencyBoost;

    return {
      message,
      matchedText,
      highlightRanges: this.adjustHighlightRanges(
        highlightRanges,
        messageText,
        matchedText
      ),
      score,
    };
  }

  /**
   * Find matches for a specific term
   */
  private findTermMatches(
    messageText: string,
    messageTokens: string[],
    term: string,
    wholeWords: boolean,
    fuzzyMatch: boolean,
    highlightRanges: Array<{ start: number; end: number }>
  ): number {
    let score = 0;

    if (wholeWords) {
      // Exact word match
      for (const token of messageTokens) {
        if (token === term) {
          const index = messageText.indexOf(token);
          if (index !== -1) {
            highlightRanges.push({ start: index, end: index + token.length });
            score += 50;
          }
        }
      }
    } else if (fuzzyMatch) {
      // Fuzzy matching
      for (const token of messageTokens) {
        const similarity = this.calculateSimilarity(term, token);
        if (similarity > 0.7) {
          const index = messageText.indexOf(token);
          if (index !== -1) {
            highlightRanges.push({ start: index, end: index + token.length });
            score += Math.floor(similarity * 30);
          }
        }
      }
    } else {
      // Substring match
      if (messageText.includes(term)) {
        let startIndex = 0;
        while (true) {
          const index = messageText.indexOf(term, startIndex);
          if (index === -1) break;

          highlightRanges.push({ start: index, end: index + term.length });
          score += 25;
          startIndex = index + 1;
        }
      }
    }

    return score;
  }

  /**
   * Extract context around a match
   */
  private extractContext(
    text: string,
    matchStart: number,
    matchLength: number,
    contextLength: number
  ): string {
    const start = Math.max(0, matchStart - contextLength);
    const end = Math.min(text.length, matchStart + matchLength + contextLength);

    let context = text.substring(start, end);

    // Add ellipsis if we truncated
    if (start > 0) {
      context = "..." + context;
    }
    if (end < text.length) {
      context = context + "...";
    }

    return context;
  }

  /**
   * Adjust highlight ranges for context text
   */
  private adjustHighlightRanges(
    ranges: Array<{ start: number; end: number }>,
    originalText: string,
    contextText: string
  ): Array<{ start: number; end: number }> {
    if (originalText === contextText) {
      return ranges;
    }

    // Find the offset of the context within the original text
    const contextStart = originalText.indexOf(
      contextText.replace(/^\.\.\./, "").replace(/\.\.\.$/, "")
    );
    if (contextStart === -1) {
      return ranges;
    }

    const ellipsisOffset = contextText.startsWith("...") ? 3 : 0;

    return ranges
      .map((range) => ({
        start: range.start - contextStart + ellipsisOffset,
        end: range.end - contextStart + ellipsisOffset,
      }))
      .filter((range) => range.start >= 0 && range.end <= contextText.length);
  }

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 0);
  }

  /**
   * Calculate similarity between two strings (Levenshtein distance based)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 1;

    const distance = this.levenshteinDistance(str1, str2);
    return (maxLength - distance) / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i;
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }
}

/**
 * Highlight search terms in text
 */
export function highlightSearchTerms(
  text: string,
  ranges: Array<{ start: number; end: number }>,
  highlightStyle: string = "background-color: yellow; font-weight: bold;"
): string {
  if (ranges.length === 0) return text;

  // Sort ranges by start position
  const sortedRanges = [...ranges].sort((a, b) => a.start - b.start);

  let result = "";
  let lastIndex = 0;

  for (const range of sortedRanges) {
    // Add text before highlight
    result += text.substring(lastIndex, range.start);

    // Add highlighted text
    const highlightedText = text.substring(range.start, range.end);
    result += `<span style="${highlightStyle}">${highlightedText}</span>`;

    lastIndex = range.end;
  }

  // Add remaining text
  result += text.substring(lastIndex);

  return result;
}

/**
 * Create search suggestions based on message history
 */
export function generateSearchSuggestions(
  messages: Message[],
  limit = 10
): string[] {
  const wordFrequency = new Map<string, number>();
  const searchEngine = new MessageSearchEngine();

  // Count word frequency
  for (const message of messages) {
    if (!message.text) continue;

    const tokens = message.text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2); // Only words with 3+ characters

    for (const token of tokens) {
      if (!searchEngine["stopWords"].has(token)) {
        wordFrequency.set(token, (wordFrequency.get(token) || 0) + 1);
      }
    }
  }

  // Get most frequent words
  return Array.from(wordFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Global search engine instance
 */
export const messageSearchEngine = new MessageSearchEngine();
