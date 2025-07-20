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
import { Colors } from "@constants/Colors";

interface SocialAuthButtonsProps {
  onGoogleSuccess?: () => void;
  onGoogleError?: (error: string) => void;
}

export default function SocialAuthButtons({
  onGoogleSuccess,
  onGoogleError,
}: SocialAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const { signInWithGoogle: authSignInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();

      if (result.success && result.idToken) {
        // Send the Google ID token to your backend
        const authResult = await authSignInWithGoogle(result.idToken);

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
    } catch (error) {
      console.error("Google sign-in error:", error);
      const errorMessage = "An unexpected error occurred during Google sign-in";
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
    marginTop: 20,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
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
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text.primary,
  },
  googleButtonText: {
    color: Colors.text.inverse,
  },
});