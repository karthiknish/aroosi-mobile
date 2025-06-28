import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Layout } from "../../constants";
import { useResponsiveSpacing, useResponsiveTypography } from "../../hooks/useResponsive";

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionText?: string;
  onAction?: () => void;
  style?: ViewStyle;
  illustration?: React.ReactNode;
}

export default function EmptyState({
  icon = "document-outline",
  title,
  message,
  actionText,
  onAction,
  style,
  illustration,
}: EmptyStateProps) {
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const dynamicStyles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.xl,
    },
    content: {
      alignItems: "center",
      maxWidth: 300,
    },
    iconContainer: {
      marginBottom: spacing.xl,
      padding: spacing.lg,
      borderRadius: 50,
      backgroundColor: Colors.background.secondary,
    },
    title: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize.xl,
      fontWeight: "bold",
      color: Colors.text.primary,
      textAlign: "center",
      marginBottom: spacing.md,
    },
    message: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: "center",
      lineHeight: fontSize.base * 1.5,
      marginBottom: spacing.xl,
    },
    actionButton: {
      backgroundColor: Colors.primary[500],
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: 8,
      shadowColor: Colors.primary[500],
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    actionButtonText: {
      fontFamily: Layout.typography.fontFamily.sansSemiBold,
      color: Colors.text.inverse,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
  });

  return (
    <Animated.View 
      style={[
        dynamicStyles.container, 
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={dynamicStyles.content}>
        {illustration || (
          <View style={dynamicStyles.iconContainer}>
            <Ionicons
              name={icon as keyof typeof Ionicons.glyphMap}
              size={64}
              color={Colors.neutral[400]}
            />
          </View>
        )}

        <Text style={dynamicStyles.title}>{title}</Text>

        {message && <Text style={dynamicStyles.message}>{message}</Text>}

        {actionText && onAction && (
          <TouchableOpacity 
            style={dynamicStyles.actionButton} 
            onPress={onAction}
            activeOpacity={0.8}
          >
            <Text style={dynamicStyles.actionButtonText}>{actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}


