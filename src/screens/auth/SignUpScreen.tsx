import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useSignUp } from "@clerk/clerk-expo";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/AuthNavigator";
import SocialAuthButtons from "../../../components/auth/SocialAuthButtons";
import { Colors } from "../../../constants/Colors";
import { useResponsiveSpacing, useResponsiveTypography } from "../../../hooks/useResponsive";

type SignUpScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "SignUp"
>;

export default function SignUpScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const onSignUpPress = async () => {
    if (!isLoaded) return;

    if (!emailAddress || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        "Error",
        "Please accept the Terms of Service and Privacy Policy"
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      await signUp.create({
        emailAddress,
        password,
      });

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: any) {
      console.error("Sign up error:", err);
      Alert.alert(
        "Sign Up Failed",
        err.errors?.[0]?.message || "An error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;

    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
    } catch (err: any) {
      console.error("Verification error:", err);
      Alert.alert(
        "Verification Failed",
        err.errors?.[0]?.message || "Invalid verification code"
      );
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing.xl * 2,
    },
    title: {
      fontSize: fontSize["2xl"],
      fontWeight: "bold",
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
    },
    form: {
      width: "100%",
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fontSize.sm,
      color: Colors.text.primary,
      marginBottom: spacing.xs,
      fontWeight: "500",
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: fontSize.base,
      color: Colors.text.primary,
    },
    button: {
      backgroundColor: Colors.primary[500],
      borderRadius: 8,
      padding: spacing.md,
      alignItems: "center",
      marginTop: spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: Colors.text.inverse,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    termsContainer: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginVertical: spacing.lg,
      paddingHorizontal: spacing.xs,
    },
    checkbox: {
      width: spacing.lg,
      height: spacing.lg,
      borderWidth: 2,
      borderColor: Colors.border.primary,
      borderRadius: 4,
      marginRight: spacing.md,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    checkboxChecked: {
      backgroundColor: Colors.primary[500],
      borderColor: Colors.primary[500],
    },
    checkmark: {
      color: Colors.text.inverse,
      fontSize: fontSize.xs,
      fontWeight: "bold",
    },
    termsText: {
      flex: 1,
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      lineHeight: spacing.lg,
    },
    termsLink: {
      color: Colors.primary[500],
      fontWeight: "500",
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: Colors.border.primary,
    },
    dividerText: {
      marginHorizontal: spacing.md,
      color: Colors.text.secondary,
      fontSize: fontSize.sm,
    },
    linkButton: {
      marginTop: spacing.lg,
      alignItems: "center",
    },
    linkText: {
      color: Colors.primary[500],
      fontSize: fontSize.sm,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!pendingVerification ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join Aroosi to find your perfect match
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={Colors.text.secondary}
                  value={emailAddress}
                  onChangeText={setEmailAddress}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.text.secondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={Colors.text.secondary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setTermsAccepted(!termsAccepted)}
                disabled={loading}
              >
                <View
                  style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked,
                  ]}
                >
                  {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{" "}
                  <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onSignUpPress}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Creating Account..." : "Sign Up"}
                </Text>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <SocialAuthButtons
                loading={loading}
                onSuccess={() => {
                  // Navigation handled by auth context
                }}
                mode="sign-up"
              />

              <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate("Login")}
                disabled={loading}
              >
                <Text style={styles.linkText}>
                  Already have an account? Sign In
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Verify Email</Text>
              <Text style={styles.subtitle}>
                We've sent a verification code to {emailAddress}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter verification code"
                  placeholderTextColor={Colors.text.secondary}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  editable={!loading}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={onPressVerify}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Verifying..." : "Verify Email"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}