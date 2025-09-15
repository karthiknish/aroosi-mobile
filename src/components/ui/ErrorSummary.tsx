import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Layout } from "@constants";
import { useThemedStyles } from "@contexts/ThemeContext";

export interface ErrorSummaryProps {
  errors: Record<string, string>;
  title?: string;
  testID?: string;
}

/**
 * Compact error summary similar to web ErrorSummary.
 * Renders when there are one or more field errors in the current step.
 */
export const ErrorSummary: React.FC<ErrorSummaryProps> = ({
  errors,
  title = "Please fix the following",
  testID,
}) => {
  const entries = Object.entries(errors).filter(([, v]) => !!v);
  const styles = useThemedStyles((t) =>
    StyleSheet.create({
      container: {
        borderWidth: 1,
        borderColor: t.colors.error[300],
        backgroundColor: t.colors.error[50],
        borderRadius: Layout.radius.md,
        padding: Layout.spacing.md,
        marginBottom: Layout.spacing.lg,
      },
      title: {
        color: t.colors.error[700],
        fontWeight: "600",
        marginBottom: Layout.spacing.xs,
        fontSize: Layout.typography?.fontSize?.base ?? 14,
      },
      list: {
        gap: Layout.spacing.xs,
      },
      item: {
        color: t.colors.error[700],
        fontSize: Layout.typography?.fontSize?.sm ?? 12,
      },
      more: {
        color: t.colors.error[600],
        marginTop: Layout.spacing.xs,
        fontSize: Layout.typography?.fontSize?.sm ?? 12,
      },
    })
  );

  if (entries.length === 0) return null;

  return (
    <View style={styles.container} testID={testID ?? "error-summary"}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.list}>
        {entries.slice(0, 6).map(([field, message]) => (
          <Text key={field} style={styles.item}>
            • {message}
          </Text>
        ))}
        {entries.length > 6 ? (
          <Text style={styles.more}>…and {entries.length - 6} more</Text>
        ) : null}
      </View>
    </View>
  );
};


export default ErrorSummary;