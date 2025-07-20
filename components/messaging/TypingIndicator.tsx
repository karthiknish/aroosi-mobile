import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Colors, Layout } from "../../constants";

interface TypingIndicatorProps {
  isVisible: boolean;
  userName?: string;
  style?: any;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isVisible,
  userName = "Someone",
  style,
}) => {
  const [dotAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    if (isVisible) {
      // Create a looping animation for the typing dots
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(dotAnimation, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dotAnimation, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();

      return () => animation.stop();
    }
  }, [isVisible, dotAnimation]);

  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.bubble}>
        <Text style={styles.text}>{userName} is typing</Text>
        <View style={styles.dotsContainer}>
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: [0.3, 1, 0.3, 0.3],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: [0.3, 0.3, 1, 0.3],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                opacity: dotAnimation.interpolate({
                  inputRange: [0, 0.33, 0.66, 1],
                  outputRange: [0.3, 0.3, 0.3, 1],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: "flex-start",
  },
  bubble: {
    backgroundColor: Colors.background.primary,
    borderRadius: Layout.radius.lg,
    borderBottomLeftRadius: Layout.radius.xs,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border.primary,
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    color: Colors.text.secondary,
    fontStyle: "italic",
    marginRight: 8,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.text.secondary,
    marginHorizontal: 1,
  },
});

export default TypingIndicator;
