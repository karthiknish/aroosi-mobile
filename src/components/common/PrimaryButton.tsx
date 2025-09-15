import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants";

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export default function PrimaryButton({ title, onPress, disabled, style }: PrimaryButtonProps) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[
        styles.button,
        { backgroundColor: disabled ? theme.colors.neutral[300] : theme.colors.primary[500] },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={[styles.text, { color: theme.colors.text.inverse }]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
  },
});
