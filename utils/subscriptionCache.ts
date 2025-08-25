import { CacheEntry } from "../types/subscription";

/**
 * Subscription data caching system for performance optimization
 */
export class SubscriptionCache {
  private static cache = new Map<string, CacheEntry>();

  /**
   * Set cache entry with TTL
   */
  static set(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttl,
    });
  }

  /**
   * Get cache entry if not expired
   */
  static get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  static invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  static size(): number {
    return this.cache.size;
  }

  /**
   * Check if key exists and is not expired
   */
  static has(key: string): boolean {
  const entry = this.cache.get(key);
  return entry !== undefined && entry !== null && entry.expires > Date.now();
  }
}

/**
 * Cache TTL constants (in milliseconds)
 */
export const CACHE_TTL = {
  SUBSCRIPTION_STATUS: 5 * 60 * 1000, // 5 minutes
  USAGE_STATS: 1 * 60 * 1000, // 1 minute
  FEATURE_ACCESS: 10 * 60 * 1000, // 10 minutes
  SUBSCRIPTION_PLANS: 60 * 60 * 1000, // 1 hour
};

/**
 * Cache key generators
 */
export const CACHE_KEYS = {
  subscriptionStatus: (userId: string) => `subscription_status_${userId}`,
  usageStats: (userId: string) => `usage_stats_${userId}`,
  featureAccess: (userId: string) => `feature_access_${userId}`,
  subscriptionPlans: () => `subscription_plans`,
  featureCheck: (userId: string, feature: string) =>
    `feature_check_${userId}_${feature}`,
};

/**
 * Offline subscription manager with caching
 */
export class OfflineSubscriptionManager {
  /**
   * Get subscription status with offline fallback
   */
  static async getSubscriptionStatus(
    userId: string,
    fetchFunction: () => Promise<any>
  ): Promise<any | null> {
    const cacheKey = CACHE_KEYS.subscriptionStatus(userId);

    // Try network first
    try {
      const response = await fetchFunction();
      if (response && response.success) {
        // Cache successful response
        SubscriptionCache.set(
          cacheKey,
          response.data,
          CACHE_TTL.SUBSCRIPTION_STATUS
        );
        return response.data;
      }
    } catch (error) {
      console.warn("Network request failed, using cache");
    }

    // Fallback to cache
    return SubscriptionCache.get(cacheKey);
  }

  /**
   * Get usage stats with offline fallback
   */
  static async getUsageStats(
    userId: string,
    fetchFunction: () => Promise<any>
  ): Promise<any | null> {
    const cacheKey = CACHE_KEYS.usageStats(userId);

    // Try network first
    try {
      const response = await fetchFunction();
      if (response && response.success) {
        // Cache successful response
        SubscriptionCache.set(cacheKey, response.data, CACHE_TTL.USAGE_STATS);
        return response.data;
      }
    } catch (error) {
      console.warn("Network request failed, using cache");
    }

    // Fallback to cache
    return SubscriptionCache.get(cacheKey);
  }

  /**
   * Get feature access with offline fallback
   */
  static async getFeatureAccess(
    userId: string,
    fetchFunction: () => Promise<any>
  ): Promise<any | null> {
    const cacheKey = CACHE_KEYS.featureAccess(userId);

    // Try network first
    try {
      const response = await fetchFunction();
      if (response && response.success) {
        // Cache successful response
        SubscriptionCache.set(
          cacheKey,
          response.data,
          CACHE_TTL.FEATURE_ACCESS
        );
        return response.data;
      }
    } catch (error) {
      console.warn("Network request failed, using cache");
    }

    // Fallback to cache
    return SubscriptionCache.get(cacheKey);
  }

  /**
   * Invalidate user-specific cache
   */
  static invalidateUserCache(userId: string): void {
    SubscriptionCache.invalidate(userId);
  }

  /**
   * Preload subscription data for better performance
   */
  static async preloadSubscriptionData(
    userId: string,
    fetchFunctions: {
      subscriptionStatus: () => Promise<any>;
      usageStats: () => Promise<any>;
      featureAccess: () => Promise<any>;
    }
  ): Promise<void> {
    try {
      // Preload all subscription data in parallel
      await Promise.allSettled([
        this.getSubscriptionStatus(userId, fetchFunctions.subscriptionStatus),
        this.getUsageStats(userId, fetchFunctions.usageStats),
        this.getFeatureAccess(userId, fetchFunctions.featureAccess),
      ]);
    } catch (error) {
      console.warn("Error preloading subscription data:", error);
    }
  }
}

export default SubscriptionCache;
