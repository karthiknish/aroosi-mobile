import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ViewStyle,
  StyleProp,
  AlertButton,
} from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@hooks/useResponsive";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>;
}

interface ErrorDisplayProps {
  error?: Error | string;
  onRetry?: () => void;
  onDismiss?: () => void;
  title?: string;
  style?: StyleProp<ViewStyle>;
}

interface ApiErrorProps {
  error: any;
  onRetry?: () => void;
  showDetails?: boolean;
}

// Error Boundary Component
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error Boundary caught an error:", error, errorInfo);
    // You can log to crash reporting service here
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}

// Default Error Fallback Component
const DefaultErrorFallback: React.FC<{
  error?: Error;
  resetError: () => void;
}> = ({ error, resetError }) => {
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const styles = StyleSheet.create({
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    errorIcon: {
      fontSize: fontSize["4xl"],
      marginBottom: spacing.md,
    },
    errorTitle: {
      fontSize: fontSize["2xl"],
      fontWeight: "600",
      textAlign: "center",
      marginBottom: spacing.sm + spacing.xs,
    },
    errorMessage: {
      fontSize: fontSize.base,
      textAlign: "center",
      lineHeight: fontSize.base * 1.5,
      marginBottom: spacing.lg,
    },
    retryButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + spacing.xs,
      borderRadius: spacing.sm,
      minWidth: spacing.xl * 3.75,
    },
    retryButtonText: {
      color: "#fff",
      fontSize: fontSize.base,
      fontWeight: "600",
      textAlign: "center",
    },
  });

  return (
    <View
      style={[
        styles.errorContainer,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <Text style={styles.errorIcon}>⚠️</Text>
      <Text style={[styles.errorTitle, { color: theme.colors.text.primary }]}>
        Something went wrong
      </Text>
      <Text
        style={[styles.errorMessage, { color: theme.colors.text.secondary }]}
      >
        {error?.message || "An unexpected error occurred. Please try again."}
      </Text>
      <TouchableOpacity
        style={[
          styles.retryButton,
          { backgroundColor: theme.colors.primary[500] },
        ]}
        onPress={resetError}
      >
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );
};

// General Error Display Component
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  title = "Error",
  style,
}) => {
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const errorMessage =
    typeof error === "string"
      ? error
      : error?.message || "An unexpected error occurred";

  const styles = StyleSheet.create({
    errorDisplay: {
      margin: spacing.md,
    },
    errorCard: {
      padding: spacing.md,
      borderRadius: spacing.sm + spacing.xs,
      borderLeftWidth: 4,
      borderLeftColor: "#B45E5E",
    },
    errorDisplayTitle: {
      fontSize: fontSize.lg,
      fontWeight: "600",
      marginBottom: spacing.sm,
    },
    errorDisplayMessage: {
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      marginBottom: spacing.sm + spacing.xs,
    },
    errorActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    errorActionButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: spacing.xs + 2,
      flex: 1,
    },
    errorActionText: {
      color: "#fff",
      fontSize: fontSize.sm,
      fontWeight: "600",
      textAlign: "center",
    },
  });

  return (
    <View style={[styles.errorDisplay, style]}>
      <View
        style={[
          styles.errorCard,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <Text
          style={[styles.errorDisplayTitle, { color: theme.colors.error[500] }]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.errorDisplayMessage,
            { color: theme.colors.text.secondary },
          ]}
        >
          {errorMessage}
        </Text>
        <View style={styles.errorActions}>
          {onRetry && (
            <TouchableOpacity
              style={[
                styles.errorActionButton,
                { backgroundColor: theme.colors.primary[500] },
              ]}
              onPress={onRetry}
            >
              <Text style={styles.errorActionText}>Retry</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity
              style={[
                styles.errorActionButton,
                { backgroundColor: theme.colors.neutral[400] },
              ]}
              onPress={onDismiss}
            >
              <Text style={styles.errorActionText}>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

// API Error Component
export const ApiErrorDisplay: React.FC<ApiErrorProps> = ({
  error,
  onRetry,
  showDetails = false,
}) => {
  const { theme } = useTheme();

  const getErrorMessage = (error: any): string => {
    if (typeof error === "string") return error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.message) return error.message;
    if (error?.status === 401) return "Please sign in again to continue";
    if (error?.status === 403)
      return "You don't have permission to access this";
    if (error?.status === 404) return "The requested resource was not found";
    if (error?.status === 500) return "Server error. Please try again later";
    if (error?.status >= 400) return "Something went wrong. Please try again";
    return "Network error. Please check your connection";
  };

  const getErrorTitle = (error: any): string => {
    if (error?.status === 401) return "Authentication Required";
    if (error?.status === 403) return "Access Denied";
    if (error?.status === 404) return "Not Found";
    if (error?.status >= 500) return "Server Error";
    if (error?.status >= 400) return "Request Error";
    return "Connection Error";
  };

  return (
    <ErrorDisplay
      title={getErrorTitle(error)}
      error={getErrorMessage(error)}
      onRetry={onRetry}
    />
  );
};

// Error Alert Helper
export const showErrorAlert = (
  error: any,
  title: string = "Error",
  onRetry?: () => void
) => {
  const message =
    typeof error === "string"
      ? error
      : error?.message || "An unexpected error occurred";

  const buttons: AlertButton[] = [{ text: "OK", style: "default" }];

  if (onRetry) {
    buttons.unshift({ text: "Try Again", onPress: onRetry });
  }

  Alert.alert(title, message, buttons);
};

// Network Error Component
export const NetworkErrorDisplay: React.FC<{ onRetry?: () => void }> = ({
  onRetry,
}) => {
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const styles = StyleSheet.create({
    networkErrorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.xl,
    },
    networkErrorIcon: {
      fontSize: fontSize["4xl"],
      marginBottom: spacing.md,
      opacity: 0.6,
    },
    networkErrorTitle: {
      fontSize: fontSize.xl,
      fontWeight: "600",
      textAlign: "center",
      marginBottom: spacing.sm,
    },
    networkErrorMessage: {
      fontSize: fontSize.base,
      textAlign: "center",
      lineHeight: fontSize.base * 1.5,
      marginBottom: spacing.lg,
    },
    retryButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm + spacing.xs,
      borderRadius: spacing.sm,
      minWidth: spacing.xl * 3.75,
    },
    retryButtonText: {
      color: "#fff",
      fontSize: fontSize.base,
      fontWeight: "600",
      textAlign: "center",
    },
  });

  return (
    <View
      style={[
        styles.networkErrorContainer,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <Text style={styles.networkErrorIcon}>📶</Text>
      <Text
        style={[styles.networkErrorTitle, { color: theme.colors.text.primary }]}
      >
        No Internet Connection
      </Text>
      <Text
        style={[
          styles.networkErrorMessage,
          { color: theme.colors.text.secondary },
        ]}
      >
        Please check your internet connection and try again.
      </Text>
      {onRetry && (
        <TouchableOpacity
          style={[
            styles.retryButton,
            { backgroundColor: theme.colors.primary[500] },
          ]}
          onPress={onRetry}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// Validation Error Component
export const ValidationErrorDisplay: React.FC<{ errors: string[] }> = ({ errors }) => {
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  if (errors.length === 0) return null;

  const styles = StyleSheet.create({
    validationContainer: {
      margin: spacing.md,
      padding: spacing.md,
      borderRadius: spacing.sm,
      borderWidth: 1,
      borderColor: "#B45E5E",
    },
    validationTitle: {
      fontSize: fontSize.base,
      fontWeight: "600",
      marginBottom: spacing.sm,
    },
    validationError: {
      fontSize: fontSize.sm,
      lineHeight: fontSize.sm * 1.4,
      marginBottom: spacing.xs,
    },
  });

  return (
    <View
      style={[
        styles.validationContainer,
        { backgroundColor: theme.colors.error[50] },
      ]}
    >
      <Text
        style={[styles.validationTitle, { color: theme.colors.error[500] }]}
      >
        Please fix the following errors:
      </Text>
      {errors.map((error, index) => (
        <Text
          key={index}
          style={[styles.validationError, { color: theme.colors.error[500] }]}
        >
          • {error}
        </Text>
      ))}
    </View>
  );
};


