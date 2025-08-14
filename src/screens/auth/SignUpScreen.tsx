import React, { useState, useEffect, useRef } from "react";
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
import { useClerkAuth } from "@contexts/ClerkAuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "../../navigation/AuthNavigator";
import SocialAuthButtons from "@components/auth/SocialAuthButtons";
import { Colors, Layout } from "../../../constants";
import useResponsiveSpacing, {
  useResponsiveTypography,
} from "../../../hooks/useResponsive";
import { GradientBackground } from "../../components/ui/GradientComponents";
import { useToast } from "../../../providers/ToastContext";
import { OtpInput } from "../../components/ui/OtpInput";

type SignUpScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "SignUp"
>;

export default function SignUpScreen() {
  const { signUp, verifyEmailCode, resendEmailVerification, refreshUser } = useClerkAuth();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const toast = useToast();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Verification state
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [signUpAttemptId, setSignUpAttemptId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [resendLoading, setResendLoading] = useState(false);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Inline field error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Start/resume countdown when verification is needed
  useEffect(() => {
    if (needsVerification) {
      // Start/resume countdown
      setSecondsLeft(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [needsVerification]);

  const handleResend = async () => {
    if (!signUpAttemptId || secondsLeft > 0) return;
    setResendLoading(true);
    try {
      const resp = await resendEmailVerification(signUpAttemptId);
      if (!resp.success) {
        toast?.show?.(resp.error || "Unable to resend code", "error");
        return;
      }
      setVerificationCode("");
      setSecondsLeft(60);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } finally {
      setResendLoading(false);
    }
  };

  // Auto-submit when full 6-digit code entered
  const autoSubmittingRef = useRef(false);
  useEffect(() => {
    const shouldAutoSubmit =
      needsVerification &&
      signUpAttemptId &&
      verificationCode.length === 6 &&
      !loading &&
      !autoSubmittingRef.current;
    if (!shouldAutoSubmit) return;
    autoSubmittingRef.current = true;
    const run = async () => {
      setLoading(true);
      try {
        const result = await verifyEmailCode(verificationCode, signUpAttemptId);
        if (!result.success)
          throw new Error(result.error || "Failed to verify code");

        await refreshUser();
        
        // After successful verification, navigate to onboarding
        toast?.show?.(
          "Account verified. Let's complete your profile.",
          "success"
        );
        navigation.reset({
          index: 0,
          routes: [
            { name: "Onboarding" as any, params: { screen: "ProfileSetup" } },
          ],
        });
      } catch (err: any) {
        const msg =
          err?.message || "Invalid verification code. Please try again.";
        toast?.show?.(msg, "error");
        autoSubmittingRef.current = false; // allow retry
        setLoading(false);
      }
    };
    void run();
  }, [
    needsVerification,
    signUpAttemptId,
    verificationCode,
    loading,
    refreshUser,
    toast,
    navigation,
    verifyEmailCode
  ]);

  const onSignUpPress = async () => {
    // Reset field errors
    const errors: Record<string, string> = {};

    // Email format validation (client-side)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = emailAddress.trim().toLowerCase();
    if (!normalizedEmail) {
      errors.emailAddress = "Email is required";
    } else if (!emailRegex.test(normalizedEmail)) {
      errors.emailAddress = "Please enter a valid email address";
    }

    // Password validation (align with server strong policy)
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 12) {
      errors.password = "Password must be at least 12 characters and include uppercase, lowercase, number, and symbol.";
    } else {
      // Client-side quick check for character classes
      const hasLower = /[a-z]/.test(password);
      const hasUpper = /[A-Z]/.test(password);
      const hasDigit = /\d/.test(password);
      const hasSymbol = /[^A-Za-z0-9]/.test(password);
      if (!(hasLower && hasUpper && hasDigit && hasSymbol)) {
        errors.password = "Password must include uppercase, lowercase, number, and symbol.";
      }
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Show error toast with summary
      const fieldDisplay: Record<string, string> = {
        emailAddress: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
      };
      const fields = Object.keys(errors)
        .filter((k) => k !== "form")
        .map((k) => fieldDisplay[k] || k);
      const summary =
        fields.length > 0
          ? `Please fix: ${fields.join(", ")}.`
          : "Please correct the highlighted fields.";
      toast?.show?.(summary, "error");
      return;
    }

    setLoading(true);
    try {
      // Use email as fullName like web version does
      const fullName = normalizedEmail.split("@")[0];
      const result = await signUp(
        normalizedEmail,
        password,
        fullName
      );

      if (result.success) {
        // After signup, send the user straight to onboarding to complete profile
        toast?.show?.(
          "Account created. Let's complete your profile.",
          "success"
        );
        navigation.reset({
          index: 0,
          routes: [
            { name: "Onboarding" as any, params: { screen: "ProfileSetup" } },
          ],
        });
      } else if (result.needsVerification && result.signUpAttemptId) {
        // Email verification required
        setNeedsVerification(true);
        setSignUpAttemptId(result.signUpAttemptId);
        toast?.show?.("We've sent a verification code to your email.", "info");
      } else {
        toast?.show?.(result.error || "Sign up failed", "error");
      }
    } catch (err: any) {
      console.error("Sign up error:", err);
      toast?.show?.("An unexpected error occurred during sign up", "error");
    } finally {
      setLoading(false);
    }
  };

  const onVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast?.show?.("Please enter the 6-digit code", "error");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyEmailCode(verificationCode, signUpAttemptId!);
      if (!result.success)
        throw new Error(result.error || "Failed to verify code");

      await refreshUser();
      
      // After successful verification, navigate to onboarding
      toast?.show?.(
        "Account verified. Let's complete your profile.",
        "success"
      );
      navigation.reset({
        index: 0,
        routes: [
          { name: "Onboarding" as any, params: { screen: "ProfileSetup" } },
        ],
      });
    } catch (err: any) {
      const errorMsg =
        err?.message || "Invalid verification code. Please try again.";
      toast?.show?.(errorMsg, "error");
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
    errorText: {
      color: Colors.error[500],
      fontSize: fontSize.sm,
      marginTop: spacing.xs,
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
    verificationContainer: {
      alignItems: "center",
      marginBottom: spacing.xl,
    },
    verificationTitle: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize.xl,
      color: Colors.text.primary,
      marginBottom: spacing.sm,
    },
    verificationSubtitle: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
      textAlign: "center",
      marginBottom: spacing.lg,
    },
    resendContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
      width: "100%",
    },
    resendText: {
      fontSize: fontSize.sm,
      color: Colors.text.secondary,
    },
    resendButton: {
      color: Colors.primary[500],
      fontSize: fontSize.sm,
      fontWeight: "500",
    },
    backButton: {
      color: Colors.primary[500],
      fontSize: fontSize.sm,
      fontWeight: "500",
      marginTop: spacing.md,
      textAlign: "center",
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
                <Text style={styles.title}>
                  {needsVerification ? "Check your email" : "Create Account"}
                </Text>
                <Text style={styles.subtitle}>
                  {needsVerification
                    ? `We sent a verification code to ${emailAddress}`
                    : "Join Aroosi to find your perfect match"}
                </Text>
              </View>

              <View style={styles.form}>
                {needsVerification ? (
                  // Verification UI
                  <View style={styles.verificationContainer}>
                    <Text style={styles.verificationTitle}>Verification Code</Text>
                    <Text style={styles.verificationSubtitle}>
                      Enter the 6-digit code sent to your email
                    </Text>
                    
                    <OtpInput
                      value={verificationCode}
                      onChange={(value) => {
                        setVerificationCode(value);
                        // Clear error when user starts typing
                        if (fieldErrors.verificationCode) {
                          setFieldErrors((e) => ({ ...e, verificationCode: "" }));
                        }
                        // Clear verificationCode error when user starts typing
                        if (fieldErrors.verificationCode) {
                          setFieldErrors((prev) => ({ ...prev, verificationCode: undefined }));
                        }
                      }}
                      length={6}
                      autoFocus
                    />
                    {fieldErrors.verificationCode ? (
                      <Text style={styles.errorText}>
                        {fieldErrors.verificationCode}
                      </Text>
                    ) : null}
                    
                    <View style={styles.resendContainer}>
                      <Text style={styles.resendText}>
                        {verificationCode.length === 6
                          ? "Ready to verify"
                          : "Enter the 6-digit code"}
                      </Text>
                      <TouchableOpacity
                        onPress={handleResend}
                        disabled={secondsLeft > 0 || resendLoading}
                      >
                        <Text style={styles.resendButton}>
                          {resendLoading
                            ? "Resending..."
                            : secondsLeft > 0
                              ? `Resend in ${secondsLeft}s`
                              : "Resend code"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    
                    <TouchableOpacity
                      style={[styles.button, (loading || verificationCode.length !== 6) && styles.buttonDisabled]}
                      onPress={onVerifyCode}
                      disabled={loading || verificationCode.length !== 6}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? "Verifying..." : "Verify Email"}
                      </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      onPress={() => {
                        setNeedsVerification(false);
                        setVerificationCode("");
                        setFieldErrors((prev) => ({
                          ...prev,
                          verificationCode: undefined,
                        }));
                      }}
                    >
                      <Text style={styles.backButton}>Back to sign up</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Regular signup form
                  <>
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
                        onChangeText={(t) => {
                          setEmailAddress(t);
                          if (fieldErrors.emailAddress) {
                            setFieldErrors((e) => ({ ...e, emailAddress: "" }));
                          }
                        }}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        editable={!loading}
                      />
                      {!!fieldErrors.emailAddress && (
                        <Text style={styles.errorText}>
                          {fieldErrors.emailAddress}
                        </Text>
                      )}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Password</Text>
                      <TextInput
                        style={[
                          styles.input,
                          fieldErrors.password && styles.inputError,
                        ]}
                        placeholder="Create a strong password"
                        placeholderTextColor={Colors.text.secondary}
                        value={password}
                        onChangeText={(t) => {
                          setPassword(t);
                          if (fieldErrors.password) {
                            setFieldErrors((e) => ({ ...e, password: "" }));
                          }
                        }}
                        secureTextEntry
                        editable={!loading}
                      />
                      {!!fieldErrors.password && (
                        <Text style={styles.errorText}>{fieldErrors.password}</Text>
                      )}
                    </View>

                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <TextInput
                        style={[
                          styles.input,
                          fieldErrors.confirmPassword && styles.inputError,
                        ]}
                        placeholder="Confirm your password"
                        placeholderTextColor={Colors.text.secondary}
                        value={confirmPassword}
                        onChangeText={(t) => {
                          setConfirmPassword(t);
                          if (fieldErrors.confirmPassword) {
                            setFieldErrors((e) => ({ ...e, confirmPassword: "" }));
                          }
                        }}
                        secureTextEntry
                        editable={!loading}
                      />
                      {!!fieldErrors.confirmPassword && (
                        <Text style={styles.errorText}>
                          {fieldErrors.confirmPassword}
                        </Text>
                      )}
                    </View>

                    <TouchableOpacity
                      style={[styles.button, loading && styles.buttonDisabled]}
                      onPress={onSignUpPress}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? "Creating Account..." : "Create Account"}
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
                        console.error("Google sign-up error:", error);
                      }}
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
                  </>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}