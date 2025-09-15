import { Alert, Platform } from "react-native";
import { Toast } from "@providers/ToastContext";

// Central error shape used across the app
export type NormalizedError = {
  code?: string;
  status?: number;
  message: string;
  details?: any;
  isNetwork?: boolean;
  isAuth?: boolean;
  retriable?: boolean;
};

// Simple in-memory throttle to prevent duplicate error toasts spam
let lastToastKey: string | null = null;
let lastToastAt = 0;
const TOAST_DEDUP_WINDOW_MS = 1500;

function shouldSuppressToast(key: string): boolean {
  const now = Date.now();
  if (lastToastKey === key && now - lastToastAt < TOAST_DEDUP_WINDOW_MS) {
    return true;
  }
  lastToastKey = key;
  lastToastAt = now;
  return false;
}

/**
 * Normalize various error shapes (fetch/ApiResponse/Axios/strings) into a consistent object
 */
export function normalizeError(err: any, fallbackMessage = "An error occurred"): NormalizedError {
  // Already normalized
  if (err && typeof err === "object" && "message" in err && ("isNetwork" in err || "isAuth" in err || "retriable" in err)) {
    return err as NormalizedError;
  }

  // ApiResponse style: { success: false, error: { code, message, details } }
  if (err && typeof err === "object" && "success" in err && err.success === false && (err as any).error) {
    const e = (err as any).error || {};
    const code = e.code ?? undefined;
    const status = typeof e.status === "number" ? e.status : undefined;
    const message = e.message || fallbackMessage;
    return {
      code,
      status,
      message,
      details: e.details,
      isNetwork: code === "NETWORK_ERROR" || /network|timeout/i.test(String(message)),
      isAuth: code === "UNAUTHORIZED" || status === 401,
      retriable: !status || (status >= 500 || status === 429),
    };
  }

  // Axios-like error
  const axiosMessage = err?.response?.data?.error?.message || err?.response?.data?.message;
  const axiosCode = err?.response?.data?.error?.code || err?.code;
  const axiosStatus = err?.response?.status ?? err?.status;
  if (axiosMessage || axiosStatus) {
    const msg = axiosMessage || err?.message || fallbackMessage;
    return {
      code: axiosCode,
      status: typeof axiosStatus === "number" ? axiosStatus : undefined,
      message: msg,
      details: err?.response?.data?.error?.details || err?.response?.data?.details,
      isNetwork:
        axiosCode === "ECONNABORTED" || axiosCode === "NETWORK_ERROR" || /network|timeout/i.test(String(msg)),
      isAuth: axiosStatus === 401,
      retriable: !axiosStatus || axiosStatus >= 500 || axiosStatus === 429,
    };
  }

  // Fetch Response error-like
  if (err && typeof err === "object" && "ok" in err && "status" in err) {
    const status = (err as any).status as number;
    return {
      status,
      message: `HTTP ${status}`,
      isAuth: status === 401,
      retriable: status >= 500 || status === 429,
    };
  }

  // Plain Error
  if (err instanceof Error) {
    const msg = err.message || fallbackMessage;
    return {
      message: msg,
      isNetwork: /network|timeout|fetch/i.test(msg),
      retriable: /network|timeout/i.test(msg),
    };
  }

  // String or unknown
  if (typeof err === "string") {
    return { message: err };
  }
  return { message: fallbackMessage };
}

export interface ToastConfig {
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  duration?: number;
  position?: "top" | "bottom";
  onPress?: () => void;
}

// Toast functions that match the web application
export function showSuccessToast(
  message: string,
  title?: string,
  duration = 3000
) {
  const combined = title ? `${title}: ${message}` : message;
  if (Platform.OS === "web") {
    Alert.alert(title || "Success", message);
    return;
  }
  Toast.success(combined, duration);
}

export function showErrorToast(
  message: string,
  title?: string,
  duration = 4000
) {
  const combined = title ? `${title}: ${message}` : message;
  if (Platform.OS === "web") {
    Alert.alert(title || "Error", message);
    return;
  }
  // Use centralized error humanization + dedupe
  if (!shouldSuppressToast(`error:${combined}`)) {
    Toast.error(combined, undefined, duration);
  }
}

export function showInfoToast(
  message: string,
  title?: string,
  duration = 3000
) {
  const combined = title ? `${title}: ${message}` : message;
  if (Platform.OS === "web") {
    Alert.alert(title || "Info", message);
    return;
  }
  if (!shouldSuppressToast(`info:${combined}`)) {
    Toast.info(combined, duration);
  }
}

export function showWarningToast(
  message: string,
  title?: string,
  duration = 3500
) {
  const combined = title ? `${title}: ${message}` : message;
  if (Platform.OS === "web") {
    Alert.alert(title || "Warning", message);
    return;
  }
  if (!shouldSuppressToast(`warning:${combined}`)) {
    Toast.warning(combined, duration);
  }
}

export function showCustomToast(config: ToastConfig) {
  if (Platform.OS === "web") {
    Alert.alert(config.title || "Notification", config.message);
    return;
  }
  const text = config.title
    ? `${config.title}: ${config.message}`
    : config.message;
  if (!shouldSuppressToast(`${config.type}:${text}`)) {
    Toast.show(text, {
      type: config.type,
      durationMs: config.duration ?? 3000,
      position: config.position ?? "top",
      action: config.onPress
        ? { label: "Open", onPress: config.onPress }
        : undefined,
    });
  }
}

export function hideToast() {
  if (Platform.OS !== "web") {
    Toast.hide();
  }
}

function getDefaultTitle(type: ToastConfig["type"]): string {
  switch (type) {
    case "success":
      return "Success";
    case "error":
      return "Error";
    case "warning":
      return "Warning";
    case "info":
      return "Info";
    default:
      return "Notification";
  }
}

// Error handling utilities that match web application
export function handleApiError(
  error: any,
  defaultMessage = "An error occurred"
) {
  const normalized = normalizeError(error, defaultMessage);
  showErrorToast(normalized.message);
}

// Alias for convenience/semantics
export function showApiError(error: any, defaultMessage = "An error occurred") {
  return handleApiError(error, defaultMessage);
}

export function handleValidationErrors(errors: Record<string, string>) {
  const errorMessages = Object.values(errors);
  if (errorMessages.length > 0) {
    showErrorToast(errorMessages[0], "Validation Error");
  }
}

// Network error handling
export function handleNetworkError(error: any) {
  const n = normalizeError(error);
  if (n.isNetwork) {
    showErrorToast(
      "Please check your internet connection and try again",
      "Network Error"
    );
  } else {
    handleApiError(error);
  }
}

// Authentication error handling
export function handleAuthError(error: any) {
  const n = normalizeError(error);
  if (n.isAuth || error?.code === "TOKEN_EXPIRED" || error?.status === 401) {
    showErrorToast(
      "Your session has expired. Please login again",
      "Session Expired"
    );
  } else if (error?.code === "INVALID_CREDENTIALS") {
    showErrorToast("Invalid email or password", "Login Failed");
  } else {
    handleApiError(error, "Authentication failed");
  }
}

// Success message helpers
export function showProfileUpdateSuccess() {
  showSuccessToast("Your profile has been updated successfully");
}

export function showMessageSentSuccess() {
  showSuccessToast("Message sent successfully");
}

export function showInterestSentSuccess() {
  showSuccessToast("Interest sent successfully");
}

export function showMatchFoundSuccess(name?: string) {
  const message = name
    ? `You have a new match with ${name}!`
    : "You have a new match!";
  showSuccessToast(message, "New Match! 🎉");
}

export function showSubscriptionSuccess(plan: string) {
  showSuccessToast(`Successfully upgraded to ${plan}`, "Subscription Active");
}

// Warning message helpers
export function showFeatureLimitWarning(feature: string) {
  showWarningToast(
    `You've reached your ${feature} limit. Upgrade to Premium for unlimited access.`
  );
}

export function showSubscriptionExpiredWarning() {
  showWarningToast(
    "Your premium subscription has expired. Renew to continue enjoying premium features."
  );
}
