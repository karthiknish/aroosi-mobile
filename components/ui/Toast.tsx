import React, { useEffect, useRef } from 'react';
import {
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { Layout } from '../../constants/Layout';
import { useTheme } from "@contexts/ThemeContext";

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  duration?: number;
  onHide?: () => void;
  visible: boolean;
  position?: 'top' | 'bottom';
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type,
  duration = 3000,
  onHide,
  visible,
  position = 'top',
}) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      showToast();
      const timer = setTimeout(() => {
        hideToast();
      }, duration);
      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const showToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: position === 'top' ? -100 : 100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  const getToastConfig = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: theme.colors.success[500],
          icon: "checkmark-circle" as const,
          iconColor: theme.colors.text.inverse,
        };
      case 'error':
        return {
          backgroundColor: theme.colors.error[500],
          icon: "close-circle" as const,
          iconColor: theme.colors.text.inverse,
        };
      case 'warning':
        return {
          backgroundColor: theme.colors.warning[500],
          icon: "warning" as const,
          iconColor: theme.colors.text.inverse,
        };
      case 'info':
        return {
          backgroundColor: theme.colors.primary[500],
          icon: "information-circle" as const,
          iconColor: theme.colors.text.inverse,
        };
      default:
        return {
          backgroundColor: theme.colors.primary[500],
          icon: "information-circle" as const,
          iconColor: theme.colors.text.inverse,
        };
    }
  };

  const config = getToastConfig();

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: config.backgroundColor,
          shadowColor: theme.colors.neutral[900],
          top: position === "top" ? Layout.safeArea.top + 10 : undefined,
          bottom:
            position === "bottom" ? Layout.safeArea.bottom + 10 : undefined,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.content}
        onPress={hideToast}
        activeOpacity={0.9}
      >
        <Ionicons
          name={config.icon}
          size={Layout.getResponsiveFontSize(24)}
          color={config.iconColor}
          style={styles.icon}
        />
        <Text
          style={[
            styles.message,
            {
              fontSize: Layout.typography.fontSize.sm,
              color: theme.colors.text.inverse,
            },
          ]}
          numberOfLines={3}
        >
          {message}
        </Text>
        <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
          <Ionicons
            name="close"
            size={Layout.getResponsiveFontSize(18)}
            color={config.iconColor}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: Layout.spacing.md,
    right: Layout.spacing.md,
    borderRadius: Layout.radius.md,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 9999,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Layout.spacing.md,
    paddingVertical: Layout.spacing.sm,
    minHeight: Layout.getResponsiveSpacing(56),
  },
  icon: {
    marginRight: Layout.spacing.sm,
  },
  message: {
    flex: 1,
    fontWeight: "500",
    lineHeight: Layout.typography.lineHeight.sm,
  },
  closeButton: {
    marginLeft: Layout.spacing.xs,
    padding: Layout.spacing.xs,
  },
});