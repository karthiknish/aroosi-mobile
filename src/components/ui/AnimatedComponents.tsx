import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewProps,
  ViewStyle,
  Dimensions,
} from "react-native";
import {
  createFadeInAnimation,
  createFadeOutAnimation,
  createScaleInAnimation,
  createSlideInAnimation,
  createBounceAnimation,
  createButtonPressAnimation,
  createHeartAnimation,
  createShakeAnimation,
  createSequentialFadeIn,
  ANIMATION_DURATIONS,
} from "@utils/animations";
import { Colors } from "../../../constants/Colors";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Animated Container for fade in effects
interface FadeInViewProps extends ViewProps {
  duration?: number;
  delay?: number;
  children: React.ReactNode;
}

export const FadeInView: React.FC<FadeInViewProps> = ({
  duration = ANIMATION_DURATIONS.normal,
  delay = 0,
  children,
  style,
  ...props
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    createFadeInAnimation(fadeAnim, duration, delay).start();
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]} {...props}>
      {children}
    </Animated.View>
  );
};

// Animated Container for scale in effects
interface ScaleInViewProps extends ViewProps {
  duration?: number;
  delay?: number;
  fromScale?: number;
  children: React.ReactNode;
}

export const ScaleInView: React.FC<ScaleInViewProps> = ({
  duration = ANIMATION_DURATIONS.normal,
  delay = 0,
  fromScale = 0.8,
  children,
  style,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(fromScale)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      createScaleInAnimation(scaleAnim, fromScale, 1, duration).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [scaleAnim, duration, delay, fromScale]);

  return (
    <Animated.View
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

// Animated Container for slide in effects
interface SlideInViewProps extends ViewProps {
  direction: "left" | "right" | "up" | "down";
  duration?: number;
  delay?: number;
  distance?: number;
  children: React.ReactNode;
}

export const SlideInView: React.FC<SlideInViewProps> = ({
  direction,
  duration = ANIMATION_DURATIONS.normal,
  delay = 0,
  distance,
  children,
  style,
  ...props
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let fromValue: number;

    switch (direction) {
      case "left":
        fromValue = distance || -screenWidth;
        break;
      case "right":
        fromValue = distance || screenWidth;
        break;
      case "up":
        fromValue = distance || -screenHeight;
        break;
      case "down":
        fromValue = distance || screenHeight;
        break;
      default:
        fromValue = 0;
    }

    slideAnim.setValue(fromValue);

    const timer = setTimeout(() => {
      createSlideInAnimation(slideAnim, fromValue, 0, duration).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [slideAnim, direction, duration, delay, distance]);

  const getTransformStyle = (): ViewStyle => {
    if (direction === "left" || direction === "right") {
      return { transform: [{ translateX: slideAnim }] };
    } else {
      return { transform: [{ translateY: slideAnim }] };
    }
  };

  return (
    <Animated.View style={[style, getTransformStyle()]} {...props}>
      {children}
    </Animated.View>
  );
};

// Animated Button with press effects
interface AnimatedButtonProps extends TouchableOpacityProps {
  animationType?: "scale" | "bounce" | "fade";
  scaleValue?: number;
  children: React.ReactNode;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  animationType = "scale",
  scaleValue = 0.95,
  children,
  style,
  onPressIn,
  onPressOut,
  ...props
}) => {
  const animValue = useRef(new Animated.Value(1)).current;
  const { pressIn, pressOut } = createButtonPressAnimation(
    animValue,
    scaleValue
  );

  const handlePressIn = () => {
    if (animationType === "scale") {
      pressIn();
    } else if (animationType === "bounce") {
      createBounceAnimation(animValue).start();
    }
    onPressIn?.({} as any);
  };

  const handlePressOut = () => {
    if (animationType === "scale") {
      pressOut();
    }
    onPressOut?.({} as any);
  };

  const getAnimatedStyle = (): ViewStyle => {
    switch (animationType) {
      case "scale":
      case "bounce":
        return { transform: [{ scale: animValue }] };
      case "fade":
        return { opacity: animValue };
      default:
        return {};
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      {...props}
    >
      <Animated.View style={[style, getAnimatedStyle()]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Animated Heart Button for likes
interface HeartButtonProps extends TouchableOpacityProps {
  isLiked: boolean;
  onToggle: () => void;
  size?: number;
  likedColor?: string;
  unlikedColor?: string;
}

export const HeartButton: React.FC<HeartButtonProps> = ({
  isLiked,
  onToggle,
  size = 24,
  likedColor = Colors.error[500],
  unlikedColor = Colors.neutral[400],
  style,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [liked, setLiked] = useState(isLiked);

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  const handlePress = () => {
    setLiked(!liked);
    createHeartAnimation(scaleAnim).start();
    onToggle();
  };

  return (
    <TouchableOpacity onPress={handlePress} style={style} {...props}>
      <Animated.Text
        style={{
          fontSize: size,
          color: liked ? likedColor : unlikedColor,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {liked ? "❤️" : "🤍"}
      </Animated.Text>
    </TouchableOpacity>
  );
};

// Shake animation component for errors
interface ShakeViewProps extends ViewProps {
  shouldShake: boolean;
  onShakeComplete?: () => void;
  children: React.ReactNode;
}

export const ShakeView: React.FC<ShakeViewProps> = ({
  shouldShake,
  onShakeComplete,
  children,
  style,
  ...props
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (shouldShake) {
      createShakeAnimation(shakeAnim).start(() => {
        onShakeComplete?.();
      });
    }
  }, [shouldShake, shakeAnim, onShakeComplete]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ translateX: shakeAnim }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

// Staggered list animation
interface StaggeredListProps extends ViewProps {
  children: React.ReactElement[];
  staggerDelay?: number;
  itemDuration?: number;
}

export const StaggeredList: React.FC<StaggeredListProps> = ({
  children,
  staggerDelay = 50,
  itemDuration = ANIMATION_DURATIONS.normal,
  style,
  ...props
}) => {
  const animatedValues = useRef(
    children.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // Reset all values
    animatedValues.forEach((value) => value.setValue(0));

    // Start staggered animation
    createSequentialFadeIn(animatedValues, staggerDelay, itemDuration).start();
  }, [animatedValues, staggerDelay, itemDuration]);

  return (
    <View style={style} {...props}>
      {children.map((child, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animatedValues[index],
            transform: [
              {
                translateY: animatedValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          }}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
};

// Progress bar with animation
interface AnimatedProgressBarProps extends ViewProps {
  progress: number; // 0 to 1
  height?: number;
  backgroundColor?: string;
  progressColor?: string;
  animated?: boolean;
  duration?: number;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  progress,
  height = 4,
  backgroundColor = Colors.neutral[200],
  progressColor = Colors.success[400],
  animated = true,
  duration = ANIMATION_DURATIONS.slow,
  style,
  ...props
}) => {
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(progressAnim, {
        toValue: progress,
        duration,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(progress);
    }
  }, [progress, animated, duration, progressAnim]);

  return (
    <View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: "hidden",
        },
        style,
      ]}
      {...props}
    >
      <Animated.View
        style={{
          height: "100%",
          backgroundColor: progressColor,
          width: progressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ["0%", "100%"],
          }),
        }}
      />
    </View>
  );
};

// Floating Action Button with animations
interface FloatingActionButtonProps extends TouchableOpacityProps {
  icon: string;
  size?: number;
  backgroundColor?: string;
  shadowColor?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  size = 56,
  backgroundColor = Colors.primary[500],
  shadowColor = Colors.neutral[900],
  style,
  ...props
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      createScaleInAnimation(scaleAnim, 0, 1, ANIMATION_DURATIONS.bounce),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: ANIMATION_DURATIONS.bounce,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, rotateAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <AnimatedButton
      style={[
        {
          position: "absolute",
          bottom: 20,
          right: 20,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          justifyContent: "center",
          alignItems: "center",
          elevation: 8,
          shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        style,
        {
          transform: [{ scale: scaleAnim }, { rotate: rotation }],
        },
      ]}
      {...props}
    >
      <Animated.Text style={{ fontSize: size * 0.4 }}>{icon}</Animated.Text>
    </AnimatedButton>
  );
};

// Pulse animation for notifications
interface PulseViewProps extends ViewProps {
  isActive: boolean;
  pulseColor?: string;
  children: React.ReactNode;
}

export const PulseView: React.FC<PulseViewProps> = ({
  isActive,
  pulseColor = Colors.primary[500],
  children,
  style,
  ...props
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isActive) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isActive, pulseAnim]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [{ scale: pulseAnim }],
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};
