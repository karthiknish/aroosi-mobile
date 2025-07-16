import { CONFIG, ENV } from "../config/environment";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  component?: string;
}

export interface LoggerConfig {
  enableConsoleLogging: boolean;
  enableRemoteLogging: boolean;
  logLevel: LogLevel;
  maxLogEntries: number;
  sensitiveFields: string[];
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const DEFAULT_CONFIG: LoggerConfig = {
  enableConsoleLogging: ENV === "development",
  enableRemoteLogging: ENV !== "development",
  logLevel: ENV === "development" ? "debug" : "info",
  maxLogEntries: 1000,
  sensitiveFields: [
    "password",
    "token",
    "accessToken",
    "refreshToken",
    "authorization",
    "cookie",
    "session",
    "secret",
    "key",
    "ssn",
    "creditCard",
    "bankAccount",
  ],
};

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private sessionId: string;
  private userId?: string;

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sessionId = this.generateSessionId();
  }

  public static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public setLogLevel(level: LogLevel): void {
    this.config.logLevel = level;
  }

  public debug(message: string, data?: any, component?: string): void {
    this.log("debug", message, data, component);
  }

  public info(message: string, data?: any, component?: string): void {
    this.log("info", message, data, component);
  }

  public warn(message: string, data?: any, component?: string): void {
    this.log("warn", message, data, component);
  }

  public error(message: string, data?: any, component?: string): void {
    this.log("error", message, data, component);
  }

  public log(
    level: LogLevel,
    message: string,
    data?: any,
    component?: string
  ): void {
    // Check if log level is enabled
    if (LOG_LEVELS[level] < LOG_LEVELS[this.config.logLevel]) {
      return;
    }

    const logEntry: LogEntry = {
      level,
      message,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      component,
    };

    // Add to log entries
    this.addLogEntry(logEntry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(logEntry);
    }

    // Remote logging
    if (this.config.enableRemoteLogging) {
      this.logToRemote(logEntry);
    }
  }

  // Specialized logging methods
  public logApiCall(
    method: string,
    url: string,
    status: number,
    duration: number,
    error?: Error
  ): void {
    const level = error || status >= 400 ? "error" : "info";
    this.log(
      level,
      `API ${method} ${url}`,
      {
        method,
        url: this.sanitizeUrl(url),
        status,
        duration,
        error: error?.message,
      },
      "API"
    );
  }

  public logUserAction(action: string, data?: any): void {
    this.info(`User action: ${action}`, data, "UserAction");
  }

  public logScreenView(screenName: string, data?: any): void {
    this.info(`Screen view: ${screenName}`, data, "Navigation");
  }

  public logPerformance(metric: string, value: number, data?: any): void {
    this.info(`Performance: ${metric}`, { value, ...data }, "Performance");
  }

  public logSecurity(event: string, data?: any): void {
    this.warn(`Security event: ${event}`, data, "Security");
  }

  public logError(error: Error, context?: any, component?: string): void {
    this.error(
      error.message,
      {
        name: error.name,
        stack: error.stack,
        context,
      },
      component
    );
  }

  // Log retrieval methods
  public getLogs(
    level?: LogLevel,
    component?: string,
    limit?: number
  ): LogEntry[] {
    let filteredLogs = this.logEntries;

    if (level) {
      filteredLogs = filteredLogs.filter((entry) => entry.level === level);
    }

    if (component) {
      filteredLogs = filteredLogs.filter(
        (entry) => entry.component === component
      );
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs;
  }

  public getLogsSince(timestamp: number): LogEntry[] {
    return this.logEntries.filter((entry) => entry.timestamp >= timestamp);
  }

  public exportLogs(): string {
    return JSON.stringify(this.logEntries, null, 2);
  }

  public clearLogs(): void {
    this.logEntries = [];
  }

  // Configuration methods
  public updateConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Private methods
  private addLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);

    // Maintain max log entries
    if (this.logEntries.length > this.config.maxLogEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxLogEntries);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    const component = entry.component ? ` [${entry.component}]` : "";
    const userId = entry.userId ? ` [User: ${entry.userId}]` : "";

    const logMessage = `${prefix}${component}${userId} ${entry.message}`;

    switch (entry.level) {
      case "debug":
        console.debug(logMessage, entry.data);
        break;
      case "info":
        console.info(logMessage, entry.data);
        break;
      case "warn":
        console.warn(logMessage, entry.data);
        break;
      case "error":
        console.error(logMessage, entry.data);
        break;
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      // Only send error and warn logs to remote in production
      if (ENV === "production" && !["error", "warn"].includes(entry.level)) {
        return;
      }

      // Implement your remote logging service here
      // This could be CloudWatch, Datadog, LogRocket, etc.

      const payload = {
        ...entry,
        environment: ENV,
        platform: "mobile",
        version: CONFIG.APP_VERSION || "1.0.0",
      };

      // Example: Send to logging service
      // await fetch('https://logs.example.com/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
    } catch (error) {
      // Don't log remote logging errors to avoid infinite loops
      console.error("Failed to send log to remote service:", error);
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    if (typeof data === "string") {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeData(item));
    }

    if (typeof data === "object") {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveField(key)) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = this.sanitizeData(value);
        }
      }

      return sanitized;
    }

    return data;
  }

  private sanitizeString(str: string): string {
    // Remove potential tokens or sensitive data from strings
    return str
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/g, "Bearer [REDACTED]")
      .replace(/token[=:]\s*[A-Za-z0-9\-._~+/]+=*/gi, "token=[REDACTED]")
      .replace(/password[=:]\s*\S+/gi, "password=[REDACTED]");
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove sensitive query parameters
      const sensitiveParams = ["token", "key", "secret", "password", "auth"];
      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, "[REDACTED]");
        }
      });

      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowerFieldName = fieldName.toLowerCase();
    return this.config.sensitiveFields.some((sensitive) =>
      lowerFieldName.includes(sensitive.toLowerCase())
    );
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Create default logger instance
export const logger = Logger.getInstance();

// Convenience functions
export function logDebug(
  message: string,
  data?: any,
  component?: string
): void {
  logger.debug(message, data, component);
}

export function logInfo(message: string, data?: any, component?: string): void {
  logger.info(message, data, component);
}

export function logWarn(message: string, data?: any, component?: string): void {
  logger.warn(message, data, component);
}

export function logError(
  message: string,
  data?: any,
  component?: string
): void {
  logger.error(message, data, component);
}

export function logApiCall(
  method: string,
  url: string,
  status: number,
  duration: number,
  error?: Error
): void {
  logger.logApiCall(method, url, status, duration, error);
}

export function logUserAction(action: string, data?: any): void {
  logger.logUserAction(action, data);
}

export function logScreenView(screenName: string, data?: any): void {
  logger.logScreenView(screenName, data);
}

export function logPerformanceMetric(
  metric: string,
  value: number,
  data?: any
): void {
  logger.logPerformance(metric, value, data);
}

export function logSecurityEvent(event: string, data?: any): void {
  logger.logSecurity(event, data);
}

export function logException(
  error: Error,
  context?: any,
  component?: string
): void {
  logger.logError(error, context, component);
}
