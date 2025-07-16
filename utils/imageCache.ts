import * as FileSystem from "expo-file-system";
import { Image } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry {
  uri: string;
  localPath: string;
  timestamp: number;
  size: number;
}

interface CacheConfig {
  maxSize: number; // in bytes
  maxAge: number; // in milliseconds
  compressionQuality: number; // 0-1
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100 * 1024 * 1024, // 100MB
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  compressionQuality: 0.8,
};

export class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cacheDir: string;
  private config: CacheConfig;
  private cache: Map<string, CacheEntry> = new Map();
  private initialized = false;

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cacheDir = `${FileSystem.cacheDirectory}images/`;
  }

  public static getInstance(config?: Partial<CacheConfig>): ImageCacheManager {
    if (!ImageCacheManager.instance) {
      ImageCacheManager.instance = new ImageCacheManager(config);
    }
    return ImageCacheManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create cache directory
      const dirInfo = await FileSystem.getInfoAsync(this.cacheDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.cacheDir, {
          intermediates: true,
        });
      }

      // Load cache index
      await this.loadCacheIndex();

      // Clean expired entries
      await this.cleanExpiredEntries();

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize image cache:", error);
    }
  }

  public async getCachedImage(uri: string): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    const cacheKey = this.getCacheKey(uri);
    const entry = this.cache.get(cacheKey);

    if (!entry) return null;

    // Check if file exists and is not expired
    const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
    if (!fileInfo.exists || this.isExpired(entry)) {
      this.cache.delete(cacheKey);
      await this.saveCacheIndex();
      return null;
    }

    return entry.localPath;
  }

  public async cacheImage(uri: string): Promise<string | null> {
    if (!this.initialized) await this.initialize();

    try {
      const cacheKey = this.getCacheKey(uri);
      const localPath = `${this.cacheDir}${cacheKey}.jpg`;

      // Check if already cached
      const existing = await this.getCachedImage(uri);
      if (existing) return existing;

      // Download and cache image
      const downloadResult = await FileSystem.downloadAsync(uri, localPath);

      if (downloadResult.status === 200) {
        const fileInfo = await FileSystem.getInfoAsync(localPath);

        const entry: CacheEntry = {
          uri,
          localPath,
          timestamp: Date.now(),
          size: fileInfo.size || 0,
        };

        this.cache.set(cacheKey, entry);
        await this.saveCacheIndex();

        // Check cache size and clean if necessary
        await this.enforceMaxSize();

        return localPath;
      }
    } catch (error) {
      console.error("Failed to cache image:", error);
    }

    return null;
  }

  public async preloadImages(uris: string[]): Promise<void> {
    const promises = uris.map((uri) => this.cacheImage(uri));
    await Promise.allSettled(promises);
  }

  public async clearCache(): Promise<void> {
    try {
      await FileSystem.deleteAsync(this.cacheDir, { idempotent: true });
      await FileSystem.makeDirectoryAsync(this.cacheDir, {
        intermediates: true,
      });
      this.cache.clear();
      await this.saveCacheIndex();
    } catch (error) {
      console.error("Failed to clear image cache:", error);
    }
  }

  public async getCacheSize(): Promise<number> {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  public async getCacheStats(): Promise<{
    totalSize: number;
    entryCount: number;
    maxSize: number;
    usagePercentage: number;
  }> {
    const totalSize = await this.getCacheSize();
    return {
      totalSize,
      entryCount: this.cache.size,
      maxSize: this.config.maxSize,
      usagePercentage: (totalSize / this.config.maxSize) * 100,
    };
  }

  private getCacheKey(uri: string): string {
    return uri.replace(/[^a-zA-Z0-9]/g, "_");
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.config.maxAge;
  }

  private async loadCacheIndex(): Promise<void> {
    try {
      const indexData = await AsyncStorage.getItem("image_cache_index");
      if (indexData) {
        const entries: [string, CacheEntry][] = JSON.parse(indexData);
        this.cache = new Map(entries);
      }
    } catch (error) {
      console.error("Failed to load cache index:", error);
    }
  }

  private async saveCacheIndex(): Promise<void> {
    try {
      const entries = Array.from(this.cache.entries());
      await AsyncStorage.setItem("image_cache_index", JSON.stringify(entries));
    } catch (error) {
      console.error("Failed to save cache index:", error);
    }
  }

  private async cleanExpiredEntries(): Promise<void> {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
        try {
          await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        } catch (error) {
          console.error("Failed to delete expired cache file:", error);
        }
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));

    if (expiredKeys.length > 0) {
      await this.saveCacheIndex();
    }
  }

  private async enforceMaxSize(): Promise<void> {
    const currentSize = await this.getCacheSize();

    if (currentSize <= this.config.maxSize) return;

    // Sort entries by timestamp (oldest first)
    const sortedEntries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    let sizeToRemove = currentSize - this.config.maxSize;

    for (const [key, entry] of sortedEntries) {
      if (sizeToRemove <= 0) break;

      try {
        await FileSystem.deleteAsync(entry.localPath, { idempotent: true });
        this.cache.delete(key);
        sizeToRemove -= entry.size;
      } catch (error) {
        console.error("Failed to delete cache file:", error);
      }
    }

    await this.saveCacheIndex();
  }
}

// Hook for using image cache
export function useImageCache() {
  const cacheManager = ImageCacheManager.getInstance();

  const getCachedImage = async (uri: string): Promise<string> => {
    const cached = await cacheManager.getCachedImage(uri);
    if (cached) return cached;

    const newCached = await cacheManager.cacheImage(uri);
    return newCached || uri;
  };

  const preloadImages = (uris: string[]) => {
    return cacheManager.preloadImages(uris);
  };

  const clearCache = () => {
    return cacheManager.clearCache();
  };

  const getCacheStats = () => {
    return cacheManager.getCacheStats();
  };

  return {
    getCachedImage,
    preloadImages,
    clearCache,
    getCacheStats,
  };
}

// Optimized Image component
export interface OptimizedImageProps {
  uri: string;
  style?: any;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
}

export function OptimizedImage({
  uri,
  style,
  placeholder,
  onLoad,
  onError,
  resizeMode = "cover",
}: OptimizedImageProps) {
  const [imageUri, setImageUri] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const { getCachedImage } = useImageCache();

  React.useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        const cachedUri = await getCachedImage(uri);

        if (mounted) {
          setImageUri(cachedUri);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
          setLoading(false);
          onError?.(err);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [uri]);

  if (loading || !imageUri) {
    return placeholder || null;
  }

  if (error) {
    return placeholder || null;
  }

  return (
    <Image
      source={{ uri: imageUri }}
      style={style}
      resizeMode={resizeMode}
      onLoad={onLoad}
      onError={onError}
    />
  );
}
