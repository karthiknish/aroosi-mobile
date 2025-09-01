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
import { useAuth } from "@contexts/AuthProvider";
import { Colors, Layout } from "@constants";
import useResponsiveSpacing, {
  useResponsiveTypography,
} from "@/hooks/useResponsive";
import { GradientBackground } from "@/components/ui/GradientComponents";
import { StackNavigationProp } from "@react-navigation/stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { useNavigation } from "@react-navigation/native";
import { useToast } from "@providers/ToastContext";

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  "ForgotPassword"
>;

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string>("");

  const onSubmit = async () => {
    const emailTrimmed = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    let error = "";
    if (!emailTrimmed) {
      error = "Email is required";
    } else if (!emailRegex.test(emailTrimmed)) {
      error = "Please enter a valid email address";
    }
    setFieldError(error);
    if (error) return;

    try {
      const result = await sendPasswordReset(emailTrimmed);
      if (!result.success && result.error) {
        toast.show(result.error, "error");
        return;
      }
      toast.show("If that email exists, we've sent a reset link.", "success");
      setEmail("");
    } catch (e: any) {
      toast.show(e?.message || "Unable to send reset email", "error");
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
      backgroundColor: Colors.background.primary,
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
                <Text style={styles.title}>Forgot Password</Text>
                <Text style={styles.subtitle}>
                  Enter your email address and we'll send you a reset link.
                </Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, !!fieldError && styles.inputError]}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.text.secondary}
                    value={email}
                    onChangeText={(v) => {
                      setEmail(v);
                      if (fieldError) setFieldError("");
                    }}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                  {!!fieldError && (
                    <Text style={styles.errorText}>{fieldError}</Text>
                  )}
                </View>

                <TouchableOpacity style={styles.button} onPress={onSubmit}>
                  <Text style={styles.buttonText}>Send Reset Link</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
