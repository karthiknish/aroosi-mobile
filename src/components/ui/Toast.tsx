import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Colors, Layout } from "@constants";
import * as Haptics from "expo-haptics";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@hooks/useResponsive";


export type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  position?: "top" | "bottom";
}

const toastConfig = {
  success: {
    icon: "✅",
    colors: [Colors.success[500], Colors.success[600]],
    haptic: Haptics.ImpactFeedbackStyle.Light,
  },
  error: {
    icon: "❌",
    colors: [Colors.error[500], Colors.error[600]],
    haptic: Haptics.ImpactFeedbackStyle.Heavy,
  },
  warning: {
    icon: "⚠️",
    colors: [Colors.warning[500], Colors.warning[600]],
    haptic: Haptics.ImpactFeedbackStyle.Medium,
  },
  info: {
    icon: "ℹ️",
    colors: [Colors.primary[500], Colors.primary[600]],
    haptic: Haptics.ImpactFeedbackStyle.Light,
  },
};

export const Toast: React.FC<ToastProps> = ({
  visible,
  message,
  type = "info",
  duration = 3000,
  onHide,
  action,
  position = "top",
}) => {
  const translateY = useSharedValue(position === "top" ? -100 : 100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const config = toastConfig[type];

  const triggerHaptic = () => {
    Haptics.impactAsync(config.haptic);
  };

  useEffect(() => {
    if (visible) {
      runOnJS(triggerHaptic)();

      // Entrance animation
      opacity.value = withTiming(1, { duration: 300 });
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });

      // Auto hide
      if (duration > 0) {
        const timer = setTimeout(() => {
          hideToast();
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      hideToast();
    }
  }, [visible, duration]);

  const hideToast = () => {
    opacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.8, { duration: 200 });
    translateY.value = withTiming(
      position === "top" ? -100 : 100,
      { duration: 200 },
      () => {
        if (onHide) {
          runOnJS(onHide)();
        }
      }
    );
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [
        { translateY: translateY.value },
        { scale: scale.value },
      ] as any,
    };
  });

  // Inline styles derived from responsive tokens to avoid stale closures
  const iconStyle = {
    fontSize: fontSize.lg as number,
    marginRight:
      (typeof spacing?.sm === "number" ? spacing.sm : 8) +
      (typeof spacing?.xs === "number" ? spacing.xs : 4),
  };

  const messageStyle = {
    flex: 1,
    fontSize: fontSize.base as number,
    fontWeight: "500" as const,
    color: Colors.background.primary,
    lineHeight: (fontSize.base as number) * 1.4,
  };

  const actionButtonStyle = {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: (typeof spacing?.md === "number" ? spacing.md : 16),
    paddingVertical: ((typeof spacing?.xs === "number" ? spacing.xs : 4) + 2),
    borderRadius: (typeof spacing?.md === "number" ? spacing.md : 16),
    marginLeft: (typeof spacing?.sm === "number" ? spacing.sm : 8),
  };

  const actionTextStyle = {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: fontSize.sm as number,
    fontWeight: "600" as const,
    color: Colors.background.primary,
  };

  const closeButtonStyle = {
    width: (typeof spacing?.lg === "number" ? spacing.lg : 24),
    height: (typeof spacing?.lg === "number" ? spacing.lg : 24),
    borderRadius: (typeof spacing?.md === "number" ? spacing.md : 12),
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    marginLeft: (typeof spacing?.xs === "number" ? spacing.xs : 4),
  };

  const closeTextStyle = {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontSize: fontSize.xs as number,
    color: Colors.background.primary,
    fontWeight: "600" as const,
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        position === "top" ? styles.topPosition : styles.bottomPosition,
        animatedStyle,
      ]}
    >
      <BlurView intensity={80} style={styles.blurContainer}>
        <LinearGradient
          colors={[config.colors[0], config.colors[1], "rgba(255,255,255,0.1)"]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.content}>
            <View style={styles.messageContainer}>
              <Text style={iconStyle}>{config.icon}</Text>
              <Text style={messageStyle}>{message}</Text>
            </View>

            {action && (
              <TouchableOpacity
                style={actionButtonStyle}
                onPress={() => {
                  action.onPress();
                  hideToast();
                }}
              >
                <Text style={actionTextStyle}>{action.label}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={closeButtonStyle}
              onPress={hideToast}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={closeTextStyle}>✕</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
};

// Toast Manager for global toasts
class ToastManager {
  private toasts: Array<{
    id: string;
    props: Omit<ToastProps, "visible" | "onHide">;
  }> = [];
  private listeners: Array<(toasts: typeof this.toasts) => void> = [];

  show(props: Omit<ToastProps, "visible" | "onHide">) {
    const id = Date.now().toString();
    this.toasts.push({ id, props });
    this.notifyListeners();

    // Auto remove after duration
    setTimeout(() => {
      this.hide(id);
    }, props.duration || 3000);

    return id;
  }

  hide(id: string) {
    this.toasts = this.toasts.filter((toast) => toast.id !== id);
    this.notifyListeners();
  }

  hideAll() {
    this.toasts = [];
    this.notifyListeners();
  }

  subscribe(listener: (toasts: typeof this.toasts) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.toasts]));
  }
}

export const toastManager = new ToastManager();

// Hook for using toasts
export const useToast = () => {
  const [toasts, setToasts] = React.useState<
    Array<{ id: string; props: Omit<ToastProps, "visible" | "onHide"> }>
  >([]);

  React.useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  const showToast = React.useCallback(
    (props: Omit<ToastProps, "visible" | "onHide">) => {
      return toastManager.show(props);
    },
    []
  );

  const hideToast = React.useCallback((id: string) => {
    toastManager.hide(id);
  }, []);

  const hideAllToasts = React.useCallback(() => {
    toastManager.hideAll();
  }, []);

  return {
    toasts,
    showToast,
    hideToast,
    hideAllToasts,
  };
};

// Global Toast Container Component
export const ToastContainer: React.FC = () => {
  const { toasts, hideToast } = useToast();

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          visible={true}
          onHide={() => hideToast(toast.id)}
          {...toast.props}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  topPosition: {
    top: 60,
  },
  bottomPosition: {
    bottom: 100,
  },
  blurContainer: {
    borderRadius: 16,
    overflow: "hidden",
  },
  gradient: {
    borderRadius: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 60,
  },
  messageContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  // Keep only static styles; responsive values are applied inline in the component
  icon: {},
  message: {
    flex: 1,
    fontWeight: "500",
    color: Colors.background.primary,
  },
  actionButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  actionText: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    fontWeight: "600",
    color: Colors.background.primary,
  },
  closeButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeText: {
    fontFamily: Layout.typography.fontFamily.sansSemiBold,
    color: Colors.background.primary,
    fontWeight: "600",
  },
  toastContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
});
