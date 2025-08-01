import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Colors } from "../constants/Colors";
import { Layout } from "../constants/Layout";

type Props = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
};

type State = {
  hasError: boolean;
  error?: Error | null;
  errorInfo?: React.ErrorInfo | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Hook for logging to monitoring service (Sentry, etc.)
    // Example:
    // Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    this.setState({ errorInfo });
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return <>{this.props.fallback}</>;
      }
      const message = this.state.error?.message ?? "Something went wrong.";
      const stack = this.state.errorInfo?.componentStack ?? "";

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.title}>Unexpected Error</Text>
            <Text style={styles.subtitle}>An unexpected error occurred while rendering the screen.</Text>
            <ScrollView style={styles.details} contentContainerStyle={{ padding: Layout.spacing.sm }}>
              <Text selectable style={styles.errorLabel}>Message</Text>
              <Text selectable style={styles.errorText}>{message}</Text>
              {!!stack && (
                <>
                  <Text selectable style={[styles.errorLabel, { marginTop: Layout.spacing.md }]}>Stack</Text>
                  <Text selectable style={[styles.errorText, { color: Colors.text.secondary }]}>{stack}</Text>
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.primary,
    padding: Layout.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    padding: Layout.spacing.lg,
  },
  title: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.xl,
    color: Colors.text.primary,
    textAlign: "center",
    marginBottom: Layout.spacing.xs,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    textAlign: "center",
    marginBottom: Layout.spacing.md,
  },
  details: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.primary,
    marginBottom: Layout.spacing.lg,
  },
  errorLabel: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
    fontWeight: "600",
  },
  errorText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.error[600] ?? Colors.error[500],
  },
  button: {
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.md,
    paddingVertical: Layout.spacing.md,
    alignItems: "center",
  },
  buttonText: {
    color: Colors.text.inverse,
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
  },
});