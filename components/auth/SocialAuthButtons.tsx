import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@contexts/AuthContext";
import { signInWithGoogle } from "@services/googleAuth";
import { Colors, Layout } from "@constants";

interface SocialAuthButtonsProps {
  onGoogleSuccess?: () => void;
  onGoogleError?: (error: string) => void;
}

export default function SocialAuthButtons({
  onGoogleSuccess,
  onGoogleError,
}: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const auth = useAuth();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success && result.idToken) {
        // Send the Google ID token to your backend (if available in auth context)
        if (!auth || typeof auth !== "object" || !("signInWithGoogle" in auth) || typeof (auth as any).signInWithGoogle !== "function") {
          const errorMessage = "Google authentication is not available right now";
          onGoogleError?.(errorMessage);
          Alert.alert("Authentication Error", errorMessage);
          return;
        }
        const authResult = await (auth as any).signInWithGoogle(result.idToken);

        if (authResult.success) {
          onGoogleSuccess?.();
        } else {
          const errorMessage =
            authResult.error || "Google authentication failed";
          onGoogleError?.(errorMessage);
          Alert.alert("Authentication Error", errorMessage);
        }
      } else {
        const errorMessage = result.error || "Google authentication failed";
        onGoogleError?.(errorMessage);
        Alert.alert("Authentication Error", errorMessage);
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      const errorMessage =
        typeof error?.message === "string"
          ? error.message
          : "An unexpected error occurred during Google sign-in";
      onGoogleError?.(errorMessage);
      Alert.alert("Authentication Error", errorMessage);
    } finally {
      setIsGoogleLoading(false);
    }
  };

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

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginTop: Layout.spacing.lg,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Layout.spacing.md,
    paddingHorizontal: Layout.spacing.lg,
    borderRadius: Layout.radius.md,
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
    fontSize: Layout.typography.fontSize.base,
    fontWeight: Layout.typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
  googleButtonText: {
    color: Colors.text.inverse,
  },
});