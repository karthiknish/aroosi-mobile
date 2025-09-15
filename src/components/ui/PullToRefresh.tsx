import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Animated,
  RefreshControl,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from "@contexts/ThemeContext";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  colors?: string[];
  tintColor?: string;
  backgroundColor?: string;
  size?: "default" | "large"; // mapped internally to numeric for RefreshControl
  enabled?: boolean;
  hapticFeedback?: boolean;
  customIndicator?: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshing = false,
  colors,
  tintColor,
  backgroundColor = "transparent",
  size = "default",
  enabled = true,
  hapticFeedback = true,
  customIndicator,
}) => {
  const { theme } = useTheme();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const rotateValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(0)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;

  const PULL_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 120;

  const handleRefresh = async () => {
    if (isRefreshing || !enabled) return;

    setIsRefreshing(true);

    if (hapticFeedback) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      resetAnimation();
    }
  };

  const resetAnimation = () => {
    Animated.parallel([
      Animated.spring(pullDistance, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(scaleValue, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(opacityValue, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (!enabled || isRefreshing) return;

      const { translationY, velocityY } = event;

      if (translationY > 0 && velocityY > 0) {
        const distance = Math.min(translationY * 0.5, MAX_PULL_DISTANCE);
        const progress = Math.min(distance / PULL_THRESHOLD, 1);

        pullDistance.setValue(distance);
        scaleValue.setValue(progress);
        opacityValue.setValue(progress);

        // Rotate icon based on pull progress
        rotateValue.setValue(progress * 180);

        // Haptic feedback at threshold
        if (distance >= PULL_THRESHOLD && hapticFeedback) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }
    })
    .onEnd((event) => {
      if (!enabled || isRefreshing) return;

      const { translationY } = event;
      const distance = Math.min(translationY * 0.5, MAX_PULL_DISTANCE);

      if (distance >= PULL_THRESHOLD) {
        handleRefresh();
      } else {
        resetAnimation();
      }
    });

  const renderCustomIndicator = () => {
    if (customIndicator) {
      return (
        <Animated.View
          style={{
            transform: [{ scale: scaleValue }],
            opacity: opacityValue,
          }}
        >
          {customIndicator}
        </Animated.View>
      );
    }

    return (
      <Animated.View
        style={{
          transform: [
            { scale: scaleValue },
            {
              rotate: rotateValue.interpolate({
                inputRange: [0, 180],
                outputRange: ["0deg", "180deg"],
              }),
            },
          ],
          opacity: opacityValue,
        }}
      >
        <LinearGradient
          colors={(colors || (theme.colors.gradient.primary as any)) as any}
          style={{
            width: size === "large" ? 50 : 40,
            height: size === "large" ? 50 : 40,
            borderRadius: size === "large" ? 25 : 20,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: theme.colors.neutral[900],
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Ionicons
            name={isRefreshing ? "refresh" : "arrow-down"}
            size={size === "large" ? 24 : 20}
            color={theme.colors.text.inverse}
          />
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: pullDistance as any,
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 10,
          zIndex: 1000,
        }}
      >
        {renderCustomIndicator()}
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || isRefreshing}
              onRefresh={handleRefresh}
              colors={(colors || (theme.colors.gradient.primary as any)) as any}
              tintColor={tintColor || theme.colors.info[500]}
              progressBackgroundColor={backgroundColor}
              // Map textual size to numeric constant (0 default, 1 large)
              size={size === "large" ? 1 : 0}
              enabled={enabled}
            />
          }
          scrollEventThrottle={16}
          bounces={true}
        >
          <Animated.View
            style={{
              paddingTop: pullDistance as any,
              flex: 1,
            }}
          >
            {children}
          </Animated.View>
        </ScrollView>
      </GestureDetector>
    </View>
  );
};

// Enhanced RefreshControl with custom styling
export const EnhancedRefreshControl: React.FC<{
  refreshing: boolean;
  onRefresh: () => void;
  colors?: string[];
  tintColor?: string;
  backgroundColor?: string;
  size?: "default" | "large";
  title?: string;
  titleColor?: string;
}> = ({
  refreshing,
  onRefresh,
  colors,
  tintColor,
  backgroundColor = "transparent",
  size = "default",
  title,
  titleColor,
}) => {
  const { theme } = useTheme();
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={(colors || (theme.colors.gradient.primary as any)) as any}
      tintColor={tintColor || theme.colors.info[500]}
      progressBackgroundColor={backgroundColor}
      size={size === "large" ? 1 : 0}
      title={title}
      titleColor={titleColor || theme.colors.text.secondary}
      progressViewOffset={0}
    />
  );
};

export default PullToRefresh;