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
} from "react-native";
import { useAuth } from "@contexts/AuthContext";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import SocialAuthButtons from "@components/auth/SocialAuthButtons";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, { useResponsiveTypography } from "@hooks/useResponsive";
import { GradientBackground } from "@/components/ui/GradientComponents";
import { useToast } from "@providers/ToastContext";

type SignUpScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "SignUp"
>;

export default function SignUpScreen() {
  const { signUp, isLoading: authLoading } = useAuth();
  const navigation = useNavigation<SignUpScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const toast = useToast();

  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  // OTP flow removed to match web session-cookie flow
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Inline field error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const onSignUpPress = async () => {
    // Reset field errors
    const errors: Record<string, string> = {};

    // Basic required fields
    if (!firstName.trim()) errors.firstName = "First name is required";
    if (!lastName.trim()) errors.lastName = "Last name is required";

    // Email format validation (client-side)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normalizedEmail = emailAddress.trim().toLowerCase();
    if (!normalizedEmail) {
      errors.emailAddress = "Email is required";
    } else if (!emailRegex.test(normalizedEmail)) {
      errors.emailAddress = "Please enter a valid email address";
    }

    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    if (!termsAccepted) {
      errors.terms = "You must accept the Terms of Service and Privacy Policy";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Inline errors are rendered below inputs
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(
        normalizedEmail,
        password,
        firstName.trim(),
        lastName.trim()
      );

      if (result.success) {
        // Session cookie set by server; navigation handled by RootNavigator via useAuth()
        toast?.show?.("Account created. Welcome to Aroosi!", "success");
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

  // OTP verification removed

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
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>
                  Join Aroosi to find your perfect match
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.firstName && styles.inputError]}
                    placeholder="Enter your first name"
                    placeholderTextColor={Colors.text.secondary}
                    value={firstName}
                    onChangeText={(t) => {
                      setFirstName(t);
                      if (fieldErrors.firstName) {
                        setFieldErrors((e) => ({ ...e, firstName: "" }));
                      }
                    }}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {!!fieldErrors.firstName && (
                    <Text style={styles.errorText}>{fieldErrors.firstName}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.lastName && styles.inputError]}
                    placeholder="Enter your last name"
                    placeholderTextColor={Colors.text.secondary}
                    value={lastName}
                    onChangeText={(t) => {
                      setLastName(t);
                      if (fieldErrors.lastName) {
                        setFieldErrors((e) => ({ ...e, lastName: "" }));
                      }
                    }}
                    autoCapitalize="words"
                    editable={!loading}
                  />
                  {!!fieldErrors.lastName && (
                    <Text style={styles.errorText}>{fieldErrors.lastName}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.emailAddress && styles.inputError]}
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
                    <Text style={styles.errorText}>{fieldErrors.emailAddress}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <TextInput
                    style={[styles.input, fieldErrors.password && styles.inputError]}
                    placeholder="Create a password"
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
                  style={styles.termsContainer}
                  onPress={() => {
                    setTermsAccepted(!termsAccepted);
                    if (fieldErrors.terms) {
                      setFieldErrors((e) => ({ ...e, terms: "" }));
                    }
                  }}
                  disabled={loading}
                >
                  <View
                    style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}
                  >
                    {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.termsText}>
                    I agree to the{" "}
                    <Text style={styles.termsLink}>Terms of Service</Text> and{" "}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                  </Text>
                </TouchableOpacity>
                {!!fieldErrors.terms && (
                  <Text style={[styles.errorText, { marginTop: -spacing.sm }]}>
                    {fieldErrors.terms}
                  </Text>
                )}

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
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}