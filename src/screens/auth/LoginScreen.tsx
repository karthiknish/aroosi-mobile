import React, { useState } from "react";
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
  Dimensions,
} from "react-native";
import { useToast } from "@providers/ToastContext";
import { useAuth } from "@contexts/AuthProvider";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import SocialAuthButtons from "@components/auth/SocialAuthButtons";
import { Layout } from "@constants";
import { useTheme } from "@contexts/ThemeContext";
import useResponsiveSpacing, {
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import { GradientBackground } from "@src/components/ui/GradientComponents";
import { Ionicons } from "@expo/vector-icons";

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Login"
>;

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const { signIn, isLoading: authLoading } = useAuth();
  const toast = useToast();
  const { theme } = useTheme();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSignInPress = async () => {
    // Clear previous error message
    setErrorMessage(null);

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
      const fieldDisplay: Record<string, string> = {
        emailAddress: "Email",
        password: "Password",
      };
      const fields = Object.keys(errors)
        .filter((k) => k !== "form")
        .map((k) => fieldDisplay[k] || k);
      const summary =
        fields.length > 0
          ? `Please fix: ${fields.join(", ")}.`
          : "Please correct the highlighted fields.";
      toast.show(summary, "error");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn(email, password);

      if (!result.success) {
        // Provide more specific error messages for common cases
        let errorMsg = result.error || "Invalid email or password";

        if (errorMsg.includes("identifier_not_found")) {
          errorMsg =
            "No account found with this email address. Please check your email or sign up for a new account.";
        } else if (errorMsg.includes("password_incorrect")) {
          errorMsg =
            "Invalid password. Please check your password and try again.";
        } else if (errorMsg.includes("invalid_credentials")) {
          errorMsg =
            "Invalid email or password. Please check your credentials and try again.";
        } else if (errorMsg.includes("too_many_requests")) {
          errorMsg = "Too many requests. Please try again later.";
        }

        setErrorMessage(errorMsg);
        toast.show(errorMsg, "error");
      }
      // Navigation is handled by the auth context
    } catch (err: any) {
      console.error("Sign in error:", err);
      const errorMsg = "An unexpected error occurred";
      setErrorMessage(errorMsg);
      toast.show(errorMsg, "error");
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
      alignItems: "center",
    },
    title: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize["2xl"],
      color: theme.colors.accent[700], // mapped from gold
      marginBottom: spacing.xs,
    },
    titleUnderline: {
      position: "absolute",
      bottom: -8,
      left: "50%",
      transform: [{ translateX: -50 }],
      width: 100,
      height: 3,
      backgroundColor: theme.colors.primary[300], // soft pink accent
      borderRadius: 2,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    formContainer: {
      backgroundColor: theme.colors.background.primary,
      borderRadius: 16,
      padding: spacing.lg,
      shadowColor: theme.colors.neutral[900],
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 10,
    },
    form: {
      width: "100%",
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    inputWrapper: {
      position: "relative",
    },
    label: {
      fontSize: fontSize.sm,
      color: theme.colors.text.primary,
      marginBottom: spacing.xs,
      fontWeight: "500",
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border.primary,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: fontSize.base,
      color: theme.colors.text.primary,
      backgroundColor: theme.colors.background.primary,
    },
    inputWithIcon: {
      paddingRight: spacing.xl * 2,
    },
    inputError: {
      borderColor: theme.colors.error[500],
    },
    eyeButton: {
      position: "absolute",
      right: spacing.md,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      backgroundColor: theme.colors.accent[700],
      borderRadius: 8,
      padding: spacing.md,
      alignItems: "center",
      marginTop: spacing.lg,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    buttonText: {
      color: theme.colors.text.inverse,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    forgotPasswordButton: {
      alignItems: "center",
      marginTop: spacing.md,
    },
    forgotPasswordText: {
      color: theme.colors.primary[400],
      fontSize: fontSize.sm,
      fontWeight: "500",
      textDecorationLine: "underline",
    },
    divider: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: spacing.xl,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border.primary,
    },
    dividerText: {
      marginHorizontal: spacing.md,
      color: theme.colors.text.secondary,
      fontSize: fontSize.sm,
    },
    linkButton: {
      marginTop: spacing.lg,
      alignItems: "center",
    },
    linkText: {
      color: theme.colors.accent[700],
      fontSize: fontSize.sm,
      fontWeight: "500",
    },
    errorText: {
      color: theme.colors.error[500],
      marginTop: spacing.xs,
      fontSize: fontSize.sm,
    },
    errorMessage: {
      color: theme.colors.error[500],
      fontSize: fontSize.sm,
      textAlign: "center",
      marginBottom: spacing.md,
      padding: spacing.sm,
      backgroundColor: theme.colors.error[50],
      borderRadius: 4,
    },
  });

  return (
    <GradientBackground
          colors={theme.colors.gradient.secondary as any}
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
                <View
                  style={{ position: "relative", marginBottom: spacing.md }}
                >
                  <Text style={styles.title}>Sign In</Text>
                  <View style={styles.titleUnderline} />
                </View>
                <Text style={styles.subtitle}>
                  Sign in to your Aroosi account to access your profile,
                  matches, and more.
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.form}>
                  {/* Error message display */}
                  {errorMessage ? (
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                  ) : null}

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                      style={[
                        styles.input,
                        fieldErrors.emailAddress && styles.inputError,
                      ]}
                      placeholder="Enter your email"
                      placeholderTextColor={theme.colors.text.secondary}
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
                      <Text style={styles.errorText}>
                        {fieldErrors.emailAddress}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Password</Text>
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={[
                          styles.input,
                          styles.inputWithIcon,
                          fieldErrors.password && styles.inputError,
                        ]}
                        placeholder="Enter your password"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={password}
                        onChangeText={(v) => {
                          setPassword(v);
                          if (fieldErrors.password) {
                            setFieldErrors((prev) => ({
                              ...prev,
                              password: "",
                            }));
                          }
                        }}
                        secureTextEntry={!showPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setShowPassword((s) => !s)}
                        accessibilityRole="button"
                        accessibilityLabel={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        <Ionicons
                          name={showPassword ? "eye-off" : "eye"}
                          size={20}
                          color={theme.colors.text.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                    {fieldErrors.password ? (
                      <Text style={styles.errorText}>
                        {fieldErrors.password}
                      </Text>
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
                    <Text style={styles.forgotPasswordText}>
                      Forgot password?
                    </Text>
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
                    onPress={() => {
                      // redirect to onboarding to create an account
                      // @ts-ignore
                      navigation.navigate("Onboarding");
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.linkText}>
                      Don't have an account? Start Onboarding
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}