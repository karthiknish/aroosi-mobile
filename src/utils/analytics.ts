import { Platform } from "react-native";

type AnalyticsEvent =
  | "profile_boost_attempt"
  | "profile_boost_success"
  | "profile_boost_failed"
  | "view_profile_viewers_attempt";

interface EventPayload { [k: string]: any }

let enabled = true;
try {
  enabled = process.env.EXPO_PUBLIC_ENABLE_ANALYTICS !== "false";
} catch {}

export function track(event: AnalyticsEvent, data: EventPayload = {}) {
  if (!enabled) return;
  try {
    console.log(`[analytics] ${event}`, { platform: Platform.OS, ...data });
    // TODO: integrate Firebase Analytics or Segment here.
  } catch {}
}

export default { track };
