import React, { useState } from 'react';
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
import { useSignIn } from '@clerk/clerk-expo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { Colors } from '../../../constants/Colors';
import { useResponsiveSpacing, useResponsiveTypography } from '../../../hooks/useResponsive';
import ScreenContainer from "../../../components/common/ScreenContainer";

type ForgotPasswordScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { signIn, setActive } = useSignIn();
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const onSendResetEmail = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await signIn?.create({
        strategy: 'reset_password_email_code',
        identifier: email,
      });
      setEmailSent(true);
      Alert.alert(
        'Email Sent',
        'Check your email for instructions to reset your password.'
      );
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to send reset email');
    }
    setLoading(false);
  };

  const onVerifyAndReset = async (code: string, newPassword: string) => {
    if (!code || !newPassword) {
      Alert.alert('Error', 'Please enter both verification code and new password');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn?.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code,
        password: newPassword,
      });

      if (result?.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        navigation.navigate('Login');
        Alert.alert('Success', 'Password reset successfully!');
      }
    } catch (err: any) {
      Alert.alert('Error', err.errors?.[0]?.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    contentStyle: {
      flexGrow: 1,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing.xl * 2,
      alignItems: "center",
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: "bold",
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: "center",
      lineHeight: spacing.lg + 2,
    },
    form: {
      width: "100%",
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: "600",
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: fontSize.base,
      backgroundColor: Colors.background.secondary,
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
      backgroundColor: Colors.neutral[300],
    },
    buttonText: {
      color: Colors.text.inverse,
      fontSize: fontSize.base,
      fontWeight: "600",
    },
    backButton: {
      alignItems: "center",
      marginTop: spacing.lg,
    },
    backButtonText: {
      color: Colors.primary[500],
      fontSize: fontSize.base,
      fontWeight: "500",
    },
  });

  if (emailSent) {
    return <ResetPasswordForm onVerifyAndReset={onVerifyAndReset} loading={loading} />;
  }

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.contentStyle}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you instructions to reset
              your password.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={onSendResetEmail}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Sending..." : "Send Reset Email"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

interface ResetPasswordFormProps {
  onVerifyAndReset: (code: string, newPassword: string) => void;
  loading: boolean;
}

function ResetPasswordForm({ onVerifyAndReset, loading }: ResetPasswordFormProps) {
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { spacing } = useResponsiveSpacing();
  const { fontSize } = useResponsiveTypography();

  const handleSubmit = () => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    onVerifyAndReset(code, newPassword);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: Colors.background.primary,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: spacing.lg,
    },
    header: {
      marginBottom: spacing.xl * 2,
      alignItems: 'center',
    },
    title: {
      fontSize: fontSize.xl,
      fontWeight: 'bold',
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: fontSize.base,
      color: Colors.text.secondary,
      textAlign: 'center',
      lineHeight: spacing.lg + 2,
    },
    form: {
      width: '100%',
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: '600',
      color: Colors.text.primary,
      marginBottom: spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: Colors.border.primary,
      borderRadius: 8,
      padding: spacing.md,
      fontSize: fontSize.base,
      backgroundColor: Colors.background.secondary,
      color: Colors.text.primary,
    },
    button: {
      backgroundColor: Colors.primary[500],
      borderRadius: 8,
      padding: spacing.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    buttonDisabled: {
      backgroundColor: Colors.neutral[300],
    },
    buttonText: {
      color: Colors.text.inverse,
      fontSize: fontSize.base,
      fontWeight: '600',
    },
  });

  return (
    <ScreenContainer
      containerStyle={styles.container}
      contentStyle={styles.scrollContent}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter the verification code from your email and your new password.
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter verification code"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Resetting..." : "Reset Password"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}