import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@contexts/ThemeContext";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";

// Create responsive styles function
const createResponsiveStyles = (
  spacing: any,
  fontSize: any,
  themeColors: any
) =>
  StyleSheet.create({
    circularProgressContainer: {
      justifyContent: "center",
      alignItems: "center",
      position: "relative",
    },
    circularProgressBackground: {
      position: "absolute",
    },
    circularProgressForeground: {
      position: "absolute",
    },
    circularProgressContent: {
      position: "absolute",
      justifyContent: "center",
      alignItems: "center",
    },
    percentageText: {
      fontSize: fontSize.lg,
      fontWeight: "600",
    },
    linearProgressContainer: {
      width: "100%",
    },
    progressLabelContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    progressLabel: {
      fontSize: fontSize.sm,
      color: themeColors.text.secondary,
      fontWeight: "500",
    },
    progressPercentage: {
      fontSize: fontSize.sm,
      color: themeColors.text.primary,
      fontWeight: "600",
    },
    progressTrack: {
      width: "100%",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
    },
    progressGradient: {
      flex: 1,
    },
    stepProgressContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    verticalStepProgress: {
      flexDirection: "column",
      alignItems: "flex-start",
    },
    stepContainer: {
      flex: 1,
      alignItems: "center",
    },
    verticalStepContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.lg - spacing.xs,
    },
    stepIndicatorContainer: {
      alignItems: "center",
      position: "relative",
    },
    stepIndicator: {
      width: spacing.xl,
      height: spacing.xl,
      borderRadius: spacing.md,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1,
    },
    stepNumber: {
      color: themeColors.text.inverse,
      fontSize: fontSize.sm,
      fontWeight: "600",
    },
    stepConnector: {
      position: "absolute",
      zIndex: 0,
    },
    horizontalConnector: {
      height: spacing.xs / 2,
      width: "100%",
      left: spacing.md,
      top: spacing.md - spacing.xs,
    },
    verticalConnector: {
      width: spacing.xs / 2,
      height: spacing.xl + spacing.sm,
      top: spacing.xl,
      left: spacing.md - spacing.xs,
    },
    stepTitle: {
      fontSize: fontSize.xs,
      textAlign: "center",
      marginTop: spacing.sm,
      fontWeight: "500",
    },
    loadingDotsContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    loadingDot: {
      // Styles applied dynamically
    },
  });

// Circular Progress Ring
interface CircularProgressProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showPercentage?: boolean;
  animated?: boolean;
  duration?: number;
  children?: React.ReactNode;
  respectReduceMotion?: boolean;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color,
  backgroundColor,
  showPercentage = true,
  animated = true,
  duration = 1000,
  children,
  respectReduceMotion = true,
}) => {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { theme } = useTheme();
  const styles = createResponsiveStyles(spacing, fontSize, theme.colors);
  const animatedProgress = useSharedValue(0);
  const strokeColor = color ?? theme.colors.primary[500];
  const bgColor = backgroundColor ?? theme.colors.neutral[200];

  const { reduceMotion } = useReduceMotion();
  const shouldAnimate = animated && !(respectReduceMotion && reduceMotion);

  useEffect(() => {
    if (shouldAnimate) {
      animatedProgress.value = withTiming(progress, { duration });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, shouldAnimate, duration]);

  const progressStyle = useAnimatedStyle(() => {
    const rotation = animatedProgress.value * 360;
    return {
      transform: [{ rotate: `${rotation}deg` }] as any,
    };
  });

  const percentageStyle = useAnimatedStyle(() => {
    return {
      opacity: animatedProgress.value > 0 ? 1 : 0,
    };
  });

  return (
    <View
      style={[styles.circularProgressContainer, { width: size, height: size }]}
    >
      {/* Background Circle */}
      <View
        style={[
          styles.circularProgressBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: bgColor,
          },
        ]}
      />

      {/* Progress Arc */}
      <Animated.View
        style={[
          styles.circularProgressForeground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: strokeColor,
            borderTopColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "transparent",
          },
          progressStyle,
        ]}
      />

      <View style={styles.circularProgressContent}>
        {children ||
          (showPercentage && (
            <Animated.View style={percentageStyle}>
              <Text style={[styles.percentageText, { color: strokeColor }]}>
                {Math.round(progress * 100)}%
              </Text>
            </Animated.View>
          ))}
      </View>
    </View>
  );
};

// Linear Progress Bar with Gradient
interface LinearProgressProps {
  progress: number; // 0 to 1
  height?: number;
  backgroundColor?: string;
  colors?: string[];
  animated?: boolean;
  duration?: number;
  showLabel?: boolean;
  label?: string;
  style?: any;
  respectReduceMotion?: boolean;
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress,
  height = 8,
  backgroundColor,
  colors,
  animated = true,
  duration = 1000,
  showLabel = false,
  label,
  style,
  respectReduceMotion = true,
}) => {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { theme } = useTheme();
  const styles = createResponsiveStyles(spacing, fontSize, theme.colors);
  const trackColor = backgroundColor ?? theme.colors.neutral[200];
  const gradientColors = colors ?? [
    theme.colors.primary[500],
    theme.colors.primary[600],
  ];
  const animatedProgress = useSharedValue(0);

  const { reduceMotion } = useReduceMotion();
  const shouldAnimate = animated && !(respectReduceMotion && reduceMotion);

  useEffect(() => {
    if (shouldAnimate) {
      animatedProgress.value = withTiming(progress, { duration });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, shouldAnimate, duration]);

  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${animatedProgress.value * 100}%`,
    };
  });

  return (
    <View style={[styles.linearProgressContainer, style]}>
      {showLabel && (
        <View style={styles.progressLabelContainer}>
          <Text style={styles.progressLabel}>{label}</Text>
          <Text style={styles.progressPercentage}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      )}
      <View
        style={[
          styles.progressTrack,
          { height, backgroundColor: trackColor, borderRadius: height / 2 },
        ]}
      >
        <Animated.View style={[styles.progressFill, progressStyle]}>
          <LinearGradient
            colors={gradientColors as any}
            style={[styles.progressGradient, { borderRadius: height / 2 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </Animated.View>
      </View>
    </View>
  );
};

// Step Progress Indicator
interface StepProgressProps {
  steps: Array<{
    id: string;
    title: string;
    completed: boolean;
    active?: boolean;
  }>;
  orientation?: "horizontal" | "vertical";
  style?: any;
  respectReduceMotion?: boolean;
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  orientation = "horizontal",
  style,
  respectReduceMotion = true,
}) => {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { theme } = useTheme();
  const styles = createResponsiveStyles(spacing, fontSize, theme.colors);

  const renderStep = (step: any, index: number) => {
    const isLast = index === steps.length - 1;
    const scale = useSharedValue(step.completed ? 1 : 0.8);
    const opacity = useSharedValue(step.completed ? 1 : 0.5);

    const { reduceMotion } = useReduceMotion();
    const shouldAnimate = !(respectReduceMotion && reduceMotion);

    useEffect(() => {
      if (shouldAnimate) {
        scale.value = withSpring(step.completed || step.active ? 1 : 0.8);
        opacity.value = withTiming(step.completed || step.active ? 1 : 0.5);
      } else {
        // Set final states without animation
        scale.value = step.completed || step.active ? 1 : 0.9;
        opacity.value = step.completed || step.active ? 1 : 0.7;
      }
    }, [step.completed, step.active, shouldAnimate]);

    const animatedStepStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <View
        key={step.id}
        style={[
          styles.stepContainer,
          orientation === "vertical" && styles.verticalStepContainer,
        ]}
      >
        <View style={styles.stepIndicatorContainer}>
          <Animated.View
            style={[
              styles.stepIndicator,
              {
                backgroundColor: step.completed
                  ? theme.colors.success[500]
                  : step.active
                  ? theme.colors.primary[500]
                  : theme.colors.neutral[300],
              },
              animatedStepStyle,
            ]}
          >
            <Text style={styles.stepNumber}>
              {step.completed ? "✓" : index + 1}
            </Text>
          </Animated.View>

          {!isLast && (
            <View
              style={[
                styles.stepConnector,
                orientation === "vertical"
                  ? styles.verticalConnector
                  : styles.horizontalConnector,
                {
                  backgroundColor: step.completed
                    ? theme.colors.success[500]
                    : theme.colors.neutral[300],
                },
              ]}
            />
          )}
        </View>

        <Text
          style={[
            styles.stepTitle,
            {
              color:
                step.completed || step.active
                  ? theme.colors.text.primary
                  : theme.colors.text.secondary,
            },
          ]}
        >
          {step.title}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.stepProgressContainer,
        orientation === "vertical" && styles.verticalStepProgress,
        style,
      ]}
    >
      {steps.map(renderStep)}
    </View>
  );
};

// Loading Dots Animation
interface LoadingDotsProps {
  size?: number;
  color?: string;
  count?: number;
  style?: any;
  respectReduceMotion?: boolean;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 8,
  color,
  count = 3,
  style,
  respectReduceMotion = true,
}) => {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const { theme } = useTheme();
  const styles = createResponsiveStyles(spacing, fontSize, theme.colors);
  const dotColor = color ?? theme.colors.primary[500];

  const { reduceMotion } = useReduceMotion();
  const shouldAnimate = !(respectReduceMotion && reduceMotion);

  const dots = Array.from({ length: count }, (_, index) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
      if (shouldAnimate) {
        scale.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 0 }),
            withTiming(1.4, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          false
        );

        opacity.value = withRepeat(
          withSequence(
            withTiming(0.5, { duration: 0 }),
            withTiming(1, { duration: 400 }),
            withTiming(0.5, { duration: 400 })
          ),
          -1,
          false
        );
      } else {
        scale.value = 1;
        opacity.value = 1;
      }
    }, [shouldAnimate]);

    const animatedDotStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

    return (
      <Animated.View
        key={index}
        style={[
          styles.loadingDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: dotColor,
            marginHorizontal: size / 4,
          },
          animatedDotStyle,
        ]}
      />
    );
  });

  return <View style={[styles.loadingDotsContainer, style]}>{dots}</View>;
};

// Pulse Animation
interface PulseProps {
  children: React.ReactNode;
  scale?: number;
  duration?: number;
  style?: any;
  respectReduceMotion?: boolean;
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  scale = 1.1,
  duration = 1000,
  style,
  respectReduceMotion = true,
}) => {
  const pulseScale = useSharedValue(1);
  const { reduceMotion } = useReduceMotion();
  const shouldAnimate = !(respectReduceMotion && reduceMotion);

  useEffect(() => {
    if (shouldAnimate) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(scale, { duration: duration / 2 }),
          withTiming(1, { duration: duration / 2 })
        ),
        -1,
        true
      );
    } else {
      pulseScale.value = 1;
    }
  }, [scale, duration, shouldAnimate]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
};