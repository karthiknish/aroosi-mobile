import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "./logger";

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  category: string;
  tags?: Record<string, string>;
}

export interface ErrorMetric {
  name: string;
  message: string;
  stack?: string;
  timestamp: number;
  category: string;
  isFatal: boolean;
  userId?: string;
  context?: any;
}

export interface UserMetric {
  action: string;
  timestamp: number;
  userId?: string;
  sessionId: string;
  properties?: Record<string, any>;
}

export interface SystemMetric {
  name: string;
  value: number;
  timestamp: number;
  system: string;
}

export interface MonitoringConfig {
  enablePerformanceTracking: boolean;
  enableErrorTracking: boolean;
  enableUserTracking: boolean;
  enableSystemTracking: boolean;
  batchSize: number;
  flushInterval: number;
  remoteEndpoint?: string;
}

export class MonitoringService {
  private config: MonitoringConfig;
  private performanceMetrics: PerformanceMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private userMetrics: UserMetric[] = [];
  private systemMetrics: SystemMetric[] = [];
  private flushTimer?: NodeJS.Timeout;
  private sessionId: string;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enablePerformanceTracking: true,
      enableErrorTracking: true,
      enableUserTracking: true,
      enableSystemTracking: true,
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flushMetrics();
    }, this.config.flushInterval);
  }

  // Performance Tracking
  trackPerformance(
    name: string,
    value: number,
    unit: string,
    category: string = "general",
    tags?: Record<string, string>
  ): void {
    if (!this.config.enablePerformanceTracking) return;

    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      category,
      tags,
    };

    this.performanceMetrics.push(metric);
    logger.logPerformanceMetric(name, value, unit);

    if (this.performanceMetrics.length >= this.config.batchSize) {
      this.flushMetrics();
    }
  }

  trackApiCall(
    method: string,
    endpoint: string,
    duration: number,
    statusCode: number,
    error?: any
  ): void {
    this.trackPerformance("api_call_duration", duration, "ms", "api", {
      method,
      endpoint: this.sanitizeEndpoint(endpoint),
      status_code: statusCode.toString(),
      success: (statusCode < 400).toString(),
    });

    if (error) {
      this.trackError(
        `API Error: ${method} ${endpoint}`,
        error.message || "Unknown API error",
        error.stack,
        "api",
        false,
        { method, endpoint, statusCode }
      );
    }
  }

  trackScreenLoad(screenName: string, duration: number): void {
    this.trackPerformance("screen_load_time", duration, "ms", "navigation", {
      screen: screenName,
    });
  }

  trackImageLoad(imageUrl: string, duration: number, success: boolean): void {
    this.trackPerformance("image_load_time", duration, "ms", "media", {
      success: success.toString(),
      cached: "false", // Could be enhanced to detect cache hits
    });
  }

  trackMemoryUsage(usage: number, total: number): void {
    this.trackPerformance("memory_usage", usage, "bytes", "system");
    this.trackPerformance(
      "memory_usage_percentage",
      (usage / total) * 100,
      "%",
      "system"
    );
  }

  // Error Tracking
  trackError(
    name: string,
    message: string,
    stack?: string,
    category: string = "general",
    isFatal: boolean = false,
    context?: any
  ): void {
    if (!this.config.enableErrorTracking) return;

    const metric: ErrorMetric = {
      name,
      message,
      stack,
      timestamp: Date.now(),
      category,
      isFatal,
      context: this.sanitizeContext(context),
    };

    this.errorMetrics.push(metric);
    logger.logError(new Error(message), context);

    // Immediately flush fatal errors
    if (isFatal) {
      this.flushMetrics();
    }
  }

  trackJavaScriptError(error: Error, isFatal: boolean = false): void {
    this.trackError(
      error.name,
      error.message,
      error.stack,
      "javascript",
      isFatal
    );
  }

  trackNetworkError(url: string, error: any): void {
    this.trackError(
      "Network Error",
      error.message || "Network request failed",
      error.stack,
      "network",
      false,
      { url: this.sanitizeUrl(url) }
    );
  }

  trackAuthError(error: any, context?: any): void {
    this.trackError(
      "Authentication Error",
      error.message || "Authentication failed",
      error.stack,
      "auth",
      false,
      context
    );
  }

  // User Tracking
  trackUserAction(action: string, properties?: Record<string, any>): void {
    if (!this.config.enableUserTracking) return;

    const metric: UserMetric = {
      action,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      properties: this.sanitizeProperties(properties),
    };

    this.userMetrics.push(metric);
    logger.logUserAction(action, properties);

    if (this.userMetrics.length >= this.config.batchSize) {
      this.flushMetrics();
    }
  }

  trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.trackUserAction("screen_view", {
      screen_name: screenName,
      ...properties,
    });
  }

  trackButtonClick(buttonName: string, screenName?: string): void {
    this.trackUserAction("button_click", {
      button_name: buttonName,
      screen_name: screenName,
    });
  }

  trackFormSubmission(
    formName: string,
    success: boolean,
    errors?: string[]
  ): void {
    this.trackUserAction("form_submission", {
      form_name: formName,
      success,
      error_count: errors?.length || 0,
      errors: errors?.slice(0, 5), // Limit error details
    });
  }

  trackSearch(query: string, resultsCount: number, filters?: any): void {
    this.trackUserAction("search", {
      query_length: query.length,
      results_count: resultsCount,
      has_filters: !!filters,
      filter_count: filters ? Object.keys(filters).length : 0,
    });
  }

  trackInterestSent(targetUserId: string): void {
    this.trackUserAction("interest_sent", {
      target_user_id: this.hashUserId(targetUserId),
    });
  }

  trackMessageSent(conversationId: string, messageType: string): void {
    this.trackUserAction("message_sent", {
      conversation_id: this.hashId(conversationId),
      message_type: messageType,
    });
  }

  trackSubscriptionEvent(event: string, plan?: string): void {
    this.trackUserAction("subscription_event", {
      event,
      plan,
    });
  }

  // System Tracking
  trackSystemMetric(
    name: string,
    value: number,
    system: string = "mobile"
  ): void {
    if (!this.config.enableSystemTracking) return;

    const metric: SystemMetric = {
      name,
      value,
      timestamp: Date.now(),
      system,
    };

    this.systemMetrics.push(metric);

    if (this.systemMetrics.length >= this.config.batchSize) {
      this.flushMetrics();
    }
  }

  trackAppLaunch(launchTime: number): void {
    this.trackSystemMetric("app_launch_time", launchTime, "app");
  }

  trackAppBackground(): void {
    this.trackUserAction("app_background");
  }

  trackAppForeground(): void {
    this.trackUserAction("app_foreground");
  }

  trackCrash(error: Error): void {
    this.trackError("App Crash", error.message, error.stack, "crash", true);
  }

  // Utility Methods
  startTimer(name: string): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.trackPerformance(name, duration, "ms");
    };
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const endTimer = this.startTimer(name);
    try {
      const result = await fn();
      endTimer();
      return result;
    } catch (error) {
      endTimer();
      this.trackError(name, (error as Error).message, (error as Error).stack);
      throw error;
    }
  }

  // Data Management
  private async flushMetrics(): Promise<void> {
    try {
      const batch = {
        performance: [...this.performanceMetrics],
        errors: [...this.errorMetrics],
        user: [...this.userMetrics],
        system: [...this.systemMetrics],
        timestamp: Date.now(),
        sessionId: this.sessionId,
      };

      // Clear current metrics
      this.performanceMetrics = [];
      this.errorMetrics = [];
      this.userMetrics = [];
      this.systemMetrics = [];

      // Store locally
      await this.storeMetricsLocally(batch);

      // Send to remote endpoint if configured
      if (this.config.remoteEndpoint) {
        await this.sendMetricsRemotely(batch);
      }
    } catch (error) {
      logger.error("MONITORING", "Failed to flush metrics", error);
    }
  }

  private async storeMetricsLocally(batch: any): Promise<void> {
    try {
      const existingMetrics = await AsyncStorage.getItem("monitoring_metrics");
      const metrics = existingMetrics ? JSON.parse(existingMetrics) : [];

      metrics.push(batch);

      // Keep only last 100 batches to prevent storage bloat
      if (metrics.length > 100) {
        metrics.splice(0, metrics.length - 100);
      }

      await AsyncStorage.setItem("monitoring_metrics", JSON.stringify(metrics));
    } catch (error) {
      logger.error("MONITORING", "Failed to store metrics locally", error);
    }
  }

  private async sendMetricsRemotely(batch: any): Promise<void> {
    try {
      if (!this.config.remoteEndpoint) return;

      const response = await fetch(this.config.remoteEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batch),
      });

      if (!response.ok) {
        throw new Error(`Remote metrics failed: ${response.status}`);
      }
    } catch (error) {
      logger.error("MONITORING", "Failed to send metrics remotely", error);
    }
  }

  // Data Sanitization
  private sanitizeEndpoint(endpoint: string): string {
    // Remove user IDs and sensitive parameters from endpoint
    return endpoint
      .replace(/\/[a-f0-9-]{36}/g, "/:id")
      .replace(/\/\d+/g, "/:id")
      .replace(/[?&](token|key|secret)=[^&]*/g, "");
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.delete("token");
      urlObj.searchParams.delete("key");
      urlObj.searchParams.delete("secret");
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private sanitizeContext(context: any): any {
    if (!context) return context;

    const sanitized = { ...context };
    const sensitiveKeys = ["password", "token", "secret", "key", "auth"];

    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = "[REDACTED]";
      }
    }

    return sanitized;
  }

  private sanitizeProperties(
    properties?: Record<string, any>
  ): Record<string, any> | undefined {
    if (!properties) return properties;

    return this.sanitizeContext(properties);
  }

  private hashUserId(userId: string): string {
    // Simple hash for privacy - in production, use a proper hash function
    return `user_${userId.length}_${userId.charCodeAt(0)}`;
  }

  private hashId(id: string): string {
    return `id_${id.length}_${id.charCodeAt(0)}`;
  }

  // Analytics and Reporting
  async getMetricsSummary(): Promise<{
    performance: { count: number; avgValue: number };
    errors: { count: number; fatalCount: number };
    user: { count: number; uniqueActions: number };
    system: { count: number };
  }> {
    try {
      const storedMetrics = await AsyncStorage.getItem("monitoring_metrics");
      if (!storedMetrics) {
        return {
          performance: { count: 0, avgValue: 0 },
          errors: { count: 0, fatalCount: 0 },
          user: { count: 0, uniqueActions: 0 },
          system: { count: 0 },
        };
      }

      const metrics = JSON.parse(storedMetrics);
      let totalPerformance = 0;
      let totalPerformanceValue = 0;
      let totalErrors = 0;
      let fatalErrors = 0;
      let totalUser = 0;
      let totalSystem = 0;
      const uniqueActions = new Set<string>();

      for (const batch of metrics) {
        totalPerformance += batch.performance?.length || 0;
        totalPerformanceValue +=
          batch.performance?.reduce(
            (sum: number, p: PerformanceMetric) => sum + p.value,
            0
          ) || 0;

        totalErrors += batch.errors?.length || 0;
        fatalErrors +=
          batch.errors?.filter((e: ErrorMetric) => e.isFatal).length || 0;

        totalUser += batch.user?.length || 0;
        batch.user?.forEach((u: UserMetric) => uniqueActions.add(u.action));

        totalSystem += batch.system?.length || 0;
      }

      return {
        performance: {
          count: totalPerformance,
          avgValue:
            totalPerformance > 0 ? totalPerformanceValue / totalPerformance : 0,
        },
        errors: {
          count: totalErrors,
          fatalCount: fatalErrors,
        },
        user: {
          count: totalUser,
          uniqueActions: uniqueActions.size,
        },
        system: {
          count: totalSystem,
        },
      };
    } catch (error) {
      logger.error("MONITORING", "Failed to get metrics summary", error);
      return {
        performance: { count: 0, avgValue: 0 },
        errors: { count: 0, fatalCount: 0 },
        user: { count: 0, uniqueActions: 0 },
        system: { count: 0 },
      };
    }
  }

  async clearMetrics(): Promise<void> {
    try {
      await AsyncStorage.removeItem("monitoring_metrics");
      this.performanceMetrics = [];
      this.errorMetrics = [];
      this.userMetrics = [];
      this.systemMetrics = [];
    } catch (error) {
      logger.error("MONITORING", "Failed to clear metrics", error);
    }
  }

  // Configuration
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  setRemoteEndpoint(endpoint: string): void {
    this.config.remoteEndpoint = endpoint;
  }

  // Cleanup
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flushMetrics(); // Final flush
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService({
  remoteEndpoint: "https://www.aroosi.app/api/metrics",
});

// Convenience functions
export const trackPerformance = (
  name: string,
  value: number,
  unit: string,
  category?: string,
  tags?: Record<string, string>
) => monitoring.trackPerformance(name, value, unit, category, tags);

export const trackError = (
  name: string,
  message: string,
  stack?: string,
  category?: string,
  isFatal?: boolean,
  context?: any
) => monitoring.trackError(name, message, stack, category, isFatal, context);

export const trackUserAction = (
  action: string,
  properties?: Record<string, any>
) => monitoring.trackUserAction(action, properties);

export const trackApiCall = (
  method: string,
  endpoint: string,
  duration: number,
  statusCode: number,
  error?: any
) => monitoring.trackApiCall(method, endpoint, duration, statusCode, error);

export const startTimer = (name: string) => monitoring.startTimer(name);

export const measureAsync = <T>(name: string, fn: () => Promise<T>) =>
  monitoring.measureAsync(name, fn);
