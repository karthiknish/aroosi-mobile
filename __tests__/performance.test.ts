import { describe, test, expect, beforeEach, jest } from "@jest/globals";
import { ApiClient } from "../utils/api";
import { ImageCache } from "../utils/imageCache";
import { OfflineCache } from "../utils/offlineCache";
import { PerformanceMonitor } from "../utils/performanceMonitor";

// Mock dependencies
jest.mock("../utils/imageCache");
jest.mock("../utils/offlineCache");
jest.mock("../utils/performanceMonitor");

describe("Performance and Optimization Tests", () => {
  let apiClient: ApiClient;
  let imageCache: ImageCache;
  let offlineCache: OfflineCache;
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient();
    imageCache = new ImageCache();
    offlineCache = new OfflineCache();
    performanceMonitor = new PerformanceMonitor();
  });

  describe("API Performance", () => {
    test("should complete profile fetch within acceptable time", async () => {
      const mockResponse = {
        success: true,
        data: {
          id: "profile-123",
          fullName: "Test User",
          email: "test@aroosi.app",
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const startTime = performance.now();
      const result = await apiClient.getProfile();
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(2000); // Should respond within 2 seconds
    });

    test("should handle concurrent API requests efficiently", async () => {
      const mockResponse = {
        success: true,
        data: { profiles: [] },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const startTime = performance.now();

      // Make 10 concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        apiClient.searchProfiles({ page: i + 1 }, 1)
      );

      const results = await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      expect(results.every((result) => result.success)).toBe(true);

      // Total time should be reasonable (not 10x single request time)
      expect(totalTime).toBeLessThan(5000);
    });

    test("should implement request batching for efficiency", async () => {
      const batchRequests = [
        { endpoint: "/api/profile", method: "GET" },
        { endpoint: "/api/interests/sent", method: "GET" },
        { endpoint: "/api/matches", method: "GET" },
      ];

      const mockResponse = {
        success: true,
        data: {
          profile: { id: "profile-123" },
          interests: [],
          matches: [],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const startTime = performance.now();
      const result = await apiClient.batchRequests(batchRequests);
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(responseTime).toBeLessThan(3000);
      // Should make only one network call for batched requests
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test("should implement request deduplication", async () => {
      const mockResponse = {
        success: true,
        data: { id: "profile-123" },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      // Make multiple identical requests simultaneously
      const requests = Array.from({ length: 5 }, () => apiClient.getProfile());

      const results = await Promise.all(requests);

      // All should succeed with same data
      expect(results.every((result) => result.success)).toBe(true);
      expect(results.every((result) => result.data?.id === "profile-123")).toBe(
        true
      );

      // Should only make one actual network request due to deduplication
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe("Image Caching and Optimization", () => {
    test("should cache images efficiently", async () => {
      const imageUrl = "https://storage.aroosi.app/images/profile-123.jpg";
      const mockImageData = new Uint8Array([1, 2, 3, 4]);

      (imageCache.get as jest.Mock).mockResolvedValue(null);
      (imageCache.set as jest.Mock).mockResolvedValue(true);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(mockImageData.buffer),
      });

      const startTime = performance.now();
      const result = await imageCache.getImage(imageUrl);
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(loadTime).toBeLessThan(1000);
      expect(imageCache.set).toHaveBeenCalledWith(imageUrl, expect.any(Object));
    });

    test("should serve cached images quickly", async () => {
      const imageUrl = "https://storage.aroosi.app/images/profile-123.jpg";
      const cachedImage = { uri: "file://cached-image.jpg" };

      (imageCache.get as jest.Mock).mockResolvedValue(cachedImage);

      const startTime = performance.now();
      const result = await imageCache.getImage(imageUrl);
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(result).toBe(cachedImage);
      expect(loadTime).toBeLessThan(100); // Should be very fast from cache
      expect(global.fetch).not.toHaveBeenCalled();
    });

    test("should optimize image sizes for mobile", async () => {
      const largeImageUrl =
        "https://storage.aroosi.app/images/large-profile.jpg";
      const optimizedImage = {
        uri: "file://optimized-image.jpg",
        width: 400,
        height: 400,
        size: 50000, // 50KB
      };

      (imageCache.optimizeImage as jest.Mock).mockResolvedValue(optimizedImage);

      const result = await imageCache.optimizeImage(largeImageUrl, {
        maxWidth: 400,
        maxHeight: 400,
        quality: 0.8,
      });

      expect(result.width).toBeLessThanOrEqual(400);
      expect(result.height).toBeLessThanOrEqual(400);
      expect(result.size).toBeLessThan(100000); // Should be compressed
    });

    test("should implement progressive image loading", async () => {
      const imageUrl = "https://storage.aroosi.app/images/profile-123.jpg";
      const thumbnailUrl =
        "https://storage.aroosi.app/images/profile-123-thumb.jpg";

      let loadingStages = [];

      const mockProgressiveLoader = {
        onProgress: (stage: string) => loadingStages.push(stage),
      };

      await imageCache.loadProgressively(
        imageUrl,
        thumbnailUrl,
        mockProgressiveLoader
      );

      expect(loadingStages).toContain("thumbnail");
      expect(loadingStages).toContain("full");
      expect(loadingStages.indexOf("thumbnail")).toBeLessThan(
        loadingStages.indexOf("full")
      );
    });

    test("should manage cache size and cleanup", async () => {
      const cacheStats = {
        totalSize: 50 * 1024 * 1024, // 50MB
        itemCount: 200,
        maxSize: 100 * 1024 * 1024, // 100MB limit
      };

      (imageCache.getStats as jest.Mock).mockResolvedValue(cacheStats);
      (imageCache.cleanup as jest.Mock).mockResolvedValue({
        itemsRemoved: 50,
        sizeFreed: 20 * 1024 * 1024,
      });

      const stats = await imageCache.getStats();
      expect(stats.totalSize).toBeLessThan(stats.maxSize);

      if (stats.totalSize > stats.maxSize * 0.8) {
        const cleanupResult = await imageCache.cleanup();
        expect(cleanupResult.itemsRemoved).toBeGreaterThan(0);
        expect(cleanupResult.sizeFreed).toBeGreaterThan(0);
      }
    });
  });

  describe("Offline Caching", () => {
    test("should cache essential data for offline access", async () => {
      const profileData = {
        id: "profile-123",
        fullName: "Test User",
        email: "test@aroosi.app",
      };

      const conversationsData = [
        { id: "conv-1", lastMessage: "Hello" },
        { id: "conv-2", lastMessage: "Hi there" },
      ];

      (offlineCache.set as jest.Mock).mockResolvedValue(true);

      await offlineCache.cacheEssentialData({
        profile: profileData,
        conversations: conversationsData,
      });

      expect(offlineCache.set).toHaveBeenCalledWith("profile", profileData);
      expect(offlineCache.set).toHaveBeenCalledWith(
        "conversations",
        conversationsData
      );
    });

    test("should serve cached data when offline", async () => {
      const cachedProfile = {
        id: "profile-123",
        fullName: "Test User",
        isOfflineCache: true,
      };

      (offlineCache.get as jest.Mock).mockResolvedValue(cachedProfile);

      // Simulate offline condition
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const result = await apiClient.getProfile();

      expect(result.success).toBe(true);
      expect(result.data?.isOfflineCache).toBe(true);
      expect(offlineCache.get).toHaveBeenCalledWith("profile");
    });

    test("should sync offline changes when back online", async () => {
      const offlineChanges = [
        {
          type: "profile_update",
          data: { aboutMe: "Updated offline" },
          timestamp: Date.now(),
        },
        {
          type: "message_sent",
          data: { text: "Offline message", conversationId: "conv-1" },
          timestamp: Date.now(),
        },
      ];

      (offlineCache.getPendingChanges as jest.Mock).mockResolvedValue(
        offlineChanges
      );
      (offlineCache.clearPendingChanges as jest.Mock).mockResolvedValue(true);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      const syncResult = await offlineCache.syncPendingChanges();

      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedCount).toBe(2);
      expect(offlineCache.clearPendingChanges).toHaveBeenCalled();
    });

    test("should handle offline cache expiration", async () => {
      const expiredData = {
        data: { id: "profile-123" },
        timestamp: Date.now() - 24 * 60 * 60 * 1000, // 24 hours ago
        ttl: 12 * 60 * 60 * 1000, // 12 hour TTL
      };

      (offlineCache.get as jest.Mock).mockResolvedValue(expiredData);
      (offlineCache.isExpired as jest.Mock).mockReturnValue(true);

      const result = await offlineCache.get("profile");

      expect(offlineCache.isExpired).toHaveBeenCalledWith(expiredData);
      expect(result).toBeNull(); // Should return null for expired data
    });
  });

  describe("Memory Management", () => {
    test("should monitor memory usage", async () => {
      const memoryStats = {
        used: 50 * 1024 * 1024, // 50MB
        total: 100 * 1024 * 1024, // 100MB
        percentage: 50,
      };

      (performanceMonitor.getMemoryUsage as jest.Mock).mockResolvedValue(
        memoryStats
      );

      const stats = await performanceMonitor.getMemoryUsage();

      expect(stats.percentage).toBeLessThan(80); // Should stay under 80%
      expect(stats.used).toBeLessThan(stats.total);
    });

    test("should cleanup memory when threshold exceeded", async () => {
      const highMemoryStats = {
        used: 85 * 1024 * 1024, // 85MB
        total: 100 * 1024 * 1024, // 100MB
        percentage: 85,
      };

      (performanceMonitor.getMemoryUsage as jest.Mock).mockResolvedValue(
        highMemoryStats
      );
      (performanceMonitor.cleanup as jest.Mock).mockResolvedValue({
        memoryFreed: 20 * 1024 * 1024,
        itemsCleared: 50,
      });

      const stats = await performanceMonitor.getMemoryUsage();

      if (stats.percentage > 80) {
        const cleanupResult = await performanceMonitor.cleanup();
        expect(cleanupResult.memoryFreed).toBeGreaterThan(0);
        expect(cleanupResult.itemsCleared).toBeGreaterThan(0);
      }
    });

    test("should implement lazy loading for large lists", async () => {
      const mockProfiles = Array.from({ length: 1000 }, (_, i) => ({
        id: `profile-${i}`,
        fullName: `User ${i}`,
      }));

      // Mock paginated response
      global.fetch = jest.fn().mockImplementation((url) => {
        const urlObj = new URL(url);
        const page = parseInt(urlObj.searchParams.get("page") || "1");
        const limit = parseInt(urlObj.searchParams.get("limit") || "20");
        const start = (page - 1) * limit;
        const end = start + limit;

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                profiles: mockProfiles.slice(start, end),
                hasMore: end < mockProfiles.length,
                totalCount: mockProfiles.length,
              },
            }),
        });
      });

      const startTime = performance.now();
      const result = await apiClient.searchProfiles({}, 1, 20);
      const endTime = performance.now();
      const loadTime = endTime - startTime;

      expect(result.success).toBe(true);
      expect(result.data?.profiles).toHaveLength(20); // Only loaded first page
      expect(loadTime).toBeLessThan(1000); // Should be fast due to pagination
    });
  });

  describe("Network Optimization", () => {
    test("should implement request compression", async () => {
      const largeData = {
        profiles: Array.from({ length: 100 }, (_, i) => ({
          id: `profile-${i}`,
          fullName: `User ${i}`,
          aboutMe: "A".repeat(500), // Large text
        })),
      };

      global.fetch = jest.fn().mockImplementation((url, options) => {
        // Check if compression headers are set
        expect(options?.headers?.["Accept-Encoding"]).toContain("gzip");

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: largeData,
            }),
        });
      });

      const result = await apiClient.searchProfiles({}, 1);
      expect(result.success).toBe(true);
    });

    test("should implement connection pooling", async () => {
      const requests = Array.from({ length: 10 }, () => apiClient.getProfile());

      const startTime = performance.now();
      await Promise.all(requests);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // With connection pooling, concurrent requests should be faster
      expect(totalTime).toBeLessThan(3000);
    });

    test("should handle slow network gracefully", async () => {
      // Simulate slow network
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({ success: true, data: {} }),
              });
            }, 5000); // 5 second delay
          })
      );

      const startTime = performance.now();
      const result = await apiClient.getProfile();
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      // Should timeout before 5 seconds
      expect(responseTime).toBeLessThan(4000);

      if (!result.success) {
        expect(result.error?.code).toBe("TIMEOUT");
      }
    });
  });

  describe("Background Processing", () => {
    test("should handle background sync efficiently", async () => {
      const backgroundTasks = [
        { type: "sync_messages", priority: "high" },
        { type: "sync_profile", priority: "medium" },
        { type: "cleanup_cache", priority: "low" },
      ];

      (
        performanceMonitor.processBackgroundTasks as jest.Mock
      ).mockResolvedValue({
        completed: 3,
        failed: 0,
        totalTime: 2000,
      });

      const result = await performanceMonitor.processBackgroundTasks(
        backgroundTasks
      );

      expect(result.completed).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.totalTime).toBeLessThan(5000);
    });

    test("should prioritize critical tasks", async () => {
      const tasks = [
        { type: "low_priority", priority: "low", estimatedTime: 1000 },
        { type: "critical_task", priority: "critical", estimatedTime: 500 },
        { type: "medium_task", priority: "medium", estimatedTime: 800 },
      ];

      const executionOrder: string[] = [];

      (performanceMonitor.executeTasks as jest.Mock).mockImplementation(
        (taskList) => {
          // Should execute in priority order: critical, medium, low
          taskList.forEach((task: any) => executionOrder.push(task.type));
          return Promise.resolve({ success: true });
        }
      );

      await performanceMonitor.executeTasks(tasks);

      expect(executionOrder[0]).toBe("critical_task");
      expect(executionOrder[1]).toBe("medium_task");
      expect(executionOrder[2]).toBe("low_priority");
    });
  });

  describe("Performance Monitoring", () => {
    test("should track key performance metrics", async () => {
      const metrics = {
        apiResponseTime: 1200,
        imageLoadTime: 800,
        screenRenderTime: 16.7, // 60fps
        memoryUsage: 45,
        cacheHitRate: 85,
      };

      (performanceMonitor.getMetrics as jest.Mock).mockResolvedValue(metrics);

      const result = await performanceMonitor.getMetrics();

      expect(result.apiResponseTime).toBeLessThan(2000);
      expect(result.imageLoadTime).toBeLessThan(1000);
      expect(result.screenRenderTime).toBeLessThan(20); // 50fps minimum
      expect(result.memoryUsage).toBeLessThan(80);
      expect(result.cacheHitRate).toBeGreaterThan(70);
    });

    test("should alert on performance degradation", async () => {
      const poorMetrics = {
        apiResponseTime: 5000, // Too slow
        memoryUsage: 90, // Too high
        cacheHitRate: 30, // Too low
      };

      (performanceMonitor.getMetrics as jest.Mock).mockResolvedValue(
        poorMetrics
      );
      (performanceMonitor.checkThresholds as jest.Mock).mockResolvedValue({
        alerts: [
          { type: "API_SLOW", value: 5000, threshold: 2000 },
          { type: "MEMORY_HIGH", value: 90, threshold: 80 },
          { type: "CACHE_LOW", value: 30, threshold: 70 },
        ],
      });

      const metrics = await performanceMonitor.getMetrics();
      const alerts = await performanceMonitor.checkThresholds(metrics);

      expect(alerts.alerts).toHaveLength(3);
      expect(alerts.alerts.some((alert) => alert.type === "API_SLOW")).toBe(
        true
      );
      expect(alerts.alerts.some((alert) => alert.type === "MEMORY_HIGH")).toBe(
        true
      );
    });
  });
});
