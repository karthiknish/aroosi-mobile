import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants";
import HapticPressable from "@/components/ui/HapticPressable";

export interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onPressBack?: () => void;
  rightActions?: React.ReactNode;
  style?: ViewStyle;
}

export default function AppHeader({
  title,
  subtitle,
  onPressBack,
  rightActions,
  style,
}: AppHeaderProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.background.primary,
          borderBottomColor: theme.colors.border.primary,
        },
        style,
      ]}
    >
      {onPressBack ? (
        <HapticPressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.left}
          onPress={onPressBack}
          haptic="selection"
        >
          <Text style={[styles.backText, { color: theme.colors.primary[600] }]}>←</Text>
        </HapticPressable>
      ) : (
        <View style={styles.left} />
      )}

      <View style={styles.center}>
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        {rightActions}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.md,
    borderBottomWidth: 1,
  },
  left: {
    padding: Layout.spacing.sm,
  },
  backText: {
    fontSize: Layout.typography.fontSize.xl,
    fontWeight: Layout.typography.fontWeight.medium,
  },
  center: {
    flex: 1,
    marginHorizontal: Layout.spacing.sm,
  },
  title: {
    fontFamily: Layout.typography.fontFamily.serif,
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: Layout.typography.fontWeight.bold,
  },
  subtitle: {
    marginTop: 2,
    fontSize: Layout.typography.fontSize.xs,
  },
  right: {
    flexDirection: "row",
    gap: Layout.spacing.sm,
    alignItems: "center",
  },
});
