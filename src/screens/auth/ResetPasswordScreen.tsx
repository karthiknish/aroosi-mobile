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
import { useClerkAuth } from "@contexts/ClerkAuthContext";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, { useResponsiveTypography } from "@hooks/useResponsive";
import { GradientBackground } from "@/components/ui/GradientComponents";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useToast } from "@providers/ToastContext";

type ResetPasswordScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "ResetPassword"
>;

type ResetPasswordRouteProp = RouteProp<AuthStackParamList, "ResetPassword">;

export default function ResetPasswordScreen() {
  const { resetPassword } = useClerkAuth();
  const navigation = useNavigation<ResetPasswordScreenNavigationProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const toast = useToast();

  // Email-based reset per Convex-auth compatible API
  const [email, setEmail] = useState<string>(
    (route.params as any)?.email || ""
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onSubmit = async () => {
    const nextErrors: Record<string, string> = {};
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailTrimmed) nextErrors.email = "Email is required";
    else if (!emailRegex.test(emailTrimmed))
      nextErrors.email = "Please enter a valid email address";
    if (!password) {
      nextErrors.password = "Password is required";
    } else if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password";
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      const res = await resetPassword(emailTrimmed, password);
      if (res.success) {
        toast.show("Your password has been reset successfully.", "success");
        navigation.navigate("Login");
      } else {
        toast.show(res.error || "Unable to reset password", "error");
      }
    } catch (e) {
      toast.show(
        "An unexpected error occurred while resetting password",
        "error"
      );
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    inner: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      paddingTop: spacing.xl * 2,
    },
    header: { marginBottom: spacing.xl * 2 },
    title: {
      fontFamily: Layout.typography.fontFamily.serif,
      fontSize: fontSize["2xl"],
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: { fontSize: fontSize.base, color: Colors.text.secondary },
    form: { width: "100%" },
    inputContainer: { marginBottom: spacing.lg },
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
    inputError: { borderColor: Colors.error[500] },
    button: {
      backgroundColor: Colors.primary[500],
      borderRadius: 8,
      padding: spacing.md,
      alignItems: "center",
      marginTop: spacing.lg,
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
                <Text style={styles.title}>Reset Password</Text>
                <Text style={styles.subtitle}>
                  Enter your account email and new password.
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.text.secondary}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (errors.email) setErrors((e) => ({ ...e, email: "" }));
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {!!errors.email && (
                    <Text style={styles.errorText}>{errors.email}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={[styles.input, errors.password && styles.inputError]}
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.text.secondary}
                    value={password}
                    onChangeText={(v) => {
                      setPassword(v);
                      if (errors.password)
                        setErrors((e) => ({ ...e, password: "" }));
                    }}
                    secureTextEntry
                  />
                  {!!errors.password && (
                    <Text style={styles.errorText}>{errors.password}</Text>
                  )}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.confirmPassword && styles.inputError,
                    ]}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.text.secondary}
                    value={confirmPassword}
                    onChangeText={(v) => {
                      setConfirmPassword(v);
                      if (errors.confirmPassword)
                        setErrors((e) => ({ ...e, confirmPassword: "" }));
                    }}
                    secureTextEntry
                  />
                  {!!errors.confirmPassword && (
                    <Text style={styles.errorText}>
                      {errors.confirmPassword}
                    </Text>
                  )}
                </View>

                <TouchableOpacity style={styles.button} onPress={onSubmit}>
                  <Text style={styles.buttonText}>Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}