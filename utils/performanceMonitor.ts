import { InteractionManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface ScreenLoadMetric {
  screenName: string;
  loadTime: number;
  timestamp: number;
  navigationTime?: number;
  renderTime?: number;
}

interface APICallMetric {
  endpoint: string;
  method: string;
  duration: number;
  status: number;
  timestamp: number;
  size?: number;
  cached?: boolean;
}

interface MemoryMetric {
  used: number;
  total: number;
  timestamp: number;
  screen?: string;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private screenLoadTimes: Map<string, number> = new Map();
  private apiCallTimes: Map<string, number> = new Map();
  private maxMetrics = 1000;
  private reportingEnabled = true;

  private constructor() {
    this.loadStoredMetrics();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // Screen performance tracking
  public startScreenLoad(screenName: string): void {
    this.screenLoadTimes.set(screenName, Date.now());
  }

  public endScreenLoad(
    screenName: string,
    metadata?: Record<string, any>
  ): void {
    const startTime = this.screenLoadTimes.get(screenName);
    if (startTime) {
      const loadTime = Date.now() - startTime;
      this.recordMetric("screen_load_time", loadTime, {
        screenName,
        ...metadata,
      });
      this.screenLoadTimes.delete(screenName);
    }
  }

  // API call performance tracking
  public startAPICall(endpoint: string, method: string): string {
    const callId = `${method}_${endpoint}_${Date.now()}`;
    this.apiCallTimes.set(callId, Date.now());
    return callId;
  }

  public endAPICall(
    callId: string,
    endpoint: string,
    method: string,
    status: number,
    size?: number,
    cached = false
  ): void {
    const startTime = this.apiCallTimes.get(callId);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.recordMetric("api_call_duration", duration, {
        endpoint,
        method,
        status,
        size,
        cached,
      });
      this.apiCallTimes.delete(callId);
    }
  }

  // Memory usage tracking
  public recordMemoryUsage(screen?: string): void {
    if (Platform.OS === "ios") {
      // iOS memory tracking would require native module
      // For now, we'll record a placeholder
      this.recordMetric("memory_usage", 0, { screen, platform: "ios" });
    } else {
      // Android memory tracking
      this.recordMetric("memory_usage", 0, { screen, platform: "android" });
    }
  }

  // Frame rate monitoring
  public startFrameRateMonitoring(screenName: string): () => void {
    let frameCount = 0;
    let startTime = Date.now();

    const frameCallback = () => {
      frameCount++;
      requestAnimationFrame(frameCallback);
    };

    requestAnimationFrame(frameCallback);

    const stopMonitoring = () => {
      const duration = Date.now() - startTime;
      const fps = (frameCount / duration) * 1000;
      this.recordMetric("frame_rate", fps, { screenName });
    };

    return stopMonitoring;
  }

  // Bundle size and load time
  public recordBundleLoadTime(bundleName: string, loadTime: number): void {
    this.recordMetric("bundle_load_time", loadTime, { bundleName });
  }

  // Image loading performance
  public recordImageLoadTime(
    imageUri: string,
    loadTime: number,
    cached = false
  ): void {
    this.recordMetric("image_load_time", loadTime, { imageUri, cached });
  }

  // Generic metric recording
  public recordMetric(
    name: string,
    value: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.reportingEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Store metrics periodically
    if (this.metrics.length % 10 === 0) {
      this.storeMetrics();
    }
  }

  // Get performance statistics
  public getMetrics(name?: string, since?: number): PerformanceMetric[] {
    let filtered = this.metrics;

    if (name) {
      filtered = filtered.filter((metric) => metric.name === name);
    }

    if (since) {
      filtered = filtered.filter((metric) => metric.timestamp >= since);
    }

    return filtered;
  }

  public getAverageMetric(name: string, since?: number): number {
    const metrics = this.getMetrics(name, since);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }

  public getPerformanceReport(): {
    screenLoadTimes: Record<string, number>;
    apiCallTimes: Record<string, number>;
    memoryUsage: number;
    frameRate: number;
    totalMetrics: number;
  } {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;

    const screenLoads = this.getMetrics("screen_load_time", lastHour);
    const apiCalls = this.getMetrics("api_call_duration", lastHour);
    const memoryMetrics = this.getMetrics("memory_usage", lastHour);
    const frameRateMetrics = this.getMetrics("frame_rate", lastHour);

    const screenLoadTimes: Record<string, number> = {};
    screenLoads.forEach((metric) => {
      const screenName = metric.metadata?.screenName;
      if (screenName) {
        screenLoadTimes[screenName] = metric.value;
      }
    });

    const apiCallTimes: Record<string, number> = {};
    apiCalls.forEach((metric) => {
      const endpoint = metric.metadata?.endpoint;
      if (endpoint) {
        apiCallTimes[endpoint] = metric.value;
      }
    });

    return {
      screenLoadTimes,
      apiCallTimes,
      memoryUsage: this.getAverageMetric("memory_usage", lastHour),
      frameRate: this.getAverageMetric("frame_rate", lastHour),
      totalMetrics: this.metrics.length,
    };
  }

  // Configuration
  public setReportingEnabled(enabled: boolean): void {
    this.reportingEnabled = enabled;
  }

  public setMaxMetrics(max: number): void {
    this.maxMetrics = max;
    if (this.metrics.length > max) {
      this.metrics = this.metrics.slice(-max);
    }
  }

  // Storage
  private async storeMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        "performance_metrics",
        JSON.stringify(this.metrics.slice(-100)) // Store only last 100 metrics
      );
    } catch (error) {
      console.error("Failed to store performance metrics:", error);
    }
  }

  private async loadStoredMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("performance_metrics");
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load stored metrics:", error);
    }
  }

  public async clearMetrics(): Promise<void> {
    this.metrics = [];
    await AsyncStorage.removeItem("performance_metrics");
  }
}

// React hooks for performance monitoring
export function usePerformanceMonitor() {
  const monitor = PerformanceMonitor.getInstance();

  const startScreenLoad = React.useCallback(
    (screenName: string) => {
      monitor.startScreenLoad(screenName);
    },
    [monitor]
  );

  const endScreenLoad = React.useCallback(
    (screenName: string, metadata?: Record<string, any>) => {
      monitor.endScreenLoad(screenName, metadata);
    },
    [monitor]
  );

  const recordMetric = React.useCallback(
    (name: string, value: number, metadata?: Record<string, any>) => {
      monitor.recordMetric(name, value, metadata);
    },
    [monitor]
  );

  return {
    startScreenLoad,
    endScreenLoad,
    recordMetric,
    getMetrics: monitor.getMetrics.bind(monitor),
    getPerformanceReport: monitor.getPerformanceReport.bind(monitor),
  };
}

// Screen performance hook
export function useScreenPerformance(screenName: string) {
  const monitor = PerformanceMonitor.getInstance();
  const [loadTime, setLoadTime] = React.useState<number | null>(null);

  React.useEffect(() => {
    const startTime = Date.now();
    monitor.startScreenLoad(screenName);

    // Record when component mounts
    const recordMountTime = () => {
      const mountTime = Date.now() - startTime;
      setLoadTime(mountTime);
      monitor.endScreenLoad(screenName, { mountTime });
    };

    // Use InteractionManager to wait for interactions to complete
    InteractionManager.runAfterInteractions(recordMountTime);

    return () => {
      // Record memory usage when component unmounts
      monitor.recordMemoryUsage(screenName);
    };
  }, [screenName, monitor]);

  return { loadTime };
}

// API performance hook
export function useAPIPerformance() {
  const monitor = PerformanceMonitor.getInstance();

  const trackAPICall = React.useCallback(
    async <T>(
      endpoint: string,
      method: string,
      apiCall: () => Promise<T>,
      cached = false
    ): Promise<T> => {
      const callId = monitor.startAPICall(endpoint, method);

      try {
        const result = await apiCall();
        monitor.endAPICall(callId, endpoint, method, 200, undefined, cached);
        return result;
      } catch (error: any) {
        const status = error?.response?.status || 500;
        monitor.endAPICall(callId, endpoint, method, status, undefined, cached);
        throw error;
      }
    },
    [monitor]
  );

  return { trackAPICall };
}

// Memory monitoring hook
export function useMemoryMonitor(screenName?: string) {
  const monitor = PerformanceMonitor.getInstance();

  React.useEffect(() => {
    const interval = setInterval(() => {
      monitor.recordMemoryUsage(screenName);
    }, 30000); // Record every 30 seconds

    return () => clearInterval(interval);
  }, [screenName, monitor]);
}

// Performance optimization utilities
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private imagePreloadQueue: string[] = [];
  private isPreloading = false;

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Lazy loading helper
  public createLazyComponent<T extends React.ComponentType<any>>(
    importFunction: () => Promise<{ default: T }>,
    fallback?: React.ComponentType
  ): React.ComponentType {
    return React.lazy(importFunction);
  }

  // Image preloading
  public queueImagePreload(uri: string): void {
    if (!this.imagePreloadQueue.includes(uri)) {
      this.imagePreloadQueue.push(uri);
      this.processPreloadQueue();
    }
  }

  private async processPreloadQueue(): Promise<void> {
    if (this.isPreloading || this.imagePreloadQueue.length === 0) return;

    this.isPreloading = true;
    const monitor = PerformanceMonitor.getInstance();

    while (this.imagePreloadQueue.length > 0) {
      const uri = this.imagePreloadQueue.shift()!;
      const startTime = Date.now();

      try {
        await Image.prefetch(uri);
        const loadTime = Date.now() - startTime;
        monitor.recordImageLoadTime(uri, loadTime, false);
      } catch (error) {
        console.error("Failed to preload image:", uri, error);
      }
    }

    this.isPreloading = false;
  }

  // Debounce utility
  public debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;

    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }

  // Throttle utility
  public throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }
}
