import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useTheme } from "@contexts/ThemeContext";
import { Layout } from "@constants";
import useResponsiveSpacing from "@/hooks/useResponsive";
import { BottomSheet } from "@/components/ui/BottomSheet";

type HintPopoverProps = {
  hint: string;
  label?: string;
  title?: string;
  disabled?: boolean;
};

export default function HintPopover({
  hint,
  label = "ⓘ",
  title = "Why is this disabled?",
  disabled,
}: HintPopoverProps) {
  const { theme } = useTheme();
  const { spacing } = useResponsiveSpacing();
  const [open, setOpen] = useState(false);

  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <TouchableOpacity
        accessibilityLabel="open-hint"
        onPress={() => setOpen(true)}
        disabled={disabled}
        style={{
          paddingHorizontal: spacing.xs,
          paddingVertical: 2,
          marginHorizontal: spacing.xs,
          borderRadius: Layout.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border.primary,
          backgroundColor: theme.colors.background.secondary,
        }}
      >
        <Text style={{ color: theme.colors.text.secondary }}>{label}</Text>
      </TouchableOpacity>

      <BottomSheet
        isVisible={open}
        onClose={() => setOpen(false)}
        title={title}
        height={220}
      >
        <View style={{ paddingVertical: spacing.md }}>
          <Text style={{ color: theme.colors.text.primary, lineHeight: 20 }}>
            {hint}
          </Text>
        </View>
      </BottomSheet>
    </View>
  );
}
