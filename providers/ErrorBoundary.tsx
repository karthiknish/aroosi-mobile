import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "../constants/Layout";
import { Sentry } from "@/utils/sentry";

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
    try {
      Sentry.captureException(error, {
        extra: { componentStack: errorInfo?.componentStack },
      } as any);
    } catch {}
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
        <ThemedErrorView
          message={message}
          stack={stack}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children as React.ReactElement;
  }
}

const ThemedErrorView = ({
  message,
  stack,
  onReset,
}: {
  message: string;
  stack: string;
  onReset: () => void;
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background.primary,
        padding: Layout.spacing.lg,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: "100%",
          backgroundColor: theme.colors.background.secondary,
          borderRadius: Layout.radius.lg,
          borderWidth: 1,
          borderColor: theme.colors.border.primary,
          padding: Layout.spacing.lg,
        }}
      >
        <Text
          style={{
            fontFamily: Layout.typography.fontFamily.serif,
            fontSize: Layout.typography.fontSize.xl,
            color: theme.colors.text.primary,
            textAlign: "center",
            marginBottom: Layout.spacing.xs,
            fontWeight: "600",
          }}
        >
          Unexpected Error
        </Text>
        <Text
          style={{
            fontSize: Layout.typography.fontSize.base,
            color: theme.colors.text.secondary,
            textAlign: "center",
            marginBottom: Layout.spacing.md,
          }}
        >
          An unexpected error occurred while rendering the screen.
        </Text>
        <ScrollView
          style={{
            maxHeight: 220,
            borderWidth: 1,
            borderColor: theme.colors.border.primary,
            borderRadius: Layout.radius.md,
            backgroundColor: theme.colors.background.primary,
            marginBottom: Layout.spacing.lg,
          }}
          contentContainerStyle={{ padding: Layout.spacing.sm }}
        >
          <Text
            selectable
            style={{
              fontSize: Layout.typography.fontSize.sm,
              color: theme.colors.text.secondary,
              marginBottom: Layout.spacing.xs,
              fontWeight: "600",
            }}
          >
            Message
          </Text>
          <Text
            selectable
            style={{
              fontSize: Layout.typography.fontSize.sm,
              color: theme.colors.error[600] ?? theme.colors.error[500],
            }}
          >
            {message}
          </Text>
          {!!stack && (
            <>
              <Text
                selectable
                style={{
                  fontSize: Layout.typography.fontSize.sm,
                  color: theme.colors.text.secondary,
                  marginTop: Layout.spacing.md,
                  marginBottom: Layout.spacing.xs,
                  fontWeight: "600",
                }}
              >
                Stack
              </Text>
              <Text
                selectable
                style={{
                  fontSize: Layout.typography.fontSize.sm,
                  color: theme.colors.text.secondary,
                }}
              >
                {stack}
              </Text>
            </>
          )}
        </ScrollView>
        <TouchableOpacity
          style={{
            backgroundColor: theme.colors.primary[500],
            borderRadius: Layout.radius.md,
            paddingVertical: Layout.spacing.md,
            alignItems: "center",
          }}
          onPress={onReset}
        >
          <Text
            style={{
              color: theme.colors.text.inverse,
              fontSize: Layout.typography.fontSize.base,
              fontWeight: "600",
            }}
          >
            Try Again
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};