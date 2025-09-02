import { Platform } from "react-native";

type AnalyticsEvent =
  | "profile_boost_attempt"
  | "profile_boost_success"
  | "profile_boost_failed"
  | "view_profile_viewers_attempt";

interface EventPayload { [k: string]: any }

let enabled = false; // default off in production
try {
  // Only enable when explicitly opted-in
  enabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === "true";
} catch {}

export function track(event: AnalyticsEvent, data: EventPayload = {}) {
  if (!enabled) return;
  try {
  // Integrate Firebase Analytics or Segment here.
  // No console logging in production by default.
  } catch {}
}

export default { track };
