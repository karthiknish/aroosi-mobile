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
import { useClerkAuth } from "../../../contexts/ClerkAuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import SocialAuthButtons from "@components/auth/SocialAuthButtons";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, { useResponsiveTypography } from "@hooks/useResponsive";

type LoginScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "Login"
>;

const { width, height } = Dimensions.get("window");

export default function LoginScreen() {
  const { signIn, isLoading: authLoading } = useClerkAuth();
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
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
      // Show error toast with summary
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
      const toast = useToast();
      toast.show(summary, "error");
      return;
    }

    const toast = useToast();
    setLoading(true);
    try {
      const result = await signIn(email, password);

      if (!result.success) {
        // Provide more specific error messages for common cases
        let errorMsg = result.error || "Invalid email or password";
        
        if (errorMsg.includes("identifier_not_found")) {
          errorMsg = "No account found with this email address. Please check your email or sign up for a new account.";
        } else if (errorMsg.includes("password_incorrect")) {
          errorMsg = "Invalid password. Please check your password and try again.";
        } else if (errorMsg.includes("invalid_credentials")) {
          errorMsg = "Invalid email or password. Please check your credentials and try again.";
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
      const toast = useToast();
      toast.show(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#f8f4f0", // base-light equivalent
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
    backgroundCircle1: {
      position: "absolute",
      top: -128,
      left: -128,
      width: 640,
      height: 640,
      borderRadius: 320,
      backgroundColor: "#BFA67A", // primary color
      opacity: 0.4,
      zIndex: 0,
    },
    backgroundCircle2: {
      position: "absolute",
      bottom: -96,
      right: -96,
      width: 512,
      height: 512,
      borderRadius: 256,
      backgroundColor: "#f0e6d2", // accent-100 equivalent
      opacity: 0.2,
      zIndex: 0,
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
      color: "#BFA67A", // primary color
      marginBottom: spacing.xs,
      fontWeight: "bold",
    },
    titleUnderline: {
      position: "absolute",
      bottom: -8,
      left: "50%",
      transform: [{ translateX: -50 }],
      width: 100,
      height: 3,
      backgroundColor: "#FDA4AF", // pink accent
      borderRadius: 2,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: "center",
      marginTop: spacing.md,
    },
    formContainer: {
      backgroundColor: "rgba(255, 255, 255, 0.9)", // white/90 equivalent
      borderRadius: 16,
      padding: spacing.lg,
      shadowColor: "#000",
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
      backgroundColor: "#BFA67A", // primary color
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
      color: "#FDA4AF", // pink accent
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
      color: "#BFA67A", // primary color
      fontSize: fontSize.sm,
      fontWeight: "500",
    },
    errorText: {
      color: Colors.error[500],
      marginTop: spacing.xs,
      fontSize: fontSize.sm,
    },
    errorMessage: {
      color: Colors.error[500],
      fontSize: fontSize.sm,
      textAlign: "center",
      marginBottom: spacing.md,
      padding: spacing.sm,
      backgroundColor: "rgba(255, 0, 0, 0.1)",
      borderRadius: 4,
    },
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Decorative background elements */}
        <View style={styles.backgroundCircle1} />
        <View style={styles.backgroundCircle2} />
        
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
                <View style={{ position: "relative", marginBottom: spacing.md }}>
                  <Text style={styles.title}>Sign In</Text>
                  <View style={styles.titleUnderline} />
                </View>
                <Text style={styles.subtitle}>Sign in to your Aroosi account to access your profile, matches, and more.</Text>
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
                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}