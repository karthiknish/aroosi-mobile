import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@contexts/AuthProvider";
import { useToast } from "@providers/ToastContext";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, {
  useResponsiveTypography,
} from "@/hooks/useResponsive";

interface SocialAuthButtonsProps {
  onGoogleSuccess?: () => void;
  onGoogleError?: (error: string) => void;
}

export default function SocialAuthButtons({
  onGoogleSuccess,
  onGoogleError,
}: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const toast = useToast();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
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
    leftIcon: {
      marginRight: spacing.sm,
    },
    inlineRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
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
          <View style={styles.inlineRow}>
            <Ionicons
              name="logo-google"
              size={18}
              color={Colors.text.inverse}
              style={styles.leftIcon}
            />
            <Text style={[styles.buttonText, styles.googleButtonText]}>
              Continue with Google
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {Platform.OS === "ios" && (
        <View style={{ marginTop: spacing.md }}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={
              AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
            }
            buttonStyle={
              AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={8}
            style={{ width: "100%", height: 48 }}
            onPress={async () => {
              try {
                const res = await signInWithApple?.();
                if (!res?.success) {
                  const msg = res?.error || "Apple authentication failed";
                  onGoogleError?.(msg);
                  toast.show(msg, "error");
                }
              } catch (e: any) {
                const msg = e?.message || "Apple authentication failed";
                onGoogleError?.(msg);
                toast.show(msg, "error");
              }
            }}
          />
        </View>
      )}
    </View>
  );
}