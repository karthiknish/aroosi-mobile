import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  Animated,
} from 'react-native';
import { Colors, Layout } from '../../constants';
import {
  useResponsiveSpacing,
  useResponsiveTypography,
} from "@/hooks/useResponsive";

export interface LoadingStateProps {
  size?: 'small' | 'large';
  message?: string;
  style?: ViewStyle;
  color?: string;
  fullScreen?: boolean;
  showPulse?: boolean;
}

export default function LoadingState({
  size = 'large',
  message,
  style,
  color = Colors.primary[500],
  fullScreen = false,
  showPulse = true,
}: LoadingStateProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Pulse animation for the container
    if (showPulse) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
      pulse.start();
      return () => pulse.stop();
    }
  }, [fadeAnim, pulseAnim, showPulse]);

  const dynamicStyles = StyleSheet.create({
    container: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.lg,
    },
    fullScreenContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Colors.background.primary,
      paddingHorizontal: spacing.xl,
    },
    spinner: {
      marginBottom: spacing.md,
    },
    message: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      lineHeight: fontSize.base * 1.4,
    },
    pulseContainer: {
      alignItems: 'center',
    },
  });

  const containerStyle = [
    fullScreen ? dynamicStyles.fullScreenContainer : dynamicStyles.container,
    style,
  ];

  return (
    <Animated.View 
      style={[
        containerStyle,
        { 
          opacity: fadeAnim,
          transform: showPulse ? [{ scale: pulseAnim }] : undefined,
        }
      ]}
    >
      <View style={dynamicStyles.pulseContainer}>
        <ActivityIndicator 
          size={size} 
          color={color}
          style={dynamicStyles.spinner}
        />
        {message && (
          <Text style={dynamicStyles.message}>{message}</Text>
        )}
      </View>
    </Animated.View>
  );
}

