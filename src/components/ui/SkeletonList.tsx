import React from "react";
import { View } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants";
import { SkeletonLoading } from "./LoadingStates";

interface SkeletonListProps {
  rows?: number;
  avatarSize?: number;
}

export default function SkeletonList({ rows = 8, avatarSize = 50 }: SkeletonListProps) {
  const { theme } = useTheme();
  return (
    <View style={{ paddingHorizontal: Layout.spacing.lg }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.colors.background.secondary,
            borderRadius: Layout.radius.lg,
            padding: Layout.spacing.lg,
            marginBottom: Layout.spacing.md,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <SkeletonLoading width={avatarSize} height={avatarSize} borderRadius={avatarSize / 2} />
            <View style={{ marginLeft: Layout.spacing.md }}>
              <SkeletonLoading width={140} height={14} style={{ marginBottom: 8 }} />
              <SkeletonLoading width={90} height={12} />
            </View>
          </View>
          <SkeletonLoading width={90} height={28} borderRadius={8} />
        </View>
      ))}
    </View>
  );
}
