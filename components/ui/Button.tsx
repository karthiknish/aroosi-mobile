import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Layout } from '../../constants';
import { useResponsiveSpacing, useResponsiveTypography } from '../../hooks/useResponsive';

// Helper functions for responsive button styles
const getResponsiveButtonStyle = (size: 'sm' | 'md' | 'lg', spacing: any) => {
  const sizeMap = {
    sm: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 36,
    },
    md: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      minHeight: 44,
    },
    lg: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.lg,
      minHeight: 52,
    },
  };
  return sizeMap[size];
};

const getResponsiveTextStyle = (size: 'sm' | 'md' | 'lg', fontSize: any) => {
  const sizeMap = {
    sm: {
      fontSize: fontSize.sm,
    },
    md: {
      fontSize: fontSize.base,
    },
    lg: {
      fontSize: fontSize.lg,
    },
  };
  return sizeMap[size];
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: 'button' | 'link';
  enableHaptics?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  enableHaptics = true,
  hapticType = 'light',
}: ButtonProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const buttonStyles = [
    styles.base,
    styles[variant],
    getResponsiveButtonStyle(size, spacing),
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`] as TextStyle,
    getResponsiveTextStyle(size, fontSize),
    (disabled || loading) && styles.disabledText,
    textStyle,
  ];

  const triggerHapticFeedback = () => {
    if (!enableHaptics) return;
    
    switch (hapticType) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      triggerHapticFeedback();
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'primary' ? Colors.text.inverse : Colors.primary[500]}
          />
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <View style={styles.iconLeft}>{icon}</View>
            )}
            <Text style={textStyles}>{title}</Text>
            {icon && iconPosition === 'right' && (
              <View style={styles.iconRight}>{icon}</View>
            )}
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Layout.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.primary[500],
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: Colors.neutral[100],
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary[500],
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  danger: {
    backgroundColor: Colors.error[500],
    borderWidth: 0,
  },
  
  // Sizes
  sm: {
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: 36,
  },
  md: {
    paddingHorizontal: Layout.spacing.lg,
    paddingVertical: Layout.spacing.md,
    minHeight: 44,
  },
  lg: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.lg,
    minHeight: 52,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Content
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Text styles
  text: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontWeight: Layout.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  
  // Text variants
  primaryText: {
    color: Colors.text.inverse,
  },
  secondaryText: {
    color: Colors.text.primary,
  },
  outlineText: {
    color: Colors.primary[500],
  },
  ghostText: {
    color: Colors.primary[500],
  },
  dangerText: {
    color: Colors.text.inverse,
  },
  
  // Text sizes
  smText: {
    fontSize: Layout.typography.fontSize.sm,
    lineHeight: Layout.typography.lineHeight.sm,
  },
  mdText: {
    fontSize: Layout.typography.fontSize.base,
    lineHeight: Layout.typography.lineHeight.base,
  },
  lgText: {
    fontSize: Layout.typography.fontSize.lg,
    lineHeight: Layout.typography.lineHeight.lg,
  },
  
  disabledText: {
    opacity: 0.7,
  },
  
  // Icons
  iconLeft: {
    marginRight: Layout.spacing.sm,
  },
  iconRight: {
    marginLeft: Layout.spacing.sm,
  },
});