import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { Colors } from "../../constants/Colors";

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
  const isDisabled = disabled || loading;

  const getButtonStyle = () => {
    const baseStyle = [styles.button, styles[size]];

    if (fullWidth) {
      baseStyle.push(styles.fullWidth);
    }

    if (isDisabled) {
      baseStyle.push(styles.disabled);
    } else {
      baseStyle.push(styles[variant]);
    }

    return baseStyle;
  };

  const getTextStyle = () => {
    const baseStyle = [styles.text, styles[`${size}Text`]];

    if (isDisabled) {
      baseStyle.push(styles.disabledText);
    } else {
      baseStyle.push(styles[`${variant}Text`]);
    }

    return baseStyle;
  };

  return (
    <TouchableOpacity
      style={[...getButtonStyle(), style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "outline" ? Colors.primary[500] : Colors.white}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[...getTextStyle(), textStyle]}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
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
    marginRight: 8,
  },

  // Sizes
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
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
    backgroundColor: Colors.red[500],
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
    fontSize: 14,
  },
  mediumText: {
    fontSize: 16,
  },
  largeText: {
    fontSize: 18,
  },

  // Text variants
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.white,
  },
  outlineText: {
    color: Colors.primary[500],
  },
  dangerText: {
    color: Colors.white,
  },
  disabledText: {
    color: Colors.gray[500],
  },
});
