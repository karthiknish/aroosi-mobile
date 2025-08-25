import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Colors, Layout } from "../../constants";

interface InlineUpgradeBannerProps {
  message?: string;
  ctaLabel?: string;
  onPress?: () => void;
  style?: any;
}

export default function InlineUpgradeBanner({
  message = "Unlock this feature with Premium",
  ctaLabel = "Upgrade",
  onPress,
  style,
}: InlineUpgradeBannerProps) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.text}>{message}</Text>
      <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.buttonText}>{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Layout.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    backgroundColor: Colors.background.secondary,
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    borderRadius: Layout.radius.md,
  },
  text: {
    flex: 1,
    color: Colors.text.secondary,
    fontSize: Layout.typography.fontSize.sm,
  },
  button: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.xs,
    backgroundColor: Colors.primary[500],
    borderRadius: Layout.radius.full,
  },
  buttonText: {
    color: Colors.background.primary,
    fontSize: Layout.typography.fontSize.sm,
    fontWeight: Layout.typography.fontWeight.bold,
  },
});
