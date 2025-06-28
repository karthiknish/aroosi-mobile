import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../../constants/Colors";

const { width: screenWidth } = Dimensions.get("window");

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
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 120,
  strokeWidth = 8,
  color = Colors.primary[500],
  backgroundColor = Colors.neutral[200],
  showPercentage = true,
  animated = true,
  duration = 1000,
  children,
}) => {
  const animatedProgress = useSharedValue(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, { duration });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, duration]);

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
    <View style={[styles.circularProgressContainer, { width: size, height: size }]}>
      {/* Background Circle */}
      <View
        style={[
          styles.circularProgressBackground,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
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
            borderColor: color,
            borderTopColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "transparent",
          },
          progressStyle,
        ]}
      />

      <View style={styles.circularProgressContent}>
        {children || (
          showPercentage && (
            <Animated.View style={percentageStyle}>
              <Text style={[styles.percentageText, { color }]}>
                {Math.round(progress * 100)}%
              </Text>
            </Animated.View>
          )
        )}
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
}

export const LinearProgress: React.FC<LinearProgressProps> = ({
  progress,
  height = 8,
  backgroundColor = Colors.neutral[200],
  colors = [Colors.primary[500], Colors.primary[600]],
  animated = true,
  duration = 1000,
  showLabel = false,
  label,
  style,
}) => {
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      animatedProgress.value = withTiming(progress, { duration });
    } else {
      animatedProgress.value = progress;
    }
  }, [progress, animated, duration]);

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
          {
            height,
            backgroundColor,
            borderRadius: height / 2,
          },
        ]}
      >
        <Animated.View style={[styles.progressFill, progressStyle]}>
          <LinearGradient
            colors={colors as any}
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
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  orientation = "horizontal",
  style,
}) => {
  const renderStep = (step: any, index: number) => {
    const isLast = index === steps.length - 1;
    const scale = useSharedValue(step.completed ? 1 : 0.8);
    const opacity = useSharedValue(step.completed ? 1 : 0.5);

    useEffect(() => {
      scale.value = withSpring(step.completed || step.active ? 1 : 0.8);
      opacity.value = withTiming(step.completed || step.active ? 1 : 0.5);
    }, [step.completed, step.active]);

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
                  ? Colors.success[500]
                  : step.active
                  ? Colors.primary[500]
                  : Colors.neutral[300],
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
                    ? Colors.success[500]
                    : Colors.neutral[300],
                },
              ]}
            />
          )}
        </View>

        <Text
          style={[
            styles.stepTitle,
            {
              color: step.completed || step.active
                ? Colors.text.primary
                : Colors.text.secondary,
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

// Animated Counter
interface AnimatedCounterProps {
  value: number;
  duration?: number;
  style?: any;
  textStyle?: any;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  style,
  textStyle,
  prefix = "",
  suffix = "",
  decimals = 0,
}) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration });
  }, [value, duration]);

  const animatedTextStyle = useAnimatedStyle(() => {
    const currentValue = animatedValue.value.toFixed(decimals);
    return {
      // Note: In a real implementation, you'd need to use a text animation library
      // or create a custom solution for animating text values
    };
  });

  return (
    <Animated.View style={[style, animatedTextStyle]}>
      <Text style={textStyle}>
        {prefix}{value.toFixed(decimals)}{suffix}
      </Text>
    </Animated.View>
  );
};

// Loading Dots Animation
interface LoadingDotsProps {
  size?: number;
  color?: string;
  count?: number;
  style?: any;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  size = 8,
  color = Colors.primary[500],
  count = 3,
  style,
}) => {
  const dots = Array.from({ length: count }, (_, index) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.3);

    useEffect(() => {
      const delay = index * 200;
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 0 }),
          withTiming(1.5, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        -1,
        false
      );
      
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 0 }),
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        false
      );
    }, []);

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
            backgroundColor: color,
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
}

export const Pulse: React.FC<PulseProps> = ({
  children,
  scale = 1.1,
  duration = 1000,
  style,
}) => {
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(scale, { duration: duration / 2 }),
        withTiming(1, { duration: duration / 2 })
      ),
      -1,
      true
    );
  }, [scale, duration]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 18,
    fontWeight: "600",
  },
  linearProgressContainer: {
    width: "100%",
  },
  progressLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontWeight: "500",
  },
  progressPercentage: {
    fontSize: 14,
    color: Colors.text.primary,
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
    marginBottom: 20,
  },
  stepIndicatorContainer: {
    alignItems: "center",
    position: "relative",
  },
  stepIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  stepNumber: {
    color: Colors.background.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  stepConnector: {
    position: "absolute",
    zIndex: 0,
  },
  horizontalConnector: {
    height: 2,
    width: "100%",
    left: 16,
    top: 15,
  },
  verticalConnector: {
    width: 2,
    height: 40,
    top: 32,
    left: 15,
  },
  stepTitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
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