import { Alert, Platform } from "react-native";
import Toast from "react-native-toast-message";

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
  if (Platform.OS === "web") {
    // Fallback for web
    Alert.alert(title || "Success", message);
    return;
  }

  Toast.show({
    type: "success",
    text1: title || "Success",
    text2: message,
    visibilityTime: duration,
    position: "top",
  });
}

export function showErrorToast(
  message: string,
  title?: string,
  duration = 4000
) {
  if (Platform.OS === "web") {
    // Fallback for web
    Alert.alert(title || "Error", message);
    return;
  }

  Toast.show({
    type: "error",
    text1: title || "Error",
    text2: message,
    visibilityTime: duration,
    position: "top",
  });
}

export function showInfoToast(
  message: string,
  title?: string,
  duration = 3000
) {
  if (Platform.OS === "web") {
    // Fallback for web
    Alert.alert(title || "Info", message);
    return;
  }

  Toast.show({
    type: "info",
    text1: title || "Info",
    text2: message,
    visibilityTime: duration,
    position: "top",
  });
}

export function showWarningToast(
  message: string,
  title?: string,
  duration = 3500
) {
  if (Platform.OS === "web") {
    // Fallback for web
    Alert.alert(title || "Warning", message);
    return;
  }

  Toast.show({
    type: "warning",
    text1: title || "Warning",
    text2: message,
    visibilityTime: duration,
    position: "top",
  });
}

export function showCustomToast(config: ToastConfig) {
  if (Platform.OS === "web") {
    // Fallback for web
    Alert.alert(config.title || "Notification", config.message);
    return;
  }

  Toast.show({
    type: config.type,
    text1: config.title || getDefaultTitle(config.type),
    text2: config.message,
    visibilityTime: config.duration || 3000,
    position: config.position || "top",
    onPress: config.onPress,
  });
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
  let message = defaultMessage;

  if (error?.response?.data?.error?.message) {
    message = error.response.data.error.message;
  } else if (error?.message) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  }

  showErrorToast(message);
}

export function handleValidationErrors(errors: Record<string, string>) {
  const errorMessages = Object.values(errors);
  if (errorMessages.length > 0) {
    showErrorToast(errorMessages[0], "Validation Error");
  }
}

// Network error handling
export function handleNetworkError(error: any) {
  if (error?.code === "NETWORK_ERROR" || error?.message?.includes("Network")) {
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
  if (error?.code === "TOKEN_EXPIRED" || error?.status === 401) {
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
