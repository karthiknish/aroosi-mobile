import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from '@contexts/AuthProvider';
import { Colors, Layout } from '@constants';
import { useToast } from '@providers/ToastContext';
import { rgbaHex } from "@utils/color";

export const EmailVerificationBanner: React.FC = () => {
  const {
    needsEmailVerification,
    resendEmailVerification,
    verifyEmailCode,
    startEmailVerificationPolling,
  } = useAuth() as any;
  const toast = useToast();
  const [sending, setSending] = React.useState(false);
  const [checking, setChecking] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(0);
  const cooldownRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (cooldown <= 0 && cooldownRef.current) {
      clearInterval(cooldownRef.current);
      cooldownRef.current = null;
    }
  }, [cooldown]);

  // Auto-start polling while the banner is visible so it auto-hides soon after user verifies via email link.
  React.useEffect(() => {
    // Debounce a bit to avoid spamming on fast mounts
    const t = setTimeout(() => {
      if (needsEmailVerification) {
        startEmailVerificationPolling?.({ intervalMs: 5000, maxAttempts: 36 }); // ~3 minutes
      }
    }, 300);
    return () => clearTimeout(t);
  }, [startEmailVerificationPolling, needsEmailVerification]);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (cooldownRef.current) {
        clearInterval(cooldownRef.current);
        cooldownRef.current = null;
      }
    };
  }, []);

  if (!needsEmailVerification) return null;

  const handleResend = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    try {
      const res = await resendEmailVerification();
      if (res.success) {
        toast.show("Verification email sent", "info");
        setCooldown(60);
        if (!cooldownRef.current) {
          cooldownRef.current = setInterval(() => {
            setCooldown((c) => c - 1);
          }, 1000);
        }
        startEmailVerificationPolling?.();
      } else {
        toast.show(res.error || "Failed to send email", "error");
      }
    } finally {
      setSending(false);
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const res = await verifyEmailCode();
      if (res.success) {
        toast.show("Email verified!", "success");
      } else {
        toast.show(res.error || "Still unverified", "info");
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={styles.safeTop}>
      <View style={styles.container}>
        <Text style={styles.message}>
          Please verify your email to unlock all features.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.button,
              (sending || cooldown > 0) && styles.disabled,
            ]}
            disabled={sending || cooldown > 0}
            onPress={handleResend}
          >
            {sending ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>
                {cooldown > 0 ? `Resend (${cooldown}s)` : "Resend"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, checking && styles.disabled]}
            disabled={checking}
            onPress={handleCheck}
          >
            {checking ? (
              <ActivityIndicator color={Colors.text.inverse} />
            ) : (
              <Text style={styles.buttonText}>I Verified</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeTop: {
    backgroundColor: "transparent",
  },
  container: {
    backgroundColor: Colors.warning[500],
    paddingVertical: Layout?.spacing?.sm || 8,
    paddingHorizontal: Layout?.spacing?.md || 12,
  },
  message: {
    color: Colors.text.inverse,
    fontWeight: "600",
    marginBottom: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    backgroundColor: rgbaHex(Colors.text.primary, 0.25),
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: Colors.text.inverse, fontWeight: "600" },
});

export default EmailVerificationBanner;
