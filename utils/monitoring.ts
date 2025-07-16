import * as Sentry from "@sentry/react-native";
import { CONFIG, ENV } from "../config/environment";
import { PerformanceMonitor } from "./performanceMonitor";

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: number;
}

export interface ErrorReport {
  error: Error;
  context?: Record<string, any>;
  userId?: string;
  level?: "info" | "warning" | "error" | "fatal";
}

export class MonitoringManager {
  private static instance: MonitoringManager;
  private isInitialized = false;
  private performanceMonitor: PerformanceMonitor;

  private constructor() {
    this.performanceMonitor = PerformanceMonitor.getInstance();
  }

  public static getInstance(): MonitoringManager {
    if (!MonitoringManager.instance) {
      MonitoringManager.instance = new MonitoringManager();
    }
    return MonitoringManager.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Sentry for error tracking
      if (CONFIG.SENTRY_DSN) {
        Sentry.init({
          dsn: CONFIG.SENTRY_DSN,
          environment: ENV,
          enableAutoSessionTracking: true,
          sessionTrackingIntervalMillis: 30000,
          enableOutOfMemoryTracking: false, // Can cause issues on some devices
          beforeSend: this.filterSentryEvent.bind(this),
        });

        console.log("✅ Sentry initialized for error tracking");
      }

      // Initialize performance monitoring
      this.performanceMonitor.setReportingEnabled(ENV !== "production");

      this.isInitialized = true;
      console.log("✅ Monitoring initialized");
    } catch (error) {
      console.error("❌ Failed to initialize monitoring:", error);
    }
  }

  // Error Reporting
  public reportError(errorReport: ErrorReport): void {
    const { error, context, userId, level = "error" } = errorReport;

    // Log to console in development
    if (ENV === "development") {
      console.error("🐛 Error Report:", {
        message: error.message,
        stack: error.stack,
        context,
        userId,
        level,
      });
    }

    // Report to Sentry
    if (CONFIG.SENTRY_DSN) {
      Sentry.withScope((scope) => {
        scope.setLevel(level);

        if (userId) {
          scope.setUser({ id: userId });
        }

        if (context) {
          Object.keys(context).forEach((key) => {
            scope.setContext(key, context[key]);
          });
        }

        scope.setTag("environment", ENV);
        scope.setTag("platform", "mobile");

        Sentry.captureException(error);
      });
    }

    // Track error metrics
    this.performanceMonitor.recordMetric("error_count", 1, {
      errorType: error.name,
      errorMessage: error.message,
      level,
      userId,
    });
  }

  // Analytics Events
  public trackEvent(event: AnalyticsEvent): void {
    const { name, properties = {}, userId, timestamp = Date.now() } = event;

    // Log in development
    if (ENV === "development") {
      console.log("📊 Analytics Event:", {
        name,
        properties,
        userId,
        timestamp,
      });
    }

    // Add common properties
    const enrichedProperties = {
      ...properties,
      environment: ENV,
      platform: "mobile",
      timestamp,
      userId,
    };

    // Track with performance monitor
    this.performanceMonitor.recordMetric("analytics_event", 1, {
      eventName: name,
      ...enrichedProperties,
    });

    // Send to analytics service (implement based on your analytics provider)
    this.sendToAnalytics(name, enrichedProperties);
  }

  // User Journey Tracking
  public trackScreenView(screenName: string, userId?: string): void {
    this.trackEvent({
      name: "screen_view",
      properties: {
        screen_name: screenName,
      },
      userId,
    });

    // Start performance tracking for screen
    this.performanceMonitor.startScreenLoad(screenName);
  }

  public trackUserAction(
    action: string,
    properties?: Record<string, any>,
    userId?: string
  ): void {
    this.trackEvent({
      name: "user_action",
      properties: {
        action,
        ...properties,
      },
      userId,
    });
  }

  // Business Metrics
  public trackRegistration(
    userId: string,
    method: "email" | "google" | "apple"
  ): void {
    this.trackEvent({
      name: "user_registered",
      properties: {
        registration_method: method,
      },
      userId,
    });
  }

  public trackLogin(
    userId: string,
    method: "email" | "google" | "apple" | "biometric"
  ): void {
    this.trackEvent({
      name: "user_login",
      properties: {
        login_method: method,
      },
      userId,
    });
  }

  public trackProfileCompletion(
    userId: string,
    completionPercentage: number
  ): void {
    this.trackEvent({
      name: "profile_completion",
      properties: {
        completion_percentage: completionPercentage,
      },
      userId,
    });
  }

  public trackInterestSent(userId: string, targetUserId: string): void {
    this.trackEvent({
      name: "interest_sent",
      properties: {
        target_user_id: targetUserId,
      },
      userId,
    });
  }

  public trackMatch(userId: string, matchedUserId: string): void {
    this.trackEvent({
      name: "match_created",
      properties: {
        matched_user_id: matchedUserId,
      },
      userId,
    });
  }

  public trackMessageSent(
    userId: string,
    conversationId: string,
    messageType: "text" | "voice" | "image"
  ): void {
    this.trackEvent({
      name: "message_sent",
      properties: {
        conversation_id: conversationId,
        message_type: messageType,
      },
      userId,
    });
  }

  public trackSubscriptionPurchase(
    userId: string,
    plan: "premium" | "premiumPlus",
    amount: number
  ): void {
    this.trackEvent({
      name: "subscription_purchased",
      properties: {
        plan,
        amount,
        currency: "USD",
      },
      userId,
    });
  }

  // Performance Metrics
  public trackAPICall(
    endpoint: string,
    method: string,
    duration: number,
    status: number
  ): void {
    this.trackEvent({
      name: "api_call",
      properties: {
        endpoint,
        method,
        duration,
        status,
        success: status >= 200 && status < 300,
      },
    });
  }

  public trackAppLaunch(userId?: string): void {
    this.trackEvent({
      name: "app_launch",
      properties: {
        launch_time: Date.now(),
      },
      userId,
    });
  }

  public trackAppBackground(userId?: string, sessionDuration?: number): void {
    this.trackEvent({
      name: "app_background",
      properties: {
        session_duration: sessionDuration,
      },
      userId,
    });
  }

  // Feature Usage Tracking
  public trackFeatureUsage(
    feature: string,
    userId?: string,
    properties?: Record<string, any>
  ): void {
    this.trackEvent({
      name: "feature_used",
      properties: {
        feature_name: feature,
        ...properties,
      },
      userId,
    });
  }

  // Crash Reporting
  public reportCrash(
    error: Error,
    userId?: string,
    context?: Record<string, any>
  ): void {
    this.reportError({
      error,
      context: {
        ...context,
        crash: true,
      },
      userId,
      level: "fatal",
    });
  }

  // Network Monitoring
  public trackNetworkError(url: string, error: Error, userId?: string): void {
    this.reportError({
      error,
      context: {
        url,
        network_error: true,
      },
      userId,
      level: "warning",
    });
  }

  // User Feedback
  public trackUserFeedback(
    userId: string,
    rating: number,
    feedback?: string
  ): void {
    this.trackEvent({
      name: "user_feedback",
      properties: {
        rating,
        feedback,
      },
      userId,
    });
  }

  // Privacy and Compliance
  public setUserConsent(
    userId: string,
    analyticsConsent: boolean,
    crashReportingConsent: boolean
  ): void {
    this.trackEvent({
      name: "user_consent",
      properties: {
        analytics_consent: analyticsConsent,
        crash_reporting_consent: crashReportingConsent,
      },
      userId,
    });

    // Update Sentry user consent
    if (CONFIG.SENTRY_DSN) {
      Sentry.configureScope((scope) => {
        scope.setUser({
          id: userId,
          consent: {
            analytics: analyticsConsent,
            crashReporting: crashReportingConsent,
          },
        });
      });
    }
  }

  // Performance Reports
  public generatePerformanceReport(): Record<string, any> {
    const report = this.performanceMonitor.getPerformanceReport();

    this.trackEvent({
      name: "performance_report",
      properties: report,
    });

    return report;
  }

  // Private Methods
  private filterSentryEvent(event: Sentry.Event): Sentry.Event | null {
    // Filter out sensitive information
    if (event.exception) {
      event.exception.values?.forEach((exception) => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames = exception.stacktrace.frames.map(
            (frame) => ({
              ...frame,
              vars: undefined, // Remove local variables that might contain sensitive data
            })
          );
        }
      });
    }

    // Filter out events in development unless they're crashes
    if (ENV === "development" && event.level !== "fatal") {
      return null;
    }

    return event;
  }

  private async sendToAnalytics(
    eventName: string,
    properties: Record<string, any>
  ): Promise<void> {
    // Implement your analytics service integration here
    // This could be Firebase Analytics, Mixpanel, Amplitude, etc.

    if (ENV === "development") {
      // Don't send analytics in development
      return;
    }

    try {
      // Example implementation for a generic analytics service
      if (CONFIG.ANALYTICS_KEY) {
        // await analyticsService.track(eventName, properties);
      }
    } catch (error) {
      console.error("Failed to send analytics event:", error);
    }
  }
}

// Convenience functions
export const monitoring = MonitoringManager.getInstance();

export function trackError(
  error: Error,
  context?: Record<string, any>,
  userId?: string
): void {
  monitoring.reportError({ error, context, userId });
}

export function trackEvent(
  name: string,
  properties?: Record<string, any>,
  userId?: string
): void {
  monitoring.trackEvent({ name, properties, userId });
}

export function trackScreen(screenName: string, userId?: string): void {
  monitoring.trackScreenView(screenName, userId);
}

export function trackAction(
  action: string,
  properties?: Record<string, any>,
  userId?: string
): void {
  monitoring.trackUserAction(action, properties, userId);
}
