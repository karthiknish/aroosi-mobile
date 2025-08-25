import React, { useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/Colors";

interface SuccessMessageProps {
  message: string;
  visible: boolean;
  onHide?: () => void;
  autoHide?: boolean;
  duration?: number;
  style?: any;
  showIcon?: boolean;
}

export function SuccessMessage({
  message,
  visible,
  onHide,
  autoHide = true,
  duration = 3000,
  style,
  showIcon = true,
}: SuccessMessageProps) {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide
      if (autoHide && onHide) {
        const timer = setTimeout(() => {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: -50,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onHide();
          });
        }, duration);

        return () => clearTimeout(timer);
      }
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(-50);
    }
  }, [visible, autoHide, duration, onHide, fadeAnim, slideAnim]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.content}>
        {showIcon && (
          <Ionicons
            name="checkmark-circle"
            size={20}
            color={Colors.success[400]}
            style={styles.icon}
          />
        )}
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.success[50],
    borderColor: Colors.success[200],
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
    shadowColor: Colors.success[400],
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 8,
  },
  message: {
    flex: 1,
    fontSize: 14,
    color: Colors.success[600],
    fontFamily: "NunitoSans-Regular",
    lineHeight: 20,
  },
});
