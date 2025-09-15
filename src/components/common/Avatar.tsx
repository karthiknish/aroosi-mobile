import React from "react";
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from "react-native";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  uri?: string | null;
  name?: string;
  fallback?: string; // fallback text like initials
  size?: AvatarSize;
  showPresence?: boolean;
  isOnline?: boolean;
  style?: ViewStyle;
  imageStyle?: ImageStyle;
  accessibilityLabel?: string;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

export default function Avatar({
  uri,
  name,
  fallback,
  size = "lg",
  showPresence,
  isOnline,
  style,
  imageStyle,
  accessibilityLabel,
}: AvatarProps) {
  const { theme } = useTheme();
  const dimension = sizeMap[size];
  const initials = React.useMemo(() => {
    if (fallback && fallback.trim().length) return fallback.trim().slice(0, 2).toUpperCase();
    if (!name) return "?";
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0];
    const second = parts[1]?.[0];
    return `${(first || "?").toUpperCase()}${second ? second.toUpperCase() : ""}`;
  }, [name, fallback]);

  const imageDimStyle: ImageStyle = {
    width: dimension,
    height: dimension,
    borderRadius: Layout.radius.full,
  };

  const presenceSize = Math.max(10, Math.round(dimension * 0.28));

  return (
    <View style={[styles.container, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[imageDimStyle, styles.image, imageStyle]}
          accessibilityLabel={accessibilityLabel || `${name || initials} avatar`}
        />
      ) : (
        <View style={[imageDimStyle, styles.fallback, { justifyContent: "center", alignItems: "center", backgroundColor: theme.colors.primary[100] }]}
              accessibilityLabel={accessibilityLabel || `${name || initials} avatar`}>
          <Text style={[styles.initials, { color: theme.colors.primary[600], fontSize: Math.round(dimension * 0.4) }]}>{initials}</Text>
        </View>
      )}

      {showPresence ? (
        <View
          style={[
            styles.presence,
            {
              width: presenceSize,
              height: presenceSize,
              borderRadius: presenceSize / 2,
              backgroundColor: isOnline ? theme.colors.success[500] : theme.colors.border.secondary,
              borderColor: theme.colors.background.primary,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    borderRadius: Layout.radius.full,
  },
  fallback: {
    borderRadius: Layout.radius.full,
  },
  initials: {
    fontWeight: Layout.typography.fontWeight.bold,
  },
  presence: {
    position: "absolute",
    bottom: 2,
    right: 2,
    borderWidth: 2,
  },
});
