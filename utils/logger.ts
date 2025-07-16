import AsyncStorage from "@react-native-async-storage/async-storage";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
  platform?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  sessionId: string;
  buildVersion: string;
}

export class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isFlushingLogs = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: __DEV__,
      enableStorage: true,
      enableRemote: !__DEV__,
      maxStorageEntries: 1000,
      sessionId: this.generateSessionId(),
      buildVersion: "1.0.0",
      ...config,
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(category: string, message: string, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data);
  }

  fatal(category: string, message: string, data?: any): void {
    this.log(LogLevel.FATAL, category, message, data);
  }

  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any
  ): void {
    if (level < this.config.level) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
      data: this.sanitizeData(data),
      sessionId: this.config.sessionId,
      buildVersion: this.config.buildVersion,
      platform: "mobile",
    };

    // Add user ID if available
    this.addUserContext(logEntry);

    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(logEntry);
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logToStorage(logEntry);
    }

    // Remote logging
    if (this.config.enableRemote) {
      this.logToRemote(logEntry);
    }
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    // Deep clone to avoid modifying original data
    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive information
    this.removeSensitiveFields(sanitized);

    return sanitized;
  }

  private removeSensitiveFields(obj: any): void {
    if (typeof obj !== "object" || obj === null) return;

    const sensitiveFields = [
      "password",
      "token",
      "auth",
      "authorization",
      "secret",
      "key",
      "credential",
      "phoneNumber",
      "email",
      "ssn",
      "creditCard",
      "bankAccount",
      "pin",
      "otp",
    ];

    for (const key in obj) {
      if (
        sensitiveFields.some((field) =>
          key.toLowerCase().includes(field.toLowerCase())
        )
      ) {
        if (typeof obj[key] === "string") {
          obj[key] = this.maskSensitiveString(obj[key]);
        } else {
          obj[key] = "[REDACTED]";
        }
      } else if (typeof obj[key] === "object") {
        this.removeSensitiveFields(obj[key]);
      }
    }
  }

  private maskSensitiveString(value: string): string {
    if (value.length <= 4) return "***";

    if (value.includes("@")) {
      // Email masking
      const [local, domain] = value.split("@");
      return `${local.charAt(0)}***@${domain}`;
    }

    if (value.startsWith("+")) {
      // Phone number masking
      return `${value.substring(0, 3)}***${value.substring(value.length - 4)}`;
    }

    // General string masking
    return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
  }

  private async addUserContext(logEntry: LogEntry): Promise<void> {
    try {
      const userContext = await AsyncStorage.getItem("user_context");
      if (userContext) {
        const context = JSON.parse(userContext);
        logEntry.userId = context.userId;
      }
    } catch (error) {
      // Ignore errors when adding user context
    }
  }

  private logToConsole(logEntry: LogEntry): void {
    const levelName = LogLevel[logEntry.level];
    const timestamp = new Date(logEntry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${levelName}] [${logEntry.category}]`;

    const consoleMethod = this.getConsoleMethod(logEntry.level);

    if (logEntry.data) {
      consoleMethod(`${prefix} ${logEntry.message}`, logEntry.data);
    } else {
      consoleMethod(`${prefix} ${logEntry.message}`);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        return console.error;
      default:
        return console.log;
    }
  }

  private async logToStorage(logEntry: LogEntry): Promise<void> {
    try {
      this.logQueue.push(logEntry);

      // Flush logs periodically or when queue is full
      if (this.logQueue.length >= 50 || logEntry.level >= LogLevel.ERROR) {
        await this.flushLogsToStorage();
      }
    } catch (error) {
      console.error("Failed to log to storage:", error);
    }
  }

  private async flushLogsToStorage(): Promise<void> {
    if (this.isFlushingLogs || this.logQueue.length === 0) {
      return;
    }

    this.isFlushingLogs = true;

    try {
      const existingLogs = await AsyncStorage.getItem("app_logs");
      const logs: LogEntry[] = existingLogs ? JSON.parse(existingLogs) : [];

      // Add new logs
      logs.push(...this.logQueue);

      // Trim logs if exceeding max entries
      if (logs.length > this.config.maxStorageEntries) {
        logs.splice(0, logs.length - this.config.maxStorageEntries);
      }

      await AsyncStorage.setItem("app_logs", JSON.stringify(logs));
      this.logQueue = [];
    } catch (error) {
      console.error("Failed to flush logs to storage:", error);
    } finally {
      this.isFlushingLogs = false;
    }
  }

  private async logToRemote(logEntry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      // Only send important logs to remote to avoid spam
      if (logEntry.level < LogLevel.WARN) {
        return;
      }

      const response = await fetch(this.config.remoteEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logs: [logEntry],
        }),
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.status}`);
      }
    } catch (error) {
      // Don't log remote logging errors to avoid infinite loops
      console.error("Remote logging failed:", error);
    }
  }

  async getLogs(
    options: {
      level?: LogLevel;
      category?: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    } = {}
  ): Promise<LogEntry[]> {
    try {
      const storedLogs = await AsyncStorage.getItem("app_logs");
      if (!storedLogs) return [];

      let logs: LogEntry[] = JSON.parse(storedLogs);

      // Apply filters
      if (options.level !== undefined) {
        logs = logs.filter((log) => log.level >= options.level!);
      }

      if (options.category) {
        logs = logs.filter((log) => log.category === options.category);
      }

      if (options.startTime) {
        logs = logs.filter((log) => log.timestamp >= options.startTime!);
      }

      if (options.endTime) {
        logs = logs.filter((log) => log.timestamp <= options.endTime!);
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => b.timestamp - a.timestamp);

      // Apply limit
      if (options.limit) {
        logs = logs.slice(0, options.limit);
      }

      return logs;
    } catch (error) {
      console.error("Failed to get logs:", error);
      return [];
    }
  }

  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem("app_logs");
      this.logQueue = [];
    } catch (error) {
      console.error("Failed to clear logs:", error);
    }
  }

  async exportLogs(): Promise<string> {
    try {
      const logs = await this.getLogs();
      return JSON.stringify(logs, null, 2);
    } catch (error) {
      console.error("Failed to export logs:", error);
      return "[]";
    }
  }

  async getLogStats(): Promise<{
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByCategory: Record<string, number>;
    oldestLog?: number;
    newestLog?: number;
  }> {
    try {
      const logs = await this.getLogs();

      const stats = {
        totalLogs: logs.length,
        logsByLevel: {} as Record<string, number>,
        logsByCategory: {} as Record<string, number>,
        oldestLog:
          logs.length > 0
            ? Math.min(...logs.map((log) => log.timestamp))
            : undefined,
        newestLog:
          logs.length > 0
            ? Math.max(...logs.map((log) => log.timestamp))
            : undefined,
      };

      logs.forEach((log) => {
        const levelName = LogLevel[log.level];
        stats.logsByLevel[levelName] = (stats.logsByLevel[levelName] || 0) + 1;
        stats.logsByCategory[log.category] =
          (stats.logsByCategory[log.category] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error("Failed to get log stats:", error);
      return {
        totalLogs: 0,
        logsByLevel: {},
        logsByCategory: {},
      };
    }
  }

  // Performance logging helpers
  startTimer(category: string, operation: string): () => void {
    const startTime = Date.now();

    return () => {
      const duration = Date.now() - startTime;
      this.info(category, `${operation} completed`, { duration });
    };
  }

  async logApiCall(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    error?: any
  ): Promise<void> {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `${method} ${url} - ${statusCode}`;

    const data = {
      method,
      url: this.sanitizeUrl(url),
      statusCode,
      duration,
      error: error ? this.sanitizeData(error) : undefined,
    };

    this.log(level, "API", message, data);
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters
      const sensitiveParams = ["token", "key", "secret", "auth"];

      sensitiveParams.forEach((param) => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, "[REDACTED]");
        }
      });

      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  async logUserAction(action: string, data?: any): Promise<void> {
    this.info("USER_ACTION", action, data);
  }

  async logError(error: Error, context?: any): Promise<void> {
    this.error("ERROR", error.message, {
      name: error.name,
      stack: error.stack,
      context: this.sanitizeData(context),
    });
  }

  async logSecurityEvent(event: string, data?: any): Promise<void> {
    this.warn("SECURITY", event, data);
  }

  async logPerformanceMetric(
    metric: string,
    value: number,
    unit: string
  ): Promise<void> {
    this.info("PERFORMANCE", `${metric}: ${value}${unit}`, {
      metric,
      value,
      unit,
    });
  }

  // Crash reporting
  async logCrash(error: Error, isFatal: boolean = false): Promise<void> {
    const level = isFatal ? LogLevel.FATAL : LogLevel.ERROR;

    this.log(level, "CRASH", error.message, {
      name: error.name,
      stack: error.stack,
      isFatal,
      timestamp: Date.now(),
    });

    // Immediately flush to storage for crashes
    await this.flushLogsToStorage();
  }

  // Configuration methods
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  setRemoteEndpoint(endpoint: string): void {
    this.config.remoteEndpoint = endpoint;
    this.config.enableRemote = true;
  }

  enableConsoleLogging(enable: boolean): void {
    this.config.enableConsole = enable;
  }

  enableStorageLogging(enable: boolean): void {
    this.config.enableStorage = enable;
  }

  enableRemoteLogging(enable: boolean): void {
    this.config.enableRemote = enable;
  }
}

// Global logger instance
export const logger = new Logger({
  level: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
  remoteEndpoint: "https://www.aroosi.app/api/logs",
});

// Convenience functions
export const logDebug = (category: string, message: string, data?: any) =>
  logger.debug(category, message, data);

export const logInfo = (category: string, message: string, data?: any) =>
  logger.info(category, message, data);

export const logWarn = (category: string, message: string, data?: any) =>
  logger.warn(category, message, data);

export const logError = (category: string, message: string, data?: any) =>
  logger.error(category, message, data);

export const logFatal = (category: string, message: string, data?: any) =>
  logger.fatal(category, message, data);
