import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useClerkAuth } from "@contexts/ClerkAuthContext";
import { useToast } from "@providers/ToastContext";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, { useResponsiveTypography } from "@hooks/useResponsive";

interface SocialAuthButtonsProps {
  onGoogleSuccess?: () => void;
  onGoogleError?: (error: string) => void;
}

export default function SocialAuthButtons({
  onGoogleSuccess,
  onGoogleError,
}: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const { signInWithGoogle } = useClerkAuth();
  const toast = useToast();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      // Use Clerk's OAuth flow directly
      const result = await signInWithGoogle();

      if (result.success) {
        onGoogleSuccess?.();
      } else {
        const errorMessage = result.error || "Google authentication failed";
        onGoogleError?.(errorMessage);
        toast.show(errorMessage, "error");
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : "An unexpected error occurred during Google sign-in";
      onGoogleError?.(errorMessage);
      toast.show(errorMessage, "error");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      width: "100%",
      marginTop: spacing.lg,
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.border.primary,
      backgroundColor: Colors.background.secondary,
      minHeight: 48,
    },
    googleButton: {
      backgroundColor: "#4285F4",
      borderColor: "#4285F4",
    },
    buttonText: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.text.primary,
    },
    googleButtonText: {
      color: Colors.text.inverse,
    },
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={handleGoogleSignIn}
        disabled={isGoogleLoading}
        accessibilityLabel="Sign in with Google"
      >
        {isGoogleLoading ? (
          <ActivityIndicator size="small" color={Colors.text.inverse} />
        ) : (
          <Text style={[styles.buttonText, styles.googleButtonText]}>
            Continue with Google
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}