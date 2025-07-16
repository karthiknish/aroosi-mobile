import { PerformanceMonitor } from "../utils/performanceMonitor";
import { ImageCacheManager } from "../utils/imageCache";
import { OfflineCacheManager } from "../utils/offlineCache";

describe("Performance Tests", () => {
  let performanceMonitor: PerformanceMonitor;
  let imageCacheManager: ImageCacheManager;
  let offlineCacheManager: OfflineCacheManager;

  beforeEach(() => {
    performanceMonitor = PerformanceMonitor.getInstance();
    imageCacheManager = ImageCacheManager.getInstance();
    offlineCacheManager = OfflineCacheManager.getInstance();
    jest.clearAllMocks();
  });

  describe("Screen Load Performance", () => {
    it("should track screen load times", async () => {
      const screenName = "ProfileScreen";

      performanceMonitor.startScreenLoad(screenName);

      // Simulate screen loading work
      await new Promise((resolve) => setTimeout(resolve, 100));

      performanceMonitor.endScreenLoad(screenName);

      const metrics = performanceMonitor.getMetrics("screen_load_time");
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.screenName).toBe(screenName);
      expect(metrics[0].value).toBeGreaterThan(90); // Should be around 100ms
    });

    it("should identify slow screen loads", async () => {
      const screenName = "SlowScreen";

      performanceMonitor.startScreenLoad(screenName);

      // Simulate slow loading
      await new Promise((resolve) => setTimeout(resolve, 2000));

      performanceMonitor.endScreenLoad(screenName);

      const metrics = performanceMonitor.getMetrics("screen_load_time");
      const slowMetric = metrics.find(
        (m) => m.metadata?.screenName === screenName
      );

      expect(slowMetric).toBeDefined();
      expect(slowMetric!.value).toBeGreaterThan(1900); // Should be around 2000ms
    });
  });

  describe("API Performance", () => {
    it("should track API call durations", async () => {
      const endpoint = "/api/test";
      const method = "GET";

      const callId = performanceMonitor.startAPICall(endpoint, method);

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 200));

      performanceMonitor.endAPICall(callId, endpoint, method, 200, 1024);

      const metrics = performanceMonitor.getMetrics("api_call_duration");
      expect(metrics).toHaveLength(1);
      expect(metrics[0].metadata?.endpoint).toBe(endpoint);
      expect(metrics[0].metadata?.method).toBe(method);
      expect(metrics[0].metadata?.status).toBe(200);
      expect(metrics[0].value).toBeGreaterThan(190);
    });

    it("should track failed API calls", async () => {
      const endpoint = "/api/error";
      const method = "POST";

      const callId = performanceMonitor.startAPICall(endpoint, method);

      // Simulate failed API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      performanceMonitor.endAPICall(callId, endpoint, method, 500);

      const metrics = performanceMonitor.getMetrics("api_call_duration");
      const errorMetric = metrics.find(
        (m) => m.metadata?.endpoint === endpoint
      );

      expect(errorMetric).toBeDefined();
      expect(errorMetric!.metadata?.status).toBe(500);
    });
  });

  describe("Image Cache Performance", () => {
    it("should cache images efficiently", async () => {
      const testImageUri = "https://example.com/test-image.jpg";

      // Mock successful image download
      jest.spyOn(global, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        blob: () => Promise.resolve(new Blob()),
      } as Response);

      const startTime = Date.now();
      const cachedUri = await imageCacheManager.cacheImage(testImageUri);
      const endTime = Date.now();

      expect(cachedUri).toBeTruthy();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete quickly
    });

    it("should handle cache size limits", async () => {
      const cacheManager = ImageCacheManager.getInstance({ maxSize: 1024 }); // 1KB limit

      // Try to cache multiple large images
      const imageUris = [
        "https://example.com/large1.jpg",
        "https://example.com/large2.jpg",
        "https://example.com/large3.jpg",
      ];

      // Mock large image downloads
      jest.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          blob: () => Promise.resolve(new Blob(["x".repeat(500)])), // 500 bytes each
        } as Response)
      );

      for (const uri of imageUris) {
        await cacheManager.cacheImage(uri);
      }

      const cacheSize = await cacheManager.getCacheSize();
      expect(cacheSize).toBeLessThanOrEqual(1024); // Should not exceed limit
    });
  });

  describe("Memory Management", () => {
    it("should clean up expired cache entries", async () => {
      const shortTTL = 100; // 100ms

      await offlineCacheManager.set("test_key", { data: "test" }, shortTTL);

      // Verify data is cached
      let cachedData = await offlineCacheManager.get("test_key");
      expect(cachedData).toEqual({ data: "test" });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Data should be expired and removed
      cachedData = await offlineCacheManager.get("test_key");
      expect(cachedData).toBeNull();
    });

    it("should limit cache size", async () => {
      const limitedCache = OfflineCacheManager.getInstance({ maxEntries: 3 });

      // Add more entries than the limit
      await limitedCache.set("key1", "value1");
      await limitedCache.set("key2", "value2");
      await limitedCache.set("key3", "value3");
      await limitedCache.set("key4", "value4"); // Should trigger cleanup

      const cacheSize = await limitedCache.getSize();
      expect(cacheSize).toBeLessThanOrEqual(3);
    });
  });

  describe("Performance Metrics Collection", () => {
    it("should collect comprehensive performance report", async () => {
      // Generate some test metrics
      performanceMonitor.recordMetric("screen_load_time", 500, {
        screenName: "TestScreen",
      });
      performanceMonitor.recordMetric("api_call_duration", 200, {
        endpoint: "/api/test",
      });
      performanceMonitor.recordMetric("memory_usage", 50, {
        screen: "TestScreen",
      });
      performanceMonitor.recordMetric("frame_rate", 60, {
        screenName: "TestScreen",
      });

      const report = performanceMonitor.getPerformanceReport();

      expect(report.screenLoadTimes).toBeDefined();
      expect(report.apiCallTimes).toBeDefined();
      expect(report.memoryUsage).toBeDefined();
      expect(report.frameRate).toBeDefined();
      expect(report.totalMetrics).toBeGreaterThan(0);
    });

    it("should calculate average metrics correctly", () => {
      const metricName = "test_metric";

      performanceMonitor.recordMetric(metricName, 100);
      performanceMonitor.recordMetric(metricName, 200);
      performanceMonitor.recordMetric(metricName, 300);

      const average = performanceMonitor.getAverageMetric(metricName);
      expect(average).toBe(200); // (100 + 200 + 300) / 3
    });
  });

  describe("Large Data Set Performance", () => {
    it("should handle large profile lists efficiently", async () => {
      const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
        id: `profile_${i}`,
        name: `User ${i}`,
        data: "x".repeat(100), // 100 chars per profile
      }));

      const startTime = Date.now();

      // Simulate processing large data set
      const processedData = largeDataSet
        .filter((item) => item.id.includes("1"))
        .map((item) => ({ ...item, processed: true }))
        .slice(0, 100);

      const endTime = Date.now();

      expect(processedData.length).toBeLessThanOrEqual(100);
      expect(endTime - startTime).toBeLessThan(100); // Should complete quickly
    });

    it("should handle pagination efficiently", async () => {
      const pageSize = 20;
      const totalItems = 1000;

      const startTime = Date.now();

      // Simulate paginated data loading
      const pages = Math.ceil(totalItems / pageSize);
      const loadedPages = [];

      for (let i = 0; i < Math.min(pages, 5); i++) {
        // Load first 5 pages
        const pageData = Array.from({ length: pageSize }, (_, j) => ({
          id: i * pageSize + j,
          data: `Item ${i * pageSize + j}`,
        }));
        loadedPages.push(pageData);
      }

      const endTime = Date.now();

      expect(loadedPages).toHaveLength(5);
      expect(loadedPages[0]).toHaveLength(pageSize);
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple simultaneous API calls", async () => {
      const apiCalls = Array.from({ length: 10 }, (_, i) => {
        const callId = performanceMonitor.startAPICall(`/api/test${i}`, "GET");

        return new Promise((resolve) => {
          setTimeout(() => {
            performanceMonitor.endAPICall(callId, `/api/test${i}`, "GET", 200);
            resolve(true);
          }, Math.random() * 100); // Random delay 0-100ms
        });
      });

      const startTime = Date.now();
      await Promise.all(apiCalls);
      const endTime = Date.now();

      const metrics = performanceMonitor.getMetrics("api_call_duration");
      expect(metrics).toHaveLength(10);
      expect(endTime - startTime).toBeLessThan(200); // Should complete in parallel
    });

    it("should handle concurrent cache operations", async () => {
      const cacheOperations = Array.from({ length: 20 }, (_, i) =>
        offlineCacheManager.set(`concurrent_key_${i}`, { value: i })
      );

      const startTime = Date.now();
      await Promise.all(cacheOperations);
      const endTime = Date.now();

      // Verify all data was cached
      const retrieveOperations = Array.from({ length: 20 }, (_, i) =>
        offlineCacheManager.get(`concurrent_key_${i}`)
      );

      const results = await Promise.all(retrieveOperations);

      expect(results).toHaveLength(20);
      expect(results.every((result) => result !== null)).toBe(true);
      expect(endTime - startTime).toBeLessThan(500); // Should be reasonably fast
    });
  });
});
