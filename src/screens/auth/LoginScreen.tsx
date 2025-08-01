import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { useToast } from "@providers/ToastContext";
import { useAuth } from "../../../contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import SocialAuthButtons from "@components/auth/SocialAuthButtons";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, { useResponsiveTypography } from "@hooks/useResponsive";
import { GradientBackground } from "@/components/ui/GradientComponents";

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Login"
>;

export default function LoginScreen() {
  const { signIn, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSignInPress = async () => {
    // Inline client-side validation
    const errors: Record<string, string> = {};

    const email = emailAddress.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      errors.emailAddress = "Email is required";
    } else if (!emailRegex.test(email)) {
      errors.emailAddress = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Do not Alert; allow inline errors to render
      return;
    }

    const toast = useToast();
    setLoading(true);
    try {
      const result = await signIn(email, password);

      if (!result.success) {
        toast.show(result.error || "Invalid email or password", "error");
      }
      // Navigation is handled by the auth context
    } catch (err: any) {
      console.error("Sign in error:", err);
      const toast = useToast();
      toast.show("An unexpected error occurred", "error");
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    inner: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingTop: spacing.xl * 2,
    },
    header: {
      marginBottom: spacing.xl * 2,
    },
    title: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize["2xl"],
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
      backgroundColor: "white",
    },
    inputError: {
      borderColor: Colors.error[500],
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
    forgotPasswordButton: {
      alignItems: "center",
      marginTop: spacing.md,
    },
    forgotPasswordText: {
      color: Colors.primary[500],
      fontSize: fontSize.sm,
      fontWeight: "500",
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.xl,
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
    errorText: {
      color: Colors.error[500],
      marginTop: spacing.xs,
      fontSize: fontSize.sm,
    },
  });

  return (
    <GradientBackground
      colors={Colors.gradient.secondary as any}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.inner}>
              <View style={styles.header}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to continue</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.emailAddress && styles.inputError,
                    ]}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.text.secondary}
                    value={emailAddress}
                    onChangeText={(v) => {
                      setEmailAddress(v);
                      if (fieldErrors.emailAddress) {
                        setFieldErrors((prev) => ({
                          ...prev,
                          emailAddress: "",
                        }));
                      }
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!loading}
                  />
                  {fieldErrors.emailAddress ? (
                    <Text style={styles.errorText}>{fieldErrors.emailAddress}</Text>
                  ) : null}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.password && styles.inputError,
                    ]}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.text.secondary}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (fieldErrors.password) {
                        setFieldErrors((prev) => ({ ...prev, password: "" }));
                      }
                    }}
                    secureTextEntry
                    editable={!loading}
                  />
                  {fieldErrors.password ? (
                    <Text style={styles.errorText}>{fieldErrors.password}</Text>
                  ) : null}
                </View>

                <TouchableOpacity
                  style={[styles.button, loading && styles.buttonDisabled]}
                  onPress={onSignInPress}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Signing in..." : "Sign In"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.forgotPasswordButton}
                  onPress={() => navigation.navigate("ForgotPassword")}
                  disabled={loading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                <SocialAuthButtons
                  onGoogleSuccess={() => {
                    // Navigation handled by auth context
                  }}
                  onGoogleError={(error) => {
                    console.error("Google sign-in error:", error);
                  }}
                />

                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => navigation.navigate("SignUp")}
                  disabled={loading}
                >
                  <Text style={styles.linkText}>
                    Don't have an account? Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}