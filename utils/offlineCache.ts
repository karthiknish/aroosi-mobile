import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt?: number;
  version: string;
}

interface CacheConfig {
  defaultTTL: number; // Time to live in milliseconds
  maxEntries: number;
  version: string;
}

const DEFAULT_CONFIG: CacheConfig = {
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  maxEntries: 1000,
  version: "1.0.0",
};

export class OfflineCacheManager {
  private static instance: OfflineCacheManager;
  private config: CacheConfig;
  private keyPrefix = "offline_cache_";

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(
    config?: Partial<CacheConfig>
  ): OfflineCacheManager {
    if (!OfflineCacheManager.instance) {
      OfflineCacheManager.instance = new OfflineCacheManager(config);
    }
    return OfflineCacheManager.instance;
  }

  public async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: ttl ? Date.now() + ttl : Date.now() + this.config.defaultTTL,
        version: this.config.version,
      };

      await AsyncStorage.setItem(
        this.getStorageKey(key),
        JSON.stringify(entry)
      );
    } catch (error) {
      console.error("Failed to cache data:", error);
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    try {
      const stored = await AsyncStorage.getItem(this.getStorageKey(key));
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check version compatibility
      if (entry.version !== this.config.version) {
        await this.remove(key);
        return null;
      }

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error("Failed to retrieve cached data:", error);
      return null;
    }
  }

  public async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getStorageKey(key));
    } catch (error) {
      console.error("Failed to remove cached data:", error);
    }
  }

  public async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.keyPrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }

  public async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  public async getSize(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.keyPrefix));
      return cacheKeys.length;
    } catch (error) {
      console.error("Failed to get cache size:", error);
      return 0;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith(this.keyPrefix));

      const expiredKeys: string[] = [];

      for (const key of cacheKeys) {
        const stored = await AsyncStorage.getItem(key);
        if (stored) {
          const entry: CacheEntry = JSON.parse(stored);
          if (
            (entry.expiresAt && Date.now() > entry.expiresAt) ||
            entry.version !== this.config.version
          ) {
            expiredKeys.push(key);
          }
        }
      }

      if (expiredKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredKeys);
      }

      // Enforce max entries limit
      const remainingSize = cacheKeys.length - expiredKeys.length;
      if (remainingSize > this.config.maxEntries) {
        const entriesToRemove = remainingSize - this.config.maxEntries;
        const keysToRemove = cacheKeys
          .filter((key) => !expiredKeys.includes(key))
          .slice(0, entriesToRemove);

        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (error) {
      console.error("Failed to cleanup cache:", error);
    }
  }

  private getStorageKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}

// Network state manager
export class NetworkStateManager {
  private static instance: NetworkStateManager;
  private isOnline = true;
  private listeners: ((isOnline: boolean) => void)[] = [];

  private constructor() {
    this.initialize();
  }

  public static getInstance(): NetworkStateManager {
    if (!NetworkStateManager.instance) {
      NetworkStateManager.instance = new NetworkStateManager();
    }
    return NetworkStateManager.instance;
  }

  private initialize(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOnline !== this.isOnline) {
        this.notifyListeners();
      }
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      this.isOnline = state.isConnected ?? false;
      this.notifyListeners();
    });
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }

  public addListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.isOnline));
  }
}

// Offline-first data manager
export class OfflineDataManager {
  private cache: OfflineCacheManager;
  private networkManager: NetworkStateManager;
  private syncQueue: Array<{
    key: string;
    data: any;
    action: "create" | "update" | "delete";
    timestamp: number;
  }> = [];

  constructor() {
    this.cache = OfflineCacheManager.getInstance();
    this.networkManager = NetworkStateManager.getInstance();
    this.loadSyncQueue();
    this.setupNetworkListener();
  }

  public async getData<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    ttl?: number
  ): Promise<T | null> {
    // Try to get from cache first
    const cached = await this.cache.get<T>(key);

    if (this.networkManager.getIsOnline()) {
      try {
        // Fetch fresh data
        const fresh = await fetchFunction();
        await this.cache.set(key, fresh, ttl);
        return fresh;
      } catch (error) {
        console.error("Failed to fetch fresh data:", error);
        // Return cached data if available
        return cached;
      }
    }

    return cached;
  }

  public async setData<T>(
    key: string,
    data: T,
    syncAction?: "create" | "update" | "delete"
  ): Promise<void> {
    // Always cache locally
    await this.cache.set(key, data);

    // Queue for sync if action specified
    if (syncAction) {
      this.addToSyncQueue(key, data, syncAction);
    }
  }

  public async removeData(key: string): Promise<void> {
    await this.cache.remove(key);
    this.addToSyncQueue(key, null, "delete");
  }

  public async syncPendingChanges(
    syncFunction: (item: any) => Promise<void>
  ): Promise<void> {
    if (!this.networkManager.getIsOnline() || this.syncQueue.length === 0) {
      return;
    }

    const itemsToSync = [...this.syncQueue];
    const successfulSyncs: number[] = [];

    for (let i = 0; i < itemsToSync.length; i++) {
      const item = itemsToSync[i];
      try {
        await syncFunction(item);
        successfulSyncs.push(i);
      } catch (error) {
        console.error("Failed to sync item:", error);
      }
    }

    // Remove successfully synced items
    successfulSyncs.reverse().forEach((index) => {
      this.syncQueue.splice(index, 1);
    });

    await this.saveSyncQueue();
  }

  public getSyncQueueSize(): number {
    return this.syncQueue.length;
  }

  public async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  private addToSyncQueue(
    key: string,
    data: any,
    action: "create" | "update" | "delete"
  ): void {
    // Remove existing entry for the same key
    const existingIndex = this.syncQueue.findIndex((item) => item.key === key);
    if (existingIndex > -1) {
      this.syncQueue.splice(existingIndex, 1);
    }

    this.syncQueue.push({
      key,
      data,
      action,
      timestamp: Date.now(),
    });

    this.saveSyncQueue();
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("sync_queue");
      if (stored) {
        this.syncQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load sync queue:", error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem("sync_queue", JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error("Failed to save sync queue:", error);
    }
  }

  private setupNetworkListener(): void {
    this.networkManager.addListener((isOnline) => {
      if (isOnline && this.syncQueue.length > 0) {
        // Trigger sync when coming back online
        console.log("Network restored, syncing pending changes...");
      }
    });
  }
}

// React hooks for offline functionality
export function useOfflineCache() {
  const cache = OfflineCacheManager.getInstance();

  return {
    set: cache.set.bind(cache),
    get: cache.get.bind(cache),
    remove: cache.remove.bind(cache),
    clear: cache.clear.bind(cache),
    has: cache.has.bind(cache),
    cleanup: cache.cleanup.bind(cache),
  };
}

export function useNetworkState() {
  const [isOnline, setIsOnline] = React.useState(true);
  const networkManager = NetworkStateManager.getInstance();

  React.useEffect(() => {
    setIsOnline(networkManager.getIsOnline());

    const unsubscribe = networkManager.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return { isOnline };
}

export function useOfflineData() {
  const dataManager = new OfflineDataManager();
  const { isOnline } = useNetworkState();

  return {
    getData: dataManager.getData.bind(dataManager),
    setData: dataManager.setData.bind(dataManager),
    removeData: dataManager.removeData.bind(dataManager),
    syncPendingChanges: dataManager.syncPendingChanges.bind(dataManager),
    getSyncQueueSize: dataManager.getSyncQueueSize.bind(dataManager),
    clearSyncQueue: dataManager.clearSyncQueue.bind(dataManager),
    isOnline,
  };
}
