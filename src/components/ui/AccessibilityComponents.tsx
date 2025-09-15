import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  ViewStyle,
  TextStyle,
  AccessibilityRole,
  AccessibilityState,
  AccessibilityValue,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "@contexts/ThemeContext";

// Accessibility utilities
export const AccessibilityUtils = {
  // Announce text to screen readers
  announce: (message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  },

  // Check if screen reader is enabled
  isScreenReaderEnabled: async (): Promise<boolean> => {
    return await AccessibilityInfo.isScreenReaderEnabled();
  },

  // Focus on a specific element
  focusOn: (ref: React.RefObject<any>) => {
    if (ref.current) {
      const node = findNodeHandle(ref.current);
      if (node) {
        AccessibilityInfo.setAccessibilityFocus(node);
      }
    }
  },

  // Get accessibility roles for different components
  getRoleForComponent: (
    type: "button" | "link" | "header" | "text" | "image" | "list"
  ): AccessibilityRole => {
    const roleMap: Record<string, AccessibilityRole> = {
      button: "button",
      link: "link",
      header: "header",
      text: "text",
      image: "image",
      list: "list",
    };
    return roleMap[type] || "none";
  },

  // Generate accessibility hints
  generateHint: (action: string, context?: string): string => {
    const hints = {
      tap: "Double tap to activate",
      swipe: "Swipe left or right to navigate",
      scroll: "Scroll to see more content",
      edit: "Double tap to edit",
      delete: "Double tap to delete",
      like: "Double tap to like",
      match: "Double tap to match",
      message: "Double tap to send message",
    };

    const baseHint =
      hints[action as keyof typeof hints] || "Double tap to activate";
    return context ? `${baseHint}. ${context}` : baseHint;
  },
};

// Enhanced TouchableOpacity with accessibility features
interface AccessibleTouchableProps {
  children: React.ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: AccessibilityState;
  accessibilityValue?: AccessibilityValue;
  disabled?: boolean;
  style?: ViewStyle;
  hapticFeedback?: boolean;
  announceOnPress?: string;
  testID?: string;
}

export const AccessibleTouchable: React.FC<AccessibleTouchableProps> = ({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = "button",
  accessibilityState,
  accessibilityValue,
  disabled = false,
  style,
  hapticFeedback = true,
  announceOnPress,
  testID,
}) => {
  const handlePress = async () => {
    if (disabled) return;

    // Haptic feedback
    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Announce action if specified
    if (announceOnPress) {
      AccessibilityUtils.announce(announceOnPress);
    }

    onPress();
  };

  return (
    <TouchableOpacity
      style={[style, disabled && { opacity: 0.5 }]}
      onPress={handlePress}
      disabled={disabled}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled, ...accessibilityState }}
      accessibilityValue={accessibilityValue}
      testID={testID}
    >
      {children}
    </TouchableOpacity>
  );
};

// Accessible Text Input with enhanced features
interface AccessibleTextProps {
  children: React.ReactNode;
  accessibilityRole?: AccessibilityRole;
  accessibilityLevel?: number;
  style?: TextStyle;
  testID?: string;
}

export const AccessibleText: React.FC<AccessibleTextProps> = ({
  children,
  accessibilityRole = "text",
  accessibilityLevel,
  style,
  testID,
}) => {
  return (
    <Text
      style={style}
      accessible={true}
      accessibilityRole={accessibilityRole}
      {...(accessibilityLevel && { accessibilityLevel })}
      testID={testID}
    >
      {children}
    </Text>
  );
};

// Skip Link component for navigation
interface SkipLinkProps {
  targetRef: React.RefObject<any>;
  label: string;
  style?: ViewStyle;
}

export const SkipLink: React.FC<SkipLinkProps> = ({
  targetRef,
  label,
  style,
}) => {
  const { theme } = useTheme();
  const handleSkip = () => {
    AccessibilityUtils.focusOn(targetRef);
    AccessibilityUtils.announce(`Skipped to ${label}`);
  };

  return (
    <AccessibleTouchable
      onPress={handleSkip}
      accessibilityLabel={`Skip to ${label}`}
      accessibilityHint="Double tap to skip to main content"
      style={{
        position: "absolute",
        top: -1000,
        left: 0,
        backgroundColor: theme.colors.neutral[900],
        padding: 8,
        zIndex: 9999,
        ...style,
      }}
    >
      <Text style={{ color: theme.colors.background.primary }}>
        Skip to {label}
      </Text>
    </AccessibleTouchable>
  );
};

// Focus trap for modals and overlays
interface FocusTrapProps {
  children: React.ReactNode;
  active: boolean;
  onEscape?: () => void;
}

export const FocusTrap: React.FC<FocusTrapProps> = ({
  children,
  active,
  onEscape,
}) => {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (active && containerRef.current) {
      // Focus on the container when trap becomes active
      AccessibilityUtils.focusOn(containerRef);
      
      // Announce modal opening
      AccessibilityUtils.announce('Modal opened');
    }
  }, [active]);

  return (
    <View
      ref={containerRef}
      accessible={active}
      accessibilityRole="none"
      accessibilityViewIsModal={active}
    >
      {children}
    </View>
  );
};

// Live region for dynamic content updates
interface LiveRegionProps {
  children: React.ReactNode;
  politeness?: 'polite' | 'assertive';
  style?: ViewStyle;
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  politeness = 'polite',
  style,
}) => {
  return (
    <View
      style={style}
      accessible={true}
      accessibilityLiveRegion={politeness}
    >
      {children}
    </View>
  );
};

// Accessible Icon Button
interface AccessibleIconButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  size?: number;
  color?: string;
  disabled?: boolean;
  style?: ViewStyle;
  hapticFeedback?: boolean;
}

export const AccessibleIconButton: React.FC<AccessibleIconButtonProps> = ({
  iconName,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  size = 24,
  color,
  disabled = false,
  style,
  hapticFeedback = true,
}) => {
  const { theme } = useTheme();
  const iconColor = color || theme.colors.text.primary;
  return (
    <AccessibleTouchable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      disabled={disabled}
      style={{
        padding: 8,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        minWidth: 44,
        minHeight: 44,
        ...style,
      }}
      hapticFeedback={hapticFeedback}
    >
      <Ionicons
        name={iconName}
        size={size}
        color={disabled ? theme.colors.neutral[300] : iconColor}
      />
    </AccessibleTouchable>
  );
};

// Accessible Progress Indicator
interface AccessibleProgressProps {
  progress: number;
  label: string;
  style?: ViewStyle;
  showPercentage?: boolean;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  progress,
  label,
  style,
  showPercentage = true,
}) => {
  const { theme } = useTheme();
  const percentage = Math.round(progress * 100);

  return (
    <View
      style={style}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: percentage,
        text: showPercentage ? `${percentage} percent` : undefined,
      }}
    >
      <View
        style={{
          height: 8,
          backgroundColor: theme.colors.neutral[200],
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${percentage}%`,
            backgroundColor: theme.colors.info[500],
            borderRadius: 4,
          }}
        />
      </View>
      {showPercentage && (
        <AccessibleText
          style={{
            marginTop: 4,
            fontSize: 12,
            color: theme.colors.text.secondary,
          }}
        >
          {percentage}%
        </AccessibleText>
      )}
    </View>
  );
};

// Accessible Card Component
interface AccessibleCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  style?: ViewStyle;
  disabled?: boolean;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  children,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  style,
  disabled = false,
}) => {
  const { theme } = useTheme();
  if (onPress) {
    return (
      <AccessibleTouchable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        disabled={disabled}
        style={{
          backgroundColor: theme.colors.background.primary,
          borderRadius: 12,
          padding: 16,
          shadowColor: theme.colors.neutral[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          ...style,
        }}
      >
        {children}
      </AccessibleTouchable>
    );
  }

  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.background.primary,
          borderRadius: 12,
          padding: 16,
          shadowColor: theme.colors.neutral[900],
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        },
        style,
      ]}
      accessible={true}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="text"
    >
      {children}
    </View>
  );
};

// Hook for managing focus
export const useFocusManagement = () => {
  const focusRef = useRef<any>(null);

  const setFocus = () => {
    if (focusRef.current) {
      AccessibilityUtils.focusOn(focusRef);
    }
  };

  const announceFocus = (message: string) => {
    AccessibilityUtils.announce(message);
    setTimeout(setFocus, 100);
  };

  return {
    focusRef,
    setFocus,
    announceFocus,
  };
};

// Hook for screen reader detection
export const useScreenReader = () => {
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = React.useState(false);

  useEffect(() => {
    const checkScreenReader = async () => {
      const enabled = await AccessibilityUtils.isScreenReaderEnabled();
      setIsScreenReaderEnabled(enabled);
    };

    checkScreenReader();

    const subscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  return isScreenReaderEnabled;
};

export default {
  AccessibilityUtils,
  AccessibleTouchable,
  AccessibleText,
  SkipLink,
  FocusTrap,
  LiveRegion,
  AccessibleIconButton,
  AccessibleProgress,
  AccessibleCard,
  useFocusManagement,
  useScreenReader,
};