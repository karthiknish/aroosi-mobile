import React from "react";
import {
  TouchableOpacity,
  TouchableNativeFeedback,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import { PlatformDesign, PlatformUtils, Colors, Layout } from "../../constants";

interface PlatformButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  style?: ViewStyle;
  textStyle?: TextStyle;
  rippleColor?: string;
  hapticFeedback?: boolean;
}

export default function PlatformButton({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  iconPosition = "left",
  style,
  textStyle,
  rippleColor,
  hapticFeedback = true,
}: PlatformButtonProps) {
  const handlePress = () => {
    if (disabled || loading) return;

    // Add haptic feedback
    if (hapticFeedback) {
      if (Platform.OS === "ios") {
        const { Haptics } = require("expo-haptics");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }

    onPress();
  };

  const getButtonStyles = () => {
    const baseStyle = {
      height: PlatformDesign.button?.height ?? Layout.spacing.xl,
      borderRadius: PlatformDesign.radius?.button ?? Layout.radius.md,
      paddingHorizontal:
        PlatformDesign.button?.padding?.horizontal ?? Layout.spacing.md,
      paddingVertical:
        PlatformDesign.button?.padding?.vertical ?? Layout.spacing.sm,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      ...(PlatformDesign.shadows?.small || {}),
    };

    const sizeStyles = {
      sm: {
        height: PlatformUtils.getValue(36, 32),
        paddingHorizontal: Layout.spacing.md,
      },
      md: {
        height: PlatformDesign.button?.height ?? Layout.spacing.xl,
      },
      lg: {
        height: PlatformUtils.getValue(56, 52),
        paddingHorizontal: Layout.spacing.xl,
      },
    };

    const variantStyles = {
      primary: {
        backgroundColor: disabled
          ? Colors.neutral[300]
          : PlatformDesign.colors?.primary ?? Colors.primary[500],
        ...(!Platform.OS !== ("android" as any) &&
          PlatformDesign.shadows?.small),
      },
      secondary: {
        backgroundColor: disabled ? Colors.neutral[100] : Colors.neutral[200],
        borderWidth: Platform.select({ ios: 1, android: 0 }),
        borderColor: Colors.neutral[300],
      },
      outline: {
        backgroundColor: "transparent",
        borderWidth: PlatformUtils.getValue(1, 2),
        borderColor: disabled
          ? Colors.neutral[300]
          : PlatformDesign.colors?.primary ?? Colors.primary[500],
      },
      ghost: {
        backgroundColor: "transparent",
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    };
  };

  const getTextStyles = () => {
    const baseTextStyle = {
      fontSize:
        Layout.typography.fontSize.base *
        (PlatformDesign.typography?.scale ?? 1),
      fontWeight:
        PlatformDesign.typography?.fontWeight?.medium ??
        Layout.typography.fontWeight.medium,
      textAlign: "center" as const,
    };

    const sizeTextStyles = {
      sm: {
        fontSize:
          Layout.typography.fontSize.sm *
          (PlatformDesign.typography?.scale ?? 1),
      },
      md: {
        fontSize:
          Layout.typography.fontSize.base *
          (PlatformDesign.typography?.scale ?? 1),
      },
      lg: {
        fontSize:
          Layout.typography.fontSize.lg *
          (PlatformDesign.typography?.scale ?? 1),
      },
    };

    const variantTextStyles = {
      primary: {
        color: disabled ? Colors.neutral[500] : Colors.background.primary,
      },
      secondary: {
        color: disabled ? Colors.neutral[400] : Colors.text.primary,
      },
      outline: {
        color: disabled
          ? Colors.neutral[400]
          : PlatformDesign.colors?.primary ?? Colors.primary[500],
      },
      ghost: {
        color: disabled
          ? Colors.neutral[400]
          : PlatformDesign.colors?.primary ?? Colors.primary[500],
      },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
    };
  };

  const renderContent = () => (
    <>
      {loading && (
        <ActivityIndicator
          size="small"
          color={
            variant === "primary"
              ? Colors.background.primary
              : PlatformDesign.colors?.primary ?? Colors.primary[500]
          }
          style={[(icon ? { marginRight: Layout.spacing.sm } : null) as any]}
        />
      )}
      {!loading && icon && iconPosition === "left" && (
        <View style={[{ marginRight: Layout.spacing.sm }]}>{icon}</View>
      )}
      {!loading && (
        <Text style={[getTextStyles() as any, textStyle]}>{title}</Text>
      )}
      {!loading && icon && iconPosition === "right" && (
        <View style={[{ marginLeft: Layout.spacing.sm }]}>{icon}</View>
      )}
    </>
  );

  const buttonStyle = [getButtonStyles(), style];

  // Use TouchableNativeFeedback on Android for Material Design ripple
  if (Platform.OS === "android" && !disabled) {
    const background = TouchableNativeFeedback.Ripple(
      rippleColor ||
        (variant === "primary" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.1)"),
      false
    );

    return (
      <View style={[buttonStyle, { overflow: "hidden" }]}>
        <TouchableNativeFeedback
          onPress={handlePress}
          background={background}
          disabled={disabled || loading}
        >
          <View style={styles.androidButtonContent}>{renderContent()}</View>
        </TouchableNativeFeedback>
      </View>
    );
  }

  // Use TouchableOpacity on iOS for native feel
  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {renderContent()}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  androidButtonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
  },
});
