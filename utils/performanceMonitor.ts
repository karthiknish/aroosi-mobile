import React from 'react';
import { InteractionManager, Platform, Image } from "react-native";
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
    this.loadStoredMetrics().catch(error => {
      console.error("Failed to load stored metrics during initialization:", error);
    });
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
    try {
      let memoryUsage = 0;
      
      if (Platform.OS === "ios") {
        // iOS: Use performance.now() as a proxy for memory pressure
        // In a real app, you'd use a native module like react-native-device-info
        memoryUsage = this.getEstimatedMemoryUsage();
      } else {
        // Android: Use global performance memory info if available
        memoryUsage = this.getAndroidMemoryUsage();
      }
      
      this.recordMetric("memory_usage", memoryUsage, { screen, platform: Platform.OS });
    } catch (error) {
      console.warn("Failed to record memory usage:", error);
      this.recordMetric("memory_usage", 0, { screen, platform: Platform.OS, error: true });
    }
  }

  private getEstimatedMemoryUsage(): number {
    // Fallback estimation based on JS heap usage
    // This is a rough approximation - use native modules for accurate data
    if (global.performance && (global.performance as any).memory) {
      return (global.performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  private getAndroidMemoryUsage(): number {
    // Try to get memory info from React Native's native modules
    // This is a placeholder - implement with actual native module
    try {
      // In a real implementation, you'd use:
      // import { NativeModules } from 'react-native';
      // const { MemoryInfo } = NativeModules;
      // return MemoryInfo?.getUsedMemory?.() || 0;
      
      // For now, use JS heap as fallback
      return this.getEstimatedMemoryUsage();
    } catch {
      return 0;
    }
  }

  // Frame rate monitoring
  public startFrameRateMonitoring(screenName: string): () => void {
    let frameCount = 0;
    let startTime = Date.now();
    let isMonitoring = true;
    let lastFrameTime = startTime;
    let frameDrops = 0;

    const frameCallback = () => {
      if (!isMonitoring) return;

      const now = Date.now();
      const frameDuration = now - lastFrameTime;
      
      // Count frame drops (frames taking longer than 16.67ms for 60fps)
      if (frameDuration > 16.67) {
        frameDrops++;
      }
      
      frameCount++;
      lastFrameTime = now;
      
      requestAnimationFrame(frameCallback);
    };

    requestAnimationFrame(frameCallback);

    const stopMonitoring = () => {
      isMonitoring = false;
      const duration = Date.now() - startTime;
      const fps = Math.round((frameCount / duration) * 1000);
      const dropRate = frameCount > 0 ? (frameDrops / frameCount) * 100 : 0;
      
      this.recordMetric("frame_rate", fps, { screenName });
      this.recordMetric("frame_drops", frameDrops, { screenName });
      this.recordMetric("frame_drop_rate", dropRate, { screenName, unit: "%" });
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
    if (!this.reportingEnabled || !name || typeof value !== 'number') {
      return;
    }

    // Validate value
    if (!isFinite(value) || isNaN(value)) {
      console.warn(`Invalid metric value: ${value} for ${name}`);
      return;
    }

    const metric: PerformanceMetric = {
      name: name.trim(),
      value: Math.max(0, value), // Ensure non-negative
      timestamp: Date.now(),
      metadata: this.sanitizeMetadata(metadata),
    };

    this.metrics.push(metric);

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Store metrics periodically, but not too frequently
    if (this.metrics.length % 10 === 0) {
      this.storeMetrics().catch(error => {
        console.error("Failed to store metrics:", error);
      });
    }
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      } else if (value !== null && value !== undefined) {
        sanitized[key] = String(value);
      }
    }
    return sanitized;
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
    lastUpdated: number;
  } {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;

    const screenLoads = this.getMetrics("screen_load_time", lastHour);
    const apiCalls = this.getMetrics("api_call_duration", lastHour);
    const memoryMetrics = this.getMetrics("memory_usage", lastHour);
    const frameRateMetrics = this.getMetrics("frame_rate", lastHour);

    const screenLoadTimes: Record<string, number> = {};
    const screenCounts: Record<string, number> = {};
    
    screenLoads.forEach((metric) => {
      const screenName = metric.metadata?.screenName;
      if (screenName && typeof metric.value === 'number') {
        if (!screenLoadTimes[screenName]) {
          screenLoadTimes[screenName] = 0;
          screenCounts[screenName] = 0;
        }
        screenLoadTimes[screenName] += metric.value;
        screenCounts[screenName]++;
      }
    });

    // Calculate averages for screens with multiple loads
    Object.keys(screenLoadTimes).forEach(screenName => {
      if (screenCounts[screenName] > 1) {
        screenLoadTimes[screenName] = Math.round(screenLoadTimes[screenName] / screenCounts[screenName]);
      }
    });

    const apiCallTimes: Record<string, number> = {};
    const apiCounts: Record<string, number> = {};
    
    apiCalls.forEach((metric) => {
      const endpoint = metric.metadata?.endpoint;
      if (endpoint && typeof metric.value === 'number') {
        if (!apiCallTimes[endpoint]) {
          apiCallTimes[endpoint] = 0;
          apiCounts[endpoint] = 0;
        }
        apiCallTimes[endpoint] += metric.value;
        apiCounts[endpoint]++;
      }
    });

    // Calculate averages for API calls
    Object.keys(apiCallTimes).forEach(endpoint => {
      if (apiCounts[endpoint] > 1) {
        apiCallTimes[endpoint] = Math.round(apiCallTimes[endpoint] / apiCounts[endpoint]);
      }
    });

    return {
      screenLoadTimes,
      apiCallTimes,
      memoryUsage: Math.round(this.getAverageMetric("memory_usage", lastHour)),
      frameRate: Math.round(this.getAverageMetric("frame_rate", lastHour) * 10) / 10,
      totalMetrics: this.metrics.length,
      lastUpdated: now,
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
      const metricsToStore = this.metrics.slice(-100);
      const serialized = JSON.stringify(metricsToStore);
      
      // Check storage size before saving
      if (serialized.length > 500000) { // ~500KB limit
        console.warn("Metrics data too large, truncating...");
        const truncated = this.metrics.slice(-50);
        await AsyncStorage.setItem("performance_metrics", JSON.stringify(truncated));
      } else {
        await AsyncStorage.setItem("performance_metrics", serialized);
      }
    } catch (error) {
      console.error("Failed to store performance metrics:", error);
      // Don't throw - this is non-critical
    }
  }

  private async loadStoredMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem("performance_metrics");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.metrics = parsed.filter(metric => 
            metric && 
            typeof metric.name === 'string' && 
            typeof metric.value === 'number' && 
            typeof metric.timestamp === 'number'
          );
        }
      }
    } catch (error) {
      console.error("Failed to load stored metrics:", error);
      this.metrics = []; // Reset on error
    }
  }

  public async clearMetrics(): Promise<void> {
    try {
      this.metrics = [];
      await AsyncStorage.removeItem("performance_metrics");
    } catch (error) {
      console.error("Failed to clear metrics:", error);
      throw error; // Re-throw for caller to handle
    }
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
