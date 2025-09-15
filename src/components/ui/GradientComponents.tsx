import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
  ViewProps,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useTheme } from "@contexts/ThemeContext";
import { rgbaHex } from "@utils/color";

// Gradient Button Component
interface GradientButtonProps extends TouchableOpacityProps {
  title: string;
  colors?: string[];
  textStyle?: TextStyle;
  gradientStyle?: ViewStyle;
  size?: "small" | "medium" | "large";
  variant?: "primary" | "secondary" | "success" | "error" | "warning";
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  colors,
  textStyle,
  gradientStyle,
  size = "medium",
  variant = "primary",
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const getVariantColors = () => {
    switch (variant) {
      case "primary":
        return [
          theme.colors.primary[500],
          theme.colors.primary[600],
          theme.colors.primary[700],
        ];
      case "secondary":
        return [
          theme.colors.secondary[500],
          theme.colors.secondary[600],
          theme.colors.secondary[700],
        ];
      case "success":
        return [
          theme.colors.success[500],
          theme.colors.success[600],
          theme.colors.success[700],
        ];
      case "error":
        return [
          theme.colors.error[500],
          theme.colors.error[600],
          theme.colors.error[700],
        ];
      case "warning":
        return [
          theme.colors.warning[500],
          theme.colors.warning[600],
          theme.colors.warning[700],
        ];
      default:
        return [
          theme.colors.primary[500],
          theme.colors.primary[600],
          theme.colors.primary[700],
        ];
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 16,
          fontSize: 14,
        };
      case "medium":
        return {
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 20,
          fontSize: 16,
        };
      case "large":
        return {
          paddingHorizontal: 32,
          paddingVertical: 16,
          borderRadius: 24,
          fontSize: 18,
        };
    }
  };

  const sizeStyles = getSizeStyles();
  const gradientColors = colors || getVariantColors();

  return (
    <TouchableOpacity style={[styles.gradientButton, style]} {...props}>
      <LinearGradient
        colors={gradientColors as any}
        style={[
          styles.gradient,
          {
            paddingHorizontal: sizeStyles.paddingHorizontal,
            paddingVertical: sizeStyles.paddingVertical,
            borderRadius: sizeStyles.borderRadius,
          },
          gradientStyle,
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text
          style={[
            styles.gradientButtonText,
            {
              fontSize: sizeStyles.fontSize,
              color: theme.colors.background.primary,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// Glassmorphism Card Component
interface GlassmorphismCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

export const GlassmorphismCard: React.FC<GlassmorphismCardProps> = ({
  children,
  intensity = 80,
  tint = "light",
  borderRadius = 16,
  borderWidth = 1,
  borderColor,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.glassmorphismContainer,
        {
          borderRadius,
          borderWidth,
          borderColor:
            borderColor ?? rgbaHex(theme.colors.background.primary, 0.2),
        },
        style,
      ]}
      {...props}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        style={[styles.blurView, { borderRadius }]}
      >
        <View
          style={[
            styles.glassmorphismContent,
            { backgroundColor: rgbaHex(theme.colors.background.primary, 0.1) },
          ]}
        >
          {children}
        </View>
      </BlurView>
    </View>
  );
};

// Gradient Background Component
interface GradientBackgroundProps extends ViewProps {
  colors?: string[];
  direction?: "vertical" | "horizontal" | "diagonal";
  children?: React.ReactNode;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  colors,
  direction = "diagonal",
  children,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  const getGradientDirection = () => {
    switch (direction) {
      case "vertical":
        return { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } };
      case "horizontal":
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } };
      case "diagonal":
        return { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } };
    }
  };

  const gradientDirection = getGradientDirection();

  return (
    <LinearGradient
      colors={(colors || (theme.colors.gradient.primary as any)) as any}
      style={[styles.gradientBackground, style]}
      start={gradientDirection.start}
      end={gradientDirection.end}
      {...props}
    >
      {children}
    </LinearGradient>
  );
};

// Animated Gradient Border Component
interface GradientBorderProps extends ViewProps {
  children: React.ReactNode;
  colors?: string[];
  borderWidth?: number;
  borderRadius?: number;
  animated?: boolean;
}

export const GradientBorder: React.FC<GradientBorderProps> = ({
  children,
  colors,
  borderWidth = 2,
  borderRadius = 12,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={
        (colors || [
          theme.colors.primary[500],
          theme.colors.secondary[500],
          theme.colors.primary[500],
        ]) as any
      }
      style={[
        styles.gradientBorderContainer,
        {
          borderRadius: borderRadius + borderWidth,
          padding: borderWidth,
        },
        style,
      ]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      {...props}
    >
      <View
        style={[
          styles.gradientBorderContent,
          {
            borderRadius,
            backgroundColor: theme.colors.background.primary,
          },
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
};

// Floating Gradient Card
interface FloatingGradientCardProps extends ViewProps {
  children: React.ReactNode;
  elevation?: number;
  shadowColor?: string;
  gradientColors?: string[];
}

export const FloatingGradientCard: React.FC<FloatingGradientCardProps> = ({
  children,
  elevation = 8,
  shadowColor,
  gradientColors,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.floatingCard,
        {
          shadowColor: shadowColor ?? theme.colors.neutral[900],
          shadowOffset: { width: 0, height: elevation / 2 },
          shadowOpacity: 0.25,
          shadowRadius: elevation,
          elevation,
        },
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={
          (gradientColors || [
            rgbaHex(theme.colors.background.primary, 0.9),
            rgbaHex(theme.colors.background.primary, 0.7),
          ]) as any
        }
        style={styles.floatingCardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {children}
      </LinearGradient>
    </View>
  );
};

// Shimmer Effect Component
interface ShimmerProps extends ViewProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  colors?: string[];
}

export const Shimmer: React.FC<ShimmerProps> = ({
  width = "100%",
  height = 20,
  borderRadius = 4,
  colors,
  style,
  ...props
}) => {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.shimmerContainer,
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: theme.colors.neutral[200],
        },
        style,
      ]}
      {...props}
    >
      <LinearGradient
        colors={
          (colors || [
            rgbaHex(theme.colors.background.primary, 0.1),
            rgbaHex(theme.colors.background.primary, 0.3),
            rgbaHex(theme.colors.background.primary, 0.1),
          ]) as any
        }
        style={styles.shimmerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  gradientButton: {
    overflow: "hidden",
  },
  gradient: {
    alignItems: "center",
    justifyContent: "center",
  },
  gradientButtonText: {
    fontWeight: "600",
    textAlign: "center",
  },
  glassmorphismContainer: {
    overflow: "hidden",
  },
  blurView: {
    flex: 1,
  },
  glassmorphismContent: {
    flex: 1,
  },
  gradientBackground: {
    flex: 1,
  },
  gradientBorderContainer: {
    overflow: "hidden",
  },
  gradientBorderContent: {
    flex: 1,
  },
  floatingCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  floatingCardGradient: {
    flex: 1,
    borderRadius: 16,
  },
  shimmerContainer: {
    overflow: "hidden",
  },
  shimmerGradient: {
    flex: 1,
  },
});