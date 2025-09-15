import React from "react";
import { Pressable, PressableProps, Animated } from "react-native";
import * as Haptics from "expo-haptics";

export type HapticPressableProps = PressableProps & {
  haptic?: boolean | "light" | "medium" | "heavy" | "selection";
  hitSlopInset?: number;
  disableScale?: boolean;
};

const DEFAULT_HITSLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

function triggerHaptic(kind: NonNullable<HapticPressableProps["haptic"]>) {
  try {
    if (kind === true || kind === "light")
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (kind === "medium")
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (kind === "heavy")
      return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (kind === "selection") return Haptics.selectionAsync();
  } catch {}
}

export default function HapticPressable({
  haptic = "selection",
  hitSlop,
  hitSlopInset,
  onPress,
  onPressIn,
  onPressOut,
  disableScale,
  ...rest
}: HapticPressableProps) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const mergedHitSlop = React.useMemo(() => {
    if (hitSlop) return hitSlop;
    if (typeof hitSlopInset === "number") {
      return {
        top: hitSlopInset,
        bottom: hitSlopInset,
        left: hitSlopInset,
        right: hitSlopInset,
      } as const;
    }
    return DEFAULT_HITSLOP;
  }, [hitSlop, hitSlopInset]);

  return (
    <Animated.View style={!disableScale ? { transform: [{ scale }] } : undefined}>
      <Pressable
        {...rest}
        hitSlop={mergedHitSlop}
        onPressIn={(e) => {
          if (!disableScale) {
            Animated.spring(scale, {
              toValue: 0.96,
              useNativeDriver: true,
              friction: 7,
              tension: 120,
            }).start();
          }
          onPressIn?.(e);
        }}
        onPressOut={(e) => {
          if (!disableScale) {
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: true,
              friction: 7,
              tension: 120,
            }).start();
          }
          onPressOut?.(e);
        }}
        onPress={(e) => {
          if (haptic) triggerHaptic(haptic);
          onPress?.(e);
        }}
      />
    </Animated.View>
  );
}
