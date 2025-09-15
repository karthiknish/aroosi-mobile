import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

let initialized = false;

export function initSentry() {
  if (initialized) return;
  initialized = true;

  const release = `${Constants.expoConfig?.slug || "aroosi"}@${Constants.expoConfig?.version || "0.0.0"}`;
  const environment = process.env.ENVIRONMENT || process.env.NODE_ENV || "development";

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || undefined,
    environment,
    release,
    enableAutoSessionTracking: true,
    tracesSampleRate: environment === "production" ? 0.2 : 0.0,
    enableNative: true,
    enableAutoPerformanceTracing: false,
    integrations: (integrations) => integrations,
    beforeSend(event) {
      if (environment !== "production" && process.env.EXPO_PUBLIC_SENTRY_SEND_NON_PROD !== "true") {
        return null;
      }
      return event;
    },
  });
}

export { Sentry };
