import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";

interface FormButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  size?: "small" | "medium" | "large";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: any;
  textStyle?: any;
  icon?: React.ReactNode;
}

export function FormButton({
  title,
  onPress,
  variant = "primary",
  size = "medium",
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
  icon,
}: FormButtonProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const isDisabled = disabled || loading;

  const styles = StyleSheet.create({
    button: {
      borderRadius: spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
    },
    fullWidth: {
      width: "100%",
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    icon: {
      marginRight: spacing.sm,
    },

    // Sizes
    small: {
      paddingHorizontal: spacing.sm + spacing.xs,
      paddingVertical: spacing.sm,
      minHeight: spacing.xl + spacing.xs,
    },
    medium: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + spacing.xs,
      minHeight: spacing.xl + spacing.sm + spacing.xs,
    },
    large: {
      paddingHorizontal: spacing.lg - spacing.xs,
      paddingVertical: spacing.md,
      minHeight: spacing.xl + spacing.lg,
    },

    // Variants
    primary: {
      backgroundColor: Colors.primary[500],
    },
    secondary: {
      backgroundColor: Colors.gray[600],
    },
    outline: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: Colors.primary[500],
    },
    danger: {
      backgroundColor: Colors.error[500],
    },
    disabled: {
      backgroundColor: Colors.gray[300],
    },

    // Text styles
    text: {
      fontWeight: "600",
      textAlign: "center",
      fontFamily: "NunitoSans-SemiBold",
    },
    smallText: {
      fontSize: fontSize.sm,
    },
    mediumText: {
      fontSize: fontSize.base,
    },
    largeText: {
      fontSize: fontSize.lg,
    },

    // Text variants
    primaryText: {
      color: Colors.text.inverse,
    },
    secondaryText: {
      color: Colors.text.inverse,
    },
    outlineText: {
      color: Colors.primary[500],
    },
    dangerText: {
      color: Colors.text.inverse,
    },
    disabledText: {
      color: Colors.gray[500],
    },
  });

  const getButtonStyle = () => {
    const baseStyle: any[] = [styles.button];

    // Add size styles
    if (size === "small") baseStyle.push(styles.small);
    else if (size === "medium") baseStyle.push(styles.medium);
    else if (size === "large") baseStyle.push(styles.large);

    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    if (isDisabled) {
      baseStyle.push(styles.disabled);
    } else {
      // Add variant styles
      if (variant === "primary") baseStyle.push(styles.primary);
      else if (variant === "secondary") baseStyle.push(styles.secondary);
      else if (variant === "outline") baseStyle.push(styles.outline);
      else if (variant === "danger") baseStyle.push(styles.danger);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle: any[] = [styles.text];

    // Add size text styles
    if (size === "small") baseStyle.push(styles.smallText);
    else if (size === "medium") baseStyle.push(styles.mediumText);
    else if (size === "large") baseStyle.push(styles.largeText);

    if (isDisabled) {
      baseStyle.push(styles.disabledText);
    } else {
      // Add variant text styles
      if (variant === "primary") baseStyle.push(styles.primaryText);
      else if (variant === "secondary") baseStyle.push(styles.secondaryText);
      else if (variant === "outline") baseStyle.push(styles.outlineText);
      else if (variant === "danger") baseStyle.push(styles.dangerText);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style].flat()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={
            variant === "outline" ? Colors.primary[500] : Colors.text.inverse
          }
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[getTextStyle(), textStyle].flat()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}


