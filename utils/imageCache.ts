import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export interface ImageCacheEntry {
  /**
   * Original image URI
   */
  originalUri: string;

  /**
   * Cached local URI
   */
  cachedUri: string;

  /**
   * Cache timestamp
   */
  timestamp: number;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * MIME type
   */
  mimeType: string;

  /**
   * Access count
   */
  accessCount: number;

  /**
   * Last accessed timestamp
   */
  lastAccessed: number;
}

export interface ImageCacheConfig {
  /**
   * Maximum cache size in bytes (default: 100MB)
   */
  maxCacheSize: number;

  /**
   * Maximum number of cached images (default: 1000)
   */
  maxItems: number;

  /**
   * Cache TTL in milliseconds (default: 7 days)
   */
  ttl: number;

  /**
   * Compression quality for cached images (0-1, default: 0.8)
   */
  compressionQuality: number;

  /**
   * Enable automatic cache cleanup
   */
  autoCleanup: boolean;

  /**
   * Cleanup interval in milliseconds (default: 1 hour)
   */
  cleanupInterval: number;
}

export interface CacheStats {
  /**
   * Current cache size in bytes
   */
  currentSize: number;

  /**
   * Number of cached items
   */
  itemCount: number;

  /**
   * Cache hit rate (0-1)
   */
  hitRate: number;

  /**
   * Cache miss rate (0-1)
   */
  missRate: number;

  /**
   * Total requests
   */
  totalRequests: number;

  /**
   * Cache hits
   */
  cacheHits: number;

  /**
   * Cache misses
   */
  cacheMisses: number;
}

/**
 * Advanced image caching utility for React Native
 */
export class ImageCache {
  private config: ImageCacheConfig;
  private cache: Map<string, ImageCacheEntry> = new Map();
  private stats: CacheStats;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private isLoaded = false;

  constructor(config: Partial<ImageCacheConfig> = {}) {
    this.config = {
      maxCacheSize: 100 * 1024 * 1024, // 100MB
      maxItems: 1000,
      ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
      compressionQuality: 0.8,
      autoCleanup: true,
      cleanupInterval: 60 * 60 * 1000, // 1 hour
      ...config,
    };

    this.stats = {
      currentSize: 0,
      itemCount: 0,
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    this.initialize();
  }

  /**
   * Initialize the cache
   */
  private async initialize(): Promise<void> {
    try {
      await this.loadCacheFromStorage();

      if (this.config.autoCleanup) {
        this.startAutoCleanup();
      }

      this.isLoaded = true;
    } catch (error) {
      console.error("ImageCache: Failed to initialize", error);
    }
  }

  /**
   * Load cache from persistent storage
   */
  private async loadCacheFromStorage(): Promise<void> {
    try {
      const cacheData = await AsyncStorage.getItem("@image_cache");
      const statsData = await AsyncStorage.getItem("@image_cache_stats");

      if (cacheData) {
        const parsedCache = JSON.parse(cacheData);
        this.cache = new Map(Object.entries(parsedCache));
      }

      if (statsData) {
        this.stats = { ...this.stats, ...JSON.parse(statsData) };
      }

      // Clean up expired entries
      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error("ImageCache: Failed to load from storage", error);
    }
  }

  /**
   * Save cache to persistent storage
   */
  private async saveCacheToStorage(): Promise<void> {
    try {
      const cacheObject = Object.fromEntries(this.cache);
      await AsyncStorage.setItem("@image_cache", JSON.stringify(cacheObject));
      await AsyncStorage.setItem(
        "@image_cache_stats",
        JSON.stringify(this.stats)
      );
    } catch (error) {
      console.error("ImageCache: Failed to save to storage", error);
    }
  }

  /**
   * Get cached image URI
   */
  async get(originalUri: string): Promise<string | null> {
    this.stats.totalRequests++;

    if (!this.isLoaded) {
      await this.initialize();
    }

    const entry = this.cache.get(originalUri);

    if (entry) {
      // Check if entry is expired
      if (Date.now() - entry.timestamp > this.config.ttl) {
        this.cache.delete(originalUri);
        this.updateStats();
        this.stats.cacheMisses++;
        return null;
      }

      // Update access information
      entry.accessCount++;
      entry.lastAccessed = Date.now();

      this.stats.cacheHits++;
      this.updateStats();

      return entry.cachedUri;
    }

    this.stats.cacheMisses++;
    this.updateStats();
    return null;
  }

  /**
   * Cache an image
   */
  async set(originalUri: string, imageData: any): Promise<string> {
    if (!this.isLoaded) {
      await this.initialize();
    }

    try {
      const cachedUri = await this.saveImageToCache(originalUri, imageData);

      const entry: ImageCacheEntry = {
        originalUri,
        cachedUri,
        timestamp: Date.now(),
        size: this.estimateImageSize(imageData),
        mimeType: this.getMimeType(originalUri),
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      this.cache.set(originalUri, entry);

      // Check cache limits
      await this.enforceCacheLimits();

      this.updateStats();
      await this.saveCacheToStorage();

      return cachedUri;
    } catch (error) {
      console.error("ImageCache: Failed to cache image", error);
      throw error;
    }
  }

  /**
   * Check if image is cached
   */
  has(originalUri: string): boolean {
    const entry = this.cache.get(originalUri);
    if (!entry) return false;

    // Check if expired
    return Date.now() - entry.timestamp <= this.config.ttl;
  }

  /**
   * Remove image from cache
   */
  async remove(originalUri: string): Promise<boolean> {
    const entry = this.cache.get(originalUri);
    if (!entry) return false;

    try {
      // Delete file if it exists
      await this.deleteImageFile(entry.cachedUri);

      this.cache.delete(originalUri);
      this.updateStats();
      await this.saveCacheToStorage();

      return true;
    } catch (error) {
      console.error("ImageCache: Failed to remove image", error);
      return false;
    }
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    try {
      // Delete all cached files
      for (const entry of this.cache.values()) {
        await this.deleteImageFile(entry.cachedUri);
      }

      this.cache.clear();
      this.resetStats();

      await AsyncStorage.removeItem("@image_cache");
      await AsyncStorage.removeItem("@image_cache_stats");
    } catch (error) {
      console.error("ImageCache: Failed to clear cache", error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache configuration
   */
  getConfig(): ImageCacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  updateConfig(newConfig: Partial<ImageCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (this.config.autoCleanup && !this.cleanupInterval) {
      this.startAutoCleanup();
    } else if (!this.config.autoCleanup && this.cleanupInterval) {
      this.stopAutoCleanup();
    }
  }

  /**
   * Save image data to cache directory
   */
  private async saveImageToCache(
    originalUri: string,
    imageData: any
  ): Promise<string> {
    // This is a simplified implementation
    // In a real implementation, you would save the image to the device's cache directory
    const fileName = this.generateCacheFileName(originalUri);
    const cacheUri = `file://cache/${fileName}`;

    // Mock implementation - in reality you'd use FileSystem or similar
    return cacheUri;
  }

  /**
   * Delete image file from cache directory
   */
  private async deleteImageFile(cachedUri: string): Promise<void> {
    // Mock implementation - in reality you'd delete the actual file
    console.log("Deleting cached image:", cachedUri);
  }

  /**
   * Generate cache file name
   */
  private generateCacheFileName(originalUri: string): string {
    const hash = this.simpleHash(originalUri);
    const extension = this.getFileExtension(originalUri);
    return `${hash}.${extension}`;
  }

  /**
   * Simple hash function for generating file names
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get file extension from URI
   */
  private getFileExtension(uri: string): string {
    const matches = uri.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
    return matches ? matches[1].toLowerCase() : "jpg";
  }

  /**
   * Get MIME type from URI
   */
  private getMimeType(uri: string): string {
    const extension = this.getFileExtension(uri);
    const mimeTypes: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
    };

    return mimeTypes[extension] || "image/jpeg";
  }

  /**
   * Estimate image size (mock implementation)
   */
  private estimateImageSize(imageData: any): number {
    // Mock implementation - return a reasonable estimate
    return 150 * 1024; // 150KB average
  }

  /**
   * Enforce cache size and item limits
   */
  private async enforceCacheLimits(): Promise<void> {
    if (
      this.stats.currentSize <= this.config.maxCacheSize &&
      this.stats.itemCount <= this.config.maxItems
    ) {
      return;
    }

    // Sort entries by last accessed (LRU)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].lastAccessed - b[1].lastAccessed
    );

    // Remove oldest entries until within limits
    while (
      (this.stats.currentSize > this.config.maxCacheSize ||
        this.stats.itemCount > this.config.maxItems) &&
      entries.length > 0
    ) {
      const [key, entry] = entries.shift()!;
      await this.remove(key);
    }
  }

  /**
   * Clean up expired entries
   */
  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.remove(key);
    }
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.itemCount = this.cache.size;
    this.stats.currentSize = Array.from(this.cache.values()).reduce(
      (total, entry) => total + entry.size,
      0
    );

    if (this.stats.totalRequests > 0) {
      this.stats.hitRate = this.stats.cacheHits / this.stats.totalRequests;
      this.stats.missRate = this.stats.cacheMisses / this.stats.totalRequests;
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      currentSize: 0,
      itemCount: 0,
      hitRate: 0,
      missRate: 0,
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };
  }

  /**
   * Start automatic cache cleanup
   */
  private startAutoCleanup(): void {
    if (this.cleanupInterval) return;

    this.cleanupInterval = setInterval(async () => {
      await this.cleanupExpiredEntries();
      await this.saveCacheToStorage();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop automatic cache cleanup
   */
  private stopAutoCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Destroy cache instance
   */
  destroy(): void {
    this.stopAutoCleanup();
    this.cache.clear();
    this.resetStats();
  }
}

// Default cache instance
export const defaultImageCache = new ImageCache();

// Simple in-memory image metadata cache (URLs by userId)
// Not persistent across app restarts; reduces duplicate network calls within session.
export type ImageCacheEntrySimple = {
  urls: string[];
  cachedAt: number;
};

const simpleCache: Record<string, ImageCacheEntrySimple> = {};
const SIMPLE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setProfileImages(userId: string, urls: string[]) {
  if (!userId) return;
  simpleCache[userId] = { urls, cachedAt: Date.now() };
}

export function getProfileImages(userId: string): string[] | undefined {
  const entry = simpleCache[userId];
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > SIMPLE_TTL_MS) {
    delete simpleCache[userId];
    return undefined;
  }
  return entry.urls;
}

/**
 * Hook for using image cache in React components
 */
export function useImageCache(config?: Partial<ImageCacheConfig>): ImageCache {
  if (config) {
    return new ImageCache(config);
  }
  return defaultImageCache;
}
