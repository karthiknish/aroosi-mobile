// Simple logger with environment-gated debug/info output for production readiness
// Enable verbose logs by setting EXPO_PUBLIC_DEBUG_LOGS=true

const DEBUG_ENABLED = (() => {
  try {
    return process.env.EXPO_PUBLIC_DEBUG_LOGS === "true";
  } catch {
    return false;
  }
})();

export const logger = {
  debug: (...args: any[]) => {
    if (DEBUG_ENABLED) console.log(...args);
  },
  info: (...args: any[]) => {
    if (DEBUG_ENABLED) console.info(...args);
  },
  warn: (...args: any[]) => {
    // Warnings are useful; keep them visible only when debug is enabled to reduce noise
    if (DEBUG_ENABLED) console.warn(...args);
  },
  error: (...args: any[]) => {
    // Always show errors
    console.error(...args);
  },
};

export default logger;
